import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookMarked, CheckCircle2, Clock, FileText, Flame, Headphones,
  Mic, Sparkles, Target, TrendingUp, Wand2, Zap,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Progress, SectionTitle } from '../components/ui';
import { Reveal, RichText, StatCard } from '../components/Common';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL, currentOverall, nextAction, readiness, skillStats, weakestQuestionTypes } from '../lib/brain';
import { daysToExam, greeting, relativeTime, todayISO } from '../lib/utils';

export default function Dashboard() {
  const { db, dailyMinutes, streak, weeklyMinutes, toggleTask } = useApp();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(30);
  const [thinking, setThinking] = useState(false);

  const profile = db.profile;
  const ready = useMemo(() => readiness(db, profile), [db, profile]);
  const overall = useMemo(() => currentOverall(db), [db]);
  const action = useMemo(() => nextAction(db, profile, available), [db, profile, available]);
  const stats = useMemo(() => skillStats(db).filter((s) => s.type === 'overall'), [db]);
  const weakTypes = useMemo(() => weakestQuestionTypes(db, 3), [db]);
  const today = todayISO();
  const todayTasks = db.tasks.filter((t) => t.dueDate <= today);
  const doneToday = todayTasks.filter((t) => t.done);
  const recentResults = [...db.results].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const daysLeft = daysToExam(profile?.examDate ?? null);
  const goal = profile?.dailyGoalMinutes ?? 45;
  const weeklyGoal = profile?.weeklyGoalMinutes ?? 300;
  const alerts = db.recommendations.filter((r) => !r.read).slice(0, 3);

  const decide = () => {
    setThinking(true);
    setTimeout(() => { setThinking(false); navigate(action.href); }, 800);
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" aria-hidden />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 animate-float rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{greeting()}, {profile?.displayName ?? 'Learner'}</p>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {overall === null ? 'Let’s find your level first.' : `You are on track for roughly Band ${overall}.`}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/75">{ready.explanation}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {daysLeft !== null && daysLeft >= 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                    <Clock className="h-3.5 w-3.5" />{daysLeft} days to your exam
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                  <Flame className="h-3.5 w-3.5 text-amber2-400" />{streak} day streak
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                  <Target className="h-3.5 w-3.5" />Target Band {profile?.targetBand ?? 7}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-center">
              <div className="relative grid h-28 w-28 place-items-center rounded-full bg-white/10 backdrop-blur">
                <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - ready.percent / 100)}
                    style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)' }} />
                </svg>
                <div>
                  <p className="font-display text-2xl font-bold">{ready.percent}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/70">readiness</p>
                </div>
              </div>
              <p className="mt-2 max-w-[10rem] text-[11px] leading-snug text-white/60">Estimated from your recent practice, not an official result.</p>
            </div>
          </div>
        </Card>
      </Reveal>

