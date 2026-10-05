import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Image as ImageIcon, Library, Plus, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';
import { useApp } from '../store/AppContext';
import { detectTopic, wordCount } from '../lib/ai/text';
import type { Material } from '../lib/types';
import { relativeTime } from '../lib/utils';

export default function Materials() {
  const { db, addMaterial, deleteMaterial } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [form, setForm] = useState({ title: '', text: '', kind: 'text' as Material['kind'] });
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const totalWords = useMemo(() => db.materials.reduce((a, m) => a + m.wordCount, 0), [db.materials]);

  const submit = () => {
    if (!form.title.trim()) { setError('Give your material a title.'); return; }
    if (form.text.trim().length < 40 && images.length === 0) { setError('Add at least a short passage of text, or upload an image.'); return; }
    addMaterial({
      title: form.title.trim(), kind: form.kind, text: form.text.trim(), imageUrls: images.map((i) => i.url),
      pageCount: images.length, wordCount: wordCount(form.text), topic: detectTopic(form.text), tags: [],
    });
    setForm({ title: '', text: '', kind: 'text' });
    setImages([]);
    setError(null);
    setOpen(false);
  };

  const readFile = (file: File, mode: 'image' | 'text') => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      if (mode === 'image') setImages((prev) => [...prev, { name: file.name, url: result }]);
      else setForm((f) => ({ ...f, text: f.text ? `${f.text}\n${result}` : result }));
    };
    reader.readAsDataURL(file);
  };

return (
    <div className="space-y-6">
      <PageHeader icon={Library} title="My Materials"
        subtitle="Upload a book page, notes, a PDF or a screenshot. Every material becomes a permanent source for grounded tests, vocabulary and summaries."
        action={<Button icon={Plus} onClick={() => setOpen(true)}>Add material</Button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase tracking-wider text-muted">Materials</p><p className="mt-1 font-display text-2xl font-bold">{db.materials.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-wider text-muted">Total words</p><p className="mt-1 font-display text-2xl font-bold">{totalWords}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-wider text-muted">Tests generated</p><p className="mt-1 font-display text-2xl font-bold">{db.tests.filter((t) => t.materialId).length}</p></Card>
      </div>

      {db.materials.length === 0 ? (
        <EmptyState icon={Library} title="No materials yet"
          body="Add your first passage. Bandit will summarise it, extract vocabulary, spot grammar issues and generate grounded tests from it."
          action={<Button size="sm" onClick={() => setOpen(true)}>Add material</Button>} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {db.materials.map((m) => {
            const resources = db.resources.filter((r) => r.materialId === m.id).length;
            return (
              <li key={m.id} className="surface group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft">
                    {m.kind === 'image' ? <ImageIcon className="h-4 w-4 text-brand" /> : <FileText className="h-4 w-4 text-brand" />}
                  </span>
                  <button onClick={() => deleteMaterial(m.id)} aria-label={`Delete ${m.title}`}
                    className="rounded-lg p-2 text-muted transition hover:bg-rose2-500/10 hover:text-rose2-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-3 font-display text-base font-bold">{m.title}</h3>
                <p className="mt-1 text-xs text-muted">{m.wordCount} words · {m.topic} · {relativeTime(m.createdAt)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{m.kind}</Badge>
                  {resources > 0 && <Badge tone="good">{resources} resources</Badge>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => navigate(`/materials/${m.id}`)}>Open</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/test-generator')}>Make a test</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

<Modal open={open} onClose={() => setOpen(false)} title="Add material" wide>
        <div className="space-y-4">
          <Field label="Title" htmlFor="m-title">
            <Input id="m-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cambridge IELTS 13 — Test 2" />
          </Field>
          <Field label="Type" htmlFor="m-kind">
            <Select id="m-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Material['kind'] })}>
              <option value="text">Text passage</option>
              <option value="image">Image / screenshot</option>
              <option value="pdf">PDF or document</option>
            </Select>
          </Field>
          <Field label="Paste or upload text" htmlFor="m-text" hint="Text files (.txt, .md) are read automatically">
            <Textarea id="m-text" rows={8} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Paste the passage here…" />
          </Field>
          <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, 'text'); e.target.value = ''; }} />
          <Button variant="outline" icon={Upload} onClick={() => fileRef.current?.click()}>Upload a text file</Button>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Images and screenshots</p>
            <input ref={imageRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => readFile(f, 'image')); e.target.value = ''; }} />
            <Button variant="outline" icon={Upload} onClick={() => imageRef.current?.click()}>Upload images</Button>
            {images.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img, i) => (
                  <li key={i} className="relative overflow-hidden rounded-lg border border-[rgb(var(--border))]">
                    <img src={img.url} alt={img.name} className="h-20 w-full object-cover" />
                    <button onClick={() => setImages((prev) => prev.filter((_, x) => x !== i))} aria-label={`Remove ${img.name}`}
                      className="absolute right-1 top-1 rounded bg-ink-950/70 p-1 text-white">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">Images are stored on your device. Paste the accompanying text so questions can be grounded in it.</p>
          </div>

          {error && <p role="alert" className="text-xs text-rose2-500">{error}</p>}
          <Button full onClick={submit} icon={Plus}>Save material</Button>
        </div>
      </Modal>
    </div>
  );
}