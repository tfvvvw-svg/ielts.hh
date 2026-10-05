import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MessageSquareText, Send, Sparkles, User } from 'lucide-react';
import { Badge, Button, Card, PageHeader } from '../components/ui';
import { RichText } from '../components/Common';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL, currentOverall, readiness } from '../lib/brain';

const SUGGESTIONS = [
  'What should I study today?', 'Why am I not improving?', 'How can I reach Band 7?',
  'Explain this grammar rule', 'Give me a Reading exercise', 'Give me Speaking questions',
  'Check my essay', 'Help me improve vocabulary', 'Create a study plan', 'Explain my mistakes',
];

export default function Coach() {
  const { db, sendMessage, coachPending } = useApp();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const messages = db.chats[0]?.messages ?? [];
  const ready = readiness(db, db.profile);
  const overall = currentOverall(db);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, coachPending]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || coachPending) return;
    setInput('');
    await sendMessage(t);
  };

  const intro = `Hi ${db.profile?.displayName ?? 'there'} — I have your history loaded.\n\n${
    overall === null
      ? 'You have not taken a test yet, so start with a diagnostic test and I will build your plan from the results.'
      : `You are at an estimated Band ${overall}, targeting ${db.profile?.targetBand}. ${ready.limiter ? `${SKILL_LABEL[ready.limiter]} is your limiting skill at about ${ready.limiterBand}.` : ''}`
  }\n\nAsk me anything — I answer with your data, not generic advice.`;

  return (
    <div className="space-y-5">
      <PageHeader icon={MessageSquareText} title="AI Coach"
        subtitle="A personal IELTS teacher that answers using your real results, mistakes and study history." />

      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <Card className="flex h-[calc(100vh-15rem)] min-h-[30rem] flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex gap-3">
                  <Avatar icon={Sparkles} />
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-brand-soft px-4 py-3"><RichText text={intro} /></div>
                </div>
                <div className="flex flex-wrap gap-2 pl-11">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => void send(s)}
                      className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium transition hover:border-brand hover:text-brand">
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' ? <Avatar icon={Sparkles} /> : <Avatar icon={User} tone="muted" />}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-[rgb(var(--surface-2))]'}`}>
                    <RichText text={m.content} />
                    {m.chips && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.chips.map((c) => (
                          <button key={c} onClick={() => void send(c)} disabled={coachPending}
                            className="rounded-full border border-brand/40 px-2.5 py-1 text-[11px] font-medium text-brand transition hover:bg-brand hover:text-white">
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {coachPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <Avatar icon={Sparkles} />
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-[rgb(var(--surface-2))] px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="h-2 w-2 rounded-full bg-brand" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} />
                    ))}
                  </span>
                  <span className="text-xs text-muted">Analysing your data…</span>
                </div>
              </motion.div>
            )}
            <div ref={bottom} />
          </div>

<form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-[rgb(var(--border))] p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your preparation…"
              aria-label="Message the AI coach" disabled={coachPending}
              className="flex-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60" />
            <Button type="submit" disabled={!input.trim() || coachPending} loading={coachPending} aria-label="Send"><Send className="h-4 w-4" /></Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your snapshot</p>
            <p className="mt-2 font-display text-3xl font-bold">{overall ?? '—'}</p>
            <p className="text-xs text-muted">Estimated band · target {db.profile?.targetBand ?? 7}</p>
            <div className="mt-3 space-y-1.5 text-xs text-muted">
              <p>Readiness: <strong className="text-[rgb(var(--text))]">{ready.percent}%</strong></p>
              {ready.limiter && <p>Limiter: <strong className="text-[rgb(var(--text))]">{SKILL_LABEL[ready.limiter]}</strong></p>}
              <p>Open mistakes: <strong className="text-[rgb(var(--text))]">{db.mistakes.filter((m) => !m.resolved).length}</strong></p>
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Jump to</p>
            <div className="mt-3 space-y-1.5">
              {[
                { label: 'My weak skills', href: '/analytics' },
                { label: 'My mistake bank', href: '/mistakes' },
                { label: 'My study plan', href: '/planner' },
                { label: 'My vocabulary queue', href: '/vocabulary' },
              ].map((l) => (
                <button key={l.href} onClick={() => navigate(l.href)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition hover:bg-brand-soft">
                  {l.label}<ArrowRight className="h-3.5 w-3.5 text-muted" />
                </button>
              ))}
            </div>
          </Card>
          <Badge tone="neutral" className="block">Answers use only your stored data.</Badge>
        </div>
      </div>
    </div>
  );
}

function Avatar({ icon: Icon, tone }: { icon: typeof Sparkles; tone?: 'muted' }) {
  return (
    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone === 'muted' ? 'bg-ink-500/10 text-muted' : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}