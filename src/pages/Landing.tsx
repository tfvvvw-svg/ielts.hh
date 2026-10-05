import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, BarChart3, Brain, Check, Flame, MessageSquareText, Quote, ShieldCheck,
  Sparkles, Star, Target, Wand2,
} from 'lucide-react';
import { Button, Field, Input } from '../components/ui';
import { Counter, Reveal } from '../components/Common';
import { useAuth } from '../store/AuthContext';
import { cx } from '../lib/utils';

const FEATURES = [
  { icon: Brain, title: 'AI Coach that knows your data', body: 'Ask why you are stuck and get an answer built from your real results, mistakes and study history — not a generic chatbot.' },
  { icon: Wand2, title: 'Grounded test generation', body: 'Upload a textbook page or PDF and every question is extracted from that exact text, with the source sentence shown as evidence.' },
  { icon: Target, title: 'Automatic study plan', body: 'Your plan weights each skill by its gap to your target band, and recalculates when you fall behind instead of stacking work on tomorrow.' },
  { icon: Flame, title: 'Mistake-driven practice', body: 'Every wrong answer is stored, repeated errors are detected automatically, and targeted drills are generated from your own failures.' },
  { icon: BarChart3, title: 'Analytics that mean something', body: 'Band progression, performance by question type, writing trends and exam readiness — every chart answers a real question.' },
  { icon: MessageSquareText, title: 'Speaking & Writing Labs', body: 'An examiner-style speaking simulator and a writing analyser that scores all four IELTS criteria with before/after examples.' },
];

const STEPS = [
  { n: '01', title: 'Upload your material', body: 'Paste text, drop in images, or import a PDF. Bandit reads it and indexes every sentence.' },
  { n: '02', title: 'Generate a real test', body: 'Choose question types and difficulty. Questions come only from your source, each with its evidence.' },
  { n: '03', title: 'Learn from every miss', body: 'Wrong answers land in your Mistake Bank, update your skill map and shape tomorrow\u2019s plan.' },
];

export default function Landing() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, continueAsGuest, error, clearError, firebaseOn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);
  const heroOpacity = useTransform(scrollY, [0, 320], [1, 0]);

  useEffect(() => { clearError(); }, [clearError, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!form.email || !form.password) { setLocalError('Please enter your email and password.'); return; }
    if (mode === 'signup' && !form.name) { setLocalError('Please enter your name.'); return; }
    if (form.password.length < 6) { setLocalError('Passwords must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') await signUpWithEmail(form.name, form.email, form.password);
      else await signInWithEmail(form.email, form.password);
    } catch { /* message shown from auth context */ } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      {/* ------------------------------- NAV -------------------------------- */}
      <header className="glass sticky top-0 z-40 border-b border-[rgb(var(--border))]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold">Bandit</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">AI IELTS Coach</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm text-muted transition hover:text-[rgb(var(--text))] sm:block">Features</a>
            <a href="#how" className="hidden rounded-lg px-3 py-2 text-sm text-muted transition hover:text-[rgb(var(--text))] sm:block">How it works</a>
            <Button size="sm" onClick={() => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })}>Start free</Button>
          </div>
        </div>
      </header>

{/* ------------------------------- HERO -------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-500/20 blur-[120px] animate-float" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-mint-400/15 blur-[110px]" aria-hidden />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 py-1.5 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-mint-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-500" />
                </span>
                Your AI-powered IELTS coach
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
                className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Study IELTS the way{' '}
                <span className="gradient-text animate-gradient">a personal teacher</span> would.
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
                className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                Bandit learns your level, tracks every mistake, finds your weak question types and plans your week —
                then tells you exactly what to do next, every single day.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={() => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })} icon={ArrowRight}>
                  Start studying free
                </Button>
                <Button size="lg" variant="outline" onClick={continueAsGuest}>Explore as guest</Button>
              </motion.div>

              <div className="mt-8 grid max-w-md grid-cols-3 gap-4">
                {[['18', 'Pages of the product'], ['4', 'Skills tracked separately'], ['0', 'Fabricated questions']].map(([v, l]) => (
                  <div key={l}>
                    <p className="font-display text-2xl font-bold text-brand"><Counter to={Number(v)} /></p>
                    <p className="text-xs text-muted">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* product preview */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotateY: -8 }} animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-500/20 via-transparent to-mint-400/20 blur-2xl" aria-hidden />
              <div className="surface relative rounded-3xl p-5 shadow-lift">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose2-500/70" /><span className="h-3 w-3 rounded-full bg-amber2-500/70" /><span className="h-3 w-3 rounded-full bg-mint-500/70" />
                  <span className="ml-2 text-xs text-muted">bandit.app/dashboard</span>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">What should I study now?</p>
                  <p className="mt-2 font-display text-lg font-bold">Work on Reading — your current limiter</p>
                  <p className="mt-1.5 text-xs text-white/80">Matching Headings at 48% is your weakest question type.</p>
                  <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/25">
                    Start targeted practice <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[['Reading', 82], ['Listening', 76], ['Writing', 58]].map(([label, v], i) => (
                    <div key={String(label)} className="rounded-xl border border-[rgb(var(--border))] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                      <p className="mt-1 font-display text-lg font-bold">{v as number}%</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-500/10">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 1.1, delay: 0.6 + i * 0.12 }}
                          className={cx('h-full rounded-full', (v as number) > 70 ? 'bg-mint-500' : 'bg-amber2-500')} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

