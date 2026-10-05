import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles, Target } from 'lucide-react';
import { Button, Card, Field, Input } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { addDaysISO, cx, todayISO } from '../lib/utils';
import { currentOverall } from '../lib/brain';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BANDS = [5.5, 6, 6.5, 7, 7.5, 8, 8.5];

export default function Onboarding() {
  const { db, saveProfile, regeneratePlan } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: user?.displayName ?? 'Learner',
    examDate: db.profile?.examDate ?? addDaysISO(todayISO(), 30),
    targetBand: db.profile?.targetBand ?? 7,
    currentBand: db.profile?.estimatedBand ?? 5.5,
    dailyMinutes: db.profile?.dailyGoalMinutes ?? 45,
    studyDays: db.profile?.studyDays ?? [1, 2, 3, 4, 5],
  });
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (new Date(`${form.examDate}T00:00:00`).getTime() <= Date.now()) { setError('Choose an exam date in the future.'); return; }
    saveProfile({
      displayName: form.name.trim(), examDate: form.examDate, targetBand: form.targetBand,
      estimatedBand: form.currentBand, dailyGoalMinutes: form.dailyMinutes,
      weeklyGoalMinutes: form.dailyMinutes * 5, studyDays: form.studyDays, onboarded: true,
    });
    regeneratePlan();
    navigate('/dashboard');
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({ ...f, studyDays: f.studyDays.includes(d) ? f.studyDays.filter((x) => x !== d) : [...f.studyDays, d].sort() }));
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[rgb(var(--bg))] px-4 py-10">
      <div className="pointer-events-none fixed inset-0 grid-bg" aria-hidden />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow"><Sparkles className="h-5 w-5 text-white" /></div>
          <p className="font-display text-lg font-bold">Bandit</p>
        </div>
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            {[0, 1, 2].map((s) => <div key={s} className={cx('h-1.5 flex-1 rounded-full transition-colors', s <= step ? 'bg-brand' : 'bg-ink-500/15')} />)}
          </div>

          {step === 0 && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold tracking-tight">Let’s set up your IELTS plan</h1>
              <p className="text-sm text-muted">Three quick questions. Bandit uses these to weight every session it schedules for you.</p>
              <Field label="Your name" htmlFor="onboard-name">
                <Input id="onboard-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="How should we address you?" />
              </Field>
              <Field label="Exam date" htmlFor="onboard-date" hint="Your plan is built backwards from this day">
                <Input id="onboard-date" type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold tracking-tight">What is your target?</h1>
              <p className="text-sm text-muted">Overall band averages all four skills, so one weak skill caps everything. We put extra time where you need it.</p>
              <BandRow label="Target band" value={form.targetBand} onPick={(b) => setForm({ ...form, targetBand: b })} tone="primary" />
              <BandRow label="Current level (best estimate)" value={form.currentBand} onPick={(b) => setForm({ ...form, currentBand: b })} tone="soft" />
              <p className="text-xs text-muted">Not sure? Your estimate is recalculated automatically from every test you take.</p>
            </div>
          )}

{step === 2 && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold tracking-tight">How much time can you give?</h1>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Minutes per study day</p>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 90].map((m) => (
                    <button key={m} onClick={() => setForm({ ...form, dailyMinutes: m })}
                      className={cx('rounded-xl px-4 py-2.5 text-sm font-semibold transition', form.dailyMinutes === m ? 'bg-brand text-white' : 'bg-ink-500/5 text-muted hover:text-[rgb(var(--text))]')}>{m} min</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Days you can study</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => toggleDay(i)} aria-pressed={form.studyDays.includes(i)}
                      className={cx('h-14 w-14 rounded-xl text-sm font-semibold transition', form.studyDays.includes(i) ? 'bg-brand text-white' : 'bg-ink-500/5 text-muted hover:text-[rgb(var(--text))]')}>
                      {form.studyDays.includes(i) && <Check className="mx-auto h-3 w-3" />}{d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-brand-soft p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand"><Target className="h-4 w-4" />{form.studyDays.length * form.dailyMinutes} minutes per week</p>
                <p className="mt-1 text-xs text-muted">Bandit schedules {form.studyDays.length} sessions a week, weighted toward the skills furthest from Band {form.targetBand}.</p>
              </div>
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-lg bg-rose2-500/10 px-3 py-2 text-xs text-rose2-500">{error}</p>}
          <div className="mt-7 flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 2
              ? <Button onClick={() => { setError(null); setStep((s) => s + 1); }}>Continue<ArrowRight className="h-4 w-4" /></Button>
              : <Button onClick={finish} icon={Sparkles}>Build my plan</Button>}
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-muted">
          {currentOverall(db) !== null ? `Currently tracking around Band ${currentOverall(db)}.` : 'Your band estimate updates as you practise.'} Estimates only.
        </p>
      </motion.div>
    </div>
  );
}

function BandRow({ label, value, onPick, tone }: { label: string; value: number; onPick: (b: number) => void; tone: 'primary' | 'soft' }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {BANDS.map((b) => (
          <button key={b} onClick={() => onPick(b)}
            className={cx('rounded-xl px-4 py-2.5 text-sm font-semibold transition', value === b ? (tone === 'primary' ? 'bg-brand text-white' : 'bg-brand-soft text-brand') : 'bg-ink-500/5 text-muted hover:text-[rgb(var(--text))]')}>
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}