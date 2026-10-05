import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, ClipboardCheck, Play, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SectionTitle } from '../components/ui';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL, currentOverall, readiness } from '../lib/brain';
import { relativeTime, round1 } from '../lib/utils';

const COMPONENT_ROUTE = { listening: '/listening', reading: '/reading', writing: '/writing', speaking: '/speaking' } as const;

export default function Mocks() {
  const { db, createMock, updateMock } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const ready = readiness(db, db.profile);
  const previous = db.mocks.find((m) => m.status === 'completed' && m.overall !== null);

  const start = () => {
    setBusy(true);
    setTimeout(() => {
      const mock = createMock();
      updateMock(mock.id, { status: 'in_progress', step: 0, startedAt: Date.now() });
      setBusy(false);
      navigate(COMPONENT_ROUTE.listening);
    }, 400);
  };

  const record = (mockId: string, skill: 'listening' | 'reading' | 'writing' | 'speaking') => {
    const mock = db.mocks.find((m) => m.id === mockId);
    if (!mock) return;
    const band = ready.bands[skill];
    const components = mock.components.map((c) => (c.skill === skill && band !== null
      ? { ...c, band, score: band, note: 'From your recent practice performance' } : c));
    const overall = overallOf(components);
    const done = components.every((c) => c.band > 0);
    updateMock(mockId, {
      components,
      step: Math.min(3, mock.step + 1),
      status: done ? 'completed' : 'in_progress',
      overall: done ? overall : null,
      completedAt: done ? Date.now() : undefined,
    });
  };

return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardCheck} title="Mock Exams"
        subtitle="Listening → Reading → Writing → Speaking under exam conditions, with a final estimated band."
        action={<Button loading={busy} onClick={start} icon={Play}>Start a mock exam</Button>} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="p-5">
          <SectionTitle title="What a mock exam does" subtitle="Four skills, one sitting, one score" />
          <ol className="space-y-3">
            {(['listening', 'reading', 'writing', 'speaking'] as const).map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft font-display text-sm font-bold text-brand">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{SKILL_LABEL[s]}</p>
                  <p className="text-xs text-muted">
                    {s === 'listening' && 'Grounded set from your transcripts, timed to the real pace.'}
                    {s === 'reading' && 'Grounded comprehension set built from your own materials.'}
                    {s === 'writing' && 'A full Task 2 essay analysed across all four criteria.'}
                    {s === 'speaking' && 'Full Part 1–3 simulation with fluency feedback.'}
                  </p>
                </div>
                <Badge tone={ready.bands[s] !== null ? (ready.bands[s]! < (db.profile?.targetBand ?? 7) ? 'warn' : 'good') : 'neutral'}>
                  {ready.bands[s] !== null ? `~${ready.bands[s]}` : '—'}
                </Badge>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl bg-brand-soft p-4">
            <p className="text-xs font-semibold text-brand">Exam readiness: {ready.percent}%</p>
            <p className="mt-1 text-xs text-muted">{ready.explanation}</p>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            Mock exam bands are AI estimates based on your practice performance in each component — not official IELTS results.
          </p>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Recent mock exams" subtitle={`${db.mocks.length} in total`} />
          {db.mocks.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No mock exams yet"
              body="A full mock is the best test of exam readiness. It walks through all four skills and produces a complete band estimate."
              action={<Button size="sm" loading={busy} onClick={start}>Start your first mock</Button>} />
          ) : (
            <ul className="space-y-2.5">
              {db.mocks.map((m) => (
                <li key={m.id} className="rounded-xl border border-[rgb(var(--border))] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <Badge tone={m.status === 'completed' ? 'good' : 'neutral'}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                  {m.status === 'completed' && m.overall !== null ? (
                    <>
                      <p className="mt-2 font-display text-2xl font-bold text-brand">Band {m.overall}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-muted">
                        {m.components.map((c) => <span key={c.skill}>{SKILL_LABEL[c.skill]}: <strong className="text-[rgb(var(--text))]">{c.band || '—'}</strong></span>)}
                      </div>
                      {previous && previous.id !== m.id && previous.overall !== null && (
                        <p className="mt-2 text-[11px] text-muted">Previous mock: Band {previous.overall} ({round1(m.overall - previous.overall) >= 0 ? '+' : ''}{round1(m.overall - previous.overall)})</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-muted">{m.components.filter((c) => c.band > 0).length}/4 components recorded · {relativeTime(m.createdAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.components.map((c) => (
                          <Button key={c.skill} size="sm" variant={c.band > 0 ? 'ghost' : 'outline'} onClick={() => record(m.id, c.skill)}>
                            {c.band > 0 ? `✓ ${SKILL_LABEL[c.skill]}` : `Record ${SKILL_LABEL[c.skill]}`}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

<Card className="p-5">
        <SectionTitle title="Your estimated band profile" subtitle="Based on your recent practice across all four skills" />
        <div className="grid gap-4 sm:grid-cols-4">
          {(['listening', 'reading', 'writing', 'speaking'] as const).map((s) => (
            <motion.div key={s} whileHover={{ y: -3 }} className="rounded-xl border border-[rgb(var(--border))] p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted">{SKILL_LABEL[s]}</p>
              <p className="mt-1 font-display text-3xl font-bold">{ready.bands[s] ?? '—'}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[rgb(var(--surface-2))] p-4">
          <span className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-brand" />Estimated overall band</span>
          <span className="font-display text-2xl font-bold text-brand">{currentOverall(db) ?? '—'}</span>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-muted">
          <Award className="h-3.5 w-3.5" />Target band {db.profile?.targetBand ?? 7} · {ready.gap > 0 ? `${ready.gap} band to go` : 'target reached in your current estimate'}
        </p>
        {ready.limiter && (
          <p className="mt-2 flex items-center gap-2 text-[11px] text-muted">
            <CheckCircle2 className="h-3.5 w-3.5" />Focus on {SKILL_LABEL[ready.limiter]} first — it is the biggest gap.
          </p>
        )}
        <Progress className="mt-3" value={ready.percent} label={`Exam readiness ${ready.percent}%`} tone={ready.percent >= 75 ? 'good' : 'warn'} />
      </Card>
    </div>
  );
}

function overallOf(components: { band: number }[]): number {
  if (components.some((c) => c.band <= 0)) return 0;
  return round1(components.reduce((a, c) => a + c.band, 0) / components.length);
}