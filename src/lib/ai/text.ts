const STOP = new Set(`a an the and or but if then than that this these those of in on at to for with without from by as is are was were be been being am do does did doing have has had having it its he she they them his her their our your my me we you i us not no nor so such very can could will would shall should may might must about into over under between during before after above below up down out off again further once here there when where why how all any both each few more most other some only own same too just also while through per`.split(/\s+/));

export const STOPWORDS = STOP;

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
}

export function sentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 25 && s.length < 500);
}

export function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 40);
}

export function contentWords(text: string): string[] {
  return words(text).filter((w) => w.length > 3 && !STOP.has(w));
}

export function wordCount(text: string): number {
  return words(text).length;
}

/** Fisher–Yates with a seeded PRNG so generated tests are reproducible. */
export function shuffled<T>(arr: T[], seed = Date.now()): T[] {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}

/** Extract a keyword set from a passage, ranked by frequency × length. */
export function keywords(text: string, limit = 12): string[] {
  const freq = new Map<string, number>();
  contentWords(text).forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
  return [...freq.entries()]
    .sort((a, b) => b[1] * b[0].length - a[1] * a[0].length)
    .slice(0, limit)
    .map(([w]) => w);
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i, ...Array(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Type / domain guess used for grammar + vocabulary drill generation. */
export function detectTopic(text: string): string {
  const t = text.toLowerCase();
  const table: [string, string[]][] = [
    ['Environment', ['climate', 'emission', 'pollution', 'environment', 'species', 'recycling', 'ecosystem', 'sustainab']],
    ['Education', ['school', 'student', 'university', 'teacher', 'education', 'academic', 'campus', 'tuition']],
    ['Technology', ['technology', 'digital', 'internet', 'software', 'artificial', 'robot', 'automation', 'smartphone', 'algorithm']],
    ['Health', ['health', 'diet', 'exercise', 'nutrition', 'wellbeing', 'obesity', 'mental', 'hospital']],
    ['Work', ['career', 'employment', 'workplace', 'wage', 'employee', 'profession', 'remote work', 'recruit']],
    ['Urban life', ['city', 'urban', 'housing', 'population', 'transport', 'commute', 'rural', 'migration']],
    ['Science', ['research', 'experiment', 'scientist', 'study', 'theory', 'data', 'innovation', 'gene']],
    ['Culture', ['culture', 'tradition', 'society', 'language', 'art', 'music', 'festival', 'heritage']],
    ['Economy', ['economy', 'market', 'trade', 'inflation', 'investment', 'business', 'consumer', 'industry']],
  ];
  let best = 'General'; let bestHits = 0;
  for (const [name, keys] of table) {
    const hits = keys.filter((k) => t.includes(k)).length;
    if (hits > bestHits) { bestHits = hits; best = name; }
  }
  return best;
}