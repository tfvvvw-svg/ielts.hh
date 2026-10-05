import { AnimatePresence, motion } from 'framer-motion';
import { Award, BookOpen, Flame, Library, Mic, PenLine, Sparkles, Trophy, ClipboardCheck } from 'lucide-react';
import { useEffect } from 'react';
import type { Achievement } from '../lib/types';

const ICONS: Record<string, typeof Trophy> = {
  Sparkles, Flame, BookOpen, Library, Mic, Trophy, PenLine, Award, ClipboardCheck,
};

export function AchievementToast({ items, onDismiss }: { items: Achievement[]; onDismiss: () => void }) {
  useEffect(() => {
    if (!items.length) return undefined;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [items, onDismiss]);

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] w-[min(92vw,26rem)] -translate-x-1/2 space-y-2 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0">
      <AnimatePresence>
        {items.map((a) => {
          const Icon = ICONS[a.icon] ?? Trophy;
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="glass pointer-events-auto flex items-center gap-3.5 rounded-2xl p-4 shadow-lift"
            >
              <motion.div
                initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 12 }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber2-400 to-amber2-500 text-white shadow-glow"
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber2-500">Achievement unlocked</p>
                <p className="truncate font-display text-sm font-bold">{a.title}</p>
                <p className="truncate text-xs text-muted">{a.description}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}