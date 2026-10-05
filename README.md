# Bandit — AI IELTS Coach

A production-quality, AI-powered IELTS learning platform. Bandit manages your learning system:
it tracks every result, detects repeated mistakes, maps your weak question types, builds and
re-plans your study schedule, and tells you the single most useful thing to do next.

**All band scores are AI estimates computed from your own practice data. They are never official
IELTS results, and the app says so everywhere it shows a number.**

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle
npm run preview    # serve the production build
npm test           # engine tests (generation, analysis, planning, SRS, coach)
npm run test:ui    # end-to-end tests driving the real UI in Chrome
```

No configuration is required to run the app. Without Firebase keys it works fully offline,
storing data in the browser. Add keys to enable cloud sign-in and sync (see below).

---

## How the AI actually works

Every AI feature is grounded and deterministic. Nothing is fabricated.

| Capability | How it works |
| --- | --- |
| **Grounded test generation** | The passage is split into sentences, each scored for information density, and questions are built by *extracting* a target phrase from that sentence. Every question stores `source.evidence` — the exact sentence it came from — which the UI shows as "Show source evidence". Distractors are real words from the same text, filtered by Levenshtein distance so they are plausible but wrong. |
| **Question types** | Multiple Choice, True/False/Not Given, Matching, Matching Headings, Sentence/Summary Completion, Fill in the Blank, Short Answer, Vocabulary, Grammar, Reading Comprehension. |
| **Writing Lab** | Scores all four IELTS criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) from word count, paragraph structure, connective density, sentence-length variety, repetition and academic register. Returns before/after examples for every issue. |
| **Speaking Lab** | An examiner asks real Part 1–3 questions and scores fluency (wpm, fillers), lexical range and grammatical range. Supports browser dictation where available, with full typing fallback. |
| **Study planner** | Each skill is weighted by its *gap* to the target band, so the weakest skill automatically receives the most time. Re-planning after a fall-off **drops** overdue work and schedules new high-impact sessions instead of stacking tomorrow. |
| **Mistake bank** | Every wrong answer is stored with its reason and source. Repeats increment a counter; repeated mistakes are promoted to the top of the "what should I study now" ranking. |
| **Skill map** | Accuracy and trend are computed per skill *and* per question type, so "Matching Headings: 48%" is a real, visible finding. |
| **Exam readiness** | Weighted from band gap, skill coverage, consistency and plan completion — with a written explanation of what is limiting the score. |
| **Spaced repetition** | SM-2 style grading drives each word's next review date and state (new → learning → weak → known → mastered). |
| **Smart alerts** | Only fires on real signals: a speaking gap, a stalled writing average, a repeatedly missed question type, exam countdown, weekly goal. |

---

## Architecture

```
src/
  lib/
    types.ts          domain model (tests, questions, mistakes, vocab, essays…)
    utils.ts          date helpers, band maths, answer normalisation
    brain.ts          planning, readiness, skill map, next-action ranking, alerts
    srs.ts            spaced repetition + achievement sync
    db.ts             storage layer (Firestore mirror + offline fallback)
    firebase.ts       optional Firebase initialisation
    useDictation.ts   browser speech-to-text
    ai/
      text.ts         tokenising, sentence splitting, keyword ranking
      generate.ts     grounded question generation, vocab/grammar extraction
      essay.ts        four-criteria writing analysis
      speaking.ts     examiner question bank + fluency scoring
      coach.ts        data-grounded conversational answers
      grammarRef.ts   teaching-quality grammar explanations
  store/
    AppContext.tsx    all mutations; recomputes alerts, band estimate, achievements
    AuthContext.tsx   Firebase auth with an offline guest fallback
  components/         UI kit, app shell, charts, achievement toast
  pages/              20 routed pages, all lazy-loaded
```

**State model.** A single `DBShape` object holds all collections (`tasks`, `tests`, `results`,
`mistakes`, `vocab`, `materials`, `essays`, `speaking`, `mocks`, `achievements`, …). Every
mutation passes through `withSync`, which recomputes smart alerts, the band estimate and
achievements before persisting, so derived data can never be forgotten.

**Storage.** Writes go to local storage immediately (optimistic, debounced) and are mirrored to
Firestore under `users/{uid}/…` when Firebase is configured. Cloud failures never block the UI.

---

## Firebase setup (optional)

1. Create a Firebase project, enable **Authentication → Google + Email/Password**, and create a
   Firestore database.
2. Copy `.env.example` to `.env` and fill in your web config values.
3. Deploy the security rules: `firebase deploy --only firestore`.

`firestore.rules` restricts every document to its owner:

```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

Without Firebase the app still runs completely — a guest session stores everything on the
device, and the UI states this clearly rather than pretending to sync.

---

## Product notes

- **Every screen has four states.** Loading, empty, error and success are designed explicitly —
  e.g. "No tests yet → Generate your first test", "Review queue is empty → your next reviews are
  scheduled", "No mistakes recorded — yet".
- **Design system.** Tokens live in `src/index.css` as CSS variables so dark mode is a designed
  variant, not an inversion. Sora for display type, Inter for UI. Layered surfaces, soft shadows,
  glass headers, animated progress, counters and charts.
- **Motion.** Framer Motion throughout: page transitions, list layouts, spring progress bars,
  achievement toasts, chart reveals. `prefers-reduced-motion` disables all of it.
- **Performance.** Route-level code splitting, manual vendor chunks (react / charts / motion /
  firebase), memoised derived data, and charts only rendered once data exists.
- **Accessibility.** Semantic landmarks, a skip link, visible focus rings, labelled form controls,
  `aria-label` on icon-only buttons, `role="progressbar"` on progress, keyboard-dismissable modals.
- **Responsive.** Desktop sidebar, tablet drawer and mobile bottom navigation with safe-area
  padding; layouts reflow rather than shrink.

---

## Tested

`npm test` covers the learning engine: question grounding (answers provably occur in the source),
answer checking, band maths, writing analysis, vocabulary and grammar extraction, speaking
scoring, planner weighting, re-planning, skill map, readiness, next-action ranking and SRS
intervals.

`npm run test:ui` drives the built app in Chrome end-to-end: landing, onboarding, dashboard CTA,
dark mode, material upload, grounded generation, taking a test, results and review, mistake bank
and drill, every page render, the coach, writing, speaking, vocabulary, analytics, mock exams,
mobile layout and overflow — and asserts **zero runtime console errors**.