import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookMarked, FileText, GraduationCap, Layers, Lightbulb, Sparkles, Wand2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, SectionTitle } from '../components/ui';
import { RichText } from '../components/Common';
import { useApp } from '../store/AppContext';
import { extractGrammarPoints, extractVocabulary, summarize } from '../lib/ai/generate';
import { relativeTime } from '../lib/utils';
import type { ResourceKind } from '../lib/types';

export default function MaterialDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, addResource, addWords, addTask } = useApp();
  const [busy, setBusy] = useState<ResourceKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const material = db.materials.find((m) => m.id === id);
  const resources = useMemo(() => db.resources.filter((r) => r.materialId === id), [db.resources, id]);
  const tests = db.tests.filter((t) => t.materialId === id);

  if (!material) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/materials')}>Back to materials</Button>
        <EmptyState icon={FileText} title="Material not found" body="It may have been deleted."
          action={<Button size="sm" onClick={() => navigate('/materials')}>Back to materials</Button>} />
      </div>
    );
  }

  const run = (kind: ResourceKind) => {
    setBusy(kind);
    setTimeout(() => {
      if (kind === 'summary') {
        const points = summarize(material.text, 5);
        addResource({ materialId: material.id, kind, title: 'Summary', body: points.map((p, i) => `${i + 1}. ${p}`).join('\n\n') });
      } else if (kind === 'explanation') {
        const { keywords: kws } = extractGrammarPoints(material.text);
        const sents = summarize(material.text, 4);
        addResource({
          materialId: material.id, kind, title: 'Explanation',
          body: `**What this passage is about**\n\n${sents.join(' ')}\n\n**Key ideas**\n${kws.map((k) => `- ${k}`).join('\n')}\n\nUse these as the spine of any summary or speaking answer based on this text.`,
        });
      } else if (kind === 'vocabulary') {
        const list = extractVocabulary(material.text, 15);
        const added = addWords(list.map((v) => ({ ...v, materialId: material.id })));
        addResource({ materialId: material.id, kind: 'vocabulary', title: 'Vocabulary extracted', body: list.map((v) => `**${v.word}** — ${v.definition}`).join('\n\n') });
        setMessage(`${added} new words added to your vocabulary (${list.length - added} already saved).`);
      } else if (kind === 'grammar') {
        const { points } = extractGrammarPoints(material.text);
        addResource({
          materialId: material.id, kind, title: 'Grammar in this text',
          body: points.length ? points.map((p) => `**${p.label}** (${p.count}×)\n${p.why}`).join('\n\n') : 'No recurring grammar issues detected in this text.',
        });
      } else if (kind === 'flashcards') {
        const list = extractVocabulary(material.text, 8);
        addResource({ materialId: material.id, kind, title: 'Flashcards', body: list.map((v) => `**${v.word}**\n${v.definition}${v.example ? `\n“${v.example}”` : ''}`).join('\n\n---\n\n') });
      } else if (kind === 'task') {
        addTask({ title: `Study material: ${material.title}`, skill: 'reading', minutes: 25, note: 'From your materials library.', refId: material.id });
        addResource({ materialId: material.id, kind, title: 'Study task created', body: 'A 25-minute study task was added to your Tasks list for this material.' });
      }
      setBusy(null);
    }, 500);
  };

return (
    <div className="space-y-6">
      <PageHeader icon={FileText} title={material.title}
        subtitle={`${material.wordCount} words · ${material.topic} · ${relativeTime(material.createdAt)}`}
        action={<Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/materials')}>All materials</Button>} />

      {message && <div role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">{message}</div>}

      <Card className="p-5">
        <SectionHead icon={Sparkles} title="Generate from this material" subtitle="Every resource below is derived only from this text" />
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {([
            { kind: 'summary' as ResourceKind, label: 'Summary', icon: FileText },
            { kind: 'explanation' as ResourceKind, label: 'Explain', icon: Lightbulb },
            { kind: 'vocabulary' as ResourceKind, label: 'Vocabulary', icon: BookMarked },
            { kind: 'grammar' as ResourceKind, label: 'Grammar', icon: Wand2 },
            { kind: 'flashcards' as ResourceKind, label: 'Flashcards', icon: Layers },
            { kind: 'task' as ResourceKind, label: 'Study task', icon: GraduationCap },
          ]).map(({ kind, label, icon: Icon }) => (
            <Button key={kind} variant="outline" loading={busy === kind} icon={Icon} onClick={() => run(kind)}>{label}</Button>
          ))}
        </div>
        <Button className="mt-3" icon={Sparkles} onClick={() => navigate('/test-generator')}>Generate a test from this material</Button>
      </Card>

      {material.imageUrls.length > 0 && (
        <Card className="p-5">
          <SectionTitle title="Images" subtitle={`${material.imageUrls.length} attached`} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {material.imageUrls.map((src, i) => (
              <li key={i} className="overflow-hidden rounded-xl border border-[rgb(var(--border))]">
                <img src={src} alt={`Page ${i + 1}`} className="h-32 w-full object-cover" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Source text" subtitle={`${material.wordCount} words`} />
          <div className="max-h-96 space-y-3 overflow-y-auto pr-2 text-sm leading-relaxed">
            {material.text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Generated resources" subtitle={`${resources.length} connected to this material`} />
          {resources.length === 0 ? (
            <EmptyState icon={Sparkles} title="No resources yet"
              body="Generate a summary, extract vocabulary or spot grammar issues — everything is stored against this material." />
          ) : (
            <ul className="space-y-3">
              {resources.map((r) => (
                <li key={r.id} className="rounded-xl border border-[rgb(var(--border))] p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge tone="brand">{r.kind}</Badge>
                    <span className="text-[11px] text-muted">{relativeTime(r.createdAt)}</span>
                  </div>
                  <p className="font-display text-sm font-bold">{r.title}</p>
                  <RichText text={r.body} className="mt-2 text-muted" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {tests.length > 0 && (
        <Card className="p-5">
          <SectionTitle title="Tests from this material" subtitle={`${tests.length} generated`} />
          <ul className="space-y-2">
            {tests.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted">{t.questions.length} questions · {t.difficulty} · {relativeTime(t.createdAt)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/test/${t.id}`)}>Open</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, subtitle }: { icon: typeof Sparkles; title: string; subtitle?: string }) {
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