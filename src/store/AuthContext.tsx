import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut,
  updateProfile, type User,
} from 'firebase/auth';
import { auth, firebaseEnabled } from '../lib/firebase';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest: boolean;
}

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  firebaseOn: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const Ctx = createContext<AuthValue | null>(null);
const GUEST_KEY = 'bandit:guest';

const map = (u: User): AuthUser => ({
  uid: u.uid,
  email: u.email ?? '',
  displayName: u.displayName ?? u.email?.split('@')[0] ?? 'Learner',
  photoURL: u.photoURL ?? undefined,
  isGuest: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseEnabled && auth) {
      return onAuthStateChanged(auth, (u) => {
        setUser(u ? map(u) : null);
        setLoading(false);
      });
    }
    const guest = localStorage.getItem(GUEST_KEY);
    if (guest) setUser(JSON.parse(guest) as AuthUser);
    setLoading(false);
    return undefined;
  }, []);

  const friendly = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    const mapErr: Record<string, string> = {
      'auth/invalid-credential': 'That email and password combination is incorrect.',
      'auth/email-already-in-use': 'An account already exists with this email.',
      'auth/weak-password': 'Choose a password of at least 6 characters.',
      'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
      'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
      'auth/unauthorized-domain': 'This domain is not authorised for sign-in. Add it under Firebase → Authentication → Settings → Authorised domains.',
      'auth/operation-not-allowed': 'This sign-in method is disabled. Enable it under Firebase → Authentication → Sign-in method.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/network-request-failed': 'Network error — check your connection and try again.',
      'auth/configuration-not-found': 'Firebase Authentication is not set up for this project.',
    };
    // Preserve our own explicit messages (e.g. "Firebase is not configured").
    if (!code && e instanceof Error && e.message) return e.message;
    return mapErr[code ?? ''] ?? 'Something went wrong while signing in. Please try again.';
  };

  const guard = useCallback(async (fn: () => Promise<void>) => {
    setError(null);
    try { await fn(); } catch (e) { setError(friendly(e)); throw e; }
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    firebaseOn: firebaseEnabled,
    error,
    clearError: () => setError(null),
    signInWithGoogle: () => guard(async () => {
      if (!auth) throw new Error('Firebase is not configured. Add your Firebase keys to .env to enable Google sign-in.');
      await signInWithPopup(auth, new GoogleAuthProvider());
    }),
    signInWithEmail: (email, password) => guard(async () => {
      if (!auth) throw new Error('Firebase is not configured. Add your Firebase keys to .env to enable email sign-in.');
      await signInWithEmailAndPassword(auth, email, password);
    }),
    signUpWithEmail: (name, email, password) => guard(async () => {
      if (!auth) throw new Error('Firebase is not configured. Add your Firebase keys to .env to enable email sign-up.');
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
    }),
    resetPassword: (email) => guard(async () => {
      if (!auth) throw new Error('Firebase is not configured. Add your Firebase keys to .env to enable password recovery.');
      await sendPasswordResetEmail(auth, email);
    }),
    continueAsGuest: () => {
      const guest: AuthUser = { uid: 'local-user', email: '', displayName: 'Guest learner', isGuest: true };
      localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
      setUser(guest);
    },
    logout: async () => {
      localStorage.removeItem(GUEST_KEY);
      if (auth?.currentUser) await signOut(auth);
      setUser(null);
    },
  }), [user, loading, error, guard]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}