import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Clock, FileText, Image as ImageIcon, ListChecks, Sparkles, Type, Wand2, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Tabs, Textarea } from '../components/ui';
import { useApp } from '../store/AppContext';
import { LISTENING_TYPES, QUESTION_TYPE_LABEL, READING_TYPES, type Difficulty, type ISkill, type QuestionType } from '../lib/types';
import { generateFromPassage } from '../lib/ai/generate';
import { detectTopic, sentences, wordCount } from '../lib/ai/text';
import { suggestDifficulty } from '../lib/brain';
import { uid } from '../lib/utils';

const SKILL_TYPES: Record<ISkill, QuestionType[]> = {
  listening: LISTENING_TYPES,
  reading: READING_TYPES,
  writing: ['fill_blank', 'grammar', 'short_answer', 'vocabulary'],
  speaking: ['short_answer'],
};

const MODES = [
  { value: 'practice', label: 'Practice — untimed' },
  { value: 'timed', label: 'Timed — countdown timer' },
  { value: 'exam', label: 'Exam conditions — strict timer' },
] as const;

export default function TestGenerator() {
  const { db, createTest } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'source' | 'paste'>('source');
  const [skill, setSkill] = useState<ISkill>('reading');
  const [materialId, setMaterialId] = useState('');
  const [pasted, setPasted] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | 'auto'>('auto');
  const [types, setTypes] = useState<QuestionType[]>(['multiple_choice', 'sentence_completion']);
  const [mode, setMode] = useState<'practice' | 'timed' | 'exam'>('practice');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const material = db.materials.find((m) => m.id === materialId);
  const passage = (tab === 'source' ? material?.text ?? '' : pasted).trim();

  const preview = useMemo(() => (passage.length > 120
    ? generateFromPassage({ skill, types, difficulty: 'medium', count, passage, materialId }).length
    : 0), [skill, types, count, passage, materialId]);

  const toggleType = (t: QuestionType) => {
    setTypes((prev) => (prev.includes(t) ? (prev.length === 1 ? prev : prev.filter((x) => x !== t)) : [...prev, t]));
  };

  const generate = () => {
    setError(null);
    if (passage.length < 200) { setError('Add at least 200 characters of source material — questions are built only from text you provide.'); return; }
    if (sentences(passage).length < 4) { setError('This text is too short for reliable questions. Paste a full paragraph or more.'); return; }

    setGenerating(true);
    setTimeout(() => {
      const resolved = difficulty === 'auto' ? suggestDifficulty(db, skill) : difficulty;
      const questions = generateFromPassage({ skill, types, difficulty: resolved, count, passage, materialId: material?.id }).map((q) => ({ ...q, id: uid() }));
      if (questions.length === 0) {
        setGenerating(false);
        setError('No questions could be built from this text. Try different question types or longer material.');
        return;
      }
      const test = createTest({
        title: `${skill[0].toUpperCase()}${skill.slice(1)} · ${material?.title ?? 'Custom text'}`,
        skill, types, difficulty: resolved, count: questions.length, mode,
        timeLimitMinutes: mode === 'practice' ? 0 : mode === 'timed' ? Math.max(5, Math.round(questions.length * 1.5)) : questions.length * 2,
        language: 'en', topic: detectTopic(passage), passage, materialId: material?.id,
        questions,
      });
      setGenerating(false);
      navigate(`/test/${test.id}`);
    }, 650);
  };

return (
    <div className="space-y-6">
      <PageHeader icon={Sparkles} title="AI Test Generator"
        subtitle="Build a practice test from your own material. Every question is extracted from the source text — nothing is invented." />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-6">
          <Card>
            <StepHead icon={BookMarked} title="1. Choose your source" subtitle="Questions are grounded in this text only" />
            <Tabs tabs={[{ value: 'source', label: 'From my materials', count: db.materials.length }, { value: 'paste', label: 'Paste text' }]} value={tab} onChange={setTab} />
            <div className="mt-4">
              {tab === 'source' ? (
                db.materials.length === 0 ? (
                  <EmptyState icon={ImageIcon} title="No materials yet"
                    body="Add a passage, screenshot or PDF in My Materials and it becomes a permanent source for grounded tests."
                    action={<Button size="sm" onClick={() => navigate('/materials')}>Go to Materials</Button>} />
                ) : (
                  <div className="space-y-2">
                    {db.materials.map((m) => (
                      <button key={m.id} onClick={() => setMaterialId(m.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${materialId === m.id ? 'border-brand bg-brand-soft' : 'border-[rgb(var(--border))] hover:border-brand/50'}`}>
                        <FileText className="h-4 w-4 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{m.title}</span>
                          <span className="block text-xs text-muted">{m.wordCount} words · {m.topic}</span>
                        </span>
                        {materialId === m.id && <Badge tone="brand">Selected</Badge>}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <Textarea rows={8} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste any passage here — a textbook page, an article, your own notes…" />
              )}
            </div>
            {passage.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[rgb(var(--surface-2))] px-3 py-2 text-xs text-muted">
                <Type className="h-3.5 w-3.5" />
                {wordCount(passage)} words · {sentences(passage).length} sentences · topic: {detectTopic(passage)}
                <button onClick={() => { setMaterialId(''); setPasted(''); }} className="ml-auto flex items-center gap-1 hover:text-[rgb(var(--text))]"><X className="h-3.5 w-3.5" />Clear</button>
              </div>
            )}
          </Card>

          <Card>
            <StepHead icon={ListChecks} title="2. Configure the test" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Skill" htmlFor="skill">
                <Select id="skill" value={skill} onChange={(e) => setSkill(e.target.value as ISkill)}>
                  <option value="reading">Reading</option>
                  <option value="listening">Listening</option>
                  <option value="writing">Writing / Grammar</option>
                  <option value="speaking">Speaking</option>
                </Select>
              </Field>
              <Field label="Difficulty" htmlFor="difficulty" hint="Auto uses your recent accuracy">
                <Select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | 'auto')}>
                  <option value="auto">Auto (adaptive)</option><option value="easy">Easy</option>
                  <option value="medium">Medium</option><option value="hard">Hard</option>
                </Select>
              </Field>
              <Field label="Questions" htmlFor="count">
                <Input id="count" type="number" min={3} max={30} value={count}
                  onChange={(e) => setCount(Math.max(3, Math.min(30, Number(e.target.value) || 3)))} />
              </Field>
              <Field label="Mode" htmlFor="mode">
                <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                  {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Question types</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_TYPES[skill].map((t) => (
                  <button key={t} onClick={() => toggleType(t)} aria-pressed={types.includes(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${types.includes(t) ? 'bg-brand text-white' : 'bg-ink-500/5 text-muted hover:text-[rgb(var(--text))]'}`}>
                    {QUESTION_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              {(skill === 'writing' || skill === 'speaking') && (
                <p className="mt-2 text-xs text-muted">For speaking practice use Speaking Lab; for full essays use Writing Lab.</p>
              )}
            </div>
          </Card>
        </div>

<div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Ready to generate</p>
              <h3 className="mt-1.5 font-display text-xl font-bold">{count} questions · {skill}</h3>
              <p className="mt-1 text-sm text-white/70">
                {passage.length >= 200
                  ? `Built from ${material ? `“${material.title}”` : 'your pasted text'} using ${types.length} question type${types.length > 1 ? 's' : ''}.`
                  : 'Add source material on the left to continue.'}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm"><Wand2 className="h-4 w-4 text-brand" />Difficulty: <strong>{difficulty === 'auto' ? `Auto (${suggestDifficulty(db, skill)})` : difficulty}</strong></div>
              <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-brand" />Timer: <strong>{mode === 'practice' ? 'Off' : mode === 'timed' ? `${Math.max(5, Math.round(count * 1.5))} min` : `${count * 2} min`}</strong></div>
              <div className="flex items-center gap-2 text-sm"><Type className="h-4 w-4 text-brand" />Grounded questions available: <strong>{preview > 0 ? preview : '—'}</strong></div>
              {error && <p role="alert" className="rounded-lg bg-rose2-500/10 px-3 py-2 text-xs text-rose2-500">{error}</p>}
              <Button full size="lg" loading={generating} onClick={generate} disabled={passage.length < 200} icon={Sparkles}>Generate test</Button>
              <p className="text-center text-[11px] leading-relaxed text-muted">
                Each question stores the exact sentence it came from, so you can verify the source at any time.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepHead({ icon: Icon, title, subtitle }: { icon: typeof BookMarked; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft"><Icon className="h-4 w-4 text-brand" /></span>
      <div>
        <h2 className="font-display text-base font-bold">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}