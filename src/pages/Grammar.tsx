import { useMemo, useState } from 'react';
import { Target, Wand2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SectionTitle, Tabs } from '../components/ui';
import { RichText } from '../components/Common';
import { useApp } from '../store/AppContext';
import { GRAMMAR_EXPLAINERS } from '../lib/ai/grammarRef';
import { GRAMMAR_RULES } from '../lib/ai/generate';

export default function Grammar() {
  const { db, addTask } = useApp();
  const [topic, setTopic] = useState<string>('All topics');
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    db.mistakes.filter((m) => m.kind === 'grammar' || m.kind === 'writing').forEach((m) => {
      const key = GRAMMAR_RULES.find((r) => m.title.includes(r.label))?.label ?? m.title;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [db.mistakes]);

  const topics = ['All topics', ...Object.keys(GRAMMAR_EXPLAINERS)];
  const visible = topics.filter((t) => t === 'All topics' || counts.get(t));
  const totalIssues = [...counts.values()].reduce((a, b) => a + b, 0);

  const weakest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      <PageHeader icon={Wand2} title="Grammar"
        subtitle="Weaknesses are detected automatically from your Writing Lab essays and every test you take." />

      {totalIssues === 0 ? (
        <EmptyState icon={Target} title="No grammar issues detected yet"
          body="Write an essay in Writing Lab or take a test — Bandit flags recurring grammar errors and builds targeted practice here."
          action={<Button size="sm" onClick={() => addTask({ title: 'Grammar practice', skill: 'writing', minutes: 20 })}>Add a grammar session</Button>} />
      ) : (
        <>
          <Card className="p-5">
            <SectionTitle title="Your weak spots" subtitle={`${totalIssues} recorded issues${weakest ? ` · most frequent: ${weakest[0]}` : ''}`} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => (
                <button key={label} onClick={() => setOpen(label)}
                  className="rounded-xl border border-[rgb(var(--border))] p-4 text-left transition hover:border-brand">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{label}</p>
                    <Badge tone={n >= 3 ? 'bad' : n === 2 ? 'warn' : 'neutral'}>{n}</Badge>
                  </div>
                  <Progress className="mt-2" value={Math.min(100, n * 25)} tone={n >= 3 ? 'bad' : 'warn'} />
                </button>
              ))}
            </div>
            <Button className="mt-4" icon={Target} onClick={() => addTask({ title: `Targeted grammar practice — ${weakest?.[0] ?? 'general'}`, skill: 'writing', minutes: 20, source: 'ai', priority: 1 })}>
              Schedule targeted practice
            </Button>
          </Card>

          {open && GRAMMAR_EXPLAINERS[open] && (
            <Card className="p-5">
              <SectionTitle title={open} action={<Button size="sm" variant="ghost" onClick={() => setOpen(null)}>Close</Button>} />
              <RichText text={GRAMMAR_EXPLAINERS[open]} className="text-sm" />
              <div className="mt-4 rounded-xl bg-brand-soft p-4">
                <p className="text-xs font-semibold text-brand">Practice this now</p>
                <p className="mt-1 text-xs text-muted">
                  Generate a test from any material and include Grammar questions — the engine will pull items from your own text.
                </p>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle title="Reference" subtitle="Every grammar area IELTS tests" />
            <Tabs value={topic} onChange={setTopic} tabs={visible.map((t) => ({ value: t, label: t, count: counts.get(t) }))} />
            <div className="mt-4 space-y-3">
              {Object.entries(GRAMMAR_EXPLAINERS).filter(([k]) => topic === 'All topics' || k === topic).map(([k, v]) => (
                <details key={k} className="rounded-xl border border-[rgb(var(--border))] p-4">
                  <summary className="cursor-pointer font-display text-sm font-bold">{k}</summary>
                  <RichText text={v} className="mt-3" />
                </details>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}