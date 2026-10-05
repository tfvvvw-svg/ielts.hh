import { uid } from '../utils';
import { detectTopic, keywords, levenshtein, sentences, shuffled, titleCase, truncate, words } from './text';
import type { Difficulty, ISkill, Question, QuestionType } from '../types';

export interface GenerateInput {
  skill: ISkill;
  types: QuestionType[];
  difficulty: Difficulty;
  count: number;
  passage: string;
  materialId?: string;
  topic?: string;
}

const ARTICLES = /\b(a|an|the)\b/gi;

function blankArticles(s: string) {
  return s.replace(ARTICLES, '____');
}

/** Selects a salient sentence: prefers length, information density, few names. */
function scoreSentence(s: string) {
  const w = words(s);
  if (w.length < 8 || w.length > 44) return -1;
  const digits = (s.match(/\d/g) ?? []).length;
  const caps = (s.match(/\b[A-Z][a-z]{2,}/g) ?? []).length;
  const connectives = (s.match(/\b(however|therefore|because|although|while|whereas|moreover|in contrast|as a result|for example)\b/gi) ?? []).length;
  return w.length * 0.6 + connectives * 6 - digits * 1.5 - caps * 0.4;
}

function makeContext(pool: string[], idx: number, radius = 1) {
  return pool.slice(Math.max(0, idx - radius), idx + radius).join(' ');
}

interface Draft {
  prompt: string; context?: string; options?: string[]; answer: string;
  accept?: string[]; explanation: string; sourceIndex?: number;
  contextRaw?: string; materialId?: string;
}

function buildShortAnswer(sentence: string, i: number, ctx: string, materialId?: string): Draft | null {
  const m = sentence.match(/(?:the|a|an)\s+([a-z]+(?:\s+[a-z]+){0,2})\s+(?:is|are|was|were|has|have|can|will|may|remains?|becomes?|provides?|creates?|causes?)\b/i);
  const answer = m ? m[1].trim() : (keywords(sentence, 1)[0] ?? '');
  if (!answer || answer.length < 3) return null;
  const blanked = blankArticles(sentence).replace(answer, '____');
  return {
    prompt: 'Answer the question using **NO MORE THAN THREE WORDS** from the passage.',
    context: blanked,
    answer,
    explanation: `The sentence reads: “${truncate(sentence, 180)}” — the target phrase is “${answer}”.`,
    sourceIndex: i,
    contextRaw: ctx,
    materialId,
  };
}

function buildCompletion(sentence: string, i: number, ctx: string, materialId?: string): Draft | null {
  const key = keywords(sentence, 1)[0];
  if (!key) return null;
  const idx = sentence.toLowerCase().indexOf(key);
  if (idx < 0) return null;
  return {
    prompt: 'Complete the sentence below with **NO MORE THAN THREE WORDS** taken from the passage.',
    context: `${sentence.slice(0, idx)}____${sentence.slice(idx + key.length)}`,
    answer: key,
    accept: [key, `${key}s`, key.replace(/ies$/, 'y')],
    explanation: `From the passage: “${truncate(sentence, 180)}”. The missing item is “${key}”.`,
    sourceIndex: i,
    contextRaw: ctx,
    materialId,
  };
}

function buildTfng(sentence: string, i: number, ctx: string, materialId?: string): Draft | null {
  const stripped = sentence.replace(/^[^A-Za-z]+/, '');
  const subject = stripped.match(/^[A-Z][a-zA-Z\- ]+?/)?.[0]?.trim() ?? '';
  if (!subject) return null;
  const detail = words(stripped).slice(4, 12).join(' ');
  return {
    prompt: `Statement: ${titleCase(subject)} ${detail}.`,
    context: ctx,
    options: ['True', 'False', 'Not Given'],
    answer: 'True',
    explanation: `This information IS given in the passage: “${truncate(stripped, 180)}”. “Not Given” does not apply because the statement is directly stated.`,
    sourceIndex: i,
    materialId,
  };
}

