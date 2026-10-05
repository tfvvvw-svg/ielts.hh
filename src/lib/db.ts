import { auth, db, firebaseEnabled } from './firebase';
import type {
  Achievement, ChatSession, Essay, Material, MaterialResource, Mistake,
  MockExam, Profile, Recommendation, SpeakingSession, StudySession, Task,
  Test, TestResult, VocabItem,
} from './types';

export const LOCAL_UID = 'local-user';
const KEY = 'bandit:v1';

export interface DBShape {
  profile: Profile | null;
  tasks: Task[];
  sessions: StudySession[];
  tests: Test[];
  results: TestResult[];
  mistakes: Mistake[];
  vocab: VocabItem[];
  materials: Material[];
  resources: MaterialResource[];
  essays: Essay[];
  speaking: SpeakingSession[];
  mocks: MockExam[];
  achievements: Achievement[];
  recommendations: Recommendation[];
  chats: ChatSession[];
}

export const emptyDB = (): DBShape => ({
  profile: null, tasks: [], sessions: [], tests: [], results: [], mistakes: [],
  vocab: [], materials: [], resources: [], essays: [], speaking: [], mocks: [],
  achievements: [], recommendations: [], chats: [],
});

export const COLLECTIONS = {
  tasks: 'tasks', sessions: 'studySessions', tests: 'tests', results: 'testResults',
  mistakes: 'mistakes', vocab: 'vocabulary', materials: 'materials', resources: 'materialResources',
  essays: 'essays', speaking: 'speakingSessions', mocks: 'mockExams',
  achievements: 'achievements', recommendations: 'aiRecommendations', chats: 'chatSessions',
} as const;

function readLocal(): DBShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDB();
    return { ...emptyDB(), ...(JSON.parse(raw) as DBShape) };
  } catch {
    return emptyDB();
  }
}

let cache: DBShape = readLocal();
const listeners = new Set<(d: DBShape) => void>();
let saveTimer: number | undefined;

function persistLocal() {
  localStorage.setItem(KEY, JSON.stringify(cache));
}

export function subscribe(fn: (d: DBShape) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getDB(): DBShape { return cache; }

export function setDB(next: DBShape, persist = true) {
  cache = next;
  if (persist) {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistLocal, 180);
    if (firebaseEnabled && auth?.currentUser) mirrorToCloud(next);
  }
  listeners.forEach((l) => l(next));
}

/* ------------------------------ Firestore mirror --------------------------- */
/* Writes are batched; failures never block the optimistic local update.       */

let mirrorTimer: number | undefined;

function mirrorToCloud(data: DBShape) {
  window.clearTimeout(mirrorTimer);
  mirrorTimer = window.setTimeout(async () => {
    const uid = auth?.currentUser?.uid;
    if (!db || !uid) return;
    const firestore = db;
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(firestore, 'users', uid), { ...data.profile, uid, updatedAt: Date.now() }, { merge: true });
      for (const [name, col] of Object.entries(COLLECTIONS)) {
        const rows = (data as unknown as Record<string, unknown>)[name];
        if (!Array.isArray(rows)) continue;
        await Promise.all(rows.map((row) => {
          const r = row as { id: string };
          return setDoc(doc(firestore, 'users', uid, col, r.id), row as Record<string, unknown>);
        }));
      }
    } catch (err) {
      console.warn('[bandit] cloud mirror failed', err);
    }
  }, 1500);
}

export async function loadFromCloud(uid: string): Promise<DBShape | null> {
  if (!db) return null;
  const firestore = db;
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(firestore, 'users', uid));
  if (!snap.exists()) return null;
  const base = emptyDB();
  (Object.keys(COLLECTIONS) as (keyof typeof COLLECTIONS)[]).forEach((name) => { base[name] = [] as never; });
  const out: DBShape = { ...base, profile: snap.data() as Profile };
  await Promise.all((Object.keys(COLLECTIONS) as (keyof typeof COLLECTIONS)[]).map(async (name) => {
    const { collection, getDocs } = await import('firebase/firestore');
    const s = await getDocs(collection(firestore, 'users', uid, COLLECTIONS[name]));
    (out as unknown as Record<string, unknown>)[name] = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  }));
  return out;
}

/**
 * A cloud snapshot can be older than what is already on the device (a write that
 * never synced, or a profile saved while offline). Adopting it blindly would
 * silently roll the learner back — e.g. straight to onboarding — so we merge
 * per row and keep whichever copy is genuinely newer.
 */
export function mergeDB(local: DBShape, cloud: DBShape): DBShape {
  const localStamp = profileStamp(local.profile);
  const cloudStamp = profileStamp(cloud.profile);
  const profile = local.profile && localStamp >= cloudStamp ? local.profile : cloud.profile;

  const rows = <T extends { id: string; createdAt?: number }>(a: T[], b: T[]): T[] => {
    const map = new Map(b.map((r) => [r.id, r]));
    a.forEach((r) => { if (!map.has(r.id)) map.set(r.id, r); });
    return [...map.values()];
  };

  return {
    profile,
    tasks: rows(local.tasks, cloud.tasks),
    sessions: rows(local.sessions, cloud.sessions),
    tests: rows(local.tests, cloud.tests),
    results: rows(local.results, cloud.results),
    mistakes: rows(local.mistakes, cloud.mistakes),
    vocab: rows(local.vocab, cloud.vocab),
    materials: rows(local.materials, cloud.materials),
    resources: rows(local.resources, cloud.resources),
    essays: rows(local.essays, cloud.essays),
    speaking: rows(local.speaking, cloud.speaking),
    mocks: rows(local.mocks, cloud.mocks),
    achievements: rows(local.achievements, cloud.achievements),
    recommendations: rows(local.recommendations, cloud.recommendations),
    chats: rows(local.chats, cloud.chats),
  };
}

function profileStamp(p: Profile | null): number {
  return p?.updatedAt ?? p?.createdAt ?? 0;
}

export function resetLocal() {
  cache = emptyDB();
  persistLocal();
  listeners.forEach((l) => l(cache));
}

export { firebaseEnabled };