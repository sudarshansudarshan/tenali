# General Knowledge (Chitragupta) — Formal Specification

## 1. Purpose

A multiple-choice general knowledge quiz that presents random questions from a bank of 991 curated questions. The quiz runs indefinitely — no fixed question count. Score and per-question results accumulate throughout the session. A running results table is displayed below the quiz. Features auto-advance after 1.5s.

## 2. Data Source

### 2.1 Question Format

Each question is a JSON file stored in `chitragupta/questions/` named `NNNN.json`:

```json
{
  "id": 1,
  "question": "What is the largest planet in our solar system?",
  "options": ["Mars", "Jupiter", "Saturn", "Neptune"],
  "answerOption": "B",
  "answerText": "Jupiter",
  "genre": "science"
}
```

**Fields:**
- `id` (integer): unique identifier
- `question` (string): the question text
- `options` (string[4]): exactly 4 options corresponding to A, B, C, D
- `answerOption` (string): correct option letter (A/B/C/D), case-insensitive
- `answerText` (string): full text of the correct answer
- `genre` (string): category tag (e.g., "science", "history", "geography", "mixed")

### 2.2 Loading

All JSON files are read synchronously at server startup into an in-memory array. A random question is selected using `Math.floor(Math.random() * questions.length)`.

## 3. API Specification

### 3.1 GET /gk-api/question

**Parameters:** none

**Response (200):**
```json
{
  "id": 42,
  "question": "What is the chemical symbol for gold?",
  "options": ["Ag", "Au", "Fe", "Cu"],
  "genre": "science"
}
```

**Response (500):** `{ "error": "No questions found" }` — if question array is empty.

**Note:** The `answerOption` and `answerText` fields are NOT included in the response (to prevent cheating).

### 3.2 POST /gk-api/check

**Request body:**
```json
{ "id": 42, "answerOption": "B" }
```

**Response (200):**
```json
{
  "correct": true,
  "correctAnswer": "B",
  "correctAnswerText": "Au",
  "message": "Correct! 🎉"
}
```

**Response (404):** `{ "error": "Question not found" }` — if `id` doesn't match any question.

**Validation logic:**
```javascript
const correct = String(answerOption).toUpperCase() === String(q.answerOption).toUpperCase()
```

## 4. Frontend Component Specification

### 4.1 Component: GKApp

**Props:** `onBack` (function) — called when user clicks "← Home"

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| question | object/null | null | Current question from API |
| selected | string | '' | Selected option letter (A/B/C/D) |
| feedback | string | '' | Feedback text to display |
| isCorrect | boolean/null | null | Whether last answer was correct |
| loading | boolean | false | Whether fetching a question |
| score | number | 0 | Cumulative correct answers |
| revealed | boolean | false | Whether answer has been shown |
| questionNumber | number | 0 | Questions answered so far |
| results | array | [] | Array of result objects |

**Timer:** Uses `useTimer()` hook. Starts when question loads. Stops on submit.

### 4.2 User Flow

```
[Mount] → loadQuestion() → [Display question + 4 options]
                                    ↓
                        [User selects option]
                                    ↓
                        [User clicks Submit / presses Enter]
                                    ↓
                    [POST /gk-api/check] → [Show feedback]
                    [Record result with time] → [Stop timer]
                    [Auto-advance after 1.5s OR press Enter to skip]
                                    ↓
                        loadQuestion() → [Loop back to display]
```

### 4.3 Feedback Format

- **Correct:** `"Correct! The answer is B) Jupiter"`
- **Incorrect:** `"Incorrect. The correct answer is B) Jupiter"`

Always reveals the correct answer with its letter and full text.

### 4.4 Results Table

The results table is displayed below the quiz area and grows with each answered question. Each row contains:
- Question number
- Question text (truncated to 50 characters with "…" if longer)
- User's selected option letter
- Result: "✓" or "✗ (B) Jupiter)"
- Time in seconds

### 4.5 UI Layout

```
┌─────────────────────────────────┐
│ [← Home]                        │
│          General Knowledge       │
│       Random question picker     │
│                    [12s] [Score] │
│                                  │
│   What is the chemical symbol    │
│          for gold?               │
│                                  │
│ ┌─ A) Ag ─────────────────────┐ │
│ ┌─ B) Au ──────── [selected] ─┐ │
│ ┌─ C) Fe ─────────────────────┐ │
│ ┌─ D) Cu ─────────────────────┐ │
│                                  │
│ ┌─ Correct! The answer is ... ─┐│
│                                  │
│         [Next Question]          │
│                                  │
│ ┌── Results Table ─────────────┐ │
│ │ # │ Question │ Answer │ ... │ │
│ └──────────────────────────────┘ │
└─────────────────────────────────┘
```

### 4.6 Keyboard Support

Global `keydown` listener on `Enter` key triggers `handleSubmitOrNext()`. Dependencies: `[question, selected, revealed, loading]`.

### 4.7 Auto-Advance

Uses the shared `useAutoAdvance(revealed, advanceRef)` hook with the `useRef` pattern to avoid stale closures. After an answer is revealed, automatically advances to the next question after 1.5 seconds (`AUTO_ADVANCE_MS`). The player can press Enter to skip the wait.

```javascript
const advanceRef = useRef(() => {})
advanceRef.current = () => loadQuestion()
useAutoAdvance(revealed, advanceRef)
```

## 5. Implementation Notes

- Options are rendered as `<label>` elements wrapping hidden radio inputs
- The radio input's `name="gk"` ensures only one can be selected
- Options are disabled after submission (`revealed === true`)
- No difficulty selector — all questions are drawn from the same pool
- No finish screen — the quiz runs indefinitely
- Uses DM Sans (body/UI) and Source Serif 4 (heading) fonts from Google Fonts
