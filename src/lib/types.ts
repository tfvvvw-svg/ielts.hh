export type ISkill = 'listening' | 'reading' | 'writing' | 'speaking';

export type QuestionType =
  | 'multiple_choice'
  | 'true_false_not_given'
  | 'matching'
  | 'matching_headings'
  | 'sentence_completion'
  | 'summary_completion'
  | 'fill_blank'
  | 'short_answer'
  | 'vocabulary'
  | 'grammar'
  | 'reading_comprehension';

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false_not_given: 'True / False / Not Given',
  matching: 'Matching',
  matching_headings: 'Matching Headings',
  sentence_completion: 'Sentence Completion',
  summary_completion: 'Summary Completion',
  fill_blank: 'Fill in the Blank',
  short_answer: 'Short Answer',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading_comprehension: 'Reading Comprehension',
};

/** Human-readable label for a question type or the aggregate "overall" row. */
export const typeLabel = (t: QuestionType | 'overall') =>
  (t === 'overall' ? 'Overall' : QUESTION_TYPE_LABEL[t]) ?? t;

export const LISTENING_TYPES: QuestionType[] = [
  'multiple_choice', 'matching', 'matching_headings',
  'sentence_completion', 'summary_completion', 'short_answer',
];
export const READING_TYPES: QuestionType[] = [
  'multiple_choice', 'true_false_not_given', 'matching', 'matching_headings',
  'sentence_completion', 'summary_completion', 'fill_blank', 'short_answer',
];
export const SKILL_TYPES: Record<ISkill, QuestionType[]> = {
  listening: LISTENING_TYPES,
  reading: [...READING_TYPES, 'vocabulary', 'grammar', 'reading_comprehension'],
  writing: ['fill_blank', 'grammar', 'short_answer', 'vocabulary'],
  speaking: ['short_answer'],
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Source {
  evidence: string;
  materialId?: string;
}

export interface Question {
  id: string;
  testId: string;
  skill: ISkill;
  type: QuestionType;
  prompt: string;
  context?: string;
  options?: string[];
  answer: string;
  accept?: string[];
  explanation: string;
  source: Source;
  sourceIndex?: number;
  points: number;
  order?: number;
}

export type TestMode = 'practice' | 'timed' | 'exam' | 'mistake_drill';

export interface TestConfig {
  title: string;
  skill: ISkill;
  types: QuestionType[];
  difficulty: Difficulty;
  count: number;
  mode: TestMode;
  timeLimitMinutes: number;
  language: string;
  topic: string;
}

export interface Test extends TestConfig {
  id: string;
  userId: string;
  createdAt: number;
  materialId?: string;
  passage?: string;
  /** Questions are stored with the test so a result can always be reconstructed. */
  questions: Question[];
}

export interface AnswerRecord {
  questionId: string;
  type: QuestionType;
  given: string;
  correct: boolean;
  timeSpentMs: number;
}

export interface TestResult {
  id: string;
  userId: string;
  testId: string;
  testTitle: string;
  skill: ISkill;
  difficulty: Difficulty;
  score: number;
  total: number;
  percentage: number;
  band: number;
  answers: AnswerRecord[];
  durationMs: number;
  createdAt: number;
  bySkillType?: Partial<Record<string, number>>;
}

export interface Mistake {
  id: string;
  userId: string;
  kind: 'reading' | 'grammar' | 'vocabulary' | 'writing' | 'listening' | 'speaking';
  skill: ISkill;
  questionType?: QuestionType;
  title: string;
  given: string;
  correct: string;
  explanation: string;
  topic: string;
  repetitions: number;
  lastMistakeAt: number;
  resolved: boolean;
  sourceMaterialId?: string;
  drillCount: number;
}

export interface VocabItem {
  id: string;
  userId: string;
  word: string;
  definition: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
  topic: string;
  difficulty: Difficulty;
  state: 'new' | 'learning' | 'weak' | 'known' | 'mastered';
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: number;
  materialId?: string;
  personal?: boolean;
  createdAt: number;
}

/** A word before the spaced-repetition fields are assigned. */
export type NewWord = Omit<VocabItem, 'id' | 'userId' | 'state' | 'ease' | 'intervalDays' | 'reps' | 'lapses' | 'dueAt' | 'createdAt'>;

export interface Material {
  id: string;
  userId: string;
  title: string;
  kind: 'text' | 'image' | 'pdf' | 'document';
  text: string;
  imageUrls: string[];
  pageCount: number;
  wordCount: number;
  topic: string;
  tags: string[];
  summary?: string;
  createdAt: number;
}

export type ResourceKind =
  | 'summary' | 'explanation' | 'vocabulary' | 'grammar' | 'flashcards' | 'quiz' | 'test' | 'task';

export interface MaterialResource {
  id: string;
  materialId: string;
  kind: ResourceKind;
  title: string;
  body: string;
  createdAt: number;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  skill: ISkill;
  minutes: number;
  dueDate: string;
  done: boolean;
  completedAt?: number;
  priority: 1 | 2 | 3;
  source: 'ai' | 'user' | 'mistake_drill' | 'plan';
  note?: string;
  refId?: string;
createdAt: number;
}
export interface CriterionScore {
  key: 'task_response' | 'coherence' | 'lexical' | 'grammatical';
  label: string;
  band: number;
  note: string;
}

export interface Issue {
  kind: 'grammar' | 'lexical' | 'structure' | 'repetition' | 'task';
  problem: string;
  original: string;
  better: string;
  why: string;
}

export interface EssayAnalysis {
  overall: number;
  criteria: CriterionScore[];
  issues: Issue[];
  strengths: string[];
  repeatedWords: { word: string; count: number }[];
  avgSentenceLength: number;
  complexSentences: number;
  disclaimer: string;
}

export interface Essay {
  id: string;
  userId: string;
  task: string;
  prompt: string;
  text: string;
  words: number;
  analysis: EssayAnalysis;
  createdAt: number;
}

export interface SpeakingScore {
  fluency: number;
  lexical: number;
  grammar: number;
  pronunciation: number | null;
}

export interface SpeakingSession {
  id: string;
  userId: string;
  part: 1 | 2 | 3 | 'full';
  topic: string;
  transcript: { role: 'examiner' | 'candidate'; text: string; at: number }[];
  durationMs: number;
  scores: SpeakingScore;
  overall: number;
  words: number;
  repeatedWords: { word: string; count: number }[];
  fillers: number;
  hesitationMarkers: number;
  recommendations: string[];
  createdAt: number;
}

export interface MockComponentResult {
  skill: ISkill;
  score: number | null;
  band: number;
  note: string;
}

export interface MockExam {
  id: string;
  userId: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  step: number;
  components: MockComponentResult[];
  overall: number | null;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress: number;
  target: number;
}

export interface Recommendation {
  id: string;
  userId: string;
  kind: 'study_now' | 'alert' | 'advice' | 'plan';
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  severity: 'info' | 'warn' | 'good';
  createdAt: number;
  read: boolean;
}

export interface Profile {
  displayName: string;
  photoURL?: string;
  email?: string;
  targetBand: number;
  estimatedBand: number;
  examDate: string | null;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  studyDays: number[];
  onboarded: boolean;
  createdAt: number;
  /** Last write stamp, used to resolve local-vs-cloud conflicts. */
  updatedAt?: number;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chips?: string[];
  createdAt: number;
  pending?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: CoachMessage[];
  updatedAt: number;
}

export interface SkillStat {
  skill: ISkill;
  type: QuestionType | 'overall';
  percentage: number;
  attempts: number;
  trend: number;
}

export interface StudySession {
  id: string;
  userId: string;
  date: string;
  minutes: number;
  skill: ISkill | 'mixed';
  createdAt: number;
}