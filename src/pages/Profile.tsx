import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Brain, FileText, Flame, Headphones, Library, Mic, Target, TrendingUp, User } from 'lucide-react';
import { Badge, Button, Card, PageHeader, Progress, SectionTitle } from '../components/ui';
import { StatCard } from '../components/Common';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { SKILL_LABEL, currentOverall, readiness } from '../lib/brain';
import { daysToExam, greeting, todayISO } from '../lib/utils';

export default function Profile() {
  const { db, streak, dailyMinutes } = useApp();
  const { user, firebaseOn } = useAuth();
  const navigate = useNavigate();
  const p = db.profile;
  const ready = readiness(db, p);
  const overall = currentOverall(db);
  const daysLeft = daysToExam(p?.examDate ?? null);

  const stats = useMemo(() => ({
    tests: db.results.length,
    questions: db.results.reduce((a, r) => a + r.total, 0),
    accuracy: db.results.length ? Math.round(db.results.reduce((a, r) => a + r.percentage, 0) / db.results.length) : 0,
    minutes: db.sessions.reduce((a, s) => a + s.minutes, 0),
  }), [db.results, db.sessions]);

  if (!p) return null;

  return (
    <div className="space-y-6">
      <PageHeader icon={User} title="Profile"
        subtitle="Your goals, progress summary and how your band estimate is built."
        action={<Button variant="outline" onClick={() => navigate('/settings')}>Edit settings</Button>} />

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 font-display text-2xl font-bold text-white">
              {p.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold">{p.displayName}</h2>
            <p className="text-sm text-muted">{user?.email ?? (user?.isGuest ? 'Guest learner — data stored on this device' : 'Signed in')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="brand">{user?.isGuest ? 'Guest' : 'Signed in'}</Badge>
              <Badge tone="neutral">{firebaseOn ? 'Firebase sync' : 'Offline mode'}</Badge>
              <Badge tone="neutral">{greeting()}</Badge>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="font-display text-4xl font-bold text-brand">{overall ?? '—'}</p>
            <p className="text-xs text-muted">estimated band · target {p.targetBand}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tests completed" value={stats.tests} hint={`${stats.questions} questions answered`} icon={Target} tone="brand" />
        <StatCard label="Average accuracy" value={stats.accuracy} suffix="%" hint="Across all practice tests" icon={TrendingUp} tone="good" />
        <StatCard label="Total study time" value={Math.round(stats.minutes / 60)} suffix=" h" hint={`${stats.minutes} minutes logged`} icon={Flame} tone="warn" />
        <StatCard label="Streak" value={streak} suffix=" days" hint={`${dailyMinutes} min today`} icon={Flame} tone="good" />
      </div>

<div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Your goals" subtitle="Edit these in Settings or the Study Planner" />
          <dl className="space-y-3">
            {[
              ['Target band', `Band ${p.targetBand}`],
              ['Current estimate', overall !== null ? `Band ${overall}` : 'Not enough data yet'],
              ['Exam date', p.examDate ? `${p.examDate}${daysLeft !== null && daysLeft >= 0 ? ` (${daysLeft} days)` : ''}` : 'Not set'],
              ['Daily goal', `${p.dailyGoalMinutes} minutes`],
              ['Weekly goal', `${p.weeklyGoalMinutes} minutes`],
              ['Study days', p.studyDays.length === 7 ? 'Every day' : `${p.studyDays.length} days a week`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] px-4 py-3">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <Progress className="mt-4" value={ready.percent} label={`Exam readiness ${ready.percent}%`} tone={ready.percent >= 75 ? 'good' : 'warn'} />
          <p className="mt-2 text-xs text-muted">{ready.explanation}</p>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Skill profile" subtitle="Estimated band per skill" />
          <ul className="space-y-3">
            {(['listening', 'reading', 'writing', 'speaking'] as const).map((s) => {
              const icons = { listening: Headphones, reading: BookMarked, writing: FileText, speaking: Mic };
              const Icon = icons[s];
              const band = ready.bands[s];
              return (
                <li key={s} className="rounded-xl border border-[rgb(var(--border))] p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-brand" />{SKILL_LABEL[s]}</span>
                    <span className="font-display text-lg font-bold">{band ?? '—'}</span>
                  </div>
                  <Progress className="mt-2" value={((band ?? 0) / 9) * 100} tone={(band ?? 0) >= (p.targetBand ?? 7) ? 'good' : 'warn'} />
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={Library} onClick={() => navigate('/vocabulary')}>Vocabulary</Button>
            <Button size="sm" variant="outline" icon={Brain} onClick={() => navigate('/analytics')}>Analytics</Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Practice summary" subtitle="Everything you have done so far" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ['Materials', db.materials.length], ['Tests', db.tests.length], ['Essays', db.essays.length],
            ['Speaking', db.speaking.length], ['Words', db.vocab.length], ['Mistakes', db.mistakes.length],
          ] as [string, number][]).map(([l, v]) => (
            <div key={l} className="rounded-xl bg-[rgb(var(--surface-2))] p-4 text-center">
              <p className="font-display text-2xl font-bold">{v}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted">Member since {new Date(p.createdAt).toLocaleDateString()}. Today is {todayISO()}.</p>
      </Card>
    </div>
  );
}