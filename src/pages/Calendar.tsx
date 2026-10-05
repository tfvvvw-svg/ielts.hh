import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Progress } from '../components/ui';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL } from '../lib/brain';
import { cx, todayISO } from '../lib/utils';

const SKILL_COLOR: Record<string, string> = {
  reading: 'bg-brand-500', listening: 'bg-mint-500', writing: 'bg-amber2-500', speaking: 'bg-rose2-500',
};

export default function Calendar() {
  const { db, toggleTask } = useApp();
  const [cursor, setCursor] = useState(() => new Date());
  const today = todayISO();

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === cursor.getMonth(),
        isToday: iso === today,
        tasks: db.tasks.filter((t) => t.dueDate === iso),
        minutes: db.sessions.filter((s) => s.date === iso).reduce((a, s) => a + s.minutes, 0),
      };
    });
  }, [cursor, db.tasks, db.sessions, today]);

  const monthMinutes = cells.filter((c) => c.inMonth).reduce((a, c) => a + c.minutes, 0);
  const monthDone = cells.filter((c) => c.inMonth).reduce((a, c) => a + c.tasks.filter((t) => t.done).length, 0);
  const monthTotal = cells.filter((c) => c.inMonth).reduce((a, c) => a + c.tasks.length, 0);

  const shift = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarDays} title="Calendar"
        subtitle="Your schedule and logged study time in one view."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-[9rem] text-center font-display text-sm font-semibold">
              {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        } />

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{monthMinutes} minutes studied · {monthDone}/{monthTotal} tasks completed this month</p>
          <Badge tone="brand">{monthTotal ? Math.round((monthDone / monthTotal) * 100) : 0}% complete</Badge>
        </div>
        <Progress value={monthTotal ? (monthDone / monthTotal) * 100 : 0} tone="good" />

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">{d}</div>
          ))}
          {cells.map((c) => (
            <div key={c.iso}
              className={cx('min-h-[4.5rem] rounded-xl border p-1.5 transition', c.isToday ? 'border-brand bg-brand-soft' : 'border-[rgb(var(--border))]', !c.inMonth && 'opacity-40')}>
              <div className="flex items-center justify-between">
                <span className={cx('text-xs font-semibold', c.isToday ? 'text-brand' : 'text-muted')}>{c.day}</span>
                {c.minutes > 0 && <span className="text-[10px] text-muted">{c.minutes}m</span>}
              </div>
              <div className="mt-1 space-y-0.5">
                {c.tasks.slice(0, 3).map((t) => (
                  <button key={t.id} onClick={() => toggleTask(t.id)} title={t.title}
                    className={cx('block w-full truncate rounded px-1 py-0.5 text-left text-[10px] text-white transition hover:opacity-80', SKILL_COLOR[t.skill], t.done ? 'line-through opacity-50' : '')}>
                    {t.title}
                  </button>
                ))}
                {c.tasks.length > 3 && <p className="px-1 text-[10px] text-muted">+{c.tasks.length - 3} more</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {db.tasks.length === 0 && (
        <EmptyState icon={CalendarDays} title="No scheduled work"
          body="Build a study plan and your sessions will appear here automatically."
          action={<Button size="sm" onClick={() => { setCursor(new Date()); }}>Back to today</Button>} />
      )}

      <Card className="p-5">
        <h2 className="mb-3 font-display text-base font-bold">This month at a glance</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {(['reading', 'listening', 'writing', 'speaking'] as const).map((s) => {
            const mins = db.sessions.filter((x) => x.skill === s && cells.some((c) => c.iso === x.date)).reduce((a, x) => a + x.minutes, 0);
            return (
              <div key={s} className="rounded-xl border border-[rgb(var(--border))] p-3">
                <p className="text-xs text-muted">{SKILL_LABEL[s]}</p>
                <p className="mt-1 font-display text-xl font-bold">{mins}<span className="text-sm text-muted"> min</span></p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}