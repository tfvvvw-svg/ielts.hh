import { useMemo, useState } from 'react';
import { FileText, Save, Trash2, Wand2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SectionTitle, Select, Textarea } from '../components/ui';
import { useApp } from '../store/AppContext';
import { RichText } from '../components/Common';
import { TASK_PROMPTS, analyseEssay } from '../lib/ai/essay';
import { findGrammarIssues } from '../lib/ai/generate';
import { relativeTime, round1 } from '../lib/utils';
import type { Essay } from '../lib/types';

export default function Writing() {
  const { db, saveEssay, deleteEssay, recordMistake } = useApp();
  const [taskIndex, setTaskIndex] = useState(0);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<Essay | null>(null);
  const [selected, setSelected] = useState<Essay | null>(null);

  const prompt = TASK_PROMPTS[taskIndex];
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const live = useMemo(() => (words > 30 ? analyseEssay(text) : null), [text, words]);
  const history = db.essays;

  const submit = () => {
    if (words < 20) return;
    const essay = saveEssay({ task: prompt.task, prompt: prompt.prompt, text });
    setSaved(essay);
    setText('');
    findGrammarIssues(essay.text).slice(0, 3).forEach(({ rule, match, correct }) => {
      recordMistake({
        kind: 'writing', skill: 'writing', title: rule.label, given: match,
        correct, explanation: rule.why, topic: 'Writing Lab',
      });
    });
  };

  const shown = selected ?? saved;

  return (
    <div className="space-y-6">
      <PageHeader icon={FileText} title="Writing Lab"
        subtitle="Write or paste an essay. Bandit scores all four IELTS criteria and shows exactly which sentences hold you back." />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle title="Task" action={
              <Select value={taskIndex} onChange={(e) => setTaskIndex(Number(e.target.value))} className="w-40">
                {TASK_PROMPTS.map((p, i) => <option key={p.task} value={i}>{p.task}</option>)}
              </Select>
            } />
            <div className="rounded-xl bg-brand-soft p-4 text-sm text-brand">{prompt.prompt}</div>
            <Textarea className="mt-4" rows={14} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Start writing here… Write at least 250 words for Task 2." />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className={words < prompt.min ? 'text-amber2-500' : 'text-mint-500'}>{words} words</span>
                <span>(minimum {prompt.min})</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setText('')}>Clear</Button>
                <Button onClick={submit} disabled={words < 20} icon={Save}>Analyse essay</Button>
              </div>
            </div>
            <div className="mt-3"><Progress value={Math.min(100, (words / prompt.min) * 100)} tone={words >= prompt.min ? 'good' : 'warn'} /></div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Writing history" subtitle={`${history.length} essays analysed`} />
            {history.length === 0 ? (
              <EmptyState icon={FileText} title="No essays yet" body="Your first analysed essay appears here with a full four-criteria breakdown." />
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                    <button onClick={() => setSelected(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{e.analysis.overall}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.task} · {e.words} words</p>
                        <p className="text-xs text-muted">{relativeTime(e.createdAt)}</p>
                      </div>
                    </button>
                    <button onClick={() => { deleteEssay(e.id); if (selected?.id === e.id) setSelected(null); }} aria-label={`Delete essay ${e.task}`}
                      className="rounded-lg p-2 text-muted transition hover:bg-rose2-500/10 hover:text-rose2-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <AnalysisPanel essay={shown} live={live} />
          {history.length >= 2 && <TrendCard history={history} />}
        </div>
      </div>
    </div>
  );
}

function AnalysisPanel({ essay, live }: { essay: Essay | null; live: ReturnType<typeof analyseEssay> | null }) {
  const a = essay?.analysis ?? live;
  if (!a) {
    return (
      <Card className="p-5">
        <SectionTitle title="Live analysis" subtitle="Appears as you type, once there is enough to score" />
        <EmptyState icon={Wand2} title="Nothing to analyse yet" body="Write at least 30 words and Bandit will score all four IELTS criteria in real time." />
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{essay ? 'Essay analysis' : 'Live analysis'}</h2>
          <p className="text-xs text-muted">Estimated for practice — not an official IELTS result</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold text-brand">{a.overall}</p>
          <Badge tone="brand">estimated band</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {a.criteria.map((c) => (
          <div key={c.key} className="rounded-xl border border-[rgb(var(--border))] p-3">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{c.label}</span>
              <span className="font-display text-lg font-bold">{c.band}</span>
            </div>
            <Progress value={(c.band / 9) * 100} tone={c.band >= 7 ? 'good' : c.band >= 5.5 ? 'warn' : 'bad'} />
            <p className="mt-1.5 text-xs text-muted">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[['Words', essay?.words ?? 0], ['Avg sentence', a.avgSentenceLength], ['Complex', a.complexSentences]].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl bg-[rgb(var(--surface-2))] p-3">
            <p className="font-display text-lg font-bold">{v}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{l}</p>
          </div>
        ))}
      </div>

      {a.strengths.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-mint-600 dark:text-mint-400">Strengths</h3>
          <ul className="space-y-1.5">
            {a.strengths.map((s) => <li key={s} className="text-xs text-muted">• {s}</li>)}
          </ul>
        </div>
      )}

      {a.issues.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <h3 className="text-sm font-semibold">How to improve</h3>
          {a.issues.slice(0, 8).map((iss, i) => (
            <div key={i} className="rounded-xl border border-[rgb(var(--border))] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={iss.kind === 'grammar' ? 'bad' : iss.kind === 'task' ? 'warn' : 'neutral'}>{iss.kind}</Badge>
                <p className="text-xs font-medium">{iss.problem}</p>
              </div>
              {iss.original && <p className="mt-2 text-xs text-rose2-500 line-through">{iss.original.slice(0, 180)}</p>}
              {iss.better && <p className="mt-1 text-xs text-mint-600 dark:text-mint-400">{iss.better.slice(0, 220)}</p>}
              <RichText text={iss.why} className="mt-1.5 text-[11px] text-muted" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TrendCard({ history }: { history: Essay[] }) {
  const sorted = [...history].sort((a, b) => a.createdAt - b.createdAt);
  const first = sorted[0].analysis.overall;
  const latest = sorted[sorted.length - 1].analysis.overall;
  const delta = round1(latest - first);
  return (
    <Card className="p-5">
      <SectionTitle title="Your writing trend" subtitle="From your first essay to your latest" />
      <div className="flex items-center gap-4">
        <div><p className="font-display text-2xl font-bold">{first}</p><p className="text-xs text-muted">first</p></div>
        <div className="h-px flex-1 bg-[rgb(var(--border))]" />
        <div><p className="font-display text-2xl font-bold text-brand">{latest}</p><p className="text-xs text-muted">latest</p></div>
        <Badge tone={delta > 0 ? 'good' : delta < 0 ? 'bad' : 'neutral'}>{delta > 0 ? '+' : ''}{delta}</Badge>
      </div>
    </Card>
  );
}