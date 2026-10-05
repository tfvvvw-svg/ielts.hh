import { motion } from 'framer-motion';
import { Award, BookOpen, ClipboardCheck, Flame, Library, Mic, PenLine, Sparkles, Trophy } from 'lucide-react';
import { Badge, Card, PageHeader, Progress, SectionTitle } from '../components/ui';
import { useApp } from '../store/AppContext';

const ICONS: Record<string, typeof Trophy> = { Sparkles, Flame, BookOpen, Library, Mic, Trophy, PenLine, Award, ClipboardCheck };

export default function Achievements() {
  const { achievements } = useApp();
  const list = [...achievements].sort((a, b) => Number(Boolean(b.unlockedAt)) - Number(Boolean(a.unlockedAt)));
  const unlocked = achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-6">
      <PageHeader icon={Trophy} title="Achievements"
        subtitle="Milestones that mark real progress — unlocked automatically from your practice data." />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Progress</p>
            <p className="mt-1 font-display text-4xl font-bold">{unlocked}<span className="text-2xl text-muted"> / {achievements.length}</span></p>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={achievements.length ? (unlocked / achievements.length) * 100 : 0} tone="good" />
            <p className="mt-2 text-xs text-muted">Achievements are unlocked by practising — not by spending more time in the app.</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="All achievements" subtitle="Locked ones show exactly what they require" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a, i) => {
            const Icon = ICONS[a.icon] ?? Trophy;
            const done = Boolean(a.unlockedAt);
            const pct = Math.min(100, (a.progress / Math.max(1, a.target)) * 100);
            return (
              <motion.li key={a.id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                className={`relative overflow-hidden rounded-2xl border p-5 transition ${done ? 'border-amber2-500/40 bg-gradient-to-br from-amber2-500/10 to-transparent' : 'border-[rgb(var(--border))]'}`}
              >
                {done && <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber2-500/15 blur-2xl" aria-hidden />}
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={done ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className={`grid h-11 w-11 place-items-center rounded-xl ${done ? 'bg-gradient-to-br from-amber2-400 to-amber2-500 text-white shadow-glow' : 'bg-ink-500/8 text-muted'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold">{a.title}</p>
                    <p className="text-xs text-muted">{a.description}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={pct} tone={done ? 'good' : 'brand'} />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                    <span>{a.progress} / {a.target}</span>
                    {done ? <Badge tone="good">Unlocked</Badge> : <span>{Math.round(pct)}%</span>}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}