{/* ----------------------------- FEATURES -------------------------------- */}
      <section id="features" className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-2))] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Everything you need</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">A complete IELTS system, not a to-do list</h2>
            <p className="mt-3 text-muted">Every feature is built around one idea: find what is costing you marks, then fix it first.</p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="group surface h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5 text-brand" aria-hidden />
                  </div>
                  <h3 className="font-display text-base font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ HOW ---------------------------------- */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Three steps to a smarter study loop</h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="surface relative h-full overflow-hidden rounded-2xl p-6">
                  <span className="absolute -right-3 -top-6 font-display text-7xl font-extrabold text-brand/8">{s.n}</span>
                  <h3 className="font-display text-base font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- TESTIMONIAL ---------------------------- */}
      <section className="border-y border-[rgb(var(--border))] bg-[rgb(var(--bg-2))] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { quote: 'The “what should I study now” button replaced my entire study spreadsheet. I stopped guessing what to revise.', name: 'Amina', role: 'Target Band 7.5' },
              { quote: 'It spotted that I always lose Matching Headings questions. Three weeks later that number moved from 48% to 71%.', name: 'Daniel', role: 'Target Band 7' },
              { quote: 'I upload a page from my textbook and get a real test in seconds. Every question shows the sentence it came from.', name: 'Mariya', role: 'Target Band 8' },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <figure className="surface h-full rounded-2xl p-6">
                  <Quote className="h-5 w-5 text-brand/40" aria-hidden />
                  <blockquote className="mt-3 text-sm leading-relaxed">{t.quote}</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">{t.name[0]}</span>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

{/* ------------------------------- AUTH --------------------------------- */}
      <section id="auth" className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Start your personalised plan in under a minute</h2>
            <p className="mt-3 max-w-md text-muted">Set your exam date and target band — Bandit builds the rest, and keeps rebuilding it as your performance changes.</p>
            <ul className="mt-7 space-y-3">
              {['Questions grounded in your own materials, never invented', 'Every mistake tracked and drilled automatically', 'Exam readiness estimated from your real recent performance', 'Works fully offline — your data stays on your device by default'].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-500/15 text-mint-600 dark:text-mint-400"><Check className="h-3 w-3" /></span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4" aria-hidden />{firebaseOn ? 'Secured with Firebase Authentication. Your learning data is stored under your own account.' : 'Running in offline mode — your data stays on this device. Add Firebase keys to .env to enable cloud sign-in.'}</p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="surface rounded-3xl p-6 shadow-lift sm:p-8">
              <div className="mb-6 flex gap-1 rounded-xl bg-ink-500/5 p-1 dark:bg-ink-100/5">
                {(['signin', 'signup'] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setLocalError(null); }}
                    className={cx('flex-1 rounded-lg py-2 text-sm font-medium transition', mode === m ? 'bg-[rgb(var(--surface))] shadow-soft' : 'text-muted hover:text-[rgb(var(--text))]')}>
                    {m === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <Button variant="outline" full size="lg" loading={busy} onClick={() => { setBusy(true); void signInWithGoogle().catch(() => undefined).finally(() => setBusy(false)); }}>
                <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden><path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.8-4.4 6.7l6.7 5.2C42.2 35.4 45 30.1 45 24z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-1.9 14.5-5.3l-6.7-5.2c-1.9 1.3-4.3 2.1-7.8 2.1-6 0-11.1-4-12.9-9.5l-7 5.4C8 41.3 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.1 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1l-7-5.4C2.6 17.2 2 20.5 2 24s.6 6.8 2.1 9.5l7-5.4z"/><path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.4 3.2l6.1-6C34.9 4.3 29.9 2 24 2 15.4 2 8 6.7 4.1 14.1l7 5.4c1.8-5.5 6.9-9 12.9-9z"/></svg>
                Continue with Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-[rgb(var(--border))]" /> or <span className="h-px flex-1 bg-[rgb(var(--border))]" />
              </div>

              <form onSubmit={submit} className="space-y-4" noValidate>
                {mode === 'signup' && (
                  <Field label="Full name" htmlFor="name">
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" autoComplete="name" />
                  </Field>
                )}
                <Field label="Email" htmlFor="email">
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
                </Field>
                <Field label="Password" htmlFor="password">
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                </Field>
                {(localError || error) && <p role="alert" className="rounded-lg bg-rose2-500/10 px-3 py-2 text-xs text-rose2-500">{localError ?? error}</p>}
                <Button type="submit" full size="lg" loading={busy}>{mode === 'signup' ? 'Create my account' : 'Sign in'}</Button>
              </form>

              <Button variant="ghost" full className="mt-3" onClick={continueAsGuest}>Continue without an account</Button>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
                By continuing you agree that Bandit may store your study data to generate your plan. AI scores are estimates for practice only.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

<footer className="border-t border-[rgb(var(--border))] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600"><Sparkles className="h-3.5 w-3.5 text-white" /></div>
            <span className="font-display text-sm font-bold">Bandit</span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-muted">
            Bandit provides educational practice tools. Band scores are AI estimates based on your own practice data and do not represent official IELTS results.
            Always confirm your readiness with an official practice test.
          </p>
          <div className="flex items-center gap-1 text-amber2-500" aria-label="Five star rating placeholder">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
          </div>
        </div>
      </footer>
    </div>
  );
}