import type { SpeakingScore, SpeakingSession } from '../types';
import { clamp, round1 } from '../utils';
import { sentences, STOPWORDS, words } from './text';

const TOPICS = ['Hometown', 'Work or Study', 'Hobbies', 'Food & Cooking', 'Music', 'Weather', 'Technology', 'Travel', 'Reading', 'City Life', 'Family', 'Sports', 'Shopping', 'Media'];

const P1: Record<string, string[]> = {
  Hometown: ['What is your hometown like?', 'What do you like most about it?', 'Has it changed in recent years?', 'Would you recommend it to visitors?'],
  'Work or Study': ['Do you work or are you a student?', 'What does a typical day look like?', 'What do you enjoy about it?', 'Would you like to change your routine?'],
  Hobbies: ['What hobbies do you have?', 'When did you first get into them?', 'Do you prefer doing them alone or with others?'],
  'Food & Cooking': ['What kind of food do you usually eat?', 'Do you cook at home often?', 'Has your diet changed recently?'],
  Music: ['What kind of music do you listen to?', 'Do you prefer live concerts or recordings?', 'Has your taste in music changed?'],
  Weather: ['What is the weather like where you are?', 'Which season do you like best?', 'Does the weather affect your mood?'],
  Technology: ['How often do you use your phone?', 'Has technology changed your daily routine?', 'Do you feel more connected or distracted?'],
  Travel: ['Do you prefer travelling alone or with others?', 'What was the last place you visited?', 'Do you prefer cities or nature?'],
  Reading: ['Do you read much in your free time?', 'Do you prefer printed books or digital ones?', 'What kind of books do you enjoy most?'],
  'City Life': ['Do you live in a city or the countryside?', 'What do you like about where you live?', 'Would you like to move somewhere else?'],
  Family: ['How often do you see your family?', 'Do you have a large or small family?', 'Who in your family are you closest to?'],
  Sports: ['Do you do any sport regularly?', 'Do you prefer watching or playing?', 'Do you follow any team?'],
  Shopping: ['Do you enjoy shopping?', 'Do you prefer shopping online or in person?', 'Are you influenced by advertising?'],
  Media: ['How do you usually get the news?', 'Do you prefer the internet or traditional media?', 'Do you trust social media?'],
};

const P2 = 'Describe a skill you learned that has been useful to you. You should say what the skill is, when you learned it, how you learned it, and explain why it has been useful.';

const P3 = [
  'Do you think practical skills are valued more than academic qualifications nowadays?',
  'How has technology changed the way people acquire skills?',
  'Should employers be responsible for staff training? Why or why not?',
  'Is it better to learn a skill from a teacher or to teach yourself?',
  'Do young people rely too much on technology to learn?',
];

const FILLERS = ['um', 'uh', 'er', 'like', 'you know', 'erm', 'ah'];

function firstOf<T>(arr: T[], i: number) { return arr[i % arr.length]; }

export function examinerQuestion(part: 1 | 2 | 3, index: number, topic?: string) {
  if (part === 2) return { topic: 'Long turn', question: P2 };
  if (part === 3) return { topic: 'Discussion', question: firstOf(P3, index) };
  const t = topic ?? firstOf(TOPICS, index);
  const bank = P1[t] ?? P1.Hometown;
  return { topic: t, question: firstOf(bank, index) };
}

export const SPEAKING_TOPICS = TOPICS;

export function analyseSpeaking(input: {
  text: string; durationMs: number; part: 1 | 2 | 3 | 'full'; pronunciation?: number | null;
}): Pick<SpeakingSession, 'scores' | 'overall' | 'words' | 'repeatedWords' | 'fillers' | 'hesitationMarkers' | 'recommendations'> {
  const tokens = words(input.text);
  const tokenCount = tokens.length;
  const minutes = Math.max(0.4, input.durationMs / 60000);
  const wpm = tokenCount / minutes;

  const freq = new Map<string, number>();
  tokens.forEach((w) => { if (!STOPWORDS.has(w) && w.length > 3) freq.set(w, (freq.get(w) ?? 0) + 1); });
  const repeatedWords = [...freq.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([word, count]) => ({ word, count }));
  const fillers = FILLERS.reduce((a, f) => a + (input.text.toLowerCase().match(new RegExp(`\\b${f}\\b`, 'g'))?.length ?? 0), 0);
  const hesitationMarkers = (input.text.match(/(\.\.\.|—|\?)/g) ?? []).length;

  const sents = sentences(input.text);
  const avgLen = sents.length ? tokenCount / sents.length : tokenCount;

  const fluency = clamp(3.5 + Math.min((wpm - 55) / 22, 3) - fillers / 14 - repeatedWords.length * 0.25, 3.5, 9);
  const lexical = clamp(4 + Math.min(new Set(tokens).size / 60, 2.4) - repeatedWords.length * 0.2, 4, 9);
  const grammatical = clamp(4.5 + Math.min(avgLen / 7, 2.2) - fillers / 18, 4, 9);
  const scores: SpeakingScore = {
    fluency: round1(fluency),
    lexical: round1(lexical),
    grammar: round1(grammatical),
    pronunciation: input.pronunciation ?? null,
  };
  const overall = round1((fluency + lexical + grammatical + (input.pronunciation ?? 6)) / 4);

  const recommendations: string[] = [];
  if (wpm < 80) recommendations.push(`You spoke at roughly ${Math.round(wpm)} words per minute. Aim for 90–130 wpm — extend one idea with an example or a reason instead of stopping.`);
  if (fillers >= 4) recommendations.push(`You used ${fillers} filler words. Replace “um / like” with a short pause; a deliberate pause is rewarded, a filler is not.`);
  if (repeatedWords.length) recommendations.push(`Repetition detected: ${repeatedWords.slice(0, 3).map((r) => r.word).join(', ')}. Prepare one synonym for each before your next practice.`);
  if (tokenCount < 60) recommendations.push('Your answers were short. In Part 1 aim for 2–3 sentences; in Part 2 speak for the full 1–2 minutes.');
  if (avgLen < 8) recommendations.push('Use longer complex sentences — “Although…, …” and “The reason I chose this is that…” lift your Grammatical Range score.');
  if (!recommendations.length) recommendations.push('Strong delivery. Push further with more precise topic vocabulary and a fully developed Part 2 answer.');

  return { scores, overall, words: tokenCount, repeatedWords, fillers, hesitationMarkers, recommendations };
}