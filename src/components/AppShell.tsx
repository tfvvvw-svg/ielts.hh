import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award, BarChart3, BookMarked, Brain, CalendarDays, ClipboardCheck, FileText, Flame,
  Headphones, LayoutDashboard, Library, LogOut, Menu, MessageSquareText, Moon, Settings,
  Sparkles, Sun, Target, Trophy, User, Wand2, X,
} from 'lucide-react';
import { Button } from './ui';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { cx, greeting } from '../lib/utils';
import { nextAction } from '../lib/brain';
import { AchievementToast } from './AchievementToast';

const NAV = [
  { group: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/coach', label: 'AI Coach', icon: MessageSquareText },
    { to: '/planner', label: 'Study Planner', icon: CalendarDays },
    { to: '/tasks', label: 'Tasks', icon: ClipboardCheck },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  ] },
  { group: 'Practise', items: [
    { to: '/listening', label: 'Listening', icon: Headphones },
    { to: '/reading', label: 'Reading', icon: BookMarked },
    { to: '/writing', label: 'Writing Lab', icon: FileText },
    { to: '/speaking', label: 'Speaking Lab', icon: Brain },
    { to: '/vocabulary', label: 'Vocabulary', icon: Library },
    { to: '/grammar', label: 'Grammar', icon: Wand2 },
  ] },
  { group: 'Assessment', items: [
    { to: '/test-generator', label: 'Test Generator', icon: Sparkles },
    { to: '/mocks', label: 'Mock Exams', icon: ClipboardCheck },
    { to: '/mistakes', label: 'Mistake Bank', icon: Target },
    { to: '/materials', label: 'Materials', icon: Library },
  ] },
  { group: 'Progress', items: [
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/achievements', label: 'Achievements', icon: Trophy },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ] },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
        <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-base font-bold tracking-tight">Bandit</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">AI IELTS Coach</p>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { db, theme, toggleTheme, dailyMinutes, streak, newAchievements, clearNewAchievements } = useApp();
  const { logout, user } = useAuth();
  const goal = db.profile?.dailyGoalMinutes ?? 45;
  const unread = db.recommendations.filter((r) => !r.read).length;
  const suggestion = useMemo(() => nextAction(db, db.profile), [db]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      {NAV.map((g) => (
        <div key={g.group} className="mb-3">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{g.group}</p>
          <div className="space-y-0.5">
            {g.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to} to={to} end={to === '/'}
                className={({ isActive }) => cx(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-ink-500/5 hover:text-[rgb(var(--text))] dark:hover:bg-ink-100/5',
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-active" className="absolute left-0 h-5 w-[3px] rounded-r-full bg-brand" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                    {to === '/' && unread > 0 && <span className="ml-auto rounded-full bg-rose2-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-auto rounded-xl border border-[rgb(var(--border))] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Flame className="h-3.5 w-3.5 text-amber2-500" aria-hidden />
          {streak} day streak
        </div>
        <p className="mt-1 text-[11px] text-muted">{dailyMinutes} / {goal} min today</p>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[rgb(var(--bg))]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:flex">
        <div className="flex h-16 items-center px-5"><Logo /></div>
        {sidebar}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[rgb(var(--surface))] lg:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="flex h-16 items-center justify-between px-5">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted hover:bg-ink-500/10" aria-label="Close menu"><X className="h-5 w-5" /></button>
              </div>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

<div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[rgb(var(--border))] px-4 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted hover:bg-ink-500/10 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="lg:hidden"><Logo compact /></div>

          <button
            onClick={() => navigate('/coach')}
            className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-left transition hover:border-brand md:flex"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span className="truncate text-sm">
              <span className="text-muted">What should I study now? </span>
              <span className="font-medium">{suggestion.title}</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggleTheme} className="rounded-lg p-2 text-muted transition hover:bg-ink-500/10 hover:text-[rgb(var(--text))]" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => navigate('/achievements')} className="rounded-lg p-2 text-muted transition hover:bg-ink-500/10 hover:text-[rgb(var(--text))]" aria-label="Achievements">
              <Award className="h-4 w-4" />
            </button>
            <div className="ml-1 hidden items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-2.5 py-1.5 sm:flex">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[10px] font-bold text-white">
                {(user?.displayName ?? 'L').slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-[9rem] truncate text-xs font-medium">{user?.displayName ?? 'Learner'}</span>
            </div>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={() => { void logout(); navigate('/'); }} className="hidden sm:inline-flex">Sign out</Button>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="hidden border-t border-[rgb(var(--border))] px-6 py-6 text-center text-xs text-muted lg:block">
          {greeting()} · All band scores shown are AI estimates from your own practice data — they are not official IELTS results.
        </footer>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:hidden" aria-label="Quick navigation">
        {[
          { to: '/', label: 'Home', icon: LayoutDashboard },
          { to: '/coach', label: 'Coach', icon: MessageSquareText },
          { to: '/tasks', label: 'Tasks', icon: ClipboardCheck },
          { to: '/test-generator', label: 'Tests', icon: Sparkles },
          { to: '/analytics', label: 'Progress', icon: BarChart3 },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition', isActive ? 'text-brand' : 'text-muted')}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <AchievementToast items={newAchievements} onDismiss={clearNewAchievements} />
    </div>
  );
}