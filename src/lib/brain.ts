import type {
  ISkill, Profile, QuestionType, Recommendation, SkillStat, Task, TestResult,
} from './types';
import { addDaysISO, daysBetween, overallBand, round1, skillBand, todayISO, uid } from './utils';
import { examinerQuestion } from './ai/speaking';
import type { DBShape } from './db';

export const SKILL_LABEL: Record<ISkill, string> = {
  listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking',
};

/* ------------------------------- skill map -------------------------------- */

export function skillStats(db: DBShape): SkillStat[] {
  const stats: SkillStat[] = [];

  (['listening', 'reading', 'writing', 'speaking'] as ISkill[]).forEach((skill) => {
    const rs = db.results.filter((r) => r.skill === skill).sort((a, b) => a.createdAt - b.createdAt);
    const percentage = rs.length ? Math.round(rs.reduce((a, r) => a + r.percentage, 0) / rs.length) : 0;
    const half = Math.max(1, Math.floor(rs.length / 2));
    const recent = rs.slice(-half);
    const older = rs.slice(0, -half);
    const avg = (arr: TestResult[]) => (arr.length ? arr.reduce((a, r) => a + r.percentage, 0) / arr.length : 0);
    stats.push({
      skill, type: 'overall', percentage, trend: older.length ? Math.round(avg(recent) - avg(older)) : 0,
      attempts: rs.reduce((a, r) => a + r.total, 0),
    });

    const agg = new Map<QuestionType, { ok: number; total: number; recentOk: number; recentTotal: number }>();
    rs.forEach((r, i) => {
      const recency = i >= rs.length - half;
      r.answers.forEach((a) => {
        const e = agg.get(a.type) ?? { ok: 0, total: 0, recentOk: 0, recentTotal: 0 };
        e.total += 1;
        if (a.correct) e.ok += 1;
        if (recency) { e.recentTotal += 1; if (a.correct) e.recentOk += 1; }
        agg.set(a.type, e);
      });
    });
    agg.forEach((v, k) => {
      const allPct = (v.ok / v.total) * 100;
      const recentPct = v.recentTotal ? (v.recentOk / v.recentTotal) * 100 : allPct;
      stats.push({ skill, type: k, percentage: Math.round(allPct), attempts: v.total, trend: Math.round(recentPct - allPct) });
    });
  });
  return stats;
}

export function weakestSkills(db: DBShape, limit = 3) {
  return skillStats(db).filter((s) => s.type === 'overall' && s.attempts > 0).sort((a, b) => a.percentage - b.percentage).slice(0, limit);
}

export function weakestQuestionTypes(db: DBShape, limit = 4) {
  return skillStats(db).filter((s) => s.type !== 'overall' && s.attempts >= 2).sort((a, b) => a.percentage - b.percentage).slice(0, limit);
}

export function estimatedBands(db: DBShape): Record<ISkill, number | null> {
  const bySkill = (skill: ISkill) => {
    const rs = db.results.filter((r) => r.skill === skill).slice(-5);
    if (!rs.length) return null;
    return round1(rs.reduce((a, r) => a + skillBand(r.percentage), 0) / rs.length);
  };
  const essays = db.essays.slice(-3);
  const speaking = db.speaking.slice(-3);
  return {
    listening: bySkill('listening'),
    reading: bySkill('reading'),
    writing: essays.length ? round1(essays.reduce((a, e) => a + e.analysis.overall, 0) / essays.length) : bySkill('writing'),
    speaking: speaking.length ? round1(speaking.reduce((a, s) => a + s.overall, 0) / speaking.length) : bySkill('speaking'),
  };
}

export function currentOverall(db: DBShape): number | null {
  const bands = estimatedBands(db);
  if (!Object.values(bands).some((b) => b !== null)) return null;
  return overallBand(bands as Record<ISkill, number | null>);
}

/* ---------------------------- exam readiness ------------------------------ */

