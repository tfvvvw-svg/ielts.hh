import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, firebaseEnabled } from '../lib/firebase';
import { getDB, loadFromCloud, mergeDB, resetLocal, setDB, subscribe, type DBShape } from '../lib/db';
import { buildAlerts, buildPlan, currentStreak, readiness } from '../lib/brain';
import { syncAchievements, reviewVocab } from '../lib/srs';
import type {
  Achievement, CoachMessage, Essay, ISkill, Material, MaterialResource, Mistake,
  MockExam, NewWord, Profile, SpeakingSession, Task, Test, TestResult, VocabItem,
} from '../lib/types';
import { uid, todayISO } from '../lib/utils';
import { analyseEssay } from '../lib/ai/essay';
import { coachReply } from '../lib/ai/coach';

interface AppValue {
  db: DBShape;
  userId: string;
  ready: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  saveProfile: (p: Partial<Profile>) => void;
  addTask: (t: Partial<Task> & { title: string; skill: ISkill }) => Task;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  regeneratePlan: () => void;
  createTest: (t: Omit<Test, 'id' | 'userId' | 'createdAt'>) => Test;
  saveResult: (r: TestResult) => void;
  getTest: (id: string) => Test | undefined;
  deleteTest: (id: string) => void;
  recordMistake: (m: Omit<Mistake, 'id' | 'userId' | 'repetitions' | 'lastMistakeAt' | 'resolved' | 'drillCount'>) => void;
  resolveMistake: (id: string) => void;
  addWords: (list: NewWord[]) => number;
  gradeWord: (id: string, grade: number) => void;
  deleteWord: (id: string) => void;
  addMaterial: (m: Omit<Material, 'id' | 'userId' | 'createdAt'>) => Material;
  deleteMaterial: (id: string) => void;
  addResource: (r: Omit<MaterialResource, 'id' | 'createdAt'>) => void;
  saveEssay: (e: { task: string; prompt: string; text: string }) => Essay;
  deleteEssay: (id: string) => void;
  saveSpeaking: (s: Omit<SpeakingSession, 'id' | 'userId' | 'createdAt'>) => SpeakingSession;
  createMock: () => MockExam;
  updateMock: (id: string, patch: Partial<MockExam>) => void;
  logStudy: (minutes: number, skill: ISkill | 'mixed') => void;
  sendMessage: (text: string) => Promise<void>;
  coachPending: boolean;
  refreshAlerts: () => void;
  markAlertRead: (id: string) => void;
  achievements: Achievement[];
  newAchievements: Achievement[];
  clearNewAchievements: () => void;
  streak: number;
  weeklyMinutes: number;
  dailyMinutes: number;
  exportData: () => string;
  resetEverything: () => void;
  firebaseOn: boolean;
}

const Ctx = createContext<AppValue | null>(null);
const THEME_KEY = 'bandit:theme';

