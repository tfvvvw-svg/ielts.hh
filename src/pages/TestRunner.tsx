import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, ChevronDown, Clock, FileText, RotateCcw, Timer, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Progress } from '../components/ui';
import { RichText } from '../components/Common';
import { useApp } from '../store/AppContext';
import { typeLabel, type QuestionType, type AnswerRecord, type TestResult } from '../lib/types';
import { isCorrect, pct, skillBand, uid } from '../lib/utils';

export default function TestRunner() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, saveResult, recordMistake, logStudy } = useApp();
  const test = db.tests.find((t) => t.id === id);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const startedAt = useRef(Date.now());
  const autoSubmitted = useRef(false);

  const questions = test?.questions ?? [];
  const total = questions.length;

  useEffect(() => { startedAt.current = Date.now(); autoSubmitted.current = false; }, [id]);

  useEffect(() => {
    if (!test || test.timeLimitMinutes <= 0 || submitted) return undefined;
    setSecondsLeft(test.timeLimitMinutes * 60);
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [test?.id, submitted]);

  useEffect(() => {
    if (secondsLeft === 0 && test && test.timeLimitMinutes > 0 && !submitted && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, submitted, test?.id]);

  const answeredCount = Object.values(answers).filter((v) => v.trim()).length;

  const byType = useMemo(() => {
    const out: Record<string, { ok: number; total: number }> = {};
    questions.forEach((q) => {
      const correct = isCorrect(answers[q.id] ?? '', q.answer, q.accept);
      const e = out[q.type] ?? { ok: 0, total: 0 };
      e.total += 1;
      if (correct) e.ok += 1;
      out[q.type] = e;
    });
    return out;
  }, [answers, questions]);

  function submit(auto = false) {
    if (!test || submitted) return;
    const records: AnswerRecord[] = questions.map((q) => ({
      questionId: q.id, type: q.type, given: answers[q.id] ?? '',
      correct: isCorrect(answers[q.id] ?? '', q.answer, q.accept), timeSpentMs: 0,
    }));
    const score = records.filter((r) => r.correct).length;
    const percentage = pct(score, records.length);
    const durationMs = Date.now() - startedAt.current;
    const bySkillType = Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, pct(v.ok, v.total)]));

    const res: TestResult = {
      id: uid(), userId: 'local-user', testId: test.id, testTitle: test.title, skill: test.skill,
      difficulty: test.difficulty, score, total: records.length, percentage, band: skillBand(percentage),
      answers: records, durationMs, createdAt: Date.now(), bySkillType,
    };
    saveResult(res);
    logStudy(Math.max(1, Math.round(durationMs / 60000)), test.skill);
    questions.forEach((q, i) => {
      if (records[i].correct) return;
      recordMistake({
        kind: test.skill === 'writing' ? 'writing' : test.skill === 'listening' ? 'listening' : 'reading',
        skill: test.skill, questionType: q.type, title: typeLabel(q.type),
        given: records[i].given || '(no answer)', correct: q.answer, explanation: q.explanation,
        topic: test.topic, sourceMaterialId: test.materialId,
      });
    });
    setResult(res);
    setSubmitted(true);
    if (auto) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

if (!test) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/test-generator')}>Back to generator</Button>
        <EmptyState icon={FileText} title="Test not found" body="This test may have been deleted. Generate a new one from your materials."
          action={<Button size="sm" onClick={() => navigate('/test-generator')}>Generate a test</Button>} />
      </div>
    );
  }

  const q = questions[index];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/test-generator')}>Generator</Button>
          <h1 className="mt-1 truncate font-display text-xl font-bold">{test.title}</h1>
          <p className="text-xs text-muted">{total} questions · {test.difficulty} · {test.mode} · topic: {test.topic}</p>
        </div>
        <div className="flex items-center gap-3">
          {test.timeLimitMinutes > 0 && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${secondsLeft < 60 ? 'bg-rose2-500/15 text-rose2-500' : 'bg-brand-soft text-brand'}`}>
              <Timer className="h-4 w-4" />{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </div>
          )}
          <Badge tone="brand">{answeredCount}/{total} answered</Badge>
        </div>
      </div>

      <Progress value={total ? (answeredCount / total) * 100 : 0} />

      {submitted && result ? (
        <Results result={result} byType={byType} onRetry={() => { setAnswers({}); setSubmitted(false); setIndex(0); setResult(null); autoSubmitted.current = false; startedAt.current = Date.now(); }} />
      ) : (
        <>
          {test.passage && <Passage text={test.passage} />}
          {q && (
            <Card className="p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge tone="neutral">Question {index + 1} of {total}</Badge>
                <Badge tone="brand">{typeLabel(q.type as QuestionType)}</Badge>
              </div>
              {q.context && !test.passage && <p className="mb-4 rounded-xl bg-[rgb(var(--surface-2))] p-3.5 text-sm leading-relaxed">{q.context}</p>}
              <p className="font-display text-base font-semibold">{q.prompt.replace(/\*\*/g, '')}</p>
              <div className="mt-4">
                {q.options ? (
                  <div className="space-y-2">
                    {q.options.map((o) => (
                      <label key={o} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition ${answers[q.id] === o ? 'border-brand bg-brand-soft' : 'border-[rgb(var(--border))] hover:border-brand/50'}`}>
                        <input type="radio" name={q.id} value={o} checked={answers[q.id] === o} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))} className="h-4 w-4 accent-[rgb(var(--brand))]" />
                        {o}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Type your answer" aria-label="Your answer"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
                )}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} icon={ArrowLeft}>Previous</Button>
                {index === total - 1
                  ? <Button onClick={() => submit(false)} icon={CheckCircle2}>Submit test</Button>
                  : <Button onClick={() => setIndex((i) => i + 1)}>Next<ArrowRight className="h-4 w-4" /></Button>}
              </div>
            </Card>
          )}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((item, i) => (
              <button key={item.id} onClick={() => setIndex(i)} aria-label={`Go to question ${i + 1}`}
                className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${i === index ? 'bg-brand text-white' : answers[item.id] ? 'bg-mint-500/20 text-mint-600 dark:text-mint-400' : 'bg-ink-500/5 text-muted'}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <Button full size="lg" onClick={() => submit(false)} disabled={answeredCount === 0} icon={CheckCircle2}>
            Submit test ({answeredCount}/{total} answered)
          </Button>
        </>
      )}
    </div>
  );
}

