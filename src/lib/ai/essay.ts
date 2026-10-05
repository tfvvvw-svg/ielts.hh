import type { EssayAnalysis, Issue } from '../types';
import { clamp, round1 } from '../utils';
import { findGrammarIssues } from './generate';
import { sentences, STOPWORDS, words } from './text';

const ACADEMIC = ['significant', 'substantial', 'crucial', 'comprehensive', 'inevitable', 'compelling', 'moreover', 'consequently', 'arguably', 'notably', 'profound', 'detrimental', 'beneficial'];
const VAGUE = ['things', 'stuff', 'a lot of', 'very much', 'etc'];

export const TASK_PROMPTS = [
  { task: 'Task 1', prompt: 'The chart below shows the results of a survey about three important factors. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.', min: 150 },
  { task: 'Task 2', prompt: 'Some people believe that universities should offer only practical courses, while others argue that a broad education is equally important. Discuss both views and give your own opinion. Write at least 250 words.', min: 250 },
  { task: 'Opinion', prompt: 'To what extent do you agree or disagree with the statement below? Support your position with relevant examples. Write at least 250 words.', min: 250 },
  { task: 'Problem / Solution', prompt: 'What problems does the situation described below cause? What measures could be taken to address them? Write at least 250 words.', min: 250 },
  { task: 'Advantages / Disadvantages', prompt: 'Do the advantages of the development described below outweigh the disadvantages? Write at least 250 words.', min: 250 },
];