<Reveal delay={0.05}>
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-brand-500/12 to-transparent" aria-hidden />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              <Sparkles className="h-4 w-4" /> AI decision
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">What should I study now?</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted">
              Bandit analyses your recent results, mistakes, weak skills, study history, available time and exam date, then recommends one activity.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted">Time available:</span>
              {[15, 30, 45, 60].map((m) => (
                <button key={m} onClick={() => setAvailable(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${available === m ? 'bg-brand text-white' : 'bg-ink-500/5 text-muted hover:text-[rgb(var(--text))]'}`}>
                  {m} min
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge tone={action.confidence === 'high' ? 'brand' : action.confidence === 'medium' ? 'warn' : 'neutral'}>
                    {action.confidence} confidence
                  </Badge>
                  <h3 className="mt-2.5 font-display text-lg font-bold">{action.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5" />{action.minutes} min
                  <Badge tone="neutral">{SKILL_LABEL[action.skill]}</Badge>
                </div>
              </div>
              <RichText text={action.reason} className="mt-3 text-muted" />
              <Button className="mt-5" size="lg" loading={thinking} onClick={decide} icon={ArrowRight}>{action.cta}</Button>
            </div>
          </div>
        </Card>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Daily progress" value={dailyMinutes} suffix=" min" hint={`Goal: ${goal} min`} icon={Clock} tone={dailyMinutes >= goal ? 'good' : 'warn'} />
        <StatCard label="Weekly study time" value={weeklyMinutes} suffix=" min" hint={`Goal: ${weeklyGoal} min`} icon={TrendingUp} tone="brand" />
        <StatCard label="Tasks completed" value={doneToday.length} hint={`${todayTasks.length} scheduled today`} icon={CheckCircle2} tone="good" />
        <StatCard label="Streak" value={streak} suffix=" days" hint="Keep it alive today" icon={Flame} tone="warn" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Today’s study plan" subtitle={`${doneToday.length} of ${todayTasks.length} complete`}
            action={<Button size="sm" variant="ghost" onClick={() => navigate('/tasks')}>View all</Button>} />
          {todayTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing scheduled today"
              body="Build a plan and your sessions appear here automatically, weighted toward your weakest skill."
              action={<Button size="sm" onClick={() => navigate('/planner')}>Build my plan</Button>} />
          ) : (
            <ul className="space-y-2">
              {todayTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3 transition hover:border-brand/40">
                  <button onClick={() => toggleTask(t.id)} aria-label={t.done ? `Mark ${t.title} incomplete` : `Mark ${t.title} complete`}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${t.done ? 'border-mint-500 bg-mint-500 text-white' : 'border-[rgb(var(--border))] hover:border-brand'}`}>
                    {t.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${t.done ? 'text-muted line-through' : ''}`}>{t.title}</p>
                    <p className="text-xs text-muted">{t.minutes} min · {SKILL_LABEL[t.skill]}</p>
                  </div>
                  <Badge tone={t.priority === 1 ? 'brand' : 'neutral'}>{t.priority === 1 ? 'Priority' : 'Normal'}</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4"><Progress value={goal ? (dailyMinutes / goal) * 100 : 0} tone={dailyMinutes >= goal ? 'good' : 'brand'} label={`${dailyMinutes} / ${goal} minutes today`} /></div>
        </Card>

<div className="space-y-6">
          <Card>
            <SectionTitle title="Smart alerts" subtitle="Based on your recent activity" />
            {alerts.length === 0 ? (
              <p className="rounded-xl bg-mint-500/10 px-4 py-3 text-sm text-mint-600 dark:text-mint-400">No concerns right now. Everything is on track.</p>
            ) : (
              <ul className="space-y-2.5">
                {alerts.map((a) => (
                  <li key={a.id} className={`rounded-xl border p-3 ${a.severity === 'warn' ? 'border-amber2-500/30 bg-amber2-500/5' : a.severity === 'good' ? 'border-mint-500/30 bg-mint-500/5' : 'border-[rgb(var(--border))]'}`}>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="mt-1 text-xs text-muted">{a.body}</p>
                    {a.actionHref && <button onClick={() => navigate(a.actionHref as string)} className="mt-2 text-xs font-semibold text-brand hover:underline">{a.actionLabel} →</button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle title="Weak areas" subtitle="Where you are losing marks" />
            {weakTypes.length === 0 ? (
              <p className="text-sm text-muted">Complete a test to reveal your weakest question types.</p>
            ) : (
              <ul className="space-y-3">
                {weakTypes.map((w) => (
                  <li key={`${w.skill}-${w.type}`}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{w.type.replace(/_/g, ' ')}</span>
                      <span className="text-muted">{w.percentage}%</span>
                    </div>
                    <Progress value={w.percentage} tone={w.percentage < 50 ? 'bad' : w.percentage < 70 ? 'warn' : 'good'} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

<div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Skill accuracy" subtitle="Average across your completed tests" />
          <div className="grid gap-4 sm:grid-cols-2">
            {(['listening', 'reading', 'writing', 'speaking'] as const).map((s) => {
              const row = stats.find((x) => x.skill === s);
              const icons = { listening: Headphones, reading: BookMarked, writing: FileText, speaking: Mic };
              const Icon = icons[s];
              const value = row?.percentage ?? 0;
              return (
                <div key={s} className="rounded-xl border border-[rgb(var(--border))] p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-brand" />{SKILL_LABEL[s]}</span>
                    {row && row.trend !== 0 && <Badge tone={row.trend > 0 ? 'good' : 'bad'}>{row.trend > 0 ? '+' : ''}{row.trend}%</Badge>}
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold">{row ? `${value}%` : '—'}</p>
                  <Progress className="mt-2" value={value} tone={value >= 75 ? 'good' : value >= 55 ? 'warn' : 'bad'} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Recent test results" action={<Button size="sm" variant="ghost" onClick={() => navigate('/analytics')}>Analytics</Button>} />
          {recentResults.length === 0 ? (
            <EmptyState icon={Zap} title="No tests yet"
              body="Generate your first practice test and Bandit will start estimating your band and finding your weak spots."
              action={<Button size="sm" onClick={() => navigate('/test-generator')}>Generate a test</Button>} />
          ) : (
            <ul className="space-y-2.5">
              {recentResults.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{r.percentage}%</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.testTitle}</p>
                    <p className="text-xs text-muted">{SKILL_LABEL[r.skill]} · Band ~{r.band} · {relativeTime(r.createdAt)}</p>
                  </div>
                  <Badge tone={r.percentage >= 75 ? 'good' : r.percentage >= 50 ? 'warn' : 'bad'}>{r.score}/{r.total}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/writing', label: 'Writing Lab', body: 'Get all four IELTS criteria scored', icon: FileText },
          { to: '/speaking', label: 'Speaking Lab', body: 'Practise with an AI examiner', icon: Mic },
          { to: '/materials', label: 'My Materials', body: 'Turn any text into a test', icon: BookMarked },
          { to: '/coach', label: 'Ask the Coach', body: 'Answers built from your data', icon: Wand2 },
        ].map(({ to, label, body, icon: Icon }) => (
          <button key={to} onClick={() => navigate(to)} className="surface group flex items-center gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft transition-transform group-hover:scale-110"><Icon className="h-4 w-4 text-brand" /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{label}</span>
              <span className="block truncate text-xs text-muted">{body}</span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
          </button>
        ))}
      </div>
    </div>
  );
}