# Indices (Laws of Exponents) — Formal Specification

## 1. Overview

An indices quiz covering the IGCSE exponents syllabus with four difficulty levels. Students practice simplifying expressions using index laws (add/subtract/multiply exponents), evaluating zero/negative exponents, fractional exponents, and mixed expressions with fraction bases. All questions generated algorithmically on-the-fly.

## 2. Component Specification

**Component:** `IndicesApp` (located in `App.jsx` monolith)

**Props:**
- `onBack` (function) — Callback invoked when user navigates away

**Files:**
- Component: `App.jsx` (monolith, `IndicesApp` function)
- CSS: `App.css` (reuses standard quiz classes)
- Server: `/indices-api/` routes in `server/index.js`
- Vite proxy: `/indices-api` entry in `vite.config.js`

## 3. Difficulty Levels

| Level | Type | Input Format | Description | Example |
|-------|------|-------------|-------------|---------|
| Easy | simplify | Exponent integer | Basic index laws: multiply (add), divide (subtract), power-of-power | x³ × x⁴ → enter "7" |
| Medium | evaluate | Number or fraction | Zero/negative exponents on numeric bases | 2⁻³ → enter "1/8" |
| Hard | evaluate | Number | Fractional exponents on numeric bases | 27^(2/3) → enter "9" |
| ExtraHard | evaluate | Number or fraction | Negative fractional exponents, fraction bases | (8/27)^(-2/3) → enter "9/4" |

## 4. API Endpoints

### 4.1 GET /indices-api/question

**Query Parameters:**
- `difficulty` (string): 'easy', 'medium', 'hard', or 'extrahard'

**Response fields (common):** `id`, `difficulty`, `type` ('simplify' or 'evaluate'), `prompt` (display string with Unicode superscripts)

**Easy subtypes:**
- `multiply`: a^m × a^n — answer exponent = m+n
- `divide`: a^m ÷ a^n — answer exponent = m-n
- `power`: (a^m)^n — answer exponent = m×n

**Medium subtypes:**
- `zero`: a⁰ = 1
- `negative_eval`: a^(-n) = 1/a^n
- `negative_simplify`: x^(-a) × x^b (algebraic)

**Hard:** Fractional exponents from curated combos ensuring clean integer results (28 combos including a^(1/n) and a^(m/n)).

**ExtraHard subtypes:**
- `neg_frac`: a^(-m/n) = 1/a^(m/n) — 12 curated combos
- `frac_base`: (a/b)^(-n) or (a/b)^(-m/n) — 8 curated combos

### 4.2 POST /indices-api/check

**Request Body:** Question fields + `answer` (string)

**Logic:**
- For `type === 'simplify'`: parse answer as integer, compare to `answerExp`
- For `type === 'evaluate'`: parse as integer or fraction (a/b), simplify both sides, compare

**Response:** `{ correct, display, message }`

## 5. Server Utilities

- `sup(n)`: Format integer as Unicode superscript string (handles negatives with ⁻)
- `fmtFracExp(num, den)`: Format fractional exponent as "num/den" or just "num" if den=1
- `idxPick(arr)`, `idxRand(lo, hi)`: Random selection helpers
- Reuses `gcd()`, `simplifyFraction()` from fractions module for answer comparison

## 6. UI Layout

### Setup Phase
- Difficulty pills: Easy — Basic Laws / Medium — Negative/Zero / Hard — Fractional / Extra Hard — Mixed
- Question count input (1–100, default 20)
- Start Quiz button

### Playing Phase
- Progress pill: "Question N/T"
- Prompt in large text with Unicode superscripts
- Helper text for simplify mode: "Enter the exponent only"
- Single text input
- Context-sensitive placeholder per difficulty
- Feedback, Submit/Next buttons, running ResultsTable

### Finished Phase
Standard score display + ResultsTable + Play Again.

## 7. Registration Points

1. `allApps`: `{ key: 'indices', name: 'Indices', subtitle: 'Laws of exponents', color: 'purple' }`
2. `modeMap`: `indices: IndicesApp`
3. `CUSTOM_PUZZLES`: `{ key: 'indices', name: 'Indices' }`
4. `fetchQuestionForType`: `indices: '${API}/indices-api/question?difficulty=${difficulty}'`
5. `getPromptForType`: returns `q.prompt + " = ?"` (prompt pre-built by server)
6. CustomApp `handleSubmit`: POSTs to `/indices-api/check`
7. CustomApp `renderInputs`: Text input with dynamic placeholder
8. Vite proxy: `/indices-api` → `http://127.0.0.1:4000`

## 8. Generation Guarantees

- **Easy:** 7 bases × 3 subtypes × ~30 exponent pairs = 600+ unique problems
- **Medium:** 3 subtypes × varied ranges = 200+ unique problems
- **Hard:** 28 curated combos (all with clean integer answers)
- **ExtraHard:** 12 + 8 = 20 curated combos with exact answers
