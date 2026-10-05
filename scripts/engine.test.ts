/* Smoke test for the learning engine: generation, analysis, planning, SRS, coach. */
import { generateFromPassage, extractVocabulary, extractGrammarPoints, summarize } from '../src/lib/ai/generate';
import { analyseEssay } from '../src/lib/ai/essay';
import { analyseSpeaking, examinerQuestion } from '../src/lib/ai/speaking';
import { coachReply } from '../src/lib/ai/coach';
import { buildPlan, readiness, nextAction, replan, skillStats, weakestQuestionTypes, currentStreak } from '../src/lib/brain';
import { reviewVocab } from '../src/lib/srs';
import { emptyDB } from '../src/lib/db';
import { isCorrect, skillBand, rawToBand } from '../src/lib/utils';
import { todayISO } from '../src/lib/utils';
import type { DBShape } from '../src/lib/db';
import type { Profile, VocabItem } from '../src/lib/types';

let pass = 0; let fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}`); }
};

export const PASSAGE = `Urban transport has changed dramatically over the past fifty years. In many cities, private cars now dominate the streets, which causes severe congestion and air pollution.

However, cities that invested in reliable public transport have seen measurable benefits. Commuters who use metro systems report significantly lower travel times, and air quality improves dramatically when the number of vehicles on the road decreases.

Critics argue that infrastructure projects are expensive and take years to complete. Nevertheless, the long-term savings in health and productivity usually exceed the initial cost. Moreover, public transport encourages more compact urban development, which reduces the need for car journeys entirely.`;

const profile: Profile = {
  displayName: 'Test Learner', targetBand: 7, estimatedBand: 5.5, examDate: '2030-01-10',
  dailyGoalMinutes: 45, weeklyGoalMinutes: 300, studyDays: [1, 2, 3, 4, 5], onboarded: true, createdAt: Date.now(),
};

const db: DBShape = { ...emptyDB(), profile };

const PASSAGE_593 = 'Urban transport has changed dramatically over the past fifty years. In many cities, private cars now dominate the streets, which causes severe congestion and air pollution. However, cities that invested in reliable public transport have seen measurable benefits. Commuters who use metro systems report significantly lower travel times, and air quality improves dramatically when the number of vehicles decreases. Critics argue that infrastructure projects are expensive and take years to complete. Nevertheless, the long-term savings in health and productivity usually exceed the initial cost.';
check('passage fixture is the same length the UI stored', PASSAGE_593.length === 593);
for (const types of [['multiple_choice', 'sentence_completion'], ['multiple_choice'], ['sentence_completion'], ['multiple_choice', 'sentence_completion', 'short_answer']] as const) {
  const out = generateFromPassage({ skill: 'reading', types: types as never, difficulty: 'medium', count: 10, passage: PASSAGE_593 });
  console.log(`    types=${types.join('+')} -> ${out.length} questions`);
  check(`generator produces questions for ${types.join('+')}`, out.length > 0);
}

console.log('\nGrounded question generation');
const qs = generateFromPassage({ skill: 'reading', types: ['multiple_choice', 'sentence_completion', 'short_answer', 'true_false_not_given'], difficulty: 'medium', count: 8, passage: PASSAGE, materialId: 'm1' });
check('produces questions up to the requested count', qs.length > 0 && qs.length <= 8);
check('every question carries source evidence', qs.every((q) => q.source.evidence.length > 20));
check('every question has an explanation', qs.every((q) => q.explanation.length > 10));
check('extracted answers really occur in the passage', qs
  .filter((q) => q.type !== 'multiple_choice' && q.type !== 'true_false_not_given' && q.type !== 'true_false_not_given')
  .every((q) => PASSAGE.toLowerCase().includes(q.answer.toLowerCase().split(' ')[0])));
check('multiple choice options include the answer', qs.filter((q) => q.options).every((q) => (q.options ?? []).includes(q.answer)));
check('question ids are unique', new Set(qs.map((q) => q.id)).size === qs.length);
check('a too-short source yields nothing (never invents)', generateFromPassage({ skill: 'reading', types: ['short_answer'], difficulty: 'easy', count: 5, passage: 'Hi there.' }).length === 0);

console.log('\nAnswer checking');
check('accepts an exact match', isCorrect('commuters', 'commuters'));
check('ignores case and punctuation', isCorrect(' Commuters. ', 'commuters'));
check('accepts declared alternatives', isCorrect('reduced', 'lowered', ['reduced']));
check('rejects a wrong answer', !isCorrect('bicycle', 'commuters'));

console.log('\nBand maths');
check('full marks maps to a high band', rawToBand(40, 40) >= 8.5);
check('zero marks maps to zero', rawToBand(0, 40) === 0);
check('80 percent maps above band 7', skillBand(80) >= 7);

console.log('\nEssay analysis');
const essay = `Universities should offer practical courses. I believe this is a significant change. However, there are many advantages of a broad education. Students who study a range of subjects develop critical thinking. They can discuss about difficult problems with confidence.

Universities are changing rapidly these days. Many students now prefer technical courses. This is because the labour market demands specific skills. Nevertheless, a broad education still has value. Employers recognise the value of adaptable graduates.

