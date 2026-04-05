# Tenali — Complete Software Specification

**Version:** 3.0 | **Date:** April 5, 2026 | **Author:** Sudarshan Iyengar, IIT Ropar

> This document is a complete, formal specification of the Tenali educational quiz platform. An LLM given only this document should be able to recreate the entire project from scratch.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Tech Stack & Dependencies](#3-tech-stack--dependencies)
4. [Build & Deployment](#4-build--deployment)
5. [Server Architecture](#5-server-architecture)
6. [Server Utility Functions](#6-server-utility-functions)
7. [Server Data Loading](#7-server-data-loading)
8. [Server API Endpoints — Complete Catalog](#8-server-api-endpoints)
9. [Tatsavit Endpoint (9-Level Drill)](#9-tatsavit-endpoint)
10. [15 New Puzzle Endpoints](#10-fifteen-new-puzzle-endpoints)
11. [Client Architecture](#11-client-architecture)
12. [Client Hooks](#12-client-hooks)
13. [NumPad Component](#13-numpad-component)
14. [ResultsTable Component](#14-resultstable-component)
15. [makeQuizApp Factory](#15-makequizapp-factory)
16. [AdaptiveTablesApp](#16-adaptivetablesapp)
17. [ScaffoldedTablesApp](#17-scaffoldedtablesapp)
18. [TatsavitApp (9-Level Progressive Drill)](#18-tatsavitapp)
19. [RandomMixApp](#19-randommixapp)
20. [CustomApp (Custom Lesson Builder)](#20-customapp)
21. [Home Component](#21-home-component)
22. [App Shell & Routing](#22-app-shell--routing)
23. [modeMap — Component Registry](#23-modemap)
24. [regularApps — Menu Items](#24-regularapps)
25. [CUSTOM_PUZZLES Array](#25-custom_puzzles)
26. [fetchQuestionForType URL Map](#26-fetchquestionfortype)
27. [getPromptForType Logic](#27-getpromptfortype)
28. [CustomApp handleSubmit Cases](#28-customapp-handlesubmit)
29. [CustomApp renderInputs Cases](#29-customapp-renderinputs)
30. [Data Persistence (localStorage)](#30-data-persistence)
31. [CSS Design System](#31-css-design-system)
32. [Prerequisite Graph (graph/index.html)](#32-prerequisite-graph)
33. [Path Finder & Journey (graph/path.html)](#33-path-finder--journey)
34. [Enhanced Landing Page (enhanced/index.html)](#34-enhanced-landing-page)

---

## 1. Project Overview

Tenali is an adaptive, web-based educational math quiz platform. It serves 69 distinct puzzle types spanning arithmetic, algebra, geometry, calculus, statistics, vectors/matrices, number theory, general knowledge, and vocabulary. The platform adapts difficulty in real time based on accuracy and response speed.

Primary students: **Taittiriya** and **Tatsavit** (Tatsavit is also the name of the 9-level progressive drill puzzle; context determines which is meant).

Deployed at: `tenali.onrender.com`

---

## 2. Directory Structure

```
Tenali/
├── server/
│   ├── package.json          # Express server dependencies
│   └── index.js              # ~6400 lines: ALL API endpoints + static serving
├── client/
│   ├── package.json          # React client dependencies
│   ├── vite.config.js        # Vite build + dev proxy config
│   ├── src/
│   │   ├── main.jsx          # React entry point (StrictMode)
│   │   ├── App.jsx           # ~10,000 lines: ALL components in one file
│   │   ├── App.css           # ~2400 lines: Complete CSS design system
│   │   └── index.css         # Minimal base styles
│   └── dist/                 # Built output (gitignored)
├── chitragupta/
│   └── questions/            # 993+ GK question JSON files
├── vocab/
│   └── questions/            # 7664+ vocabulary question JSON files
├── graph/
│   ├── index.html            # Prerequisite DAG visualization (D3 + dagre)
│   └── path.html             # Path finder + "Start the Journey" quiz engine
├── enhanced/
│   └── index.html            # Enhanced landing page preview
├── render.yaml               # Render deployment config
└── SRS.md                    # This file
```

---

## 3. Tech Stack & Dependencies

### Server (`server/package.json`)
```json
{
  "name": "aryabhata-server",
  "type": "commonjs",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "http-proxy-middleware": "^3.0.5"
  }
}
```

### Client (`client/package.json`)
```json
{
  "type": "module",
  "dependencies": {
    "axios": "^1.13.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.0",
    "vite": "^8.0.0",
    "eslint": "^9.39.4"
  }
}
```

### External Libraries (loaded via CDN in HTML pages)
- D3.js 7.9.0 (graph visualization)
- Dagre 0.8.5 (DAG layout algorithm)

---

## 4. Build & Deployment

### `render.yaml`
```yaml
services:
  - type: web
    name: tenali
    env: node
    buildCommand: npm install && cd client && npm install && npm run build
    startCommand: node server/index.js
    healthCheckPath: /api/health
```

### Vite Config (`client/vite.config.js`)
```javascript
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Every /{type}-api route proxied to http://127.0.0.1:4000
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/gk-api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/addition-api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      // ... (50+ proxy entries, one per puzzle API)
    }
  }
})
```

### Client Entry (`client/src/main.jsx`)
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

---

## 5. Server Architecture

### Initialization Order
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

app.use(cors());                           // CORS for all routes, no restrictions
app.use(express.json());                   // Parse JSON bodies
app.use(express.static(clientDistPath));   // Serve React dist
```

### Route Registration Order
1. `GET /api/health` — health check
2. GK and Vocab endpoints
3. Original puzzle endpoints (addition, quadratic, sqrt, multiply, polymul, polyfactor, primefactor, qformula, simul, funceval, lineq, basicarith, fractionadd, surds, indices, sequences, ratio, percent, sets, trig, ineq, coordgeom, prob, stats, matrix, vectors, dotprod, transform, mensur, bearings, log, diff, bases, circle, integ, stdform, bounds, sdt, variation, hcflcm, profitloss, rounding, binomial, complex, angles, triangles, congruence, pythag, polygons, similarity, squaring, tatsavit)
4. 15 new puzzle endpoints (lineareq, decimals, permcomb, limits, invtrig, remfactor, heron, shares, banking, gst, section, linprog, circmeasure, conics, diffeq)
5. Special routes: `/graph`, `/path`, `/enhanced`
6. Catch-all: `app.get(/.*/, ...)` → serves `client/dist/index.html`
7. `app.listen(PORT, '0.0.0.0')`

### ID Generation Pattern
All generated questions use: `const id = \`q-${Date.now()}-${Math.random()}\``
Exception: addition uses `\`${digits}-${Date.now()}-${Math.random()}\``

---

## 6. Server Utility Functions

### `randomInt(min, max)` → integer in [min, max] inclusive
```
Math.floor(Math.random() * (max - min + 1)) + min
```

### `digitRange(digits)` → {min, max}
| digits | min | max |
|--------|-----|-----|
| 1 | 0 | 9 |
| 2 | 10 | 99 |
| 3 | 100 | 999 |
| 4+ | 1000 | 9999 |

### `bandForStep(step)` → {min, max} for sqrt radicand
| step | min | max |
|------|-----|-----|
| ≤10 | 2 | 50 |
| ≤20 | 51 | 150 |
| ≤35 | 151 | 350 |
| ≤60 | 351 | 700 |
| >60 | 701 | 999 |

### `quadraticRange(difficulty)` → {min, max} coefficient range
| difficulty | min | max |
|------------|-----|-----|
| easy | -3 | 3 |
| medium | -6 | 6 |
| hard | -9 | 9 |
| extrahard | -15 | 15 |

### `polyCoeffRange(difficulty)` → {min, max}
| difficulty | min | max |
|------------|-----|-----|
| easy | 1 | 9 |
| medium | 1 | 10 |
| hard | 1 | 20 |
| extrahard | 1 | 30 |

### `factorCoeffRange(difficulty)` → {min, max}
| difficulty | min | max |
|------------|-----|-----|
| easy | 1 | 10 |
| medium | 1 | 20 |
| hard | 1 | 30 |
| extrahard | 1 | 50 |

### `primeRange(difficulty)` → {min, max}
| difficulty | min | max |
|------------|-----|-----|
| easy | 2 | 100 |
| medium | 2 | 300 |
| hard | 2 | 1000 |
| extrahard | 2 | 5000 |

### `simulRange(difficulty)` → {min, max}
| difficulty | min | max |
|------------|-----|-----|
| easy | 1 | 10 |
| medium | 1 | 12 |
| hard | 1 | 15 |
| extrahard | 1 | 20 |

### `linearRange(difficulty)` → {min, max}
| difficulty | min | max |
|------------|-----|-----|
| easy | 1 | 5 |
| medium | 1 | 10 |
| hard | 1 | 15 |
| extrahard | 1 | 25 |

### `formatSignedTerm(value, variablePart, isFirst)`
Formats a polynomial term with proper math notation. Examples:
- `formatSignedTerm(-5, 'x²', true)` → `"-5x²"`
- `formatSignedTerm(3, 'x', false)` → `"+ 3x"`
- `formatSignedTerm(1, 'x', true)` → `"x"` (coefficient 1 is implicit)

### `buildQuadraticPrompt(a, b, c, x)`
Returns `"If x = {x}, find y for y = {ax²+bx+c}"` using `formatSignedTerm()` for each term.

### `randomPoly(degree, range)` → Array<number>
Generates random polynomial coefficients where `index = power`.
- 30% probability to negate non-constant coefficients
- Leading coefficient forced nonzero

### `multiplyPolys(a, b)` → Array<number>
Multiplies two polynomials via distribution:
```
result = new Array(a.length + b.length - 1).fill(0)
for i in [0..a.length): for j in [0..b.length): result[i+j] += a[i] * b[j]
```

### `formatPoly(coeffs)` → string
Formats polynomial array as human-readable notation. Uses superscript characters (⁰¹²³⁴⁵⁶⁷⁸⁹). Skips zero coefficients, omits coefficient 1/-1 for non-constant terms.

### `triPick(arr)` → random element from array

---

## 7. Server Data Loading

### GK Questions
```javascript
const questionsDir = path.join(__dirname, '..', 'chitragupta', 'questions');
function loadQuestions() {
  return fs.readdirSync(questionsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(questionsDir, f), 'utf8')));
}
const questions = loadQuestions(); // Loaded at startup, crashes if fails
```

**GK Question Schema:**
```json
{
  "id": 1,
  "question": "Who discovered penicillin?",
  "options": ["Alexander Fleming", "Louis Pasteur", "Charles Darwin", "Isaac Newton"],
  "answerOption": "A",
  "answerText": "Alexander Fleming",
  "genre": "science"
}
```

### Vocabulary Questions
```javascript
const vocabDir = path.join(__dirname, '..', 'vocab', 'questions');
function loadVocab() {
  try {
    return fs.readdirSync(vocabDir).filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(vocabDir, f), 'utf8')));
  } catch(e) { return []; } // Graceful fallback
}
const vocabQuestions = loadVocab();
```

**Vocab Question Schema:**
```json
{
  "id": 1,
  "difficulty": "easy",
  "question": "Resilient",
  "options": ["Strong", "Flexible", "Able to recover quickly", "Resistant"],
  "answerOption": "C",
  "answerText": "Able to recover quickly"
}
```

---

## 8. Server API Endpoints

### Common Patterns

Every puzzle type exposes two endpoints:
```
GET  /{type}-api/question?difficulty={easy|medium|hard|extrahard}
POST /{type}-api/check
```

**Answer Validation Tolerances:**
- Integer answers: exact match
- Decimal answers: |userAnswer - answer| < 0.05
- Systems of equations: |equation_residual| < 0.1
- Polynomial coefficients: exact array match
- GK/Vocab: case-insensitive letter match (A/B/C/D)

### Solve Middleware (Server-Side)

An Express middleware intercepts ALL `*-api/check` POST requests. When `req.body.solve === true`:
1. Monkey-patches `res.json()` to intercept the response
2. Adds `solved: true` to the response
3. Generates a contextual `explanation` string based on question type:
   - **basicarith-api:** Step-by-step arithmetic with operation context (e.g., "When multiplying a positive by a negative, the result is negative.")
   - **Generic with a, b, op:** Shows "Write the problem → Calculate → Result"
   - **All other types:** Falls back to "The answer is {display}."
4. Returns the modified response with `{ ...original, solved: true, explanation: "..." }`

Regular (non-solve) requests pass through unmodified.

### `GET /api/health`
Returns `{ ok: true, questions: <gk_count> }`

### `GET /gk-api/question?exclude=1,2,3`
Algorithm:
1. Parse `exclude` as comma-separated IDs
2. Filter to unseen questions
3. If all seen, reset to full pool
4. Pick random from pool
5. Return question WITHOUT `answerOption` or `answerText`

### `POST /gk-api/check` — body: `{ id, answerOption }`
Looks up question by ID, compares `.toUpperCase()`. Returns `{ correct, correctAnswer, correctAnswerText, message }`.

### `GET /vocab-api/question?difficulty=easy&exclude=1,2,3`
Same pool-based selection as GK. Filters by difficulty if provided. Returns question without answer fields.

### `POST /vocab-api/check` — same pattern as GK

### `GET /addition-api/question?digits=1`
- digits ∈ {1,2,3,4}, default 1
- Generates a, b from digitRange(digits)
- answer = a + b
- Returns `{ id, digits, a, b, prompt: "${a} + ${b}", answer }`

### `POST /addition-api/check` — body: `{ a, b, answer }`
Recalculates, exact match.

### `GET /quadratic-api/question?difficulty=hard`
- Coefficients from quadraticRange(difficulty)
- a ≠ 0 (while loop)
- answer = a*x*x + b*x + c
- Returns `{ id, a, b, c, x, prompt, answer }`

### `GET /sqrt-api/question?difficulty=easy` or `?step=5`
- difficulty maps to step range: easy→[1,5], medium→[6,10], hard→[11,20], extrahard→[21,50]
- step maps to radicand band via bandForStep()
- Returns `{ id, q, step, prompt: "√{q}", floorAnswer, ceilAnswer, sqrtRounded }`

### `POST /sqrt-api/check` — accepts floor OR ceiling as correct

### `GET /multiply-api/question?table=7`
- table ∈ [1, ∞), default 1
- multiplier = randomInt(1, 10)
- Returns `{ id, table, multiplier, prompt: "{table} × {multiplier}", answer }`

### `GET /polymul-api/question?difficulty=easy`
**Difficulty levels:**
- easy: monomial × binomial (40% ax form, 60% constant form)
- medium: binomial × binomial (degree 1 × degree 1)
- hard: trinomial × trinomial (degree 2 × degree 2)
- extrahard: degree-3 × degree-3

**Polynomial representation:** Array where index = power. `[5, -3, 2]` = 2x² - 3x + 5.

Returns `{ id, p1, p2, product, p1Display, p2Display, productDisplay, resultDegree }`

### `POST /polymul-api/check` — body: `{ p1, p2, userCoeffs }`
Recalculates product, checks length AND values match exactly.

### `GET /polyfactor-api/question?difficulty=easy`
**Reverse generation:** generates (px+q)(rx+s), expands to ax²+bx+c.
- p,r ∈ [1, min(max,5)], q,s ∈ [-max, max], q,s ≠ 0
- Returns `{ id, a, b, c, factors: {p,q,r,s}, display }`

### `POST /polyfactor-api/check` — body: `{ a, b, c, userP, userQ, userR, userS }`
Expands user factors, compares to original quadratic.

### `GET /primefactor-api/question?difficulty=easy`
Returns `{ id, number, prompt, factors: [sorted primes] }`

### `POST /primefactor-api/check` — exact factor array match

### `GET /qformula-api/question?difficulty=easy`
**Easy:** builds from integer roots r1,r2 → a=1, b=-(r1+r2), c=r1*r2
**Medium:** generates a,b,c with disc ≥ 0
**Hard:** any discriminant (may be complex)
Returns `{ id, a, b, c, disc, roots: { type, r1, r2, realPart, imagPart } }`

### `POST /qformula-api/check` — tolerance ±0.05, accepts roots in either order

### `GET /simul-api/question?difficulty=easy`
**Easy/medium:** 2×2 system, **hard/extrahard:** 3×3 system.
Reverse generation from integer solution. Ensures non-singular (determinant ≠ 0, max 50 retries).
Returns `{ id, size, eqs, solution: {x, y, z?} }`

### `POST /simul-api/check` — verifies all equations satisfied within ±0.1

### `GET /funceval-api/question?difficulty=easy`
**Easy:** f(x) = ax+b. **Medium:** f(x,y) = ax+by+c. **Hard/extrahard:** f(x,y,z) = ax+by+cz+d.
Returns `{ id, formula, vars, answer }`

### `GET /lineq-api/question?difficulty=easy`
Two points → find y = mx + c. Avoids vertical lines.
Returns `{ id, x1, y1, x2, y2, prompt, m, c }`

### `POST /lineq-api/check` — body: `{ x1, y1, x2, y2, userM, userC }`, tolerance ±0.05

### Remaining Original Endpoints
Each follows the same GET question / POST check pattern with difficulty parameter:
- `basicarith-api` — +, −, × based on difficulty
- `fractionadd-api` — fraction addition with LCD
- `surds-api` — simplify, add, multiply, rationalise surds
- `indices-api` — exponent laws
- `sequences-api` — AP & GP nth term and sums
- `ratio-api` — simplify, divide, proportion
- `percent-api` — find %, increase, reverse
- `sets-api` — union, intersection, Venn diagrams
- `trig-api` — SOH-CAH-TOA, sine/cosine rule
- `ineq-api` — linear & quadratic inequalities
- `coordgeom-api` — midpoint, distance, gradient
- `prob-api` — simple, combined, conditional probability
- `stats-api` — mean, median, mode, range
- `matrix-api` — add, scalar multiply, determinant, multiply
- `vectors-api` — add, scale, magnitude
- `dotprod-api` — dot product, matrix multiply
- `transform-api` — reflect, rotate, translate, enlarge
- `mensur-api` — area, perimeter, volume, surface area
- `bearings-api` — 3-figure bearings, back bearing
- `log-api` — evaluate, laws, solve equations
- `diff-api` — power rule, turning points
- `bases-api` — binary, hex conversions
- `circle-api` — circle equations and properties
- `integ-api` — antiderivatives, definite integrals
- `stdform-api` — scientific notation operations
- `bounds-api` — error intervals, propagation
- `sdt-api` — speed/distance/time
- `variation-api` — direct & inverse proportion
- `hcflcm-api` — Euclidean algorithm
- `profitloss-api` — CP, SP, discounts, markup
- `rounding-api` — DP, sig figs, estimation
- `binomial-api` — nCr, expansion, coefficients
- `complex-api` — add, multiply, modulus
- `angles-api` — straight line, point, parallel
- `triangles-api` — angle sum, isosceles, exterior
- `congruence-api` — SSS, SAS, ASA conditions
- `pythag-api` — hypotenuse, legs, 3D
- `polygons-api` — interior/exterior angles
- `similarity-api` — scale factor, area/volume ratios
- `squaring-api` — (a+b)² identity drill

---

## 9. Tatsavit Endpoint (9-Level Drill)

### `GET /tatsavit-api/question?difficulty=easy`

**9 Question Types** generated based on adaptive level 0-8:

**Type Distribution by Difficulty:**
```javascript
const typeWeights = {
  easy:      [0, 0, 0, 1, 2, 6, 7],       // mostly tables, some add/sub
  medium:    [0, 1, 2, 3, 4, 5, 6, 7],     // all types up to negative arith
  hard:      [2, 3, 4, 5, 6, 7, 8],        // harder types weighted
  extrahard: [3, 4, 5, 7, 8, 8, 8],        // mostly negative arith + monomial
}
```

**Type 0: Single-digit tables** — a ∈ [2,9], b ∈ [2,9], answer = a*b
**Type 1: Tables up to 20** — a ∈ [2,19], b ∈ [2,12], answer = a*b
**Type 2: Squares** — n ∈ [2,20], answer = n²
**Type 3: Square root** — q = random perfect or non-perfect square, prompt "√{q} = ?", accepts floor OR ceiling
**Type 4: Monomial ×** —
  - Easy: c × (coeff)x, e.g. "3 × 4x", answer = coefficient only, answerExp = 1
  - Medium: ax × bx, e.g. "3x × 5x", answer = a*b, answerExp = 2
  - Hard: ax^p1 × bx^p2, answer = a*b (coefficient), answerExp = p1+p2
  - All return `inputHint: 'e.g. 15x^2'`

**Type 5: Percentage** — pct% of whole, or "X is Y% of what?"
**Type 6: Addition** — two numbers with max 3 digits (capped at 999)
**Type 7: Subtraction** — two numbers with max 3 digits (capped at 999)
**Type 8: Negative arithmetic** — operations involving negative numbers

### `POST /tatsavit-api/check`
```javascript
const { type, answer, ceilAnswer, display, answerExp } = req.body;
const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
const userNum = parseFloat(userStr);

if (type === 3) {
  // Square root: accept floor OR ceiling
  correct = !isNaN(userNum) && (userNum === answer || userNum === ceilAnswer);
} else if (type === 4) {
  // Monomial: accept "15" OR "15x^2"
  const exprMatch = userStr.match(/^(-?\d+(?:\.\d+)?)x(?:\^(\d+))?$/);
  if (exprMatch) {
    const userCoeff = parseFloat(exprMatch[1]);
    const userExpVal = exprMatch[2] ? parseInt(exprMatch[2]) : 1;
    const expectedExp = answerExp || (display.includes('x²') ? 2 : display.includes('x') ? 1 : 0);
    correct = Math.abs(userCoeff - answer) < 0.05 && userExpVal === expectedExp;
  } else {
    correct = !isNaN(userNum) && Math.abs(userNum - answer) < 0.05;
  }
} else {
  correct = !isNaN(userNum) && Math.abs(userNum - answer) < 0.05;
}
```

---

## 10. Fifteen New Puzzle Endpoints

All use `const id = \`q-${Date.now()}-${Math.random()}\`` and have 4 difficulty levels.

### `lineareq-api` — Solve ax + b = c
- Easy: ax + b = c (a ∈ [2,9], b ∈ [1,20], c ∈ [1,100])
- Medium: ax + b = cx + d
- Hard: a(bx + c) = d
- Extrahard: a(bx+c) + d(ex+f) = g

### `decimals-api` — Decimal arithmetic
- Easy: a.b + c.d (1 decimal place)
- Medium: subtraction with 2 decimal places
- Hard: multiplication of decimals
- Extrahard: division of decimals

### `permcomb-api` — Permutations & combinations
- Easy: nPr or nCr with small n
- Medium: word arrangement problems
- Hard: committee selection with constraints
- Extrahard: multi-step counting

### `limits-api` — Limits
- Easy: lim(x→a) [mx + b] (direct substitution)
- Medium: lim(x→a) [ax² + bx + c]
- Hard: lim(x→a) [(x²-a²)/(x-a)] (factoring needed)
- Extrahard: limits at infinity

### `invtrig-api` — Inverse trigonometry
- Easy: arcsin/arccos/arctan of standard values (in degrees)
- Medium: compound expressions
- Hard: identities
- Extrahard: complex inverse trig

### `remfactor-api` — Remainder & factor theorems
- Easy: Find remainder when f(x) divided by (x-a)
- Medium: Determine if (x-a) is a factor
- Hard: Find unknown coefficient given a factor
- Extrahard: Polynomial long division

### `heron-api` — Heron's formula
- Easy: Find semi-perimeter
- Medium: Find area given 3 sides
- Hard: Mixed problems
- Extrahard: Complex triangles with decimal sides

### `shares-api` — Shares & dividends
- Easy: Calculate dividend from shares and rate
- Medium: Find return on investment
- Hard: Compare investment options
- Extrahard: Multi-step share problems

### `banking-api` — Banking (RD)
- Easy: Simple interest
- Medium: Compound interest
- Hard: Recurring deposit maturity
- Extrahard: Complex banking scenarios

### `gst-api` — Goods & Services Tax
- Easy: Find GST amount
- Medium: Find price including GST
- Hard: Find original price from GST-inclusive price
- Extrahard: Input tax credit calculations

### `section-api` — Section formula
- Easy: Find midpoint of two points
- Medium: Find point dividing line in ratio m:n
- Hard: External division
- Extrahard: Find ratio given division point

### `linprog-api` — Linear programming
- Easy: Evaluate Z = ax + by at a vertex
- Medium: Find optimal vertex from given set
- Hard: Formulate and solve LP
- Extrahard: Multi-constraint optimization

### `circmeasure-api` — Circular measure
- Easy: Convert degrees to radians
- Medium: Arc length
- Hard: Sector area
- Extrahard: Complex circular measure problems

### `conics-api` — Conic sections
- Easy: Identify conic type from equation
- Medium: Find center/radius of circle
- Hard: Parabola vertex and focus
- Extrahard: Ellipse/hyperbola parameters

### `diffeq-api` — Differential equations
- Easy: Find order of DE
- Medium: Verify solution
- Hard: Solve separable DE
- Extrahard: First-order linear DE

---

## 11. Client Architecture

The entire client is a single React component file (`App.jsx`, ~10,000+ lines) with:
- Global constants
- Reusable hooks (useTimer, useAutoAdvance)
- Reusable components (NumPad, ResultsTable, QuizLayout)
- ~14 apps generated via `makeQuizApp()` factory
- Specialized apps (AdaptiveTablesApp, ScaffoldedTablesApp, TatsavitApp, PolyMulApp, PolyFactorApp, PrimeFactorApp, SimulApp, QFormulaApp, GKApp, VocabApp, RandomMixApp, CustomApp, TwinHuntApp)
- Home component
- App shell with theme toggle and routing

### Cross-Cutting Features (Present in ALL Quiz Apps)

**Solve Button:** Every quiz app has a `handleSolve()` function and a "Solve" button (styled: transparent background, accent-color border) next to Submit. When clicked:
1. Calls the check API with `{ ...question, userAnswer: '', solve: true }`
2. Server middleware intercepts, computes correct answer, generates step-by-step explanation
3. Client reveals the answer with explanation in a blue `.feedback.solve` styled box
4. Question recorded as "(solved)" in results, not counted as correct
5. Does not affect adaptive score or streak

**Self-Report Difficulty Buttons:** All adaptive puzzle apps show always-visible "Too Easy" (green outline) / "Too Hard" (red outline) buttons. Adjustment values vary by app type:
- makeQuizApp: ±0.5/0.3 on adaptScore (0-3 scale)
- TatsavitApp: ±1.0/0.2 on adaptLevel (0-8 scale) + auto-prompt on slow answers
- RandomMixApp: ±1 step on diffIndex (0-3 index)
- Journey quiz: ±0.5/0.3 on adaptScore (0-3 scale)

### Global Constants
```javascript
const API = import.meta.env.VITE_API_BASE_URL || ''
const DEFAULT_TOTAL = 20
const AUTO_ADVANCE_MS = 1500
const ADAPT_DIFFS = ['easy', 'medium', 'hard', 'extrahard']
const ADAPT_COLORS = { easy: '#4caf50', medium: '#ff9800', hard: '#f44336', extrahard: '#9c27b0' }
```

---

## 12. Client Hooks

### `useAutoAdvance(revealed, advanceFnRef, isCorrect)`
```javascript
function useAutoAdvance(revealed, advanceFnRef, isCorrect) {
  useEffect(() => {
    if (!revealed || !isCorrect) return
    const id = setTimeout(() => advanceFnRef.current(), AUTO_ADVANCE_MS)
    return () => clearTimeout(id)
  }, [revealed, isCorrect])
}
```
**3 arguments.** Only auto-advances when both `revealed=true` AND `isCorrect=true`.

### `useTimer()`
Returns `{ elapsed, start, stop, reset }` where `elapsed` is a NUMBER (seconds).
- `start()`: records `startRef.current = Date.now()`, starts interval every 250ms updating `elapsed = Math.floor((Date.now() - startRef.current) / 1000)`
- `stop()`: clears interval, returns elapsed seconds as number
- `reset()`: clears interval, sets elapsed = 0

---

## 13. NumPad Component

```javascript
function NumPad({ value, onChange, onSubmit, disabled, showDecimal, showSlash, showCaret, showX })
```

**Key behaviors:**
- `'0'-'9'`: append digit
- `'±'`: toggle negative sign (prefix `-`)
- `'.'`: append decimal point (only if not already present)
- `'/'`: append slash (only if not already present)
- `'^'`: append caret for exponents
- `'x'`: append variable x
- `'⌫'`: delete last character

**Layout:** 4 rows. Row 1: [1,2,3]. Row 2: [4,5,6]. Row 3: [7,8,9]. Row 4: [±, 0, (.), (/), (^), (x), ⌫] — optional keys shown based on props.

---

## 14. ResultsTable Component

```javascript
function ResultsTable({ results })
```
Renders table with columns: #, Question, Your Answer, Result (✓/✗), Time.
Green rows for correct, red for wrong. Footer: total time and average time per question.

---

## 15. makeQuizApp Factory

```javascript
function makeQuizApp({ title, subtitle, apiPath, diffLabels, placeholders, tip, answerField })
```

Returns a React component with this state machine:

**setup → playing → finished**

**State:**
```javascript
difficulty, isAdaptive, adaptScore (0-3.0), numQuestions, started, finished,
question, answer, score, questionNumber, totalQ, feedback, isCorrect,
loading, revealed, results
```

**Adaptive score adjustment:**
```javascript
if (correct) adaptScore = Math.min(3, prev + 0.25)
else adaptScore = Math.max(0, prev - 0.35)
```

**Adaptive difficulty from score:**
```javascript
adaptiveLevel(score) → ADAPT_DIFFS[Math.min(3, Math.floor(score))]
// 0-0.99 → easy, 1-1.99 → medium, 2-2.99 → hard, 3.0 → extrahard
```

**Solve Button:**
All makeQuizApp instances have a "Solve" button (blue accent outline) next to Submit. `handleSolve()` calls the check API with `{ ...question, userAnswer: '', solve: true }`, reveals the correct answer with an explanation, and records the question as "(solved)" in results (not counted as correct). Feedback uses the `.feedback.solve` CSS class (blue theme, left-aligned, pre-line whitespace).

**Self-Report Difficulty Buttons:**
When `isAdaptive`, always-visible "Too Easy" / "Too Hard" buttons appear below Submit:
```javascript
reportDifficulty(wasDifficult):
  if wasDifficult: adaptScore = Math.max(0, prev - 0.5)
  if !wasDifficult: adaptScore = Math.min(3, prev + 0.3)
```

**14 apps created via makeQuizApp:**
SurdsApp, IndicesApp, SequencesApp, RatioApp, PercentApp, SetsApp, TrigApp, IneqApp, CoordGeomApp, ProbApp, StatsApp (and more — each with specific `apiPath`, `title`, `subtitle`).

Additionally: LinearEqApp, DecimalsApp, PermCombApp, LimitsApp, InvTrigApp, RemFactorApp, HeronApp, SharesApp, BankingApp, GSTApp, SectionApp, LinProgApp, CircMeasureApp, ConicsApp, DiffEqApp.

---

## 16. AdaptiveTablesApp

```javascript
function AdaptiveTablesApp({ studentName })
```

**State machine:** setup → playing → finished

**Constants:**
```javascript
WINDOW = 8              // Rolling window size
FAST_THRESH = 3000      // ms — "mastered" speed
MEDIUM_THRESH = 6000    // ms — "comfortable" speed
ADVANCE_COUNT = 5       // Consecutive mastered-without-table to advance
```

**Rolling window:** `[{ correct: bool, timeMs: number }, ...]` (max 8)

**evaluate(window) → { level, avgTime, accuracy }:**
```
if window.length < 3: return 'learning'
accuracy = correct_count / window.length
avgTime = sum(timeMs) / window.length
if avgTime < 3000 && accuracy >= 0.9: return 'mastered'
if avgTime < 6000 && accuracy >= 0.7: return 'comfortable'
return 'learning'
```

**Decision tree after each answer:**
1. Add answer to window, keep last 8
2. Evaluate window
3. If **mastered && table hidden**: increment masteredWithout counter
   - If counter ≥ 5: advance to next table (or finish if > 20)
4. If **mastered && table shown**: hide table
5. If **comfortable**: hide table if shown
6. If **learning**: show table if hidden

**Persistence:** `localStorage['tenali-tables-{studentName}']` saves `{ currentTable }`

**Solve Button:** Available alongside Submit — calls check API with `solve: true` to reveal answer with explanation.

---

## 17. ScaffoldedTablesApp

```javascript
function ScaffoldedTablesApp({ studentName, defaultTable = 2 })
```

**State machine:** playing → finished (no setup)

**Constants:**
```javascript
TOTAL_QUESTIONS = 30
SCAFFOLD_WINDOW = 8
FAST_MS = 4000
CONSECUTIVE_FAST_TO_REMOVE = 5
ERRORS_TO_RESTORE = 3
```

Starts with 3 reference tables visible. Tables removed one at a time when student gets 5 consecutive fast+correct answers. Tables restored if 3+ errors in rolling window.

**Persistence:** `localStorage['tenali-scaffold-{studentName}']` saves `{ currentTable, showTable }`

**Solve Button:** Available alongside Submit — calls check API with `solve: true` to reveal answer with explanation.

---

## 18. TatsavitApp

```javascript
function TatsavitApp({ onBack })
```

**State machine:** setup → playing → finished

### Adaptive Level System
Float `adaptLevel` ranges 0.0–8.0, mapped to 9 question types:
```javascript
currentLevel() = Math.floor(adaptLevel)  // 0-8
```

### Within-Type Difficulty
```javascript
adaptiveDifficulty() {
  const lvl = currentLevel()
  if (lvl <= 2) return 'easy'
  if (lvl <= 5) return 'medium'
  if (lvl <= 7) return 'hard'
  return 'extrahard'
}
```

### Wrong Answer Behavior
- Wrong answers do NOT count toward total
- A fresh question is loaded at the SAME question number
- Only correct answers increment score and move forward
- Only correct answers are recorded in results

### Slow Answer Detection
```javascript
const SLOW_THRESHOLDS = [8, 10, 12, 15, 12, 20, 10, 10, 12]
// Index: 0=tables1dig, 1=tables20, 2=squares, 3=sqrt, 4=monomial, 5=percent, 6=add, 7=sub, 8=neg

const diffBuffer = () => {
  if (difficulty === 'hard') return 3
  if (difficulty === 'extrahard') return 5
  if (difficulty === 'medium') return 1
  return 0
}

const getSlowThreshold = () => (SLOW_THRESHOLDS[question?.type ?? 0] || 15) + diffBuffer()
```

### Self-Report System
**Always-visible buttons** (when isAdaptive): "Too Easy" / "Too Hard" below Submit:
- **Too Easy:** adaptLevel += 0.2
- **Too Hard:** adaptLevel -= 1.0

**Auto-prompt** when `timeTaken > slowThreshold` (any answer, correct or wrong):
- Shows "Was the previous question easy or difficult?" in an accent-colored box
- **Easy response:** adaptLevel += 0.2
- **Difficult response:** adaptLevel -= 1.0

### Solve Button
`handleSolve()` calls `/tatsavit-api/check` with `{ ...question, userAnswer: '', solve: true }`, reveals the answer with explanation, does not affect score or adaptive level. Displayed alongside Submit button with blue accent outline styling.

### Adaptive Progression
```javascript
if (correct) {
  streak >= 0 ? streak++ : streak = 1
  const bump = timeTaken > slowThresh ? 0.15 : (streak >= 3 ? 0.5 : 0.3)
  adaptLevel = Math.min(8, adaptLevel + bump)
} else {
  streak <= 0 ? streak-- : streak = -1
  const penalty = timeTaken > slowThresh ? 0.6 : 0.4
  adaptLevel = Math.max(0, adaptLevel - penalty)
}
```

### NumPad
TatsavitApp renders: `<NumPad value={answer} onChange={...} disabled={revealed} showDecimal showCaret showX />`

---

## 19. RandomMixApp

**State machine:** setup → playing → finished

**45 topics** from RANDOM_MIX_TOPICS array, each with `{ key, name, api }`.
Excludes: simul, polymul, polyfactor, primefactor, qformula, dotprod (need special input).

**Adaptive difficulty:**
```javascript
const DIFF_LEVELS = ['easy', 'medium', 'hard', 'extrahard']
diffIndex starts at 0

// After correct:
streak >= 0 ? streak++ : streak = 1
if (streak >= 3 && diffIndex < 3) { diffIndex++; streak = 0 }

// After wrong:
streak <= 0 ? streak-- : streak = -1
if (streak <= -2 && diffIndex > 0) { diffIndex--; streak = 0 }
```

**Skip Logic:** Students can skip topics. Skipped topic doesn't count as a question.

**Solve Button:** `handleSolve()` calls check API with `{ ...question, userAnswer: '', solve: true }`, reveals answer with explanation. Recorded as "(solved)" in results.

**Self-Report Buttons:** Always-visible "Too Easy" / "Too Hard" buttons adjust difficulty:
```javascript
reportDifficulty(wasDifficult):
  if wasDifficult && diffIndex > 0: diffIndex--; streak = 0
  if !wasDifficult && diffIndex < 3: diffIndex++; streak = 0
```

---

## 20. CustomApp (Custom Lesson Builder)

**State machine:** setup → quiz → finished

**Setup:** Checkbox grid of 63 puzzle types from CUSTOM_PUZZLES. Radio buttons for ordering (random/sequential) and difficulty. Question count input (1-100).

**Sequential ordering:**
```javascript
const perType = Math.floor(count / selected.length)
const remainder = count % selected.length
selected.forEach((key, i) => {
  const n = perType + (i < remainder ? 1 : 0)
  for (let j = 0; j < n; j++) questionPlan.push(key)
})
```

**Random ordering:** randomly pick from selected types for each question.

**handleSubmit:** 26+ switch cases covering all puzzle types with their specific validation logic and API calls.

**handleSolve:** Calls the relevant check API with `solve: true`, reveals the answer with explanation. Available alongside Submit in all puzzle types.

**renderInputs:** Different input methods per puzzle type:
- Single text input: most puzzles
- Multiple choice (A-D): gk, vocab
- Coefficient array: polymul
- 4-field (p,q,r,s): polyfactor
- CSV factors: primefactor
- Root fields (r1,r2): qformula
- Multi-variable (x,y,z): simul
- Slope/intercept (m,c): lineq

---

## 21. Home Component

**State:** `search`, `menuOpen`, `cols`

**Layout:**
1. Title "Tenali" in serif font
2. Hamburger menu → quick access to featured apps
3. Search bar with magnifying glass
4. Featured row: Random Mix, Custom Lesson (special gradient styling)
5. Regular apps grid: 64 apps sorted alphabetically, responsive columns
6. Grid dimensions shown at bottom (e.g. "8 × 4")

**Search:** case-insensitive match on name and subtitle.

---

## 22. App Shell & Routing

```javascript
function App() {
  const [theme, setTheme] = useState(localStorage.getItem('tenali-theme') || 'dark')
  const [mode, setMode] = useState(null)
}
```

**URL-based routes (checked via `window.location.pathname`):**
| Path | Component | Props |
|------|-----------|-------|
| `/taittiriya` | ScaffoldedTablesApp | studentName="Taittiriya", defaultTable=3 |
| `/tatsavit` | TatsavitApp | — |
| `/intervalscheduling` | IntervalSchedulingApp | — |
| `/extendedeuclid` | ExtendedEuclidApp | — |

**Mode-based routing:** If `mode` is set, renders `modeMap[mode]`. Otherwise renders Home.

**Theme toggle:** ☀️ / 🌙 button. Toggles `data-theme` attribute on document. Persists to `localStorage['tenali-theme']`.

---

## 23. modeMap

65 entries mapping mode keys to components:
```javascript
const modeMap = {
  gk: GKApp, addition: AdditionApp, quadratic: QuadraticApp, multiply: MultiplyApp,
  vocab: VocabApp, spot: TwinHuntApp, sqrt: SqrtApp, polymul: PolyMulApp,
  polyfactor: PolyFactorApp, primefactor: PrimeFactorApp, qformula: QFormulaApp,
  simul: SimulApp, funceval: FuncEvalApp, lineq: LineEqApp, basicarith: BasicArithApp,
  fractionadd: FractionAddApp, surds: SurdsApp, indices: IndicesApp,
  sequences: SequencesApp, ratio: RatioApp, percent: PercentApp, sets: SetsApp,
  trig: TrigApp, ineq: IneqApp, coordgeom: CoordGeomApp, prob: ProbApp,
  stats: StatsApp, matrix: MatrixApp, vectors: VectorsApp, dotprod: DotProdApp,
  transform: TransformApp, mensur: MensurApp, bearings: BearingsApp, log: LogApp,
  diff: DiffApp, bases: BasesApp, circleth: CircleThApp, integ: IntegApp,
  stdform: StdFormApp, bounds: BoundsApp, sdt: SDTApp, variation: VariationApp,
  hcflcm: HcfLcmApp, profitloss: ProfitLossApp, rounding: RoundingApp,
  binomial: BinomialApp, complex: ComplexApp, angles: AnglesApp,
  triangles: TrianglesApp, congruence: CongruenceApp, pythag: PythagApp,
  polygons: PolygonsApp, similarity: SimilarityApp, squaring: SquaringApp,
  lineareq: LinearEqApp, decimals: DecimalsApp, permcomb: PermCombApp,
  limits: LimitsApp, invtrig: InvTrigApp, remfactor: RemFactorApp,
  heron: HeronApp, shares: SharesApp, banking: BankingApp, gst: GSTApp,
  section: SectionApp, linprog: LinProgApp, circmeasure: CircMeasureApp,
  conics: ConicsApp, diffeq: DiffEqApp, tatsavit: TatsavitApp,
  randommix: RandomMixApp, custom: CustomApp,
}
```

---

## 24. regularApps

64 menu items sorted alphabetically. Each entry: `{ key, name, subtitle, color }`.
Colors: `'blue'`, `'purple'`, `'green'`.

Full list:
```
addition, angles, basicarith, banking, bearings, binomial, bounds, circmeasure,
circleth, complex, congruence, conics, coordgeom, decimals, diff, diffeq,
dotprod, fractionadd, funceval, gk, gst, hcflcm, heron, indices, ineq,
integ, invtrig, limits, lineareq, lineq, linprog, log, matrix, mensur,
multiply, percent, permcomb, polyfactor, polymul, polygons, primefactor,
prob, profitloss, pythag, qformula, quadratic, ratio, remfactor, rounding,
sdt, section, sequences, sets, shares, similarity, simul, spot, sqrt,
squaring, stats, stdform, surds, tatsavit, transform, triangles, trig,
variation, vectors, vocab
```

---

## 25. CUSTOM_PUZZLES

63 entries for the Custom Lesson builder. Same keys as regularApps minus a few special ones.

---

## 26. fetchQuestionForType

Maps puzzle keys to API URLs:
```javascript
const urls = {
  basicarith: `${API}/basicarith-api/question?difficulty=${difficulty}`,
  addition:   `${API}/addition-api/question?digits=${diffMap[difficulty] || 1}`,
  quadratic:  `${API}/quadratic-api/question?difficulty=${difficulty}`,
  multiply:   `${API}/multiply-api/question?table=${Math.floor(Math.random() * 8) + 2}`,
  sqrt:       `${API}/sqrt-api/question?step=${...}`,  // maps difficulty to step range
  polymul:    `${API}/polymul-api/question?difficulty=${difficulty}`,
  // ... (all 63 types)
}
```

Where `diffMap = { easy: 1, medium: 2, hard: 3 }` for addition digits.

---

## 27. getPromptForType

Returns display text for each puzzle type:
```javascript
case 'basicarith': case 'addition': return `${q.prompt} = ?`
case 'multiply': return `${q.prompt} = ?`
case 'sqrt': return `${q.prompt} = ?`
case 'quadratic': return q.prompt
case 'funceval': return `${q.formula}, evaluate at ${vars}`
case 'polymul': return `Expand: (${q.p1Display})(${q.p2Display})`
case 'polyfactor': return `Factorise: ${q.display}`
case 'primefactor': return `Find all prime factors of ${q.number}`
case 'qformula': return `Roots of ${q.a}x² + ${q.b}x + ${q.c} = 0`
case 'gk': return q.question
case 'vocab': return `What does "${q.question}" mean?`
// Most others: return q.prompt || ''
```

---

## 28. CustomApp handleSubmit

26+ switch cases. Each case:
1. Validates input is filled
2. POSTs to `/{type}-api/check` with appropriate body
3. Extracts `correct` and `correctDisplay` from response

---

## 29. CustomApp renderInputs

Input method per type:
- **gk, vocab:** 4 option buttons (A, B, C, D) with keyboard shortcut (1-4 or a-d)
- **polymul:** Array of coefficient input fields, one per degree
- **polyfactor:** 4 inputs labeled p, q, r, s for (px+q)(rx+s)
- **primefactor:** Single CSV input for prime factors
- **qformula:** 2 root inputs (r1, r2)
- **simul:** 2 or 3 variable inputs (x, y, z)
- **lineq:** 2 inputs (m, c)
- **All others:** Single text input

---

## 30. Data Persistence

| Key | Storage | Format |
|-----|---------|--------|
| `tenali-theme` | localStorage | `"dark"` or `"light"` |
| `tenali-tables-{name}` | localStorage | `{ currentTable: number }` |
| `tenali-scaffold-{name}` | localStorage | `{ currentTable: number, showTable: boolean }` |
| `tenali_gk_seen` | localStorage | `[id1, id2, ...]` (array of question IDs) |
| `tenali_vocab_seen` | localStorage | `[id1, id2, ...]` |

GK and Vocab load seen IDs on init, add new IDs after each question, and pass them as `exclude` parameter to the API.

---

## 31. CSS Design System

### Fonts
```css
@import url('...DM+Sans...Source+Serif+4...');
--font-display: 'Source Serif 4', Georgia, serif;     /* Headings */
--font-body: 'DM Sans', system-ui, sans-serif;        /* Body text */
```

### Dark Theme (default `:root`)
```css
--clr-bg: #1a1614;                    /* Very dark brown */
--clr-card: #2c2622;                  /* Dark brown card */
--clr-surface: #362f2a;               /* Medium dark surface */
--clr-input: #3e3631;                 /* Input field bg */
--clr-text: #ede8e3;                  /* Off-white cream */
--clr-text-soft: #a89e94;             /* Muted brown-gray */
--clr-border: rgba(255,245,230,0.10); /* 10% cream */
--clr-accent: #e8864a;                /* Warm orange */
--clr-accent-soft: rgba(232,134,74,0.15);
--clr-correct: #5cb87a;               /* Muted green */
--clr-correct-bg: rgba(92,184,122,0.12);
--clr-wrong: #e05a4a;                 /* Muted red */
--clr-wrong-bg: rgba(224,90,74,0.12);
--clr-badge: #4a4340;
--clr-placeholder: #6b6058;
--clr-hover: rgba(255,245,230,0.04);
--radius: 16px;
--radius-sm: 10px;
--shadow-card: 0 4px 24px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15);
--shadow-btn: 0 2px 8px rgba(0,0,0,0.20);
--transition: 180ms ease;
```

### Light Theme (`[data-theme="light"]`)
```css
--clr-bg: #f5f0eb;                    /* Warm off-white */
--clr-card: #fffdf9;                  /* Near white */
--clr-surface: #f0ebe5;               /* Light warm gray */
--clr-input: #ffffff;
--clr-text: #2c2420;                  /* Very dark brown */
--clr-text-soft: #6b5e54;
--clr-border: rgba(60,45,30,0.12);
--clr-accent: #e07a3a;
--clr-correct: #3a8a5c;
--clr-wrong: #c24b3a;
```

### Key CSS Classes
- `.shell` — outer container, full viewport
- `.card` — content card with rounded corners and shadow
- `.search-bar` — magnifying glass + input
- `.menu-card` — clickable puzzle card in grid
- `.numpad` — virtual keyboard container
- `.numpad-key` — individual key button (52×44px)
- `.numpad-special` — ±, ., /, ^, x, ⌫ buttons
- `.answer-input` — text input field
- `.question-box` — question display area
- `.results-table` — quiz results
- `.correct-row` / `.wrong-row` — result highlighting
- `.checkbox-pill` — difficulty selector pills
- `.adaptive-bar` — colored difficulty indicator
- `.feedback.solve` — solution display: `background: rgba(66,165,245,0.12); color: #42a5f5; text-align: left; line-height: 1.6;` — shows step-by-step explanations with pre-line whitespace

### Responsive Breakpoints
- `@media (max-width: 700px)` — tablet adjustments
- `@media (max-width: 500px)` — mobile adjustments

---

## 32. Prerequisite Graph

### File: `graph/index.html`

Uses D3.js 7.9.0 + Dagre 0.8.5 for DAG layout.

### 67 Nodes
Each node: `{ id, label, sub, cat }`

Categories and colors:
```javascript
const catColor = {
  arith:  '#ef5350',  // Red
  alg:    '#ab47bc',  // Purple
  geom:   '#42a5f5',  // Blue
  calc:   '#66bb6a',  // Green
  stats:  '#ffa726',  // Orange
  vecmat: '#26c6da',  // Cyan
  numth:  '#78909c',  // Blue-gray
  other:  '#90a4ae',  // Gray
}
```

### Complete Node List
**Arithmetic (10):** basicarith, addition, multiply, rounding, fractionadd, percent, profitloss, ratio, sdt, squaring
**Number Theory (3):** hcflcm, primefactor, bases
**Algebra (18):** indices, surds, stdform, log, sqrt, quadratic, funceval, polymul, polyfactor, qformula, simul, ineq, sequences, variation, binomial, complex, bounds, lineareq, remfactor, linprog
**Geometry (16):** angles, triangles, polygons, congruence, similarity, pythag, circleth, mensur, transform, bearings, coordgeom, lineq, trig, invtrig, heron, section, circmeasure, conics
**Calculus (4):** diff, integ, limits, diffeq
**Stats (3):** stats, prob, sets, permcomb
**Vectors (3):** vectors, dotprod, matrix
**Other (3):** gk, vocab, spot
**Applied (4):** decimals, shares, banking, gst

### Complete Edge List (Prerequisite Relationships)
```
basicarith→addition, basicarith→multiply, basicarith→rounding, multiply→squaring,
addition→squaring, multiply→fractionadd, fractionadd→percent, percent→profitloss,
ratio→percent, basicarith→ratio, multiply→sdt, ratio→sdt,
multiply→hcflcm, hcflcm→primefactor, basicarith→bases,
multiply→indices, indices→surds, indices→log, indices→stdform,
multiply→sqrt, squaring→sqrt,
basicarith→funceval, multiply→quadratic, indices→quadratic,
multiply→polymul, indices→polymul, polymul→polyfactor,
polyfactor→qformula, sqrt→qformula,
basicarith→simul, funceval→simul,
basicarith→ineq, polyfactor→ineq,
basicarith→sequences, multiply→sequences, indices→sequences,
ratio→variation, indices→variation,
indices→binomial, polymul→binomial,
sqrt→complex, qformula→complex,
rounding→bounds,
basicarith→angles, angles→triangles, angles→polygons, triangles→polygons,
triangles→congruence, triangles→similarity, ratio→similarity,
triangles→pythag, squaring→pythag,
angles→circleth, triangles→circleth,
multiply→mensur, squaring→mensur, polygons→mensur,
angles→transform, coordgeom→transform,
angles→bearings,
basicarith→coordgeom, pythag→coordgeom, coordgeom→lineq, fractionadd→lineq,
pythag→trig, angles→trig, ratio→trig,
indices→diff, polymul→diff, quadratic→diff, diff→integ,
basicarith→stats, fractionadd→prob, basicarith→prob, basicarith→sets,
basicarith→vectors, vectors→dotprod, multiply→matrix, basicarith→matrix, matrix→dotprod,
basicarith→decimals, basicarith→lineareq, lineareq→simul,
basicarith→shares, basicarith→banking,
percent→gst, percent→shares, percent→banking,
basicarith→permcomb, sequences→limits, limits→diff,
trig→invtrig, trig→circmeasure,
coordgeom→section, coordgeom→conics,
polyfactor→remfactor, polymul→remfactor,
pythag→heron, triangles→heron, mensur→heron,
lineareq→linprog, ineq→linprog,
diff→diffeq, integ→diffeq
```

---

## 33. Path Finder & Journey

### File: `graph/path.html`

### Path Finding
- Two dropdown selects: source and target puzzle
- BFS from target backwards to find shortest path
- Renders path as connected nodes with "NONE" option for longest path
- After rendering, shows "Start the Journey" button

### Journey Quiz Engine

**Constants:**
```javascript
MASTERY_WINDOW = 5      // Rolling window for mastery check
MASTERY_NEEDED = 3      // 3 correct out of last 5 to advance
```

**API_MAP:** Maps all puzzle IDs to their API paths (e.g., `basicarith: 'basicarith-api'`).

**State:**
- `journeySteps`: ordered array of puzzle IDs in the path
- `journeyIdx`: current step index
- `journeyHistory`: array of last 5 answers for mastery check
- `adaptScore`: float 0-3 for adaptive difficulty (carries across steps)
- `journeyStats`: per-step statistics

**Flow:**
1. `startJourney()` → initializes state, shows fullscreen overlay
2. `loadJourneyQuestion()` → fetches from puzzle API with adaptive difficulty
3. Student answers via numpad in overlay
4. `submitJourneyAnswer()` → checks answer, updates adaptive score and mastery tracking
5. If mastered (3/5 correct): advance to next step
6. If not mastered: continue same step with new question
7. After all steps: show completion screen with stats

**Quiz overlay UI:** Header with step name, progress bar, step pills, question card, numpad (0-9, ±, ., ⌫), buttons (Submit, Solve, Skip), feedback, mastery progress bar, self-report buttons.

**Solve Button:** `solveJourneyQuestion()` calls check API with `{ ...question, userAnswer: '', solve: true }`. Reveals answer with explanation, counts as incorrect for mastery, displayed with blue `.solve` styling.

**Skip Button:** `skipJourneyQuestion()` marks question as unanswered/incorrect, shows "Skipped" feedback, pushes `false` to mastery history.

**Self-Report Buttons:** Always-visible "Too Easy" / "Too Hard" buttons adjust `adaptScore`:
```javascript
reportJourneyDifficulty(wasDifficult):
  if wasDifficult: adaptScore = Math.max(0, adaptScore - 0.5)
  if !wasDifficult: adaptScore = Math.min(3, adaptScore + 0.3)
```

**Enter Key Fix:** Global `document.addEventListener('keydown')` listener ensures Enter works after answer reveal (since the input becomes `disabled` and can't capture keyboard events).

---

## 34. Enhanced Landing Page

### File: `enhanced/index.html`

Standalone preview page at `/enhanced`.

**Design:**
- Greyscale palette (charcoal/slate base, no warm browns)
- Category color strips on cards: teal (arith), violet (alg), coral (geom), amber (calc), sky (stats), emerald (vecmat), pink (numth), slate (other)
- DM Sans (body) + Source Serif 4 (display) typography

**Features:**
- Search bar with magnifying glass icon
- Category filter pills (clickable toggles)
- Featured row: Random Mix, Custom Lesson, Tatsavit (gradient border)
- Compact 170×100px puzzle cards, left-aligned, 20px border-radius
- Hover effect: scale 1.03× with category-color glow
- Dark/light theme toggle with localStorage persistence

**Card rendering:** JavaScript generates cards from a `PUZZLES` array, filtering by search text and selected category pills.

---

*End of specification.*
