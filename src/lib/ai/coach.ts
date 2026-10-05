import type { DBShape } from '../db';
import { SKILL_LABEL, currentOverall, readiness, skillStats, weakestQuestionTypes } from '../brain';
import { GRAMMAR_EXPLAINERS } from './grammarRef';
import { examinerQuestion, SPEAKING_TOPICS } from './speaking';
import { TASK_PROMPTS } from './essay';
import { daysBetween, round1, todayISO } from '../utils';
import { typeLabel } from '../types';
import type { CriterionScore } from '../types';

export interface CoachReply {
  content: string;
  chips?: string[];
  action?: { label: string; href: string };
}

/**
 * The coach answers using the learner's own history — results, mistakes, skills
 * and plan. It never invents data that is not present in the database.
 */
export function coachReply(question: string, db: DBShape): CoachReply {
  const q = question.toLowerCase();
  const p = db.profile;
  const r = readiness(db, p);
  const overall = currentOverall(db);
  const weakest = weakestQuestionTypes(db, 3);
  const skillRows = skillStats(db).filter((s) => s.type === 'overall');
  const lastEssayCriteria: CriterionScore[] = db.essays[db.essays.length - 1]?.analysis.criteria ?? [];
  const daysLeft = p?.examDate ? daysBetween(todayISO(), p.examDate) : null;
  const headline = overall === null ? 'no estimate yet' : `estimated Band ${overall}`;

  if (/(grammar|tense|article|conditional|preposition|passive voice|relative clause|modal verb)/.test(q) && /explain|what is|how does|rule|teach/.test(q)) {
    const key = Object.keys(GRAMMAR_EXPLAINERS).find((k) => q.includes(k.toLowerCase().split(' ')[0])) ?? 'Articles';
    const flagged = db.mistakes.filter((m) => m.title.includes(key)).length;
    return {
      content: `${GRAMMAR_EXPLAINERS[key]}${flagged ? `\n\nYou have made this mistake ${flagged} time(s) in your Mistake Bank, which is why I am flagging it now.` : ''}`,
      chips: ['Give me practice on this', 'What should I study today?'],
      action: { label: 'Open Grammar', href: '/grammar' },
    };
  }

  if (/(not improving|stuck|plateau|why.*improve|why.*progress)/.test(q)) {
    const lines = [`You are currently at ${headline} (target ${p?.targetBand ?? 7}).`];
    if (!db.results.length) {
      lines.push('The reason is simple: there is not enough practice data yet. Ten timed questions per skill give the AI a signal it can work with.');
    } else {
      if (r.limiter) lines.push(`**${SKILL_LABEL[r.limiter]}** is your limiter at about ${r.limiterBand}. Your overall band is an average — one weak skill caps everything.`);
      if (weakest.length) lines.push(`Your weakest question type is **${typeLabel(weakest[0].type)}** at ${weakest[0].percentage}% over ${weakest[0].attempts} questions.`);
      const last = db.sessions.length ? Math.max(...db.sessions.map((s) => s.createdAt)) : null;
      if (last) {
        const gap = Math.floor((Date.now() - last) / 86400000);
        if (gap > 4) lines.push(`You last logged study time ${gap} days ago. Skills do not improve without spaced repetition.`);
      }
      const repeated = db.mistakes.filter((m) => m.repetitions >= 2).length;
      if (repeated) lines.push(`You have ${repeated} repeated mistakes. Repeating the same error costs the same marks every single time.`);
    }
    lines.push('**Three things for this week:** attack your limiter skill with one targeted test, clear your repeated mistakes, and log at least 20 minutes a day.');
    return { content: lines.join('\n\n'), chips: ['Show my weak skills', 'What should I study today?'] };
  }

  if (/(reach|get to|achieve|improve to).*(band|\d(\.\d)?)/.test(q) || /how can i (reach|get|improve)/.test(q)) {
    const gap = overall === null ? null : round1((p?.targetBand ?? 7) - overall);
    const rows = skillRows.map((s) => `- **${SKILL_LABEL[s.skill]}: ${s.percentage}%**${s.trend ? ` (${s.trend > 0 ? '+' : ''}${s.trend} vs earlier)` : ''}`).join('\n');
    return {
      content: `You are at ${headline}, target ${p?.targetBand ?? 7}${gap !== null && gap > 0 ? ` — a gap of ${gap} band` : ''}.\n\nCurrent accuracy by skill:\n${rows || '- No results yet.'}\n\n${
        r.limiter ? `**Fastest route:** ${SKILL_LABEL[r.limiter]} is your lowest skill. Raising one skill by a full band lifts your overall by roughly 0.25. ` : ''
      }${daysLeft !== null && daysLeft > 0 ? `With ${daysLeft} days left, aim for two timed sets per skill per week plus one full mock every two weeks.` : 'Set an exam date so I can schedule this properly.'}`,
      chips: ['Build my study plan', 'Generate a targeted test'],
      action: { label: 'Open Study Planner', href: '/planner' },
    };
  }

  if (/reading/.test(q) && /(exercise|test|practice|question|give me)/.test(q)) {
    const weak = weakest.find((s) => s.skill === 'reading');
    return {
      content: weak
        ? `Let's target **${typeLabel(weak.type)}** — you sit at ${weak.percentage}% there, your weakest reading type.\n\nOpen Test Generator and choose one of your own materials. Every question is built only from that text, so nothing can be invented.`
        : 'Let us build a reading set from your own materials — then every question is grounded in a real text you own.',
      chips: ['Generate a reading test', 'What should I study today?'],
      action: { label: 'Go to Test Generator', href: '/test-generator' },
    };
  }

  if (/speaking/.test(q) && /(question|topic|practice|test|give me)/.test(q)) {
    const t = examinerQuestion(1, db.speaking.length).topic;
    return {
      content: `Here is a Part 1–3 set on **${t}**.\n\n**Part 1**\n1. ${examinerQuestion(1, db.speaking.length).question}\n2. ${examinerQuestion(1, db.speaking.length + 1, t).question}\n\n**Part 2**\n${examinerQuestion(2, 0).question}\n\n**Part 3**\n${examinerQuestion(3, db.speaking.length).question}\n\nAim for 2–3 sentences in Part 1 and the full minute in Part 2. More topics: ${SPEAKING_TOPICS.slice(0, 6).join(', ')}.`,
      chips: ['Start a speaking session', 'Analyse my speaking'],
      action: { label: 'Open Speaking Lab', href: '/speaking' },
    };
  }

  if (/(essay|writing task|check my writing|check my essay)/.test(q)) {
    const last = db.essays[db.essays.length - 1];
    const prompt = TASK_PROMPTS[db.essays.length % TASK_PROMPTS.length];
    return {
      content: last
        ? `Your last essay scored an estimated **${last.analysis.overall}**. Its weakest criterion was **${lastEssayCriteria.reduce((a: CriterionScore, b: CriterionScore) => (a.band <= b.band ? a : b), lastEssayCriteria[0]).label}**.\n\nTry this next prompt:\n\n**${prompt.task}** — ${prompt.prompt}`
        : `Here is your next prompt:\n\n**${prompt.task}** — ${prompt.prompt}\n\nWrite at least ${prompt.min} words in Writing Lab and I will score all four IELTS criteria and show exactly which sentences hold you back.`,
      chips: ['Open Writing Lab', 'What should I study today?'],
      action: { label: 'Open Writing Lab', href: '/writing' },
    };
  }

if (/(vocab|words|lexis)/.test(q)) {
    const due = db.vocab.filter((v) => v.dueAt <= Date.now() && v.state !== 'mastered').length;
    const mastered = db.vocab.filter((v) => v.state === 'mastered').length;
    const weak = db.vocab.filter((v) => v.state === 'weak').length;
    return {
      content: `You have **${db.vocab.length}** words saved, **${mastered}** mastered, and **${due}** due for review right now.${weak ? ` ${weak} are marked weak and need shorter review intervals.` : ''}\n\nLexical Resource scores Collocation and Precision, not volume. Ten to fifteen new words a week from your own materials, reviewed on schedule, is worth more than a hundred saved and never seen again.`,
      chips: ['Review due words', 'Extract words from a material'],
      action: { label: 'Open Vocabulary', href: '/vocabulary' },
    };
  }

  if (/(my mistakes|mistake bank|explain my mistakes)/.test(q)) {
    const list = [...db.mistakes].sort((a, b) => b.repetitions - a.repetitions).slice(0, 4);
    if (!list.length) return { content: 'Your mistake bank is empty — good news. Every mistake is logged here automatically, and repeated mistakes trigger targeted practice on their own.', chips: ['What should I study today?'] };
    return {
      content: `Your most repeated mistakes:\n\n${list.map((m) => `- **${m.title}** — ${m.repetitions} time(s). ${m.explanation}`).join('\n')}\n\nLet us drill exactly these. A test built only from your own errors is far more useful than a generic one.`,
      chips: ['Practice my mistakes'],
      action: { label: 'Open Mistake Bank', href: '/mistakes?drill=1' },
    };
  }

  if (/(plan|schedule|my week)/.test(q)) {
    const weekly = p?.weeklyGoalMinutes ?? 300;
    return {
      content: `I will build a plan across ${daysLeft !== null && daysLeft > 0 ? daysLeft : 30} days at ${weekly} minutes a week.\n\nEach skill is weighted by its gap to your target, so the weakest skill automatically receives the most time. If you fall behind, the remaining plan is recalculated rather than pushing every missed task onto tomorrow.\n\nSet your exam date, target band and available time in the planner and I will generate every session.`,
      chips: ['Open study planner', 'What should I study today?'],
      action: { label: 'Open Study Planner', href: '/planner' },
    };
  }

  const weakText = weakest.length
    ? weakest.map((w) => `${typeLabel(w.type)} (${w.percentage}%)`).join(', ')
    : 'none yet — a test will reveal them';
  return {
    content: `You are at ${headline}${daysLeft !== null && daysLeft >= 0 ? `, ${daysLeft} days to your exam` : ''}.\n\nWeakest areas right now: ${weakText}.\n\n${
      r.limiter ? `Priority one is **${SKILL_LABEL[r.limiter]}** at about ${r.limiterBand}. ` : ''
    }Today I would spend ${p?.dailyGoalMinutes ?? 30} focused minutes on that limiter, then 10 minutes clearing due vocabulary.`,
    chips: ['Why am I not improving?', 'How can I reach my target band?', 'Give me speaking questions'],
  };
}