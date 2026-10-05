import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Sparkles, Target } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, Tabs } from '../components/ui';
import { RichText } from '../components/Common';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL } from '../lib/brain';
import { QUESTION_TYPE_LABEL } from '../lib/types';
import { isCorrect, relativeTime } from '../lib/utils';

export default function Mistakes() {
  const { db, resolveMistake, createTest, recordMistake, logStudy } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'open' | 'resolved' | 'all'>('open');
  const [drillIndex, setDrillIndex] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  void params;

  const list = useMemo(() => db.mistakes
    .filter((m) => (tab === 'all' ? true : tab === 'open' ? !m.resolved : m.resolved))
    .sort((a, b) => b.repetitions - a.repetitions || b.lastMistakeAt - a.lastMistakeAt), [db.mistakes, tab]);

  const drillSet = useMemo(() => db.mistakes.filter((m) => !m.resolved).sort((a, b) => b.repetitions - a.repetitions), [db.mistakes]);
  const current = drillIndex === null ? null : drillSet[drillIndex];

  const startDrill = () => {
    setParams({ drill: '1' });
    setDrillIndex(0); setInput(''); setChecked(false); setFeedback(null);
  };
  const endDrill = () => { setParams({}); setDrillIndex(null); setInput(''); setFeedback(null); };

  const check = () => {
    if (!current) return;
    const correct = isCorrect(input, current.correct);
    setChecked(true);
    setFeedback(correct
      ? 'Correct — this mistake is now marked as resolved.'
      : `Not quite. The correct answer is “${current.correct}”. This mistake has been logged again so it comes back sooner.`);
    if (correct) { resolveMistake(current.id); logStudy(2, current.skill); }
    else {
      recordMistake({
        kind: current.kind, skill: current.skill, questionType: current.questionType,
        title: current.title, given: input || '(no answer)', correct: current.correct,
        explanation: current.explanation, topic: current.topic, sourceMaterialId: current.sourceMaterialId,
      });
    }
  };

  const buildMistakeTest = () => {
    const material = db.materials[0];
    const test = createTest({
      title: 'Practice my mistakes', skill: current?.skill ?? 'reading',
      types: ['fill_blank', 'short_answer', 'grammar', 'multiple_choice'],
      difficulty: 'easy', count: Math.max(3, Math.min(12, drillSet.length)), mode: 'mistake_drill',
      timeLimitMinutes: 0, language: 'en', topic: 'My mistakes',
      passage: material?.text ?? '', materialId: material?.id, questions: [],
    });
    logStudy(10, test.skill);
    navigate(`/test/${test.id}`);
  };

if (current) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader icon={Target} title="Practice my mistakes"
          subtitle={`Item ${(drillIndex ?? 0) + 1} of ${drillSet.length} · ${SKILL_LABEL[current.skill]} · missed ${current.repetitions}×`}
          action={<Button variant="ghost" onClick={endDrill}>End drill</Button>} />
        <Progress value={((drillIndex ?? 0) / Math.max(1, drillSet.length)) * 100} />
        <Card className="p-6">
          <Badge tone="neutral">{current.questionType ? QUESTION_TYPE_LABEL[current.questionType] : current.title}</Badge>
          <h2 className="mt-3 font-display text-lg font-bold">{current.title}</h2>
          <p className="mt-2 rounded-xl bg-[rgb(var(--surface-2))] p-4 text-sm">
            <span className="text-muted">Your previous answer: </span>
            <span className="text-rose2-500">{current.given}</span>
          </p>
          <p className="mt-3 text-sm">Write the correct version:</p>
          <input value={input} onChange={(e) => setInput(e.target.value)} disabled={checked}
            placeholder="Type the corrected answer…" aria-label="Your corrected answer"
            className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60" />
          {feedback && (
            <div className="mt-4 rounded-xl bg-brand-soft p-4 text-sm text-brand">
              <p>{feedback}</p>
              <RichText text={current.explanation} className="mt-2 text-xs" />
            </div>
          )}
          <div className="mt-5 flex gap-2">
            {!checked
              ? <Button onClick={check} disabled={input.trim().length === 0}>Check answer</Button>
              : <Button onClick={() => {
                if ((drillIndex ?? 0) + 1 >= drillSet.length) endDrill();
                else { setDrillIndex((drillIndex ?? 0) + 1); setInput(''); setChecked(false); setFeedback(null); }
              }}>{(drillIndex ?? 0) + 1 >= drillSet.length ? 'Finish drill' : 'Next mistake'}</Button>}
            <Button variant="ghost" onClick={endDrill}>Exit</Button>
          </div>
        </Card>
      </div>
    );
  }

