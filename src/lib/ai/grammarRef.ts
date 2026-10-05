/** Study-ready explanations of the grammar areas IELTS actually tests. */
export const GRAMMAR_EXPLAINERS: Record<string, string> = {
  'Subject–verb agreement': [
    '**Subject–verb agreement.** The verb must match the subject in number and tense.',
    '',
    '- Singular: *she **takes**, she **has***',
    '- Plural: *they **take**, they **have***',
    '- Past: *she **took**, they **took***',
    '',
    'Common traps: "he don’t", "they was", "she have".',
  ].join('\n'),
  Countability: [
    '**Countable vs uncountable nouns.**',
    '',
    'Countable (take a plural): people, children, men, problems, ideas.',
    'Uncountable (never plural): information, advice, equipment, knowledge, research, progress.',
    '',
    '- *informations* ✗ → *information* ✓',
    '- *researches* ✗ → *research* ✓',
  ].join('\n'),
  Articles: [
    '**Articles (a / an / the).**',
    '',
    '- **a** before a consonant sound: *a university, a European city*',
    '- **an** before a vowel sound: *an hour, an MBA*',
    '- **the** when the listener already knows which one you mean (second mention, or a unique thing).',
  ].join('\n'),
  Tenses: [
    '**Tense control.**',
    '',
    '- past signal + past form: *yesterday I **went***',
    '- after *did / didn’t* → base form: *I didn’t **go***',
    '- present perfect for a past action with present relevance: *I **have finished***',
  ].join('\n'),
  'Verb pattern': [
    '**Verb patterns.** Some verbs are followed directly by the object (*discuss, reach, mention*),',
    'others need a preposition (*depend on, refer to, apply for*). Learn them as fixed pairs.',
  ].join('\n'),
  'Academic register': [
    '**Academic register.** Avoid conversational markers (*according to me, I think that*)',
    'in favour of academic ones: *in my view, this essay argues, it can be seen that*.',
  ].join('\n'),
  Determiners: [
    '**Determiners.**',
    '',
    '- countable: *many, few, a few, several*',
    '- uncountable: *much, little, a little*',
    '- both: *some, plenty of*',
    '',
    '"less" is for uncountable nouns; "fewer" for countable nouns.',
  ].join('\n'),
  Prepositions: [
    '**Fixed prepositions.** Learn them as chunks:',
    '*depend **on**, refer **to**, consist **of**, result **in**, responsible **for**, similar **to**, different **from***.',
  ].join('\n'),
  'Modal verbs': [
    '**Modal verbs** are always followed by the base form: *can **go**, should **study**, must **pay***.',
    'Never "can to go".',
  ].join('\n'),
  'Passive voice': [
    '**Passive voice** = a form of *be* + a past participle: *The results **were published***.',
    'Use it when the action matters more than the agent — very common in Writing Task 1.',
  ].join('\n'),
  'Cohesion devices': [
    '**Cohesion devices.**',
    '',
    '- adding: *moreover, furthermore, in addition*',
    '- contrast: *however, whereas, by contrast*',
    '- result: *therefore, consequently, as a result*',
    '- example: *for instance, such as*',
    '',
    'In formal writing, never begin a sentence with a linking word — put a comma after it instead.',
  ].join('\n'),
  'Relative clauses': [
    '**Relative clauses** add information about a noun: *The report, **which** was published in 1998, …*.',
    'Use *which* for things, *who* for people, and *that* for both in academic writing.',
  ].join('\n'),
  'Mixed conditionals': [
    '**Mixed conditionals.**',
    '',
    '- Second conditional (unreal present): *If I **had** more time, I **would travel**.*',
    '- Third conditional (unreal past): *If I **had studied** harder, I **would have passed**.*',
    '',
    'Mix them when cause and effect sit in different time frames.',
  ].join('\n'),
  Conditionals: [
    '**Conditionals.**',
    '',
    '- First: *If it rains, water **closes***.',
    '- Second: *If it **rained**, it **would close***.',
    '- Third: *If it **had rained**, it **would have closed***.',
    '',
    'Note the shift: the *if* clause moves one step back, the result clause uses *would*.',
  ].join('\n'),
  Punctuation: [
    '**Punctuation.** A linking word such as *however* followed by a full sentence takes a comma before it:',
    '"However, this is not sustainable." At the start of a sentence it takes no comma.',
  ].join('\n'),
};

export const GRAMMAR_TOPICS = Object.keys(GRAMMAR_EXPLAINERS);