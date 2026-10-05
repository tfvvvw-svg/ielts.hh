import { useNavigate } from 'react-router-dom';
import { BookMarked, Headphones, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SectionTitle } from '../components/ui';
import { StatCard } from '../components/Common';
import { useApp } from '../store/AppContext';
import { SKILL_LABEL, skillStats, weakestQuestionTypes, suggestDifficulty } from '../lib/brain';
import { typeLabel, type ISkill } from '../lib/types';
import { relativeTime } from '../lib/utils';

export default function SkillPractice({ skill }: { skill: ISkill }) {
  const { db } = useApp();
  const navigate = useNavigate();
  const isListening = skill === 'listening';
  const stats = skillStats(db).filter((s) => s.skill === skill);
  const overall = stats.find((s) => s.type === 'overall');
  const byType = stats.filter((s) => s.type !== 'overall');
  const weak = weakestQuestionTypes(db).find((w) => w.skill === skill);
  const results = db.results.filter((r) => r.skill === skill);
  const Icon = isListening ? Headphones : BookMarked;

  return (
    <div className="space-y-6">
      <PageHeader icon={Icon} title={`${SKILL_LABEL[skill]} practice`}
        subtitle={isListening
          ? 'Generate listening sets from your transcripts — same grounded engine, timed like the real test.'
          : 'Your performance by question type, plus grounded tests generated from your own materials.'}
        action={<Button icon={Sparkles} onClick={() => navigate('/test-generator')}>Generate a test</Button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accuracy" value={overall?.percentage ?? 0} suffix="%" hint={`${overall?.attempts ?? 0} questions answered`} icon={TrendingUp}
          tone={(overall?.percentage ?? 0) >= 70 ? 'good' : 'warn'} />
        <StatCard label="Tests completed" value={db.tests.filter((t) => t.skill === skill).length} hint={`Suggested difficulty: ${suggestDifficulty(db, skill)}`} icon={Zap} tone="brand" />
        <StatCard label="Weakest type" value={weak ? weak.percentage : 0} suffix="%" hint={weak ? typeLabel(weak.type) : 'Take a test to find out'} icon={Icon}
          tone={weak && weak.percentage < 60 ? 'bad' : 'good'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Skill map" subtitle="Accuracy for each question type you have attempted" />
          {byType.length === 0 ? (
            <EmptyState icon={Icon} title="No data for this skill yet"
              body="Take a practice test and Bandit will map every question type you get right and wrong."
              action={<Button size="sm" onClick={() => navigate('/test-generator')}>Generate my first test</Button>} />
          ) : (
            <ul className="space-y-3.5">
              {byType.map((s) => (
                <li key={String(s.type)}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{typeLabel(s.type)}</span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {s.trend !== 0 && <Badge tone={s.trend > 0 ? 'good' : 'bad'}>{s.trend > 0 ? '+' : ''}{s.trend}%</Badge>}
                      {s.percentage}% · {s.attempts} q
                    </span>
                  </div>
                  <Progress value={s.percentage} tone={s.percentage >= 75 ? 'good' : s.percentage >= 55 ? 'warn' : 'bad'} />
                </li>
              ))}
            </ul>
          )}
        </Card>

<Card>
          <SectionTitle title="Recent results" subtitle="Every score is saved automatically" />
          {results.length === 0 ? (
            <EmptyState icon={Zap} title="No results yet"
              body="Your scores, explanations and mistakes appear here after your first test."
              action={<Button size="sm" onClick={() => navigate('/test-generator')}>Generate a test</Button>} />
          ) : (
            <ul className="space-y-2.5">
              {results.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{r.percentage}%</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.testTitle}</p>
                    <p className="text-xs text-muted">{r.score}/{r.total} · Band ~{r.band} · {relativeTime(r.createdAt)}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/test/${r.testId}`)}>Review</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle title="How to improve this skill" subtitle="Advice generated from your own results" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Target your weakest type', body: weak ? `You score ${weak.percentage}% on ${typeLabel(weak.type)}. A focused set on this single type is the cheapest gain available.` : 'Take a test and Bandit will identify the exact question type costing you marks.' },
            { title: 'Work under time pressure', body: 'Real IELTS questions are timed. Use timed mode so speed becomes automatic before exam day.' },
            { title: 'Review every mistake', body: 'Each wrong answer lands in your Mistake Bank with the source sentence, so a repeat costs you nothing.' },
          ].map((t) => (
            <div key={t.title} className="rounded-xl border border-[rgb(var(--border))] p-4">
              <h3 className="font-display text-sm font-bold">{t.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{t.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}