In conclusion, universities should offer both practical and broad courses. This balance serves society best.`;
const analysis = analyseEssay(essay);
check('scores all four IELTS criteria', analysis.criteria.length === 4);
check('detects the verb-pattern mistake', analysis.issues.some((i) => /discuss/i.test(i.problem)));
check('flags the single-block structure', analysis.issues.some((i) => i.kind === 'structure'));
check('gives before/after examples', analysis.issues.every((i) => typeof i.better === 'string'));
check('carries an estimate disclaimer', /not an official/i.test(analysis.disclaimer));
check('empty text does not crash', analyseEssay('').criteria.length === 4);

console.log('\nGrammar + vocabulary extraction');
check('finds grammar points', extractGrammarPoints(essay).points.length > 0);
check('extracts vocabulary with definitions', extractVocabulary(PASSAGE, 10).every((v) => v.word && v.definition));
check('summarises only from the passage', summarize(PASSAGE, 3).every((s) => PASSAGE.includes(s.slice(0, 25))));

console.log('\nSpeaking engine');
const sp = analyseSpeaking({ text: 'I live in a small city um it is very nice and I like it a lot um the people are friendly and there is a park near my house which is good.', durationMs: 30000, part: 1 });
check('scores fluency, lexical and grammar', sp.scores.fluency > 0 && sp.scores.lexical > 0 && sp.scores.grammar > 0);
check('counts filler words', sp.fillers >= 2);
check('gives actionable recommendations', sp.recommendations.length > 0);
check('produces Part 1, 2 and 3 questions', Boolean(examinerQuestion(1, 0).question) && Boolean(examinerQuestion(2, 0).question) && Boolean(examinerQuestion(3, 0).question));

console.log('\nPlanner + adaptive engine');
const plan = buildPlan({ examDate: '2030-01-10', targetBand: 7, currentBand: 5.5, weeklyMinutes: 300, studyDays: profile.studyDays }, db);
check('generates a full plan', plan.length > 10);
check('sessions fall on the chosen study days', plan.filter((t) => !t.title.includes('checkpoint')).every((t) => profile.studyDays.includes(new Date(`${t.dueDate}T00:00:00`).getDay())));
check('the weakest skill receives the most time', plan.filter((t) => t.skill === 'speaking').length >= plan.filter((t) => t.skill === 'listening').length);
const overdueDb: DBShape = { ...db, tasks: [{ id: 'x', userId: 'local-user', title: 'old', skill: 'reading' as const, minutes: 30, dueDate: '2020-01-01', done: false, priority: 1 as const, source: 'plan' as const, createdAt: 0 }] };
const rp = replan(overdueDb, profile);
check('re-plan drops overdue work rather than stacking it', rp.dropped === 1 && rp.created.length > 0);
check('recovery sessions are priority 1 and near-term', rp.created.every((t) => t.priority === 1 && t.dueDate >= todayISO()));

console.log('\nAnalytics + recommendations');
const results = [
  { id: 'r1', userId: 'u', testId: 't1', testTitle: 'Reading 1', skill: 'reading' as const, difficulty: 'easy' as const, score: 6, total: 10, percentage: 60, band: 5.5, answers: Array.from({ length: 10 }, (_, i) => ({ questionId: `q${i}`, type: (i < 4 ? 'matching_headings' : 'multiple_choice') as 'matching_headings' | 'multiple_choice', given: '', correct: i >= 4, timeSpentMs: 0 })), durationMs: 300000, createdAt: Date.now() - 86400000, bySkillType: {} },
  { id: 'r2', userId: 'u', testId: 't2', testTitle: 'Reading 2', skill: 'reading' as const, difficulty: 'medium' as const, score: 9, total: 10, percentage: 90, band: 8, answers: [], durationMs: 300000, createdAt: Date.now(), bySkillType: {} },
];
const dbWithResults: DBShape = { ...db, results, tasks: plan };
check('produces a skill map', skillStats(dbWithResults).some((s) => s.type === 'overall'));
check('detects matching headings as a weak type', weakestQuestionTypes(dbWithResults, 3).some((w) => w.type === 'matching_headings'));
const r = readiness(dbWithResults, profile);
check('readiness is a percentage', r.percent >= 0 && r.percent <= 100);
check('readiness explains the limiter', r.explanation.length > 20);
const action = nextAction(dbWithResults, profile, 30);
check('recommends one action with a reason', Boolean(action.title && action.reason));
check('routes the recommendation to a real page', ['/reading', '/writing', '/speaking', '/listening', '/mistakes', '/vocabulary', '/tasks', '/test-generator', '/mocks'].includes(action.href));
check('counts a studied day as a streak', currentStreak({ ...dbWithResults, sessions: [{ id: 's', userId: 'u', date: todayISO(), minutes: 30, skill: 'reading', createdAt: Date.now() }] }) === 1);

console.log('\nAI coach grounding');
check('answers "why am I not improving"', /limiter|weakest|test/i.test(coachReply('Why am I not improving?', dbWithResults).content));
check('uses the real target band', coachReply('How can I reach Band 7?', dbWithResults).content.includes('7'));
check('produces speaking questions', /Part 1/.test(coachReply('Give me Speaking questions', db).content));
check('explains grammar with teaching content', coachReply('Explain this grammar rule about articles', db).content.includes('**'));
check('guides a brand-new learner', coachReply('What should I study today?', emptyDB()).content.length > 20);

console.log('\nSpaced repetition');
const base: VocabItem = { id: 'w', userId: 'u', word: 'mitigate', definition: '', example: '', synonyms: [], antonyms: [], topic: 't', difficulty: 'medium', state: 'new', ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt: 0, createdAt: 0 };
const graded = reviewVocab(base, 5);
check('a good answer schedules a future review', graded.dueAt > Date.now() && graded.intervalDays >= 1);
const failed = reviewVocab(graded, 1);
check('a failed answer shortens the interval', failed.intervalDays === 1 && failed.state === 'weak');
check('repeated success reaches known or mastered', ['known', 'mastered'].includes(reviewVocab(reviewVocab(graded, 5), 5).state));

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);