import type { Achievement, ISkill, VocabItem } from './types';
import { todayISO } from './utils';
import type { DBShape } from './db';
import { currentOverall, currentStreak, SKILL_LABEL } from './brain';

/** SM-2 style spaced repetition. `grade` is 0 (again) … 5 (easy). */
export function reviewVocab(item: VocabItem, grade: number): VocabItem {
  const g = Math.max(0, Math.min(5, grade));
  let { ease, intervalDays, reps, lapses, state } = item;
  if (g < 3) {
    lapses += 1; reps = 0; intervalDays = 1; ease = Math.max(1.3, ease - 0.2);
    state = 'weak';
  } else {
    reps += 1;
    ease = Math.min(2.8, ease + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02)));
    intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(intervalDays * ease);
    state = reps >= 5 && intervalDays >= 21 ? 'mastered' : intervalDays >= 7 ? 'known' : 'learning';
  }
  return { ...item, ease, intervalDays, reps, lapses, state, dueAt: Date.now() + intervalDays * 86400000 };
}

export function dueVocab(db: DBShape): VocabItem[] {
  const now = Date.now();
  return db.vocab.filter((v) => v.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
}

const DEFS: { code: string; title: string; description: string; icon: string; target: number; value: (db: DBShape) => number }[] = [
  { code: 'first-session', title: 'First Study Session', description: 'Complete your first study task.', icon: 'Sparkles', target: 1, value: (db) => db.tasks.filter((t) => t.done).length },
  { code: 'streak-7', title: '7 Day Streak', description: 'Study seven days in a row.', icon: 'Flame', target: 7, value: (db) => currentStreak(db) },
  { code: 'streak-30', title: '30 Day Streak', description: 'Study thirty days in a row.', icon: 'Flame', target: 30, value: (db) => currentStreak(db) },
  { code: 'words-100', title: '100 Words', description: 'Add 100 words to your vocabulary.', icon: 'BookOpen', target: 100, value: (db) => db.vocab.length },
  { code: 'words-500', title: '500 Words', description: 'Add 500 words to your vocabulary.', icon: 'Library', target: 500, value: (db) => db.vocab.length },
  { code: 'words-1000', title: '1000 Words', description: 'Add 1000 words to your vocabulary.', icon: 'Library', target: 1000, value: (db) => db.vocab.length },
  { code: 'first-mock', title: 'First Mock Exam', description: 'Complete a full mock exam.', icon: 'ClipboardCheck', target: 1, value: (db) => db.mocks.filter((m) => m.status === 'completed').length },
  { code: 'essays-10', title: '10 Essays', description: 'Write and analyse ten essays.', icon: 'PenLine', target: 10, value: (db) => db.essays.length },
  { code: 'speaking-20', title: '20 Speaking Sessions', description: 'Complete twenty speaking sessions.', icon: 'Mic', target: 20, value: (db) => db.speaking.length },
  { code: 'band-7', title: 'Band 7', description: 'Reach an estimated overall Band 7.', icon: 'Award', target: 7, value: (db) => Math.round((currentOverall(db) ?? 0) * 10) / 10 },
  { code: 'target-band', title: 'Target Band Reached', description: 'Reach your target band estimate.', icon: 'Trophy', target: 7, value: (db) => Math.round((currentOverall(db) ?? 0) * 10) / 10 },
];

/** Recomputes achievement progress; returns newly unlocked achievements. */
export function syncAchievements(db: DBShape): { achievements: Achievement[]; newlyUnlocked: Achievement[] } {
  const target = db.profile?.targetBand ?? 7;
  const current = currentOverall(db) ?? 0;
  const achievements: Achievement[] = DEFS.map((d) => {
    const prev = db.achievements.find((a) => a.code === d.code);
    const t = d.code === 'target-band' ? target : d.target;
    const raw = d.value(db);
    const isBandAch = d.code === 'band-7' || d.code === 'target-band';
    return {
      id: prev?.id ?? d.code,
      code: d.code,
      title: d.title,
      description: d.description,
      icon: d.icon,
      target: t,
      progress: isBandAch ? Math.round(Math.min(current, t) * 10) / 10 : Math.min(t, raw),
      unlockedAt: raw >= t ? prev?.unlockedAt ?? Date.now() : undefined,
    };
  });
  const previously = new Set(db.achievements.filter((a) => a.unlockedAt).map((a) => a.code));
  return { achievements, newlyUnlocked: achievements.filter((a) => a.unlockedAt && !previously.has(a.code)) };
}

export const SKILLS: ISkill[] = ['listening', 'reading', 'writing', 'speaking'];
export { SKILL_LABEL, todayISO };