function Passage({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-2 font-display text-sm font-bold"><FileText className="h-4 w-4 text-brand" />Source passage</span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="max-h-80 overflow-y-auto border-t border-[rgb(var(--border))] px-5 py-4 text-sm leading-relaxed">
        {text.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
      </div>}
    </Card>
  );
}

function Results({ result, byType, onRetry }: {
  result: TestResult; byType: Record<string, { ok: number; total: number }>; onRetry: () => void;
}) {
  const navigate = useNavigate();
  const { db } = useApp();
  const test = db.tests.find((t) => t.id === result.testId);
  const passed = result.percentage >= 60;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
        <Card className="overflow-hidden text-center">
          <div className={`p-8 text-white ${passed ? 'bg-gradient-to-br from-mint-600 to-mint-500' : 'bg-gradient-to-br from-brand-600 to-brand-800'}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Test complete</p>
            <p className="mt-2 font-display text-6xl font-extrabold">{result.percentage}%</p>
            <p className="mt-1 text-sm text-white/80">{result.score} of {result.total} correct · estimated Band {result.band} · {Math.max(1, Math.round(result.durationMs / 60000))} min</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 p-4">
            <Badge tone={passed ? 'good' : 'warn'}>{passed ? 'Solid' : 'Needs work'}</Badge>
            <Badge tone="neutral">{(result.durationMs / 1000 / Math.max(1, result.total)).toFixed(0)}s per question</Badge>
          </div>
        </Card>
      </motion.div>

      <Card>
        <h2 className="mb-3 font-display text-base font-bold">Performance by question type</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(byType).map(([type, v]) => {
            const p = pct(v.ok, v.total);
            return (
              <div key={type} className="rounded-xl border border-[rgb(var(--border))] p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{typeLabel(type as QuestionType)}</span>
                  <span className="text-muted">{p}% ({v.ok}/{v.total})</span>
                </div>
                <Progress value={p} tone={p >= 75 ? 'good' : p >= 50 ? 'warn' : 'bad'} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-bold">Answer review</h2>
        <ul className="space-y-3">
          {(test?.questions ?? []).map((item, i) => {
            const rec = result.answers.find((a) => a.questionId === item.id);
            const ok = rec?.correct ?? false;
            return (
              <li key={item.id} className={`rounded-xl border p-4 ${ok ? 'border-mint-500/30 bg-mint-500/5' : 'border-rose2-500/30 bg-rose2-500/5'}`}>
                <div className="flex items-start gap-3">
                  {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose2-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{i + 1}. {item.prompt.replace(/\*\*/g, '')}</p>
                    {item.context && <p className="mt-1.5 text-xs italic text-muted">“{item.context}”</p>}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge tone={ok ? 'good' : 'bad'}>Your answer: {rec?.given || '—'}</Badge>
                      {!ok && <Badge tone="neutral">Correct: {item.answer}</Badge>}
                    </div>
                    <RichText text={item.explanation} className="mt-2 text-muted" />
                    {item.source.evidence && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-brand">Show source evidence</summary>
                        <p className="mt-1.5 rounded-lg bg-[rgb(var(--surface-2))] p-3 text-xs italic text-muted">“{item.source.evidence}”</p>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Award className="h-4 w-4 text-brand" />
          {passed ? 'Wrong answers were added to your Mistake Bank for targeted practice.' : 'Every wrong answer is in your Mistake Bank — drill them before your next attempt.'}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={RotateCcw} onClick={onRetry}>Retake</Button>
          <Button onClick={() => navigate('/mistakes?drill=1')} icon={Award}>Practice my mistakes</Button>
        </div>
      </Card>
      <p className="text-center text-[11px] text-muted">
        <Clock className="mr-1 inline h-3 w-3" />
        This band is an estimate from this practice test only — not an official IELTS score.
      </p>
    </div>
  );
}