function buildMc(sentence: string, i: number, ctx: string, pool: string[], materialId?: string): Draft | null {
  const key = keywords(sentence, 1)[0];
  if (!key) return null;
  const distractors = shuffled(
    pool.flatMap((s) => keywords(s, 3)).filter((w) => w !== key && levenshtein(w, key) > 2), 42,
  ).slice(0, 3);
  if (distractors.length < 3) return null;
  const idx = sentence.toLowerCase().indexOf(key);
  return {
    prompt: 'Choose the correct answer to complete the statement.',
    context: `${sentence.slice(0, idx)}____${sentence.slice(idx + key.length)}`,
    options: shuffled([key, ...distractors], 7),
    answer: key,
    explanation: `The passage states: “${truncate(sentence, 180)}” — therefore “${key}” is correct.`,
    sourceIndex: i,
    contextRaw: ctx,
    materialId,
  };
}

function buildMatchingHeadings(paras: string[], i: number, materialId?: string): Draft | null {
  const para = paras[i];
  const keys = keywords(para, 3);
  if (keys.length < 2) return null;
  const generic = ['A change in approach', 'A growing problem', 'A surprising discovery', 'A practical solution', 'Recent research findings', 'Historical background'];
  const correct = `Paragraph ${String(i + 1)}`;
  const options = shuffled([correct, ...shuffled(generic, i + 11).slice(0, 3)], i + 3);
  return {
    prompt: 'Which heading best summarises the paragraph below?',
    context: para,
    options,
    answer: correct,
    explanation: `The paragraph centres on ${keys.slice(0, 3).join(', ')}. Read the first and last sentence of each paragraph — they usually contain the main idea.`,
    sourceIndex: i,
    contextRaw: para,
    materialId,
  };
}