export function analyseEssay(text: string): EssayAnalysis {
  const clean = text.trim();
  const sents = sentences(clean);
  const tokens = words(clean);
  const wordTotal = tokens.length;
  const avgSentenceLength = sents.length ? wordTotal / sents.length : wordTotal;

  const freq = new Map<string, number>();
  tokens.forEach((w) => { if (!STOPWORDS.has(w) && w.length > 3) freq.set(w, (freq.get(w) ?? 0) + 1); });
  const repeatedWords = [...freq.entries()]
    .filter(([, c]) => c >= 4).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  const issues: Issue[] = [];
  findGrammarIssues(clean).forEach(({ rule, match, index, correct }) => {
    const start = Math.max(clean.lastIndexOf('.', index), clean.lastIndexOf('\n', index)) + 1;
    const rest = clean.slice(index);
    const end = rest.search(/[.!?\n]/);
    const original = clean.slice(start, index + (end === -1 ? 160 : end + 1)).replace(/\s+/g, ' ').trim();
    issues.push({
      kind: 'grammar',
      problem: `${rule.label}: “${match}”`,
      original,
      better: original.replace(match, correct),
      why: rule.why,
    });
  });

  repeatedWords.slice(0, 4).forEach(({ word, count }) => {
    issues.push({
      kind: 'repetition',
      problem: `“${word}” is used ${count} times`,
      original: `… ${word} … ${word} … ${word} …`,
      better: `Vary your vocabulary — use a synonym or rephrase so “${word}” carries the idea once or twice rather than repeatedly.`,
      why: 'Repetition lowers Lexical Resource. Range matters as much as accuracy.',
    });
  });

  const complexSentences = sents.filter((s) => /\b(although|whereas|while|despite|in addition|moreover|however|therefore|which|that|whose|whom|because|so that)\b/i.test(s) || s.split(',').length >= 3).length;
  const connectors = (clean.match(/\b(however|therefore|moreover|whereas|although|consequently|in contrast|by contrast|furthermore|nevertheless)\b/gi) ?? []).length;
  const paragraphs = clean.split(/\n{2,}/).filter((p) => p.trim().length > 30).length || 1;

if (paragraphs < 3) {
    issues.push({
      kind: 'structure',
      problem: 'Not enough developed paragraphs detected',
      original: paragraphs <= 1 ? 'The whole answer is a single block.' : `Detected ${paragraphs} paragraph(s).`,
      better: 'Write a clear introduction, two or three body paragraphs, and a conclusion. Separate them with a blank line.',
      why: 'Coherence & Cohesion rewards visible paragraph structure with a topic sentence per paragraph.',
    });
  }
  if (connectors < 3) {
    issues.push({
      kind: 'structure',
      problem: `Few linking words used (${connectors} found)`,
      original: 'Ideas are joined mainly with “and”.',
      better: 'Use contrast and result markers: however, therefore, as a result, whereas, in contrast.',
      why: 'Cohesive devices tell the examiner how your ideas relate to each other.',
    });
  }
  if (avgSentenceLength > 34) {
    issues.push({
      kind: 'structure',
      problem: `Sentences average ${round1(avgSentenceLength)} words`,
      original: 'One long sentence carries several ideas.',
      better: 'Split long sentences with a semicolon, a comma plus a conjunction, or a full stop. Mix short (10–15 word) and long (25–30 word) sentences.',
      why: 'A controlled range of sentence structures supports a higher Grammatical Range band.',
    });
  }
  const academicHits = tokens.filter((t) => ACADEMIC.includes(t)).length;
  if (academicHits < 3 && wordTotal > 100) {
    issues.push({
      kind: 'lexical',
      problem: 'Vocabulary is largely everyday rather than academic',
      original: 'good / bad / a lot of things …',
      better: 'Use precise academic alternatives: significant, substantial, detrimental, mitigate, facilitate.',
      why: 'Lexical Resource rewards precise, natural academic word choice over repetition of simple words.',
    });
  }
  VAGUE.forEach((v) => {
    if (clean.toLowerCase().includes(v)) {
      issues.push({
        kind: 'lexical',
        problem: `Vague wording: “${v}”`,
        original: v,
        better: `Replace “${v}” with something specific and measurable.`,
        why: 'Specificity raises both Lexical Resource and Task Response.',
      });
    }
  });
  if (wordTotal < 150) {
    issues.push({
      kind: 'task',
      problem: `Only ${wordTotal} words`,
      original: `${wordTotal} words written.`,
      better: 'IELTS Task 1 needs 150+ words and Task 2 needs 250+. Under-writing costs marks directly in Task Response.',
      why: 'Under-length answers are penalised even when the language is accurate.',
    });
  }

  const grammarErrors = issues.filter((i) => i.kind === 'grammar').length;
  const grammatical = clamp(9 - grammarErrors * 0.55 - Math.max(0, avgSentenceLength - 30) / 22, 4, 9);
  const lexical = clamp(4.5 + Math.min(repeatedWords.length * 0.35, 1.4) + academicHits / 6 + complexSentences / 14, 4, 9);
  const coherence = clamp(4.2 + Math.min(paragraphs, 4) * 0.45 + connectors * 0.22 + complexSentences / 16, 4, 9);
  const task = clamp(4 + Math.min(wordTotal / 250, 1) * 2 + Math.min(paragraphs, 4) * 0.35, 4, 9);
  const criteria = [
    { key: 'task_response' as const, label: 'Task Response', band: round1(task), note: task < 6.5 ? 'Under-length or thin development of ideas.' : 'Ideas are developed and your position is clear.' },
    { key: 'coherence' as const, label: 'Coherence & Cohesion', band: round1(coherence), note: coherence < 6.5 ? 'Paragraph structure and linking devices need work.' : 'Clear paragraphing with visible cohesion.' },
    { key: 'lexical' as const, label: 'Lexical Resource', band: round1(lexical), note: repeatedWords.length ? `Repetition in: ${repeatedWords.slice(0, 3).map((r) => r.word).join(', ')}.` : 'Good range and control of vocabulary.' },
    { key: 'grammatical' as const, label: 'Grammatical Range & Accuracy', band: round1(grammatical), note: grammarErrors ? `${grammarErrors} recurring grammar issue(s) detected.` : 'Accurate, with a reasonable range of structures.' },
  ];
  const overall = round1(criteria.reduce((a, c) => a + c.band, 0) / 4);

  const strengths: string[] = [];
  if (wordTotal >= 250) strengths.push('You reached the required length — you are not being penalised for under-writing.');
  if (paragraphs >= 3) strengths.push(`Clear paragraph structure with ${paragraphs} developed sections.`);
  if (connectors >= 4) strengths.push(`${connectors} cohesive devices found — your ideas are visibly linked.`);
  if (complexSentences / Math.max(1, sents.length) > 0.3) strengths.push('Good proportion of complex sentences for the Grammatical Range criterion.');
  if (grammarErrors === 0) strengths.push('No recurring grammar errors from the rule checks — accuracy is a genuine strength.');
  if (academicHits >= 4) strengths.push(`Strong academic register (${academicHits} academic items).`);
  if (!strengths.length) strengths.push('You have a complete draft to build on — the fastest gains now come from structure and precise vocabulary.');

  return {
    overall, criteria, issues: issues.slice(0, 14), strengths, repeatedWords,
    avgSentenceLength: round1(avgSentenceLength), complexSentences,
    disclaimer: 'Estimated band based on automated analysis of this text only — an approximation for practice, not an official IELTS result.',
  };
}