export function readiness(db: DBShape, profile: Profile | null) {
  const target = profile?.targetBand ?? 7;
  const bands = estimatedBands(db);
  const current = currentOverall(db);
  const gap = current === null ? 0 : round1(Math.max(0, target - current));
  const coverage = (Object.values(bands).filter((b) => b !== null).length / 4) * 0.5;
  const accuracy = current === null ? 0 : Math.min(1, current / target);
  const consistency = Math.min(1, db.results.length / 12);
  const plan = Math.min(1, db.tasks.filter((t) => t.done).length / 30);
  const percent = Math.round((accuracy * 0.45 + coverage * 0.2 + consistency * 0.15 + plan * 0.2) * 100);
  const limiter = (Object.entries(bands) as [ISkill, number | null][])
    .filter(([, b]) => b !== null)
    .sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))[0];
  let explanation: string;
  if (!limiter) {
    explanation = 'Take your first practice tests so readiness can be estimated from real performance data.';
  } else if (current !== null && current >= target) {
    explanation = `Your estimated overall band (${current}) is at or above your target of ${target}. Keep all four skills balanced and confirm with a full mock exam.`;
  } else {
    explanation = `${SKILL_LABEL[limiter[0]]} is currently limiting your overall score (estimated ${limiter[1]} against a target of ${target}). Improving it gives the fastest overall gain.`;
  }
  return { percent, current, target, gap, limiter: limiter?.[0] ?? null, limiterBand: limiter?.[1] ?? null, explanation, bands };
}

/* ------------------------------- streaks ---------------------------------- */

export function currentStreak(db: DBShape): number {
  const days = new Set(db.sessions.map((s) => s.date));
  db.tasks.filter((t) => t.done && t.completedAt).forEach((t) => days.add(todayISO(new Date(t.completedAt as number))));
  db.essays.forEach((e) => days.add(todayISO(new Date(e.createdAt))));
  let streak = 0;
  let cursor = todayISO();
  if (!days.has(cursor)) cursor = addDaysISO(cursor, -1);
  while (days.has(cursor)) { streak++; cursor = addDaysISO(cursor, -1); }
  return streak;
}

export function studyMinutesOn(db: DBShape, date: string): number {
  return db.sessions.filter((s) => s.date === date).reduce((a, s) => a + s.minutes, 0);
}

export interface PlanInput {
  examDate: string;
  targetBand: number;
  currentBand: number;
  weeklyMinutes: number;
  studyDays: number[];
}

const BLOCKS: { skill: ISkill; label: string }[] = [
  { skill: 'reading', label: 'Reading practice' },
  { skill: 'listening', label: 'Listening practice' },
  { skill: 'writing', label: 'Writing task' },
  { skill: 'speaking', label: 'Speaking practice' },
];

/**
 * Each skill is weighted by its gap to the target band: the larger the gap, the
 * more time it receives. Blocks are then packed into the remaining study days
 * before the exam date.
 */