function defaultProfile(displayName: string): Profile {
  return {
    displayName,
    targetBand: 7,
    estimatedBand: 5.5,
    examDate: null,
    dailyGoalMinutes: 45,
    weeklyGoalMinutes: 300,
    studyDays: [1, 2, 3, 4, 5, 6, 0],
    onboarded: false,
    createdAt: Date.now(),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setLocal] = useState<DBShape>(() => getDB());
  const [ready, setReady] = useState(false);
  const [coachPending, setCoachPending] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') ?? 'dark');
  const userId = 'local-user';

  useEffect(() => subscribe(setLocal), []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const firebaseAuth = auth;
      if (firebaseEnabled && firebaseAuth) {
        try {
          const u = firebaseAuth.currentUser ?? await new Promise<User | null>((resolve) => {
            const t = setTimeout(() => resolve(null), 4000);
            return onAuthStateChanged(firebaseAuth, (user) => { clearTimeout(t); resolve(user); });
          });
          if (u) {
            const cloud = await loadFromCloud(u.uid);
            // Merge rather than replace: a stale cloud copy must never roll back
            // work the learner has already done on this device.
            if (cloud && !cancelled) setDB(mergeDB(getDB(), cloud));
            else if (!getDB().profile && !cancelled) {
              setDB({ ...getDB(), profile: defaultProfile(u.displayName ?? 'Learner') });
            }
          }
        } catch (err) {
          console.warn('[bandit] cloud load failed, continuing locally', err);
        }
      }
      if (!getDB().profile && !cancelled) setDB({ ...getDB(), profile: defaultProfile('Learner') });
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

const keepRecent = (r: { kind: string; createdAt: number }) => r.kind !== 'alert' || r.createdAt > Date.now() - 6 * 3600 * 1000;

  /** Applies a mutation, then recomputes alerts, band estimate and achievements. */
  const withSync = useCallback((fn: (d: DBShape) => DBShape) => {
    const next = fn(getDB());
    const alerts = buildAlerts(next, next.profile);
    const existing = new Set(next.recommendations.filter((r) => r.kind === 'alert').map((r) => r.title));
    const fresh = alerts
      .filter((a) => !existing.has(a.title))
      .map((a) => ({ ...a, id: uid(), userId, createdAt: Date.now(), read: false }));
    const withAlerts: DBShape = {
      ...next,
      recommendations: [...fresh, ...next.recommendations.filter(keepRecent)].slice(0, 20),
      profile: next.profile
        ? { ...next.profile, estimatedBand: readiness(next, next.profile).current ?? next.profile.estimatedBand, updatedAt: Date.now() }
        : null,
    };
    const { achievements, newlyUnlocked } = syncAchievements(withAlerts);
    setDB({ ...withAlerts, achievements });
    if (newlyUnlocked.length) setNewAchievements((prev) => [...newlyUnlocked, ...prev]);
    return { ...withAlerts, achievements };
  }, []);

  const saveProfile = useCallback((p: Partial<Profile>) => {
    withSync((d) => ({ ...d, profile: { ...(d.profile ?? defaultProfile('Learner')), ...p } }));
  }, [withSync]);

  const addTask = useCallback((t: Partial<Task> & { title: string; skill: ISkill }): Task => {
    const task: Task = {
      id: uid(), userId, title: t.title, skill: t.skill, minutes: t.minutes ?? 25,
      dueDate: t.dueDate ?? todayISO(), done: false, priority: t.priority ?? 2,
      source: t.source ?? 'user', note: t.note, refId: t.refId, createdAt: Date.now(),
    };
    withSync((d) => ({ ...d, tasks: [...d.tasks, task] }));
    return task;
  }, [withSync]);

  const toggleTask = useCallback((id: string) => {
    withSync((d) => {
      const tasks = d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined } : t));
      const target = d.tasks.find((t) => t.id === id);
      const sessions = target && !target.done
        ? [...d.sessions, { id: uid(), userId, date: todayISO(), minutes: target.minutes, skill: target.skill, createdAt: Date.now() }]
        : d.sessions;
      return { ...d, tasks, sessions };
    });
  }, [withSync]);

  const deleteTask = useCallback((id: string) => {
    withSync((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
  }, [withSync]);

  const regeneratePlan = useCallback(() => {
    withSync((d) => {
      const p = d.profile ?? defaultProfile('Learner');
      const examDate = p.examDate ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const generated = buildPlan({
        examDate, targetBand: p.targetBand, currentBand: p.estimatedBand,
        weeklyMinutes: p.weeklyGoalMinutes, studyDays: p.studyDays,
      }, d).map((t) => ({ ...t, userId }));
      return { ...d, tasks: [...d.tasks.filter((t) => t.source !== 'plan'), ...generated] };
    });
  }, [withSync]);

const createTest = useCallback((t: Omit<Test, 'id' | 'userId' | 'createdAt'>): Test => {
    const test: Test = { ...t, id: uid(), userId, createdAt: Date.now() };
    withSync((d) => ({ ...d, tests: [test, ...d.tests] }));
    return test;
  }, [withSync]);

  const saveResult = useCallback((r: TestResult) => {
    withSync((d) => ({ ...d, results: [r, ...d.results] }));
  }, [withSync]);

  const getTest = useCallback((id: string) => getDB().tests.find((t) => t.id === id), []);
  const deleteTest = useCallback((id: string) => {
    withSync((d) => ({ ...d, tests: d.tests.filter((t) => t.id !== id) }));
  }, [withSync]);

  /** Logs a wrong answer; repeats of the same mistake increment the counter. */
  const recordMistake = useCallback((m: Omit<Mistake, 'id' | 'userId' | 'repetitions' | 'lastMistakeAt' | 'resolved' | 'drillCount'>) => {
    withSync((d) => {
      const key = `${m.kind}|${m.title}|${m.given}`;
      const existing = d.mistakes.find((x) => `${x.kind}|${x.title}|${x.given}` === key);
      const mistakes = existing
        ? d.mistakes.map((x) => (x.id === existing.id
          ? { ...x, repetitions: x.repetitions + 1, lastMistakeAt: Date.now(), resolved: false }
          : x))
        : [...d.mistakes, { ...m, id: uid(), userId, repetitions: 1, lastMistakeAt: Date.now(), resolved: false, drillCount: 0 }];
      return { ...d, mistakes };
    });
  }, [withSync]);

  const resolveMistake = useCallback((id: string) => {
    withSync((d) => ({ ...d, mistakes: d.mistakes.map((m) => (m.id === id ? { ...m, resolved: true } : m)) }));
  }, [withSync]);

  const addWords = useCallback((list: NewWord[]) => {
    let added = 0;
    withSync((d) => {
      const existing = new Set(d.vocab.map((v) => v.word.toLowerCase()));
      const fresh = list.filter((w) => !existing.has(w.word.toLowerCase()))
        .map((w) => ({
          ...w, id: uid(), userId, state: 'new' as const, ease: 2.5, intervalDays: 0,
          reps: 0, lapses: 0, dueAt: Date.now(), createdAt: Date.now(),
        } satisfies VocabItem));
      added = fresh.length;
      return { ...d, vocab: [...d.vocab, ...fresh] };
    });
    return added;
  }, [withSync]);

  const gradeWord = useCallback((id: string, grade: number) => {
    withSync((d) => ({ ...d, vocab: d.vocab.map((v) => (v.id === id ? reviewVocab(v, grade) : v)) }));
  }, [withSync]);

  const deleteWord = useCallback((id: string) => {
    withSync((d) => ({ ...d, vocab: d.vocab.filter((v) => v.id !== id) }));
  }, [withSync]);

  const addMaterial = useCallback((m: Omit<Material, 'id' | 'userId' | 'createdAt'>): Material => {
    const material: Material = { ...m, id: uid(), userId, createdAt: Date.now() };
    withSync((d) => ({ ...d, materials: [material, ...d.materials] }));
    return material;
  }, [withSync]);

  const deleteMaterial = useCallback((id: string) => {
    withSync((d) => ({
      ...d,
      materials: d.materials.filter((m) => m.id !== id),
      resources: d.resources.filter((r) => r.materialId !== id),
      tests: d.tests.filter((t) => t.materialId !== id),
    }));
  }, [withSync]);

  const addResource = useCallback((r: Omit<MaterialResource, 'id' | 'createdAt'>) => {
    withSync((d) => ({ ...d, resources: [{ ...r, id: uid(), createdAt: Date.now() }, ...d.resources] }));
  }, [withSync]);

  const saveEssay = useCallback((e: { task: string; prompt: string; text: string }): Essay => {
    const essay: Essay = {
      id: uid(), userId, task: e.task, prompt: e.prompt, text: e.text,
      words: e.text.trim().split(/\s+/).filter(Boolean).length,
      analysis: analyseEssay(e.text), createdAt: Date.now(),
    };
    withSync((d) => ({
      ...d,
      essays: [essay, ...d.essays],
      sessions: [...d.sessions, { id: uid(), userId, date: todayISO(), minutes: Math.min(60, Math.max(15, essay.words / 4)), skill: 'writing', createdAt: Date.now() }],
    }));
    return essay;
  }, [withSync]);

  const deleteEssay = useCallback((id: string) => {
    withSync((d) => ({ ...d, essays: d.essays.filter((e) => e.id !== id) }));
  }, [withSync]);

  const saveSpeaking = useCallback((s: Omit<SpeakingSession, 'id' | 'userId' | 'createdAt'>): SpeakingSession => {
    const session: SpeakingSession = { ...s, id: uid(), userId, createdAt: Date.now() };
    withSync((d) => ({
      ...d,
      speaking: [session, ...d.speaking],
      sessions: [...d.sessions, { id: uid(), userId, date: todayISO(), minutes: Math.max(3, Math.round(s.durationMs / 60000)), skill: 'speaking', createdAt: Date.now() }],
    }));
    return session;
  }, [withSync]);

const createMock = useCallback((): MockExam => {
    const mock: MockExam = {
      id: uid(), userId, title: `Mock exam — ${new Date().toLocaleDateString()}`,
      status: 'not_started', step: 0,
      components: [
        { skill: 'listening', score: null, band: 0, note: 'Not attempted' },
        { skill: 'reading', score: null, band: 0, note: 'Not attempted' },
        { skill: 'writing', score: null, band: 0, note: 'Not attempted' },
        { skill: 'speaking', score: null, band: 0, note: 'Not attempted' },
      ],
      overall: null, createdAt: Date.now(),
    };
    withSync((d) => ({ ...d, mocks: [mock, ...d.mocks] }));
    return mock;
  }, [withSync]);

  const updateMock = useCallback((id: string, patch: Partial<MockExam>) => {
    withSync((d) => ({ ...d, mocks: d.mocks.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, [withSync]);

  const logStudy = useCallback((minutes: number, skill: ISkill | 'mixed') => {
    withSync((d) => ({ ...d, sessions: [...d.sessions, { id: uid(), userId, date: todayISO(), minutes, skill, createdAt: Date.now() }] }));
  }, [withSync]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: CoachMessage = { id: uid(), role: 'user', content: trimmed, createdAt: Date.now() };
    const base = getDB();
    const chat = base.chats[0];
    const history = chat?.messages ?? [];
    setCoachPending(true);
    withSync((d) => ({
      ...d,
      chats: [{
        id: chat?.id ?? uid(), userId,
        title: history.length ? chat?.title ?? trimmed.slice(0, 40) : trimmed.slice(0, 40),
        messages: [...history, userMsg], updatedAt: Date.now(),
      }, ...d.chats.slice(chat ? 1 : 0)],
    }));
    await new Promise((r) => { setTimeout(r, 420); });
    const reply = coachReply(trimmed, getDB());
    const answer: CoachMessage = { id: uid(), role: 'assistant', content: reply.content, chips: reply.chips, createdAt: Date.now() };
    withSync((d) => {
      const active = d.chats[0];
      if (!active) return d;
      return { ...d, chats: [{ ...active, messages: [...active.messages, answer] }, ...d.chats.slice(1)] };
    });
    setCoachPending(false);
  }, [withSync]);

  const refreshAlerts = useCallback(() => { withSync((d) => d); }, [withSync]);
  const markAlertRead = useCallback((id: string) => {
    withSync((d) => ({ ...d, recommendations: d.recommendations.map((r) => (r.id === id ? { ...r, read: true } : r)) }));
  }, [withSync]);

  const streak = useMemo(() => currentStreak(db), [db]);
  const weeklyMinutes = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return db.sessions.filter((s) => new Date(`${s.date}T00:00:00`) >= start).reduce((a, s) => a + s.minutes, 0);
  }, [db.sessions]);
  const dailyMinutes = useMemo(
    () => db.sessions.filter((s) => s.date === todayISO()).reduce((a, s) => a + s.minutes, 0),
    [db.sessions],
  );

  const value: AppValue = {
    db, userId, ready,
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    saveProfile, addTask, toggleTask, deleteTask, regeneratePlan,
    createTest, saveResult, getTest, deleteTest,
    recordMistake, resolveMistake,
    addWords, gradeWord, deleteWord,
    addMaterial, deleteMaterial, addResource,
    saveEssay, deleteEssay, saveSpeaking,
    createMock, updateMock, logStudy, sendMessage,
    coachPending, refreshAlerts, markAlertRead,
    achievements: db.achievements,
    newAchievements,
    clearNewAchievements: () => setNewAchievements([]),
    streak, weeklyMinutes, dailyMinutes,
    exportData: () => JSON.stringify(getDB(), null, 2),
    resetEverything: () => { resetLocal(); },
    firebaseOn: firebaseEnabled,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}