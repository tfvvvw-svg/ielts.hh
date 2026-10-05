import { useState } from 'react';
import { Download, LogOut, Moon, RotateCcw, Settings as SettingsIcon, Sun, Trash2, User, Wand2 } from 'lucide-react';
import { Button, Card, Field, Input, Modal, PageHeader, SectionTitle, Select } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { cx, download, todayISO } from '../lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Settings() {
  const { db, saveProfile, regeneratePlan, theme, toggleTheme, exportData, resetEverything, firebaseOn } = useApp();
  const { user, logout, resetPassword } = useAuth();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const p = db.profile;
  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };

  if (!p) return null;

  const toggleDay = (d: number) => {
    const next = p.studyDays.includes(d) ? p.studyDays.filter((x) => x !== d) : [...p.studyDays, d].sort();
    saveProfile({ studyDays: next });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Everything here changes how Bandit plans and adapts your preparation." />
      {notice && <div role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">{notice}</div>}

      <Card className="space-y-4 p-5">
        <SectionTitle title="Profile and goals" subtitle="These drive the whole planning engine" />
        <Field label="Display name" htmlFor="s-name">
          <Input id="s-name" value={p.displayName} onChange={(e) => saveProfile({ displayName: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target band" htmlFor="s-target">
            <Select id="s-target" value={p.targetBand} onChange={(e) => saveProfile({ targetBand: Number(e.target.value) })}>
              {[5.5, 6, 6.5, 7, 7.5, 8, 8.5].map((b) => <option key={b} value={b}>Band {b}</option>)}
            </Select>
          </Field>
          <Field label="Exam date" htmlFor="s-date" hint="Leave blank if you have not booked yet">
            <Input id="s-date" type="date" value={p.examDate ?? ''} min={todayISO()} onChange={(e) => saveProfile({ examDate: e.target.value || null })} />
          </Field>
          <Field label="Minutes per study day" htmlFor="s-daily">
            <Input id="s-daily" type="number" min={5} max={240} value={p.dailyGoalMinutes} onChange={(e) => saveProfile({ dailyGoalMinutes: Number(e.target.value) || 30 })} />
          </Field>
          <Field label="Minutes per week" htmlFor="s-weekly">
            <Input id="s-weekly" type="number" min={30} max={1500} step={30} value={p.weeklyGoalMinutes} onChange={(e) => saveProfile({ weeklyGoalMinutes: Number(e.target.value) || 300 })} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Study days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)} aria-pressed={p.studyDays.includes(i)}
                className={cx('h-10 w-14 rounded-xl text-sm font-semibold transition', p.studyDays.includes(i) ? 'bg-brand text-white' : 'bg-ink-500/5 text-muted')}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <Button icon={Wand2} onClick={() => { regeneratePlan(); flash('Study plan regenerated from your updated goals.'); }}>Regenerate study plan</Button>
      </Card>

      <Card className="space-y-4 p-5">
        <SectionTitle title="Appearance" subtitle="Both themes are designed, not simply inverted" />
        <div className="grid gap-3 sm:grid-cols-2">
          {([['dark', Moon, 'Dark'], ['light', Sun, 'Light']] as const).map(([value, Icon, label]) => (
            <button key={value} onClick={() => { if (theme !== value) toggleTheme(); }}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${theme === value ? 'border-brand bg-brand-soft' : 'border-[rgb(var(--border))]'}`}>
              <Icon className="h-5 w-5 text-brand" />
              <div>
                <p className="text-sm font-medium">{label} mode</p>
                <p className="text-xs text-muted">{theme === value ? 'Currently active' : 'Switch to this theme'}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

<Card className="space-y-4 p-5">
        <SectionTitle title="Account" subtitle={firebaseOn ? 'Connected with Firebase Authentication' : 'Running in offline mode'} />
        <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft"><User className="h-4 w-4 text-brand" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.displayName ?? 'Learner'}</p>
            <p className="truncate text-xs text-muted">{user?.email ?? 'Guest learner'}</p>
          </div>
          <Button className="ml-auto" variant="outline" size="sm" icon={LogOut} onClick={() => { void logout(); }}>Sign out</Button>
        </div>
        {firebaseOn && !user?.isGuest && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Password recovery" htmlFor="s-recover" hint="We will email you a reset link">
              <Input id="s-recover" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="your@email.com" />
            </Field>
            <Button variant="secondary"
              onClick={() => { void resetPassword(resetEmail).then(() => flash('Password reset email sent, if that address exists.')).catch(() => flash('Could not send the reset email.')); }}>
              Send reset link
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <SectionTitle title="Your data" subtitle="Export or clear everything stored on this device" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Download} onClick={() => download(`bandit-data-${todayISO()}.json`, exportData(), 'application/json')}>
            Export my data
          </Button>
          <Button variant="outline" icon={RotateCcw} onClick={() => { flash('Alerts and achievements recalculated.'); }}>
            Recalculate insights
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setConfirmReset(true)}>Delete all data</Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          {firebaseOn
            ? 'Your learning data is stored under your Firebase user id and never shared. Export it at any time.'
            : 'Firebase is not configured, so your data stays in this browser only. Add your Firebase keys to .env to sync it across devices.'}
        </p>
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Delete all data?">
        <p className="text-sm text-muted">
          This removes every task, test, result, mistake, essay, speaking session and word from this browser. It cannot be undone.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => { resetEverything(); setConfirmReset(false); flash('All local data deleted.'); }}>Yes, delete everything</Button>
          <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}