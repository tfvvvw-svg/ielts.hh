import { useMemo, useState } from 'react';
import { CalendarRange, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select } from '../components/ui';
import { useApp } from '../store/AppContext';
import { buildPlan, replan, SKILL_LABEL, readiness } from '../lib/brain';
import { addDaysISO, cx, daysBetween, todayISO } from '../lib/utils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Planner() {
  const { db, saveProfile, regeneratePlan, addTask } = useApp();
  const [form, setForm] = useState({
    examDate: db.profile?.examDate ?? addDaysISO(todayISO(), 30),
    targetBand: db.profile?.targetBand ?? 7,
    currentBand: db.profile?.estimatedBand ?? 5.5,
    weeklyMinutes: db.profile?.weeklyGoalMinutes ?? 300,
    studyDays: db.profile?.studyDays ?? [1, 2, 3, 4, 5],
  });
  const [message, setMessage] = useState<string | null>(null);
  const ready = readiness(db, db.profile);
  const overdue = db.tasks.filter((t) => !t.done && t.dueDate < todayISO());

  const preview = useMemo(() => buildPlan({
    examDate: form.examDate, targetBand: form.targetBand, currentBand: form.currentBand,
    weeklyMinutes: form.weeklyMinutes, studyDays: form.studyDays,
  }, db), [form, db]);

  const apply = () => {
    saveProfile({
      examDate: form.examDate, targetBand: form.targetBand, estimatedBand: form.currentBand,
      weeklyGoalMinutes: form.weeklyMinutes, studyDays: form.studyDays,
    });
    regeneratePlan();
    setMessage('Your plan has been regenerated and added to Tasks.');
    setTimeout(() => setMessage(null), 4000);
  };

  const handleReplan = () => {
    const { created, dropped } = replan(db, db.profile);
    if (dropped === 0) setMessage('Nothing is overdue — your plan is up to date.');
    else {
      created.forEach((t) => addTask(t));
      setMessage(`Dropped ${dropped} overdue task${dropped > 1 ? 's' : ''} and scheduled ${created.length} high-impact sessions instead.`);
    }
    setTimeout(() => setMessage(null), 6000);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarRange} title="AI Study Planner"
        subtitle="Bandit weights every session by your gap to the target band, then adapts the plan when you fall behind." />

      {message && <div role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit space-y-4 p-5">
          <Field label="Exam date" htmlFor="plan-date">
            <Input id="plan-date" type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
          </Field>
          <Field label="Target band" htmlFor="plan-target">
            <Select id="plan-target" value={form.targetBand} onChange={(e) => setForm({ ...form, targetBand: Number(e.target.value) })}>
              {[5.5, 6, 6.5, 7, 7.5, 8, 8.5].map((b) => <option key={b} value={b}>Band {b}</option>)}
            </Select>
          </Field>
          <Field label="Current estimated band" htmlFor="plan-current">
            <Select id="plan-current" value={form.currentBand} onChange={(e) => setForm({ ...form, currentBand: Number(e.target.value) })}>
              {[4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((b) => <option key={b} value={b}>Band {b}</option>)}
            </Select>
          </Field>
          <Field label="Minutes per week" htmlFor="plan-weekly" hint={`${Math.round(form.weeklyMinutes / Math.max(1, form.studyDays.length))} min per study day`}>
            <Input id="plan-weekly" type="range" min={60} max={900} step={30} value={form.weeklyMinutes} onChange={(e) => setForm({ ...form, weeklyMinutes: Number(e.target.value) })} />
          </Field>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Study days</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_NAMES.map((d, i) => (
                <button key={d} aria-pressed={form.studyDays.includes(i)}
                  onClick={() => setForm((f) => ({ ...f, studyDays: f.studyDays.includes(i) ? f.studyDays.filter((x) => x !== i) : [...f.studyDays, i].sort() }))}
                  className={cx('h-9 w-12 rounded-lg text-xs font-semibold transition', form.studyDays.includes(i) ? 'bg-brand text-white' : 'bg-ink-500/5 text-muted')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Button full onClick={apply} icon={Wand2}>Generate plan</Button>
          <Button full variant="outline" onClick={handleReplan} icon={RefreshCw}>
            Re-plan after missed days{overdue.length ? ` (${overdue.length} overdue)` : ''}
          </Button>
          <p className="text-[11px] leading-relaxed text-muted">
            Re-planning does <strong>not</strong> push every missed task onto tomorrow. It drops stale work and schedules new,
            high-impact sessions based on {ready.limiter ? `your limiter — ${SKILL_LABEL[ready.limiter]}` : 'your weakest skills'}.
          </p>
        </Card>

<div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold">Plan preview</h2>
                <p className="text-xs text-muted">
                  {preview.length} sessions · {preview.reduce((a, t) => a + t.minutes, 0)} minutes ·
                  {' '}{daysBetween(todayISO(), form.examDate)} days to your exam
                </p>
              </div>
              <Badge tone="brand"><Sparkles className="h-3 w-3" />Weighted by skill gap</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {preview.slice(0, 9).map((t) => (
                <div key={t.id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                  <p className="text-xs text-muted">{t.dueDate}</p>
                  <p className="mt-0.5 text-sm font-medium">{t.title}</p>
                  <p className="mt-1 text-xs text-muted">{t.minutes} min · {SKILL_LABEL[t.skill]}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-display text-base font-bold">Time distribution</h2>
            {preview.length === 0 ? <EmptyState icon={CalendarRange} title="Pick your study days" body="Select at least one day to generate a plan." /> : (
              <div className="space-y-2.5">
                {(['reading', 'listening', 'writing', 'speaking'] as const).map((s) => {
                  const mins = preview.filter((t) => t.skill === s).reduce((a, t) => a + t.minutes, 0);
                  const total = Math.max(1, preview.reduce((a, t) => a + t.minutes, 0));
                  return (
                    <div key={s}>
                      <div className="mb-1 flex justify-between text-xs"><span>{SKILL_LABEL[s]}</span><span className="text-muted">{mins} min</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-500/10">
                        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${(mins / total) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}