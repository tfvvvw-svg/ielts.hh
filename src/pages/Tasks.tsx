import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Select, Tabs } from '../components/ui';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL } from '../lib/brain';
import type { ISkill } from '../lib/types';
import { todayISO } from '../lib/utils';

type Filter = 'today' | 'upcoming' | 'done' | 'all';

export default function Tasks() {
  const { db, addTask, toggleTask, deleteTask } = useApp();
  const [filter, setFilter] = useState<Filter>('today');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', skill: 'reading' as ISkill, minutes: 30, dueDate: todayISO() });
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  const filtered = useMemo(() => {
    const list = [...db.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (filter === 'today') return list.filter((t) => !t.done && t.dueDate <= today);
    if (filter === 'upcoming') return list.filter((t) => !t.done && t.dueDate > today);
    if (filter === 'done') return list.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    return list;
  }, [db.tasks, filter, today]);

  const submit = () => {
    if (!form.title.trim()) { setError('Give your task a title.'); return; }
    addTask({ title: form.title.trim(), skill: form.skill, minutes: Number(form.minutes) || 30, dueDate: form.dueDate });
    setForm({ title: '', skill: 'reading', minutes: 30, dueDate: todayISO() });
    setError(null);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardCheck} title="Tasks"
        subtitle="Everything scheduled for you, plus anything you add yourself."
        action={<Button icon={Plus} onClick={() => setOpen(true)}>New task</Button>} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onChange={setFilter} tabs={[
          { value: 'today', label: 'Today', count: db.tasks.filter((t) => !t.done && t.dueDate <= today).length },
          { value: 'upcoming', label: 'Upcoming', count: db.tasks.filter((t) => !t.done && t.dueDate > today).length },
          { value: 'done', label: 'Completed', count: db.tasks.filter((t) => t.done).length },
          { value: 'all', label: 'All', count: db.tasks.length },
        ]} />
        <p className="text-xs text-muted">{db.tasks.filter((t) => t.done).length} tasks completed overall</p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nothing here yet"
          body={filter === 'today' ? 'No tasks are due today. Generate a study plan or add a task manually.' : 'Switch tabs to see other tasks.'}
          action={<Button size="sm" onClick={() => setOpen(true)}>Add a task</Button>} />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((t) => {
            const overdue = !t.done && t.dueDate < today;
            return (
              <li key={t.id} className={`surface flex items-center gap-3 rounded-2xl p-4 transition hover:shadow-lift ${overdue ? 'border-rose2-500/40' : ''}`}>
                <button onClick={() => toggleTask(t.id)} aria-label={t.done ? `Mark ${t.title} incomplete` : `Mark ${t.title} complete`}
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${t.done ? 'border-mint-500 bg-mint-500 text-white' : 'border-[rgb(var(--border))] hover:border-brand'}`}>
                  {t.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${t.done ? 'text-muted line-through' : ''}`}>{t.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{t.dueDate}{overdue ? ' · overdue' : ''} · {t.minutes} min · {SKILL_LABEL[t.skill]}</p>
                  {t.note && <p className="mt-1 text-xs italic text-muted">{t.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.source === 'ai' && <Badge tone="brand">AI</Badge>}
                  {t.priority === 1 && !t.done && <Badge tone="warn">Priority</Badge>}
                  <button onClick={() => deleteTask(t.id)} aria-label={`Delete ${t.title}`} className="rounded-lg p-2 text-muted transition hover:bg-rose2-500/10 hover:text-rose2-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

<Modal open={open} onClose={() => setOpen(false)} title="New task">
        <div className="space-y-4">
          <Field label="Title" htmlFor="task-title">
            <Input id="task-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Reading practice — T/F/NG" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Skill" htmlFor="task-skill">
              <Select id="task-skill" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value as ISkill })}>
                {(['reading', 'listening', 'writing', 'speaking'] as ISkill[]).map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
              </Select>
            </Field>
            <Field label="Minutes" htmlFor="task-minutes">
              <Input id="task-minutes" type="number" min={5} max={180} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} />
            </Field>
            <Field label="Due date" htmlFor="task-due">
              <Input id="task-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
          </div>
          {error && <p role="alert" className="text-xs text-rose2-500">{error}</p>}
          <Button full onClick={submit} icon={Plus}>Add task</Button>
        </div>
      </Modal>
    </div>
  );
}