return (
    <div className="space-y-6">
      <PageHeader icon={Target} title="Mistake Bank"
        subtitle="Every wrong answer is stored with its reason. Repeated mistakes trigger targeted practice automatically."
        action={<Button icon={Sparkles} onClick={startDrill} disabled={!drillSet.length}>Practice my mistakes</Button>} />

      {db.mistakes.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No mistakes recorded — yet"
          body="Every wrong answer is logged here automatically with an explanation and the source sentence. Take a test to start building your bank."
          action={<Button size="sm" onClick={() => navigate('/test-generator')}>Generate a test</Button>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs uppercase tracking-wider text-muted">Open</p><p className="mt-1 font-display text-2xl font-bold">{drillSet.length}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase tracking-wider text-muted">Repeated 2+ times</p><p className="mt-1 font-display text-2xl font-bold text-rose2-500">{db.mistakes.filter((m) => m.repetitions >= 2 && !m.resolved).length}</p></Card>
            <Card className="p-4"><p className="text-xs uppercase tracking-wider text-muted">Resolved</p><p className="mt-1 font-display text-2xl font-bold text-mint-500">{db.mistakes.filter((m) => m.resolved).length}</p></Card>
          </div>

          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'open', label: 'Open', count: drillSet.length },
            { value: 'resolved', label: 'Resolved', count: db.mistakes.filter((m) => m.resolved).length },
            { value: 'all', label: 'All', count: db.mistakes.length },
          ]} />

          {list.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing here" body="Switch tabs to see other mistakes." />
          ) : (
            <ul className="space-y-3">
              {list.map((m) => (
                <li key={m.id} className="surface rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={m.repetitions >= 2 ? 'bad' : 'neutral'}>{m.repetitions}× repeated</Badge>
                        <Badge tone="neutral">{SKILL_LABEL[m.skill]}</Badge>
                        {m.questionType && <Badge tone="brand">{QUESTION_TYPE_LABEL[m.questionType]}</Badge>}
                        {m.resolved && <Badge tone="good">Resolved</Badge>}
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold">{m.title}</h3>
                    </div>
                    {!m.resolved && <Button size="sm" variant="outline" onClick={() => resolveMistake(m.id)}>Mark resolved</Button>}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-rose2-500/5 p-3"><p className="text-[11px] uppercase tracking-wider text-muted">Your answer</p><p className="mt-1 text-sm text-rose2-500">{m.given}</p></div>
                    <div className="rounded-xl bg-mint-500/5 p-3"><p className="text-[11px] uppercase tracking-wider text-muted">Correct</p><p className="mt-1 text-sm text-mint-600 dark:text-mint-400">{m.correct}</p></div>
                  </div>
                  <RichText text={m.explanation} className="mt-3 text-muted" />
                  <p className="mt-3 text-[11px] text-muted">Last missed {relativeTime(m.lastMistakeAt)} · topic: {m.topic}</p>
                </li>
              ))}
            </ul>
          )}

          {drillSet.length > 0 && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h2 className="font-display text-base font-bold">Turn mistakes into a full test</h2>
                <p className="mt-1 text-xs text-muted">Generates a grounded practice set from your own materials, focused on your error patterns.</p>
              </div>
              <Button onClick={buildMistakeTest} icon={Sparkles} disabled={!db.materials.length}>Generate mistake test</Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}