export function buildPlan(input: PlanInput, db: DBShape): Task[] {
  const { examDate, targetBand, currentBand, weeklyMinutes, studyDays } = input;
  const bands = estimatedBands(db);
  const priority: Record<ISkill, number> = { listening: 1, reading: 1, writing: 1, speaking: 1 };
  (Object.keys(priority) as ISkill[]).forEach((s) => {
    const b = bands[s] ?? currentBand;
    priority[s] = Math.max(0.4, Math.min(2.5, 1 + (targetBand - b) * 0.9));
  });
  if (db.mistakes.filter((m) => !m.resolved && m.skill === 'writing').length > 2) priority.writing += 0.5;
  if (db.speaking.length === 0) priority.speaking += 0.6;

  const days = daysBetween(todayISO(), examDate);
  const weeks = Math.max(1, Math.min(24, days > 0 ? Math.ceil(days / 7) : 1));
  const perDay = Math.max(20, Math.round(Math.max(90, weeklyMinutes) / Math.max(1, studyDays.length)));
  const tasks: Task[] = [];
  const weekday = new Date().getDay();
  const ordered = (Object.keys(priority) as ISkill[]).sort((a, b) => priority[b] - priority[a]);

  for (let w = 0; w < weeks; w++) {
    studyDays.forEach((day, k) => {
      const offset = w * 7 + ((day - weekday + 7) % 7);
      const dueDate = addDaysISO(todayISO(), Math.max(0, offset));
      const skill = ordered[k % ordered.length];
      const block = BLOCKS.find((b) => b.skill === skill) ?? BLOCKS[0];
      tasks.push({
        id: uid(), userId: '', title: `${block.label} — target Band ${targetBand}`, skill,
        minutes: Math.min(60, perDay), dueDate, done: false, priority: skill === ordered[0] ? 1 : 2,
        source: 'plan', createdAt: Date.now(),
        note: `Weighted for your estimated band ${currentBand} against a target of ${targetBand}.`,
      });
      if (perDay >= 45) {
        tasks.push({
          id: uid(), userId: '', title: 'Vocabulary review', skill: 'reading', minutes: 15,
          dueDate, done: false, priority: 3, source: 'plan', createdAt: Date.now(),
          note: 'Spaced-repetition queue for your due words.',
        });
      }
    });
    if (w % 2 === 1) {
      tasks.push({
        id: uid(), userId: '', title: `Week ${w + 1} checkpoint test`, skill: 'reading', minutes: 45,
        dueDate: addDaysISO(todayISO(), w * 7 + 2), done: false, priority: 1, source: 'ai', createdAt: Date.now(),
        note: 'Timed mixed practice to measure progress against your target band.',
      });
    }
  }
  return tasks;
}

/**
 * Re-plans after a fall-off: instead of stacking every missed task on tomorrow,
 * overdue tasks are dropped and new high-impact sessions are scheduled inside
 * the remaining days, weighted toward the current limiter.
 */
export function replan(db: DBShape, profile: Profile | null): { created: Task[]; dropped: number } {
  const today = todayISO();
  const overdue = db.tasks.filter((t) => !t.done && t.dueDate < today);
  if (!overdue.length) return { created: [], dropped: 0 };
  const examDate = profile?.examDate ?? addDaysISO(today, 30);
  const daysLeft = Math.max(1, daysBetween(today, examDate));
  const limiter: ISkill = readiness(db, profile).limiter ?? 'reading';
  const perDay = Math.max(15, Math.round((profile?.dailyGoalMinutes ?? 30) * 0.8));
  const created: Task[] = [];

  for (let i = 0; i < Math.min(daysLeft, 5); i++) {
    const skill = i === 0 ? limiter : (['reading', 'listening', 'speaking', 'writing'] as ISkill[])[i % 4];
    created.push({
      id: uid(), userId: '', title: `Recovery session — ${SKILL_LABEL[skill]}`, skill,
      minutes: perDay, dueDate: addDaysISO(today, i), done: false, priority: 1, source: 'ai',
      createdAt: Date.now(),
      note: 'Created by your AI coach after missed sessions — high-impact work only.',
    });
  }
  return { created, dropped: overdue.length };
}

export interface NextAction {
  title: string;
  reason: string;
  minutes: number;
  skill: ISkill;
  href: string;
  cta: string;
  confidence: 'low' | 'medium' | 'high';
}

const SKILL_ROUTE: Record<ISkill, string> = {
  listening: '/listening', reading: '/reading', writing: '/writing', speaking: '/speaking',
};

