# Multiplication Tables — Formal Specification

## 1. Purpose

A configurable multiplication tables quiz. The player selects which tables to practice (2–9 via checkbox pills), then answers shuffled questions of the form n × m where m ranges from 1 to 10. Questions are generated client-side from the selected tables. Supports configurable question count, on-screen NumPad, auto-advance, and a running results table.

## 2. Configuration

- **Table selection**: Checkbox pills for tables 2 through 9. Multiple tables can be selected simultaneously.
- **Question count**: Configurable via text input, defaults to 20 (`DEFAULT_TOTAL`). If more questions are requested than the pool size, the pool is the limit.

## 3. Question Generation (Client-Side)

All questions are generated client-side — no server API is used for question generation:

1. For each selected table `t`, generate pairs `(t, 1), (t, 2), ..., (t, 10)`
2. Collect all pairs into a pool
3. Shuffle the pool using Fisher-Yates
4. Slice to `totalQ` questions (or pool size, whichever is smaller)

Each question is rendered as: `t × m = ?`

## 4. API Specification

### 4.1 GET /multiply-api/question

Used only as a fallback. Client-side generation is primary.

**Query parameters:**
- `table` (integer): The multiplication table number

**Response (200):**
```json
{
  "id": "5-1775067701647-0.857",
  "table": 5,
  "multiplier": 7,
  "prompt": "5 × 7",
  "answer": 35
}
```

### 4.2 POST /multiply-api/check

**Request body:**
```json
{ "table": 5, "multiplier": 7, "answer": 35 }
```

**Response (200):**
```json
{
  "correct": true,
  "correctAnswer": 35,
  "message": "Correct"
}
```

## 5. Frontend Component Specification

### 5.1 Component: MultiplyApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| tables | Set | {2} | Selected table numbers |
| numQuestions | string | '20' | Configurable question count |
| started | boolean | false | Quiz has begun |
| finished | boolean | false | All questions done |
| pool | array | [] | Shuffled question pairs |
| poolIndex | number | 0 | Current index in pool |
| answer | string | '' | Player's typed answer |
| score | number | 0 | Correct answers count |
| feedback | string | '' | Feedback message |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects |

**Timer:** `useTimer()` — starts on question load, stops on submit.

### 5.2 User Flow

```
[Show checkbox pills: 2, 3, 4, 5, 6, 7, 8, 9]
[Show "How many questions?" input]
[Show "Start Quiz" button]
        ↓ (click Start)
[Build shuffled pool from selected tables]
[Set started=true, poolIndex=0]
        ↓
[Display: "Question N/total", "5 × 7 = ?", input field, NumPad]
[Timer starts]
        ↓ (submit answer)
[Check: Number(answer) === table × multiplier]
[Show feedback, auto-advance after 1.5s if correct; click Next if wrong]
        ↓ (all questions done)
[Show finish screen with score and ResultsTable]
```

### 5.3 Features

- **NumPad**: On-screen numeric keypad with 0–9, ±, ⌫. Physical keyboard works alongside.
- **Auto-advance**: After a correct answer is revealed, auto-advances in 1.5s. On wrong answers, the player must click Next manually. Enter skips the wait on correct answers.
- **Running results table**: Displayed during gameplay below the quiz area.
- **Answer validation**: Client-side check (`Number(answer) === table * multiplier`).

### 5.4 UI Layout

```
┌─────────────────────────────────┐
│ [← Home]                        │
│          Multiplication          │
│   Practice any times table       │
│                    [5s] [Score]  │
│  [2] [3] [4] [✓5] [6] [7] [8] [9]  │
│     How many questions? [20]     │
│          [Start Quiz]            │
│                                  │
│       Question 3/20              │
│        5 × 7 = ?                 │
│       ┌──────────────┐           │
│       │  Type answer  │           │
│       └──────────────┘           │
│     [± ] [1] [2] [3]            │
│     [⌫ ] [4] [5] [6]            │
│     [   ] [7] [8] [9]           │
│     [       0       ]            │
│          [Submit]                │
└─────────────────────────────────┘
```
