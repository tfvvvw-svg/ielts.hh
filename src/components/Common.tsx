import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { cx } from '../lib/utils';

export function Counter({ to, decimals = 0, suffix = '', duration = 1.1 }: {
  to: number; decimals?: number; suffix?: string; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (inView) mv.set(to);
  }, [inView, mv, to]);

  useEffect(() => spring.on('change', (v) => setDisplay(v.toFixed(decimals))), [spring, decimals]);

  return <span ref={ref} className="tabular-nums">{display}{suffix}</span>;
}

export function Reveal({ children, delay = 0, y = 16, className }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} className={className}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, hint, tone = 'brand', icon: Icon, suffix, decimals }: {
  label: string; value: number; hint?: string; tone?: 'brand' | 'good' | 'warn' | 'bad' | 'neutral';
  icon?: React.ComponentType<{ className?: string }>; suffix?: string; decimals?: number;
}) {
  const tones = {
    brand: 'text-brand bg-brand-soft',
    good: 'text-mint-500 bg-mint-500/12',
    warn: 'text-amber2-500 bg-amber2-500/12',
    bad: 'text-rose2-500 bg-rose2-500/12',
    neutral: 'text-muted bg-ink-500/8',
  };
  return (
    <Reveal>
      <div className="surface group h-full rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          {Icon && (
            <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110', tones[tone])}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <p className="mt-3 font-display text-3xl font-bold tracking-tight">
          <Counter to={value} decimals={decimals} suffix={suffix} />
        </p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </Reveal>
  );
}

/** Lightweight markdown: **bold**, *italic*, `code` and bullet lists. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split('\n');
  const render = (line: string, key: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
    return (
      <span key={key}>
        {parts.map((p, i) => {
          if (p.startsWith('**')) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
          if (p.startsWith('*')) return <em key={i} className="italic">{p.slice(1, -1)}</em>;
          if (p.startsWith('`')) return <code key={i} className="rounded bg-ink-500/10 px-1 py-0.5 text-[0.85em]">{p.slice(1, -1)}</code>;
          return <span key={i}>{p}</span>;
        })}
      </span>
    );
  };
  return (
    <div className={cx('space-y-2 text-sm leading-relaxed', className)}>
      {blocks.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (/^\s*[-*]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{render(line.replace(/^\s*[-*]\s/, ''), `b${i}`)}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="font-semibold text-brand">{line.match(/^(\d+)\./)?.[1]}.</span>
              <span>{render(line.replace(/^\d+\.\s/, ''), `n${i}`)}</span>
            </div>
          );
        }
        return <p key={i}>{render(line, `p${i}`)}</p>;
      })}
    </div>
  );
}