/** Picks the single highest-impact activity based on the learner's real data. */
export function nextAction(db: DBShape, profile: Profile | null, availableMinutes = 45): NextAction {
  const r = readiness(db, profile);
  const today = todayISO();
  const dueTasks = db.tasks.filter((t) => !t.done && t.dueDate <= today).sort((a, b) => a.priority - b.priority);
  const weakTypes = weakestQuestionTypes(db, 1)[0];
  const repeatedMistakes = db.mistakes.filter((m) => !m.resolved && m.repetitions >= 2)
    .sort((a, b) => b.repetitions - a.repetitions)[0];
  const dueVocab = db.vocab.filter((v) => v.dueAt <= Date.now() && v.state !== 'mastered');
  const daysLeft = profile?.examDate ? daysBetween(today, profile.examDate) : null;

  if (!db.results.length) {
    return {
      title: 'Take a diagnostic test to unlock your study plan',
      reason: 'You have no test results yet, so your estimated band and weak skills are unknown. A short mixed test gives the AI enough data to build a personalised plan.',
      minutes: 20, skill: 'reading', href: '/test-generator', cta: 'Generate a diagnostic test', confidence: 'high',
    };
  }
  if (repeatedMistakes) {
    return {
      title: `Drill your repeated mistake: ${repeatedMistakes.title}`,
      reason: `You have made this mistake ${repeatedMistakes.repetitions} times. Repeated errors cost more marks than new topics, so a focused drill is the highest-value work right now.`,
      minutes: 15, skill: repeatedMistakes.skill, href: '/mistakes?drill=1', cta: 'Practice my mistakes', confidence: 'high',
    };
  }
  if (r.limiter && (r.limiterBand ?? 9) <= (profile?.targetBand ?? 7) - 0.5) {
    const gap = round1((profile?.targetBand ?? 7) - (r.limiterBand ?? 0));
    return {
      title: `Work on ${SKILL_LABEL[r.limiter]} — your current limiter`,
      reason: `Your ${SKILL_LABEL[r.limiter].toLowerCase()} estimate is ${r.limiterBand}, about ${gap} band below your target. This is the skill holding your overall score back.`,
      minutes: availableMinutes, skill: r.limiter, href: SKILL_ROUTE[r.limiter],
      cta: `Start ${SKILL_LABEL[r.limiter].toLowerCase()} practice`, confidence: 'high',
    };
  }
  if (weakTypes) {
    return {
      title: `Targeted practice: ${weakTypes.type.replace(/_/g, ' ')}`,
      reason: `You score ${weakTypes.percentage}% on this question type versus your stronger types. Focused work on one type usually transfers straight into the real test.`,
      minutes: 25, skill: weakTypes.skill, href: '/test-generator', cta: 'Generate targeted test', confidence: 'medium',
    };
  }
  if (dueVocab.length >= 10) {
    return {
      title: `Clear ${dueVocab.length} vocabulary reviews`,
      reason: 'Spaced repetition works best on schedule. These words are due now and will be forgotten if pushed further back.',
      minutes: 15, skill: 'reading', href: '/vocabulary', cta: 'Start review session', confidence: 'medium',
    };
  }
  if (dueTasks.length) {
    return {
      title: dueTasks[0].title,
      reason: `${dueTasks.length} scheduled task${dueTasks.length > 1 ? 's are' : ' is'} due today. Finishing your plan keeps your streak and weekly goal on track.`,
      minutes: dueTasks[0].minutes, skill: dueTasks[0].skill, href: '/tasks', cta: 'Open my tasks', confidence: 'medium',
    };
  }
  if (daysLeft !== null && daysLeft <= 14) {
    return {
      title: 'Sit a full mock exam',
      reason: `Your exam is in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. A full mock now trains your time management under real conditions.`,
      minutes: 60, skill: 'reading', href: '/mocks', cta: 'Start a mock exam', confidence: 'high',
    };
  }
  return {
    title: 'Mixed timed practice',
    reason: 'Your skills are balanced, so broad timed practice under exam conditions is the best use of the next session.',
    minutes: availableMinutes, skill: 'reading', href: '/test-generator', cta: 'Generate a mixed test', confidence: 'low',
  };
}

type Alert = Omit<Recommendation, 'id' | 'userId' | 'createdAt' | 'read'>;

