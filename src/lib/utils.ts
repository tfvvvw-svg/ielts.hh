export const uid = () => crypto.randomUUID();

export const todayISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const round1 = (v: number) => Math.round(v * 10) / 10;

export function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** IELTS raw score → approximate band using the official public conversion curve. */
const BAND_TABLE: [number, number][] = [
  [0, 0], [10, 4.0], [13, 4.5], [15, 5.0], [17, 5.5], [19, 6.0], [23, 6.5],
  [26, 7.0], [30, 7.5], [34, 8.0], [39, 8.5], [40, 9.0],
];
export function rawToBand(raw: number, max: number): number {
  if (max <= 0) return 0;
  const scaled = (raw / max) * 40;
  let band = 0;
  for (const [threshold, b] of BAND_TABLE) if (scaled >= threshold) band = b;
  return Math.min(9, round1(band));
}

/** Score a whole skill out of its IELTS weighting. */
export function skillBand(percentage: number): number {
  return round1(Math.max(0, Math.min(9, percentage / 100 * 9)));
}

export const overallBand = (bands: Record<string, number | null | undefined>) => {
  const { listening, reading, writing, speaking } = bands;
  const l = listening ?? 0, r = reading ?? 0;
  let w = writing ?? 0, s = speaking ?? 0;
  if (writing === null) w = r;
  if (speaking === null) s = Math.max(l, r);
  return round1((l + r + w + s) / 4);
};

export function daysToExam(examDate: string | null): number | null {
  if (!examDate) return null;
  return daysBetween(todayISO(), examDate);
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export function normalizeAnswer(v: string): string {
  return v.toLowerCase().replace(/[.,;:!?"'’“”()]/g, '').replace(/\s+/g, ' ').trim();
}

export function isCorrect(given: string, answer: string, accept: string[] = []): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  if (g === normalizeAnswer(answer)) return true;
  if (accept.some((a) => normalizeAnswer(a) === g)) return true;
  // numeric tolerance for band-scored completions
  const a1 = parseFloat(normalizeAnswer(answer));
  const g1 = parseFloat(g);
  if (!Number.isNaN(a1) && !Number.isNaN(g1) && Math.abs(a1 - g1) < 0.001) return true;
  return false;
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function download(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}