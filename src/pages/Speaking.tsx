import { useMemo, useState } from 'react';
import { Mic, MicOff, Play, RotateCcw, Square, Timer, Volume2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SectionTitle, Textarea } from '../components/ui';
import { useApp } from '../store/AppContext';
import { SPEAKING_TOPICS, analyseSpeaking, examinerQuestion } from '../lib/ai/speaking';
import { speechSupported, useDictation } from '../lib/useDictation';
import { relativeTime, round1 } from '../lib/utils';
import type { SpeakingSession } from '../lib/types';

type Part = 1 | 2 | 3 | 'full';

export default function Speaking() {
  const { db, saveSpeaking } = useApp();
  const [part, setPart] = useState<Part>(1);
  const [topic, setTopic] = useState<string>(SPEAKING_TOPICS[0]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<SpeakingSession | null>(null);

  const dictation = useDictation((t) => setAnswer((a) => (a ? `${a} ${t}` : t)));

  const question = useMemo(() => {
    const p: 1 | 2 | 3 = part === 'full' ? (([1, 2, 3] as const)[index % 3] ?? 1) : part;
    return examinerQuestion(p, index, topic);
  }, [part, index, topic]);

  const begin = () => setStartedAt(Date.now());

  const submit = () => {
    if (!startedAt || answer.trim().length < 5) return;
    const analysis = analyseSpeaking({ text: answer, durationMs: Date.now() - startedAt, part });
    const session = saveSpeaking({
      part, topic: question.topic,
      transcript: [
        { role: 'examiner', text: question.question, at: startedAt },
        { role: 'candidate', text: answer, at: Date.now() },
      ],
      durationMs: Date.now() - startedAt, scores: analysis.scores, overall: analysis.overall,
      words: analysis.words, repeatedWords: analysis.repeatedWords, fillers: analysis.fillers,
      hesitationMarkers: analysis.hesitationMarkers, recommendations: analysis.recommendations,
    });
    setResult(session);
    setAnswer('');
    setStartedAt(null);
    dictation.stop();
  };

  const reset = () => { setResult(null); setIndex(0); setStartedAt(null); dictation.stop(); };

  return (
    <div className="space-y-6">
      <PageHeader icon={Mic} title="Speaking Lab"
        subtitle="An IELTS-style examiner asks the question. Speak, dictate or type — then get feedback on fluency, vocabulary and grammar." />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            {([[1, 'Part 1 — Interview'], [2, 'Part 2 — Long turn'], [3, 'Part 3 — Discussion'], ['full', 'Full test']] as [Part, string][]).map(([p, label]) => (
              <button key={p} onClick={() => { setPart(p); reset(); }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${part === p ? 'bg-brand text-white' : 'bg-ink-500/5 text-muted hover:text-[rgb(var(--text))]'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic"
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:border-brand">
              {SPEAKING_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Badge tone="neutral">Question {index + 1}</Badge>
            {startedAt && <Badge tone="brand"><Timer className="h-3 w-3" />{Math.max(1, Math.round((Date.now() - startedAt) / 1000))}s</Badge>}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{question.topic}</p>
            <p className="mt-2 font-display text-xl font-bold">{question.question}</p>
            {part === 2 && <p className="mt-3 text-sm text-white/75">Speak for 1–2 minutes, using each bullet point in turn.</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={Volume2}
              onClick={() => { const u = new SpeechSynthesisUtterance(question.question); window.speechSynthesis.speak(u); }}>Listen</Button>
            {!startedAt
              ? <Button onClick={begin} icon={Play}>Start answering</Button>
              : <Button onClick={submit} disabled={answer.trim().length < 5} icon={Square}>Finish and analyse</Button>}
            <Button variant="ghost" onClick={() => { setIndex((i) => i + 1); setStartedAt(null); }}>Next question</Button>
            <Button variant="ghost" onClick={reset} icon={RotateCcw}>Reset</Button>
          </div>

          <Textarea rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder={dictation.active ? 'Listening — speak now…' : 'Type what you would say, or dictate using the button below…'} />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={dictation.active ? MicOff : Mic} onClick={dictation.active ? dictation.stop : dictation.start} disabled={!speechSupported()}>
              {dictation.active ? 'Stop dictation' : 'Dictate my answer'}
            </Button>
            {!speechSupported() && <span className="text-xs text-muted">Dictation is not supported in this browser — typing works everywhere.</span>}
            {dictation.error && <span className="text-xs text-rose2-500">{dictation.error}</span>}
          </div>
        </Card>

<div className="space-y-6">
          {result ? (
            <Card className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <SectionTitle title="Examiner feedback" subtitle="Estimated — not an official IELTS result" />
                <div className="text-right"><p className="font-display text-3xl font-bold text-brand">{result.overall}</p><Badge tone="brand">overall</Badge></div>
              </div>
              <div className="space-y-3">
                {([['Fluency & Coherence', result.scores.fluency], ['Lexical Resource', result.scores.lexical], ['Grammatical Range', result.scores.grammar]] as [string, number][]).map(([label, v]) => (
                  <div key={label} className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{label}</span><span className="font-display font-bold">{v}</span></div>
                    <Progress value={(v / 9) * 100} tone={v >= 7 ? 'good' : v >= 5.5 ? 'warn' : 'bad'} />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[['Words', result.words], ['Fillers', result.fillers], ['Repeats', result.repeatedWords.length], ['Secs', Math.round(result.durationMs / 1000)]].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl bg-[rgb(var(--surface-2))] p-2">
                    <p className="font-display text-base font-bold">{v}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted">{l}</p>
                  </div>
                ))}
              </div>
              {result.repeatedWords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.repeatedWords.map((w) => <Badge key={w.word} tone="warn">{w.word} ×{w.count}</Badge>)}
                </div>
              )}
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold">What to fix next</h3>
                <ul className="space-y-1.5">
                  {result.recommendations.map((r) => <li key={r} className="text-xs leading-relaxed text-muted">• {r}</li>)}
                </ul>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <SectionTitle title="How this works" subtitle="IELTS Speaking, simulated" />
              <ul className="space-y-2.5 text-xs leading-relaxed text-muted">
                {['Part 1: three or four short questions about familiar topics.',
                  'Part 2: speak for one to two minutes on a long turn.',
                  'Part 3: abstract discussion questions that go deeper.',
                  'Answer naturally — accuracy and range matter more than memorised scripts.'].map((t) => (
                    <li key={t} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{t}</li>
                  ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle title="Session history" subtitle={`${db.speaking.length} sessions completed`} />
            {db.speaking.length === 0 ? (
              <EmptyState icon={Mic} title="No speaking sessions yet" body="Your scores, fluency trends and recommendations will build up here." />
            ) : (
              <ul className="space-y-2">
                {db.speaking.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{s.overall}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.topic} · Part {s.part}</p>
                      <p className="text-xs text-muted">{s.words} words · {round1(s.words / Math.max(0.5, s.durationMs / 60000))} wpm · {relativeTime(s.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}