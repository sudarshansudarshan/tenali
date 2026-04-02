# Vocab Builder — Formal Specification

## 1. Purpose

A multiple-choice vocabulary quiz with 5 difficulty levels. The player is shown a **word** and must pick the correct **definition** from 4 options. Questions are served from a bank of 75 curated words (15 per difficulty level). Supports configurable question count, auto-advance, and a running results table.

## 2. Data Source

### 2.1 Question Format

Each question is a JSON file stored in `vocab/questions/` named `NNNN.json`:

```json
{
  "id": 1,
  "word": "Brave",
  "question": "Brave",
  "options": [
    "Free from pretence or deceit",
    "Mild and kind in manner",
    "Not afraid of danger",
    "Shiny and smooth on the surface"
  ],
  "answerOption": "C",
  "answerText": "Not afraid of danger",
  "difficulty": "easy",
  "sourceFile": "0001.json"
}
```

- `word` / `question`: The vocabulary word shown to the player (displayed prominently)
- `options`: 4 definitions — 1 correct + 3 distractors from the same difficulty level
- `answerOption`: Letter (A/B/C/D) of the correct definition
- `answerText`: The correct definition text

### 2.2 Difficulty Levels

| Level | Files | Word Count | Example Words |
|-------|-------|-----------|---------------|
| easy | 0001–0015 | 15 | brave, curious, enormous, gentle, hesitate |
| medium | 0016–0030 | 15 | diligent, eloquent, peculiar, reluctant, abundant |
| hard | 0031–0045 | 15 | ambiguous, benevolent, cacophony, ephemeral, gregarious |
| extra-hard | 0046–0060 | 15 | equivocate, iconoclast, laconic, magnanimous, obsequious |
| hardest | 0061–0075 | 15 | sesquipedalian, defenestration, perspicacious, pusillanimous, tergiversate |

### 2.3 Data Loading

Questions are loaded once at server startup by the `loadVocab()` function, which reads all JSON files from `vocab/questions/` into an in-memory array.

## 3. API Specification

### 3.1 GET /vocab-api/question

**Query parameters:**
- `difficulty` (string, optional): One of `easy`, `medium`, `hard`, `extra-hard`, `hardest`. Default: `easy`.

**Response (200):**
```json
{
  "id": 1,
  "question": "Brave",
  "options": ["Free from pretence or deceit", "Mild and kind in manner", "Not afraid of danger", "Shiny and smooth on the surface"],
  "difficulty": "easy"
}
```

Note: The server omits `answerOption` and `answerText` from the GET response to prevent client-side cheating.

### 3.2 POST /vocab-api/check

**Request body:**
```json
{ "id": 1, "answerOption": "C" }
```

**Response (200):**
```json
{
  "correct": true,
  "correctAnswer": "C",
  "correctAnswerText": "Not afraid of danger",
  "message": "Correct!"
}
```

## 4. Frontend Component Specification

### 4.1 Component: VocabApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| difficulty | string | 'easy' | Selected difficulty level |
| numQuestions | string | '20' | Configurable question count |
| started | boolean | false | Quiz has begun |
| finished | boolean | false | All questions done |
| question | object/null | null | Current question from API |
| selected | string | '' | Selected option letter (A/B/C/D) |
| feedback | string | '' | Feedback message |
| isCorrect | boolean/null | null | Whether last answer was correct |
| revealed | boolean | false | Answer shown |
| score | number | 0 | Correct answers count |
| questionNumber | number | 0 | Current question number |
| totalQ | number | 20 | Total questions for this session |
| results | array | [] | Result objects |

### 4.2 User Flow

```
[Show difficulty selector: Easy / Medium / Hard / Extra Hard / Hardest]
[Show "How many questions?" input]
[Show "Start Quiz" button]
        ↓ (click Start)
[Lock difficulty selector]
[Fetch first question from /vocab-api/question?difficulty=...]
        ↓
[Display: word in large display font, 4 definition options as radio cards]
[Timer starts]
        ↓ (select option, click Submit)
[POST /vocab-api/check with id and selected option]
[Show feedback: correct/incorrect with the right definition]
[Auto-advance after 1.5s]
        ↓ (all questions done)
[Show finish screen with score and ResultsTable]
```

### 4.3 Presentation

- The word is displayed in the `vocab-word` CSS class: Source Serif 4 display font, 1.6rem, weight 600
- Options show definitions as clickable radio cards (same style as GK quiz)
- Feedback shows the correct definition in quotes
- Results table truncates long definitions to 35 characters

### 4.4 Features

- **Auto-advance**: After revealing the answer, auto-advances in 1.5s via `useAutoAdvance` hook.
- **Running results table**: Displayed during gameplay below the quiz area.
- **Difficulty persists**: Selector is locked during a quiz session (`disabled={started && !finished}`).

### 4.5 UI Layout

```
┌─────────────────────────────────┐
│ [← Home]                        │
│         Vocab Builder            │
│  Pick the correct definition     │
│                    [4s] [Score]  │
│ [Easy] [Medium] [Hard] [Extra Hard] [Hardest] │
│     How many questions? [20]     │
│          [Start Quiz]            │
│                                  │
│       Question 5/20              │
│        Ephemeral                 │
│                                  │
│  ○ A) Open to more than one     │
│       interpretation             │
│  ● B) Lasting for a very short  │
│       time                       │
│  ○ C) A harsh mixture of        │
│       discordant sounds          │
│  ○ D) Fond of company; sociable │
│                                  │
│          [Submit]                │
│ ┌─ Correct! "Lasting for a      │
│    very short time" ───────────┐ │
└─────────────────────────────────┘
```
