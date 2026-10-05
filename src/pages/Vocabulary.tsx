import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Check, Plus, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Progress, Select, Tabs } from '../components/ui';
import { useApp } from '../store/AppContext';
import { dueVocab } from '../lib/srs';
import type { Difficulty, VocabItem } from '../lib/types';
import { cx } from '../lib/utils';

const STATES = ['new', 'learning', 'weak', 'known', 'mastered'] as const;
const STATE_TONE: Record<string, 'brand' | 'warn' | 'bad' | 'good' | 'neutral'> = {
  new: 'brand', learning: 'warn', weak: 'bad', known: 'good', mastered: 'good',
};

export default function Vocabulary() {
  const { db, addWords, gradeWord, deleteWord } = useApp();
  const [tab, setTab] = useState<'list' | 'review'>('list');
  const [filter, setFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [topic, setTopic] = useState('General');
  const [error, setError] = useState<string | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const due = useMemo(() => dueVocab(db), [db]);
  const filtered = db.vocab.filter((v) => filter === 'all' || v.state === filter);

  const submit = () => {
    if (!word.trim()) { setError('Enter a word.'); return; }
    const added = addWords([{
      word: word.trim(), definition: definition.trim() || `Your own definition of “${word.trim()}”.`,
      example: example.trim(), synonyms: [], antonyms: [], topic,
      difficulty: (word.trim().length > 8 ? 'hard' : word.trim().length > 6 ? 'medium' : 'easy') as Difficulty,
      personal: true,
    }]);
    if (added === 0) { setError('That word is already in your vocabulary.'); return; }
    setWord(''); setDefinition(''); setExample(''); setError(null);
    setAddOpen(false);
  };

  const grade = (g: number) => {
    const current = due[reviewIndex];
    if (!current) return;
    gradeWord(current.id, g);
    setFlipped(false);
    setReviewIndex((i) => Math.min(i + 1, Math.max(0, due.length - 2)));
  };

  const current = due[reviewIndex];

  return (
    <div className="space-y-6">
      <PageHeader icon={BookOpen} title="Vocabulary"
        subtitle="Spaced repetition decides when each word comes back. Review on schedule and intervals grow automatically."
        action={<Button icon={Plus} onClick={() => setAddOpen(true)}>Add word</Button>} />

      <div className="grid gap-4 sm:grid-cols-5">
        {STATES.map((s) => (
          <Card key={s} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{s}</p>
            <p className="mt-1.5 font-display text-2xl font-bold">{db.vocab.filter((v) => v.state === s).length}</p>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'list', label: 'Word list', count: db.vocab.length },
        { value: 'review', label: 'Review queue', count: due.length },
      ]} />

{tab === 'review' ? (
        due.length === 0 ? (
          <EmptyState icon={Check} title="Review queue is empty"
            body={db.vocab.length ? 'Nothing is due right now — your next reviews are scheduled by the spaced-repetition algorithm.' : 'Add words or extract them from a material to start building your vocabulary.'}
            action={<Button size="sm" onClick={() => setTab('list')}>Go to word list</Button>} />
        ) : (
          <Card className="mx-auto max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-4 text-xs text-muted">
              <span>{reviewIndex + 1} / {due.length} due</span>
              <Progress value={((reviewIndex + 1) / Math.max(1, due.length)) * 100} className="w-40" />
            </div>
            {current && (
              <motion.button key={current.id} onClick={() => setFlipped((f) => !f)}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full cursor-pointer text-left" aria-label="Flip flashcard">
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-8 text-center">
                  <p className="font-display text-3xl font-bold">{current.word}</p>
                  {flipped ? (
                    <div className="mt-4 space-y-2 text-sm">
                      <p>{current.definition}</p>
                      {current.example && <p className="italic text-muted">“{current.example}”</p>}
                      {current.synonyms.length > 0 && <p className="text-xs text-muted">Synonyms: {current.synonyms.join(', ')}</p>}
                    </div>
                  ) : <p className="mt-3 text-sm text-muted">Tap to reveal the definition</p>}
                </div>
              </motion.button>
            )}
            <div className="mt-5 grid grid-cols-4 gap-2">
              {([[0, 'Again'], [2, 'Hard'], [4, 'Good'], [5, 'Easy']] as [number, string][]).map(([g, label]) => (
                <Button key={label} variant={g < 2 ? 'outline' : g >= 5 ? 'primary' : 'secondary'} onClick={() => grade(g)}>{label}</Button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted">“Again” shortens the interval; “Easy” extends it. Intervals grow as your accuracy does.</p>
          </Card>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44" aria-label="Filter by state">
              <option value="all">All states</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <span className="text-xs text-muted">{filtered.length} words</span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title={db.vocab.length ? 'No words in this state' : 'No vocabulary yet'}
              body={db.vocab.length ? 'Try another state filter.' : 'Add words manually, or open a material and extract vocabulary in one click.'}
              action={<Button size="sm" onClick={() => setAddOpen(true)}>Add your first word</Button>} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filtered.map((v) => <WordCard key={v.id} item={v} onDelete={() => deleteWord(v.id)} />)}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a word">
        <div className="space-y-4">
          <Field label="Word" htmlFor="v-word"><Input id="v-word" value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g. mitigate" /></Field>
          <Field label="Definition" htmlFor="v-def"><Input id="v-def" value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="to make something less harmful" /></Field>
          <Field label="Example sentence" htmlFor="v-ex"><Input id="v-ex" value={example} onChange={(e) => setExample(e.target.value)} placeholder="Policies aim to mitigate the effects of…" /></Field>
          <Field label="Topic" htmlFor="v-topic"><Input id="v-topic" value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
          {error && <p role="alert" className="text-xs text-rose2-500">{error}</p>}
          <Button full onClick={submit} icon={Plus}>Save word</Button>
        </div>
      </Modal>
    </div>
  );
}

function WordCard({ item, onDelete }: { item: VocabItem; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.li layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base font-bold">{item.word}</p>
          <p className="text-xs text-muted">{item.topic}</p>
        </div>
        <Badge tone={STATE_TONE[item.state]}>{item.state}</Badge>
      </div>
      <button onClick={() => setOpen((o) => !o)} className="mt-2 w-full text-left">
        <p className={cx('text-xs', open ? '' : 'line-clamp-2')}>{item.definition}</p>
      </button>
      {open && item.example && <p className="mt-2 text-xs italic text-muted">“{item.example}”</p>}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
        <span>Review in {item.intervalDays || 0}d · {item.reps} reps</span>
        <button onClick={onDelete} aria-label={`Delete ${item.word}`} className="rounded p-1 transition hover:bg-rose2-500/10 hover:text-rose2-500"><X className="h-3.5 w-3.5" /></button>
      </div>
    </motion.li>
  );
}