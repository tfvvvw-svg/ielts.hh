import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cx } from '../lib/utils';

/* --------------------------------- Card ----------------------------------- */

export function Card({ className, children, hover = false, ...rest }: HTMLMotionProps<'div'> & { hover?: boolean }) {
  return (
    <motion.div className={cx('surface rounded-2xl', hover && 'transition-shadow duration-300 hover:shadow-lift', className)} {...rest}>
      {children}
    </motion.div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- Button ---------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  full?: boolean;
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-500 text-white shadow-soft hover:bg-brand-600 dark:bg-brand-400 dark:text-ink-950',
  secondary: 'bg-brand-soft text-brand hover:brightness-95',
  ghost: 'text-muted hover:bg-ink-500/10 hover:text-[rgb(var(--text))]',
  danger: 'bg-rose2-500 text-white hover:bg-rose2-500/90',
  outline: 'border border-[rgb(var(--border))] hover:border-brand hover:text-brand',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, full, className, children, disabled, ...rest }, ref,
) {
  return (
    <button
      ref={ref} disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center font-medium transition-all duration-200 active:scale-[.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant], SIZES[size], full && 'w-full', className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
});

/* --------------------------------- Inputs --------------------------------- */

const fieldBase = 'w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60';

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-rose2-500">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(fieldBase, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(fieldBase, 'resize-y leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return <select ref={ref} className={cx(fieldBase, 'appearance-none', className)} {...rest}>{children}</select>;
});

/* ---------------------------------- Badge --------------------------------- */

const BADGE_TONES = {
  brand: 'bg-brand-soft text-brand',
  good: 'bg-mint-500/15 text-mint-600 dark:text-mint-400',
  warn: 'bg-amber2-500/15 text-amber2-500',
  bad: 'bg-rose2-500/15 text-rose2-500',
  neutral: 'bg-ink-500/10 text-muted',
} as const;

export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof BADGE_TONES; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', BADGE_TONES[tone], className)}>{children}</span>;
}

/* --------------------------------- States --------------------------------- */

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted" role="status" aria-live="polite">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border-2 border-brand/25" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand" />
      </div>
      <p className="text-sm">{label}…</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-xl', className)} />;
}

export function EmptyState({ icon: Icon, title, body, action }: {
  icon: LucideIcon; title: string; body: string; action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] px-6 py-14 text-center"
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft">
        <Icon className="h-7 w-7 text-brand" aria-hidden />
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ title = 'Something went wrong', body, onRetry }: { title?: string; body: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-rose2-500/30 bg-rose2-500/5 px-6 py-8 text-center">
      <h3 className="font-display text-base font-semibold text-rose2-500">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/* -------------------------------- Progress -------------------------------- */

const BAR_TONES = { brand: 'bg-brand-500', good: 'bg-mint-500', warn: 'bg-amber2-500', bad: 'bg-rose2-500' };

export function Progress({ value, tone = 'brand', className, label }: {
  value: number; tone?: keyof typeof BAR_TONES; className?: string; label?: string;
}) {
  return (
    <div className={cx('w-full', className)}>
      {label && <div className="mb-1.5 flex justify-between text-xs text-muted"><span>{label}</span></div>}
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-500/10 dark:bg-ink-100/10" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className={cx('h-full rounded-full', BAR_TONES[tone])}
          initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
      </div>
    </div>
  );
}

/* --------------------------------- Modal ---------------------------------- */

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cx('surface relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-2xl p-6', wide ? 'max-w-3xl' : 'max-w-lg')}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-ink-500/10 hover:text-[rgb(var(--text))]" aria-label="Close dialog">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------- Tabs ----------------------------------- */

export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-ink-500/5 p-1 dark:bg-ink-100/5" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('relative shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition', value === t.value ? 'text-[rgb(var(--text))]' : 'text-muted hover:text-[rgb(var(--text))]')}
        >
          {value === t.value && (
            <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-[rgb(var(--surface))] shadow-soft" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
          )}
          <span className="relative flex items-center gap-1.5">
            {t.label}
            {t.count !== undefined && <span className="text-xs text-muted">{t.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- Page header ------------------------------ */

export function PageHeader({ title, subtitle, action, icon: Icon }: {
  title: string; subtitle?: string; action?: ReactNode; icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && <div className="hidden h-11 w-11 place-items-center rounded-xl bg-brand-soft sm:grid"><Icon className="h-5 w-5 text-brand" aria-hidden /></div>}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export { AnimatePresence, motion };