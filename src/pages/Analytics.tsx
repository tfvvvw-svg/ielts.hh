import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, Sparkles } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, Progress, SectionTitle } from '../components/ui';
import { StatCard } from '../components/Common';
import { AXIS, CHART_MARGIN, COLORS, GRID, chartTooltip, gradient } from '../components/Charts';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL, currentOverall, readiness, skillStats, weakestQuestionTypes } from '../lib/brain';
import { typeLabel } from '../lib/types';
import { todayISO } from '../lib/utils';

export default function Analytics() {
  const { db, streak, weeklyMinutes } = useApp();
  const navigate = useNavigate();
  const stats = useMemo(() => skillStats(db), [db]);
  const weak = useMemo(() => weakestQuestionTypes(db, 6), [db]);
  const ready = readiness(db, db.profile);
  const overall = currentOverall(db);

  const bandTrend = useMemo(() => {
    const map = new Map<string, number[]>();
    [...db.results].sort((a, b) => a.createdAt - b.createdAt).forEach((r) => {
      const d = todayISO(new Date(r.createdAt));
      map.set(d, [...(map.get(d) ?? []), r.band]);
    });
    return [...map.entries()].map(([date, bands]) => ({
      date: date.slice(5), band: Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10,
    })).slice(-14);
  }, [db.results]);

  const studyData = useMemo(() => {
    const map = new Map<string, number>();
    db.sessions.forEach((s) => map.set(s.date, (map.get(s.date) ?? 0) + s.minutes));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, minutes]) => ({ date: date.slice(5), minutes }));
  }, [db.sessions]);

  const writingTrend = useMemo(() => [...db.essays].sort((a, b) => a.createdAt - b.createdAt).slice(-10)
    .map((e) => ({ date: todayISO(new Date(e.createdAt)).slice(5), band: e.analysis.overall })), [db.essays]);

  const speakingTrend = useMemo(() => [...db.speaking].sort((a, b) => a.createdAt - b.createdAt).slice(-10)
    .map((s) => ({ date: todayISO(new Date(s.createdAt)).slice(5), overall: s.overall })), [db.speaking]);

  const skillPie = useMemo(() => stats.filter((s) => s.type === 'overall' && s.attempts > 0)
    .map((r) => ({ name: SKILL_LABEL[r.skill], value: Math.round((r.percentage / 9) * 10) / 10 })), [stats]);

  if (db.results.length === 0 && db.essays.length === 0 && db.speaking.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={BarChart3} title="Analytics" subtitle="Every chart answers a real question about your preparation." />
        <EmptyState icon={BarChart3} title="No data yet"
          body="Take a test, write an essay or run a speaking session. Bandit turns your practice into a clear picture of where you stand."
          action={<Button size="sm" icon={Sparkles} onClick={() => navigate('/test-generator')}>Generate your first test</Button>} />
      </div>
    );
  }

return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Analytics"
        subtitle="Band progression, study time, skill accuracy and writing trends — all from your own practice data." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Estimated overall" value={overall ?? 0} decimals={1} hint={`Target ${db.profile?.targetBand ?? 7}`} icon={Sparkles} tone="brand" />
        <StatCard label="Exam readiness" value={ready.percent} suffix="%" hint={ready.limiter ? `${SKILL_LABEL[ready.limiter]} is the limiter` : 'Complete all four skills'} icon={BarChart3} tone={ready.percent >= 75 ? 'good' : 'warn'} />
        <StatCard label="Study time this week" value={weeklyMinutes} suffix=" min" hint={`Goal ${db.profile?.weeklyGoalMinutes ?? 300} min`} icon={BarChart3} tone="brand" />
        <StatCard label="Current streak" value={streak} suffix=" days" hint="Consistency beats intensity" icon={Sparkles} tone="good" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Band progression" subtitle="Average estimated band per practice day" />
          {bandTrend.length === 0 ? <p className="py-10 text-center text-sm text-muted">Take a test to see your band trend.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={bandTrend} margin={CHART_MARGIN}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 9]} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip()} />
                <Line type="monotone" dataKey="band" stroke="#3366f2" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Study minutes per day" subtitle="Where your time actually goes" />
          {studyData.length === 0 ? <p className="py-10 text-center text-sm text-muted">Log study time by completing tasks or tests.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={studyData} margin={CHART_MARGIN}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgb(var(--border) / .3)' }} {...chartTooltip()} />
                <Bar dataKey="minutes" fill="#3366f2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Skill balance" subtitle="Estimated band per skill" />
          {skillPie.length === 0 ? <p className="py-10 text-center text-sm text-muted">No skill data yet.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={skillPie} dataKey="value" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={3}>
                  {skillPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...chartTooltip()} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Accuracy by question type" subtitle="Your weakest types — the ones costing you marks" />
          {weak.length === 0 ? <p className="py-10 text-center text-sm text-muted">Answer more questions to reveal this breakdown.</p> : (
            <ul className="space-y-3">
              {weak.map((w) => (
                <li key={`${w.skill}-${w.type}`}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{typeLabel(w.type)}</span>
                    <span className="text-muted">{w.percentage}% · {w.attempts} q</span>
                  </div>
                  <Progress value={w.percentage} tone={w.percentage >= 75 ? 'good' : w.percentage >= 55 ? 'warn' : 'bad'} />
                </li>
              ))}
            </ul>
          )}
        </Card>

<Card className="p-5">
          <SectionTitle title="Writing progression" subtitle="Estimated band per essay" />
          {writingTrend.length === 0 ? <p className="py-10 text-center text-sm text-muted">Write your first essay in Writing Lab.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={writingTrend} margin={CHART_MARGIN}>
                {gradient('wg', '#14b8a6')}
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 9]} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip()} />
                <Area type="monotone" dataKey="band" stroke="#14b8a6" fill="url(#wg)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Speaking progression" subtitle="Estimated band per session" />
          {speakingTrend.length === 0 ? <p className="py-10 text-center text-sm text-muted">Complete a speaking session in Speaking Lab.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={speakingTrend} margin={CHART_MARGIN}>
                {gradient('sg', '#f59e0b')}
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 9]} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip()} />
                <Area type="monotone" dataKey="overall" stroke="#f59e0b" fill="url(#sg)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}