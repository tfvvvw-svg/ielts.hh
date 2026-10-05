import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { AppProvider, useApp } from './store/AppContext';
import AppShell from './components/AppShell';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';

const Coach = lazy(() => import('./pages/Coach'));
const Planner = lazy(() => import('./pages/Planner'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Skill = lazy(() => import('./pages/SkillPractice'));
const Writing = lazy(() => import('./pages/Writing'));
const Speaking = lazy(() => import('./pages/Speaking'));
const Vocabulary = lazy(() => import('./pages/Vocabulary'));
const Grammar = lazy(() => import('./pages/Grammar'));
const Mistakes = lazy(() => import('./pages/Mistakes'));
const TestGenerator = lazy(() => import('./pages/TestGenerator'));
const TestRunner = lazy(() => import('./pages/TestRunner'));
const Mocks = lazy(() => import('./pages/Mocks'));
const Materials = lazy(() => import('./pages/Materials'));
const MaterialDetail = lazy(() => import('./pages/MaterialDetail'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Preparing your workspace" /></div>;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return children;
}

function OnboardingGate({ children }: { children: JSX.Element }) {
  const { db, ready } = useApp();
  if (!ready) return <div className="grid min-h-screen place-items-center"><Spinner label="Loading your profile" /></div>;
  if (db.profile && !db.profile.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function Router() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />

      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />

      <Route element={<Protected><OnboardingGate><AppShell /></OnboardingGate></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/reading" element={<Skill skill="reading" />} />
        <Route path="/listening" element={<Skill skill="listening" />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/mistakes" element={<Mistakes />} />
        <Route path="/test-generator" element={<TestGenerator />} />
        <Route path="/tests" element={<TestGenerator />} />
        <Route path="/test/:id" element={<TestRunner />} />
        <Route path="/tests/:id" element={<TestRunner />} />
        <Route path="/mocks" element={<Mocks />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/materials/:id" element={<MaterialDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner /></div>}>
            <Router />
          </Suspense>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}