export function buildAlerts(db: DBShape, profile: Profile | null): Alert[] {
  const out: Alert[] = [];
  const today = todayISO();

  const lastSpeaking = db.speaking.length ? Math.max(...db.speaking.map((s) => s.createdAt)) : 0;
  const speakingGap = lastSpeaking ? daysBetween(todayISO(new Date(lastSpeaking)), today) : null;
  if (speakingGap === null) {
    out.push({ kind: 'alert', title: 'You have never practised Speaking', body: 'Speaking is the skill most improved by volume. One 10-minute session today is enough to start a habit.', actionLabel: 'Start speaking', actionHref: '/speaking', severity: 'warn' });
  } else if (speakingGap >= 4) {
    out.push({ kind: 'alert', title: `No Speaking practice for ${speakingGap} days`, body: 'Speaking decays fastest of the four skills. A 10-minute Part 1 session restores your rhythm immediately.', actionLabel: 'Practise now', actionHref: '/speaking', severity: 'warn' });
  }

  const weak = weakestQuestionTypes(db, 1)[0];
  if (weak && weak.percentage < 60 && weak.attempts >= 3) {
    out.push({ kind: 'alert', title: `You repeatedly miss ${weak.type.replace(/_/g, ' ')} questions`, body: `Your accuracy here is ${weak.percentage}% over ${weak.attempts} questions. Targeted practice on this single type is the cheapest available gain.`, actionLabel: 'Practise this type', actionHref: '/test-generator', severity: 'warn' });
  }

  const essays = [...db.essays].sort((a, b) => a.createdAt - b.createdAt);
  if (essays.length >= 2) {
    const gap = (essays[essays.length - 1].createdAt - essays[essays.length - 2].createdAt) / 86400000;
    if (gap > 14) {
      out.push({ kind: 'alert', title: 'Writing has not improved for 2+ weeks', body: 'Writing only improves when it is practised. Writing Lab analyses an essay in seconds and shows exactly what changed.', actionLabel: 'Open Writing Lab', actionHref: '/writing', severity: 'warn' });
    }
  }

  const daysLeft = profile?.examDate ? daysBetween(today, profile.examDate) : null;
  if (daysLeft !== null && daysLeft > 0 && daysLeft <= 30) {
    out.push({ kind: 'alert', title: `${daysLeft} days until your exam`, body: 'At this stage, switch to timed practice and full mock exams — building new knowledge matters less than performing under exam pressure.', actionLabel: 'Book a mock exam', actionHref: '/mocks', severity: 'info' });
  }

  const weekMinutes = db.sessions.filter((s) => { const d = daysBetween(s.date, today); return d >= 0 && d < 7; }).reduce((a, s) => a + s.minutes, 0);
  const goal = profile?.weeklyGoalMinutes ?? 300;
  if (weekMinutes >= goal) {
    out.push({ kind: 'alert', title: 'You are ahead of your weekly goal', body: `${weekMinutes} of ${goal} planned minutes completed. This is the week to attempt a harder difficulty or a full mock exam.`, actionLabel: 'Take a mock exam', actionHref: '/mocks', severity: 'good' });
  } else if (weekMinutes === 0) {
    out.push({ kind: 'alert', title: 'No study time logged this week', body: `Your weekly goal is ${goal} minutes. Even 20 minutes today keeps your streak alive and your plan on track.`, actionLabel: "See today's plan", actionHref: '/planner', severity: 'info' });
  }

  const stale = db.mistakes.filter((m) => !m.resolved && Date.now() - m.lastMistakeAt > 7 * 86400000);
  if (stale.length >= 3) {
    out.push({ kind: 'alert', title: `${stale.length} mistakes have not been revisited`, body: 'Mistakes fade from memory quickly. A 10-minute mistake drill is the most efficient review available.', actionLabel: 'Practice my mistakes', actionHref: '/mistakes?drill=1', severity: 'info' });
  }
  return out;
}

/* --------------------------- adaptive difficulty --------------------------- */

export function suggestDifficulty(db: DBShape, skill: ISkill, chosen?: 'easy' | 'medium' | 'hard'): 'easy' | 'medium' | 'hard' {
  if (chosen) return chosen;
  const rs = db.results.filter((r) => r.skill === skill).slice(-3);
  if (!rs.length) return 'medium';
  const avg = rs.reduce((a, r) => a + r.percentage, 0) / rs.length;
  return avg >= 85 ? 'hard' : avg >= 65 ? 'medium' : 'easy';
}

export function speakingCueFor(db: DBShape) {
  const last = db.speaking[db.speaking.length - 1];
  return examinerQuestion(1, db.speaking.length, last?.topic).question;
}