/** Builds grounded questions from a passage. Nothing is invented. */
export function generateFromPassage(input: GenerateInput): Question[] {
  const { passage, count, types, skill } = input;
  const pool = sentences(passage);
  if (pool.length === 0) return [];
  const paras = passage.split(/\n{2,}/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 60);
  /* A pasted block without blank lines still has usable paragraph-like units. */
  const paraUnits = paras.length > 0 ? paras : pool.filter((s) => s.length > 60).reduce<string[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.length < 220) acc[acc.length - 1] = `${last} ${s}`;
    else acc.push(s);
    return acc;
  }, []);
  const ranked = pool
    .map((s, i) => ({ s, i, score: scoreSentence(s) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);

  const drafts: Draft[] = [];
  const wanted = new Set(types);

  for (const s of ranked) {
    const i = pool.indexOf(s);
    const ctx = makeContext(pool, i);
    if (drafts.length >= count * 3) break;
    if (wanted.has('short_answer')) {
      const d = buildShortAnswer(s, i, ctx, input.materialId); if (d) drafts.push(d);
    }
    if (wanted.has('sentence_completion') || wanted.has('summary_completion') || wanted.has('fill_blank')) {
      const d = buildCompletion(s, i, ctx, input.materialId); if (d) drafts.push(d);
    }
    if (wanted.has('multiple_choice')) {
      const d = buildMc(s, i, ctx, pool, input.materialId); if (d) drafts.push(d);
    }
    if (wanted.has('true_false_not_given')) {
      const d = buildTfng(s, i, ctx, input.materialId); if (d) drafts.push(d);
    }
  }

  if ((wanted.has('matching_headings') || wanted.has('matching')) && paraUnits.length >= 2) {
    const n = Math.min(paraUnits.length, 4);
    for (let i = 0; i < n; i++) {
      const d = buildMatchingHeadings(paraUnits, i, input.materialId);
      if (d) drafts.push(d);
    }
  }
  if (wanted.has('multiple_choice') && paraUnits.length >= 1) {
    const d = buildMcFromParagraph(paraUnits[0], paraUnits, input.materialId);
    if (d) drafts.push(d);
  }
  if (wanted.has('vocabulary')) drafts.push(...vocabDrafts(passage));
  if (wanted.has('grammar')) drafts.push(...grammarDrafts(passage));
  if (wanted.has('reading_comprehension') && pool[0]) {
    const opening = truncate((paras[0] ?? pool[0]).split(/(?<=\.)\s/)[0], 120);
    drafts.push({
      prompt: 'In one sentence, summarise the main idea of this passage.',
      context: paras[0] ?? pool.slice(0, 3).join(' '),
      answer: opening,
      accept: [opening],
      explanation: 'A strong summary answers What / Who / Where / When and is supported by the opening of the passage.',
      sourceIndex: 0,
      materialId: input.materialId,
    });
  }

  const seen = new Set<string>();
  const unique = drafts.filter((d) => {
    const k = `${d.prompt}|${d.answer}|${d.sourceIndex}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  const chosen = interleaveTypes(unique, types, count).slice(0, count);

  return chosen.map((d, idx) => ({
    id: uid(),
    testId: '',
    skill,
    type: inferType(d),
    prompt: d.prompt,
    context: d.context,
    options: d.options,
    answer: d.answer,
    accept: d.accept,
    explanation: d.explanation,
    source: { evidence: truncate(d.contextRaw ?? d.context ?? passage, 400), materialId: d.materialId },
    sourceIndex: d.sourceIndex,
    points: 1,
    order: idx,
  }));
}

function buildMcFromParagraph(para: string, paras: string[], materialId?: string): Draft | null {
  const keys = keywords(para, 4);
  if (keys.length < 3) return null;
  const distractors = shuffled(paras.filter((p) => p !== para).flatMap((p) => keywords(p, 3)).filter((w) => !keys.includes(w)), 5).slice(0, 3);
  if (distractors.length < 3) return null;
  const answer = keys[0];
  const idx = para.toLowerCase().indexOf(answer);
  return {
    prompt: 'Which option correctly completes the statement according to the passage?',
    context: `${para.slice(0, idx)}____${para.slice(idx + answer.length)}`,
    options: shuffled([answer, ...distractors], 9),
    answer,
    explanation: `The passage says: “${truncate(para, 200)}”. The correct completion is “${answer}”.`,
    sourceIndex: 0,
    contextRaw: para,
    materialId,
  };
}

/** Rotates through the requested types; if a type yields nothing it still
 *  fills the remaining slots from other grounded drafts rather than short tests. */
function interleaveTypes(drafts: Draft[], types: QuestionType[], count: number): Draft[] {
  const buckets = types.map((t) => drafts.filter((d) => {
    const dt = inferType(d);
    if (t === dt) return true;
    if (t === 'fill_blank' && dt === 'sentence_completion') return true;
    if (t === 'summary_completion' && dt === 'sentence_completion') return true;
    if (t === 'reading_comprehension' && dt === 'short_answer') return true;
    return false;
  }));
  const out: Draft[] = [];
  let i = 0;
  while (out.length < count && i < 80) {
    let added = false;
    for (const b of buckets) {
      if (out.length >= count) break;
      if (b.length) { out.push(b.shift() as Draft); added = true; }
    }
    if (!added) break;
    i++;
  }
  if (out.length < count) {
    const chosen = new Set(out);
    drafts.forEach((d) => { if (out.length < count && !chosen.has(d)) { out.push(d); chosen.add(d); } });
  }
  return out;
}

function inferType(d: Draft): QuestionType {
  if (d.options?.length === 3 && ['True', 'False', 'Not Given'].every((o) => d.options?.includes(o))) return 'true_false_not_given';
  if (d.prompt.includes('heading')) return 'matching_headings';
  if (d.prompt.includes('main idea')) return 'reading_comprehension';
  if (d.prompt.includes('NO MORE THAN THREE WORDS')) return 'short_answer';
  if (d.options) return 'multiple_choice';
  return 'sentence_completion';
}

export interface GrammarRule {
  id: string;
  label: string;
  why: string;
  find: RegExp;
  replace: (m: RegExpMatchArray) => string;
}

export const GRAMMAR_RULES: GrammarRule[] = [
  { id: 'sva-they-was', label: 'Subject–verb agreement', why: '“They” always takes the plural verb “were” in the past.', find: /\b(they was)\b/gi, replace: () => 'they were' },
  { id: 'sva-he-dont', label: 'Subject–verb agreement', why: 'Third-person singular subjects take “does” in the present simple.', find: /\b(he don't)\b/gi, replace: () => 'he does not' },
  { id: 'sva-doesnt-has', label: 'Subject–verb agreement', why: 'After “does not” use the base form of the verb.', find: /\b(doesn't has)\b/gi, replace: () => 'does not have' },
  { id: 'sva-i-are', label: 'Subject–verb agreement', why: 'The verb “be” with “I” is always “am”.', find: /\b(I are)\b/g, replace: () => 'I am' },
  { id: 'sva-she-have', label: 'Subject–verb agreement', why: '“She” takes “has”, never “have”.', find: /\b(she have)\b/gi, replace: () => 'she has' },
  { id: 'cnt-information', label: 'Countability', why: 'Information, advice, equipment and knowledge are uncountable nouns.', find: /\b(informations|advices|equipments|knowledges)\b/gi, replace: (m) => m[1].replace(/s$/, '') },
  { id: 'cnt-people', label: 'Countability', why: '“People” is already plural; use it for more than one person.', find: /\b(peoples|childrens|mens)\b/gi, replace: (m) => m[1].replace(/s$/, '') },
  { id: 'vb-discuss-about', label: 'Verb pattern', why: '“Discuss” is followed directly by the object, not by “about”.', find: /\b(discuss about)\b/gi, replace: () => 'discuss' },
  { id: 'reg-according-to-me', label: 'Academic register', why: 'Academic writing prefers impersonal or explicit stance markers.', find: /\b(according to me)\b/gi, replace: () => 'in my view' },
  { id: 'art-a-vowel', label: 'Articles', why: 'Use “an” before a vowel sound.', find: /\ba ([aeiou]\w+)/gi, replace: (m) => `an ${m[1]}` },
  { id: 'art-an-consonant', label: 'Articles', why: 'Use “a” before a consonant sound.', find: /\ban ([^aeiouAEIOU\s]\w+)/g, replace: (m) => `a ${m[1]}` },
  { id: 'ten-didnt-went', label: 'Tenses', why: 'After a past auxiliary the verb returns to its base form.', find: /\b(didn't went|did not went)\b/gi, replace: () => 'did not go' },
  { id: 'ten-yesterday-go', label: 'Tenses', why: '“Yesterday” requires the past simple.', find: /\b(yesterday I go)\b/gi, replace: () => 'yesterday I went' },
  { id: 'det-much-many', label: 'Determiners', why: 'Countable nouns use “many”; uncountable nouns use “much”.', find: /\b(much many|many much)\b/gi, replace: () => 'many' },
  { id: 'det-fewer', label: 'Determiners', why: 'People is countable, so “fewer” is used in comparisons.', find: /\b(less people|fewer people)\b/gi, replace: () => 'fewer people' },
  { id: 'prep-depend', label: 'Prepositions', why: 'The correct collocation is “depend on”.', find: /\b(depend of|depend from)\b/gi, replace: () => 'depend on' },
  { id: 'prep-refer', label: 'Prepositions', why: 'Use “refer to” when pointing to a source.', find: /\brefer (of|about)\b/gi, replace: () => 'refer to' },
  { id: 'modal-can-to', label: 'Modal verbs', why: 'After a modal verb the verb stays in its base form.', find: /\b(can to|will to|should to)\b/gi, replace: (m) => `${m[1].split(' ')[0]}` },
  { id: 'passive-was-participle', label: 'Passive voice', why: 'Form the passive with a form of “be” plus a past participle.', find: /\b(was|did|were) (gone|eaten|written|built|made|taken|given|seen|done)\b/gi, replace: (m) => `was ${m[2]}` },
];

export function findGrammarIssues(text: string) {
  return GRAMMAR_RULES.flatMap((rule) => {
    const re = new RegExp(rule.find.source, rule.find.flags.includes('g') ? rule.find.flags : `${rule.find.flags}g`);
    const hits: { rule: GrammarRule; match: string; index: number; correct: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      hits.push({ rule, match: m[0], index: m.index, correct: rule.replace(m) });
      if (hits.length >= 4) break;
    }
    return hits;
  }).slice(0, 12);
}

function sentenceAround(text: string, index: number) {
  const start = Math.max(text.lastIndexOf('.', index), text.lastIndexOf('\n', index)) + 1;
  const rest = text.slice(index);
  const end = rest.search(/[.!?\n]/);
  return text.slice(start, index + (end === -1 ? 140 : end + 1)).replace(/\s+/g, ' ').trim();
}

export function grammarDrafts(passage: string): Draft[] {
  const out: Draft[] = [];
  const seen = new Set<string>();
  findGrammarIssues(passage).forEach(({ rule, match, index, correct }) => {
    const key = `${rule.id}|${match}`;
    if (seen.has(key)) return;
    seen.add(key);
    const sentence = sentenceAround(passage, index);
    out.push({
      prompt: 'Correct the grammar error in the sentence below. Write only the corrected sentence.',
      context: sentence || match,
      answer: correct,
      accept: [correct],
      explanation: `${rule.label} — ${rule.why}`,
      sourceIndex: index,
      contextRaw: sentence,
    });
  });
  return out;
}

export const GLOSS: Record<string, [string, string]> = {
  sustainable: ['able to be maintained without damaging the environment', 'viable, long-lasting'],
  infrastructure: ['the basic physical systems a society relies on', 'framework, facilities'],
  mitigate: ['to make something less harmful', 'reduce, alleviate'],
  prevalent: ['widespread and common', 'widespread, common'],
  incentive: ['something that encourages an action', 'motivation, inducement'],
  disparity: ['a large and unfair difference', 'inequality, gap'],
  advocate: ['to publicly support a cause', 'support, champion'],
  detrimental: ['harmful or damaging', 'harmful, damaging'],
  proliferation: ['a rapid increase in the number of something', 'spread, increase'],
  ubiquitous: ['present everywhere', 'omnipresent, widespread'],
  allocate: ['to distribute resources for a purpose', 'assign, distribute'],
  feasibility: ['how possible something is', 'viability, practicality'],
  stringent: ['very strict and severe', 'strict, rigorous'],
  paradigm: ['a typical model or pattern', 'model, framework'],
  exacerbate: ['to make a problem worse', 'aggravate, worsen'],
  subsequent: ['happening after something else', 'following, later'],
  compelling: ['convincing and strongly interesting', 'persuasive, gripping'],
  undermine: ['to weaken gradually', 'erode, weaken'],
};

export function vocabDrafts(passage: string): Draft[] {
  const out: Draft[] = [];
  Array.from(new Set(words(passage).filter((w) => w.length > 4 && GLOSS[w]))).forEach((w, i) => {
    const [def, syn] = GLOSS[w];
    const sentence = sentences(passage).find((s) => s.toLowerCase().includes(w)) ?? '';
    out.push({
      prompt: `What does “${w}” mean in this context?`,
      context: sentence,
      answer: def,
      accept: [def, ...syn.split(', ')],
      explanation: `“${w}” means ${def}. Related: ${syn}.`,
      sourceIndex: i,
      contextRaw: sentence,
    });
  });
  return out;
}

export function summarize(text: string, count = 5): string[] {
  const pool = sentences(text);
  return pool
    .map((s, i) => ({ s, i, score: scoreSentence(s) + (i === 0 ? 12 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.i - b.i)
    .map((x) => truncate(x.s, 220));
}

export function extractVocabulary(text: string, limit = 20) {
  const topic = detectTopic(text);
  const uniq = Array.from(new Set(words(text).filter((w) => w.length > 5)));
  return uniq.slice(0, limit).map((w) => {
    const g = GLOSS[w];
    return {
      word: w,
      definition: g?.[0] ?? `Look “${w}” up in a dictionary and write your own one-line definition to make it stick.`,
      example: sentences(text).find((s) => s.toLowerCase().includes(w)) ?? '',
      synonyms: g ? g[1].split(', ') : [],
      antonyms: [] as string[],
      topic,
      difficulty: (w.length > 9 ? 'hard' : w.length > 7 ? 'medium' : 'easy') as Difficulty,
    };
  });
}

const STRUCTURAL = [
  { re: /would [^.]*\bwere\b|\bif [^.]*\bwere\b/i, label: 'Mixed conditionals', why: 'An unreal past result uses “would + infinitive” in the if-clause past form.' },
  { re: /\b(who|which|whose|whom)\b/i, label: 'Relative clauses', why: 'Relative clauses add information about a noun and start with who/which/that.' },
  { re: /\bbeen\b|\bbeing\b|\bwas \w+ed\b/i, label: 'Passive voice', why: 'The passive is a form of “be” plus a past participle.' },
  { re: /\b(although|whereas|moreover|therefore)\b/i, label: 'Cohesion devices', why: 'Linking words make relationships between ideas explicit.' },
  { re: /\bhowever\b/i, label: 'Punctuation', why: 'A full sentence after “however” takes a comma before it.' },
  { re: /\bif\b[^.]*,\s*we\b/i, label: 'Conditionals', why: 'Second conditional: if + past simple, would + infinitive.' },
];

export function extractGrammarPoints(text: string) {
  const hits = findGrammarIssues(text).reduce<{ label: string; why: string; count: number }[]>((acc, h) => {
    const found = acc.find((x) => x.label === h.rule.label);
    if (found) found.count += 1; else acc.push({ label: h.rule.label, why: h.rule.why, count: 1 });
    return acc;
  }, []);
  STRUCTURAL.forEach((s) => { if (s.re.test(text)) hits.push({ label: s.label, why: s.why, count: 1 }); });
  return { points: hits.slice(0, 8), keywords: keywords(text, 10) };
}