const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const questionsDir = path.join(__dirname, '..', 'chitragupta', 'questions');

app.use(cors());
app.use(express.json());
app.use(express.static(clientDistPath));

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function digitRange(digits) {
  if (digits === 1) return { min: 0, max: 9 };
  if (digits === 2) return { min: 10, max: 99 };
  return { min: 100, max: 999 };
}

function bandForStep(step) {
  if (step <= 10) return { min: 2, max: 50 };
  if (step <= 20) return { min: 51, max: 150 };
  if (step <= 35) return { min: 151, max: 350 };
  if (step <= 60) return { min: 351, max: 700 };
  return { min: 701, max: 999 };
}

function loadQuestions() {
  const files = fs.readdirSync(questionsDir).filter((file) => file.endsWith('.json'));
  return files.map((file) => {
    const fullPath = path.join(questionsDir, file);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  });
}

const questions = loadQuestions();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, questions: questions.length });
});

app.get('/gk-api/question', (req, res) => {
  const exclude = req.query.exclude ? req.query.exclude.split(',').map(Number) : [];
  if (!questions.length) {
    return res.status(500).json({ error: 'No questions found' });
  }
  // Filter out already-seen questions; if all exhausted, allow any
  let pool = questions;
  const unseen = pool.filter((q) => !exclude.includes(q.id));
  if (unseen.length > 0) pool = unseen;
  const q = pool[Math.floor(Math.random() * pool.length)];
  res.json({
    id: q.id,
    question: q.question,
    options: q.options,
    genre: q.genre || 'mixed',
  });
});

app.post('/gk-api/check', (req, res) => {
  const { id, answerOption } = req.body || {};
  const q = questions.find((item) => Number(item.id) === Number(id));
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }
  const correct = String(answerOption || '').toUpperCase() === String(q.answerOption || '').toUpperCase();
  res.json({
    correct,
    correctAnswer: q.answerOption,
    correctAnswerText: q.answerText,
    message: correct ? 'Correct! 🎉' : 'Wrong ❌',
  });
});

app.get('/addition-api/question', (req, res) => {
  const digits = Number(req.query.digits || 1);
  const safeDigits = [1, 2, 3].includes(digits) ? digits : 1;
  const range = digitRange(safeDigits);
  const a = randomInt(range.min, range.max);
  const b = randomInt(range.min, range.max);
  res.json({ id: `${safeDigits}-${Date.now()}-${Math.random()}`, digits: safeDigits, a, b, prompt: `${a} + ${b}`, answer: a + b });
});

app.post('/addition-api/check', (req, res) => {
  const { a, b, answer } = req.body || {};
  const correctAnswer = Number(a) + Number(b);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});


function randomSignedDigit() {
  return randomInt(-9, 9);
}

function quadraticRange(difficulty) {
  if (difficulty === 'easy') return { min: -3, max: 3 };
  if (difficulty === 'medium') return { min: -6, max: 6 };
  return { min: -9, max: 9 };
}

function randomInRange(min, max) {
  return randomInt(min, max);
}

function formatSignedTerm(value, variablePart, isFirst = false) {
  if (value === 0) {
    return isFirst ? `0${variablePart}` : `+ 0${variablePart}`;
  }

  const sign = value < 0 ? '-' : '+';
  const absValue = Math.abs(value);
  if (isFirst) {
    return `${value}${variablePart}`;
  }
  return `${sign} ${absValue}${variablePart}`;
}

function buildQuadraticPrompt(a, b, c, x) {
  const expression = `${formatSignedTerm(a, 'x²', true)} ${formatSignedTerm(b, 'x')} ${formatSignedTerm(c, '')}`;
  return `If x = ${x}, find y for y = ${expression}`;
}

app.get('/quadratic-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'hard';
  const range = quadraticRange(difficulty);
  let a = 0;
  while (a === 0) a = randomInRange(range.min, range.max);
  const b = randomInRange(range.min, range.max);
  const c = randomInRange(range.min, range.max);
  const x = randomInRange(range.min, range.max);
  const answer = a * x * x + b * x + c;

  res.json({
    id: `quadratic-${Date.now()}-${Math.random()}`,
    a,
    b,
    c,
    x,
    prompt: buildQuadraticPrompt(a, b, c, x),
    answer,
  });
});

app.post('/quadratic-api/check', (req, res) => {
  const { a, b, c, x, answer } = req.body || {};
  const correctAnswer = Number(a) * Number(x) * Number(x) + Number(b) * Number(x) + Number(c);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

app.get('/sqrt-api/question', (req, res) => {
  const step = Math.max(1, Number(req.query.step || 1));
  const band = bandForStep(step);
  const q = randomInt(band.min, band.max);
  const sqrt = Math.sqrt(q);
  const floorAnswer = Math.floor(sqrt);
  const ceilAnswer = Math.ceil(sqrt);

  res.json({
    id: `${step}-${Date.now()}-${Math.random()}`,
    q,
    step,
    prompt: `√${q}`,
    floorAnswer,
    ceilAnswer,
    sqrtRounded: sqrt.toFixed(2),
  });
});

app.post('/sqrt-api/check', (req, res) => {
  const { q, answer } = req.body || {};
  const sqrt = Math.sqrt(Number(q));
  const floorAnswer = Math.floor(sqrt);
  const ceilAnswer = Math.ceil(sqrt);
  const numericAnswer = Number(answer);
  const correct = numericAnswer === floorAnswer || numericAnswer === ceilAnswer;

  res.json({
    correct,
    floorAnswer,
    ceilAnswer,
    sqrtRounded: sqrt.toFixed(2),
    message: correct ? 'Correct' : 'Incorrect',
  });
});

/* ── Vocab Builder ─────────────────────────────────── */
const vocabDir = path.join(__dirname, '..', 'vocab', 'questions');

function loadVocab() {
  try {
    const files = fs.readdirSync(vocabDir).filter((f) => f.endsWith('.json'));
    return files.map((f) => JSON.parse(fs.readFileSync(path.join(vocabDir, f), 'utf8')));
  } catch (e) {
    return [];
  }
}

const vocabQuestions = loadVocab();

app.get('/vocab-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const exclude = req.query.exclude ? req.query.exclude.split(',').map(Number) : [];
  let pool = vocabQuestions.filter((q) => q.difficulty === difficulty);
  if (!pool.length) {
    return res.status(404).json({ error: `No vocab questions for difficulty: ${difficulty}` });
  }
  // Filter out already-seen questions; if all exhausted, reset and allow any
  const unseen = pool.filter((q) => !exclude.includes(q.id));
  if (unseen.length > 0) pool = unseen;
  const q = pool[Math.floor(Math.random() * pool.length)];
  res.json({
    id: q.id,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty,
  });
});

app.post('/vocab-api/check', (req, res) => {
  const { id, answerOption } = req.body || {};
  const q = vocabQuestions.find((item) => Number(item.id) === Number(id));
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }
  const correct = String(answerOption || '').toUpperCase() === String(q.answerOption || '').toUpperCase();
  res.json({
    correct,
    correctAnswer: q.answerOption,
    correctAnswerText: q.answerText,
    message: correct ? 'Correct!' : 'Incorrect',
  });
});

/* ── Multiplication Tables ──────────────────────────── */
app.get('/multiply-api/question', (req, res) => {
  const table = Math.max(1, Number(req.query.table || 1));
  const multiplier = randomInt(1, 10);
  const answer = table * multiplier;

  res.json({
    id: `multiply-${Date.now()}-${Math.random()}`,
    table,
    multiplier,
    prompt: `${table} × ${multiplier}`,
    answer,
  });
});

app.post('/multiply-api/check', (req, res) => {
  const { table, multiplier, answer } = req.body || {};
  const correctAnswer = Number(table) * Number(multiplier);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

/* ── Polynomial Multiplication ─────────────────────── */
function polyCoeffRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 9 };
  if (difficulty === 'medium') return { min: 1, max: 10 };
  return { min: 1, max: 20 };
}
function randomPoly(degree, range) {
  const coeffs = [];
  for (let i = 0; i <= degree; i++) {
    let c = randomInt(range.min, range.max);
    if (Math.random() < 0.3 && i > 0) c = -c;
    coeffs.push(c);
  }
  if (coeffs[degree] === 0) coeffs[degree] = 1;
  return coeffs; // index = power: [constant, x, x², ...]
}
function multiplyPolys(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}
function formatPoly(coeffs) {
  const parts = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    if (c === 0 && coeffs.length > 1) continue;
    const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
    const varPart = i === 0 ? '' : i === 1 ? 'x' : `x${sup(i)}`;
    if (parts.length === 0) {
      parts.push(c === 1 && i > 0 ? varPart : c === -1 && i > 0 ? `-${varPart}` : `${c}${varPart}`);
    } else {
      const sign = c > 0 ? '+' : '-';
      const abs = Math.abs(c);
      parts.push(`${sign} ${abs === 1 && i > 0 ? varPart : `${abs}${varPart}`}`);
    }
  }
  return parts.join(' ') || '0';
}

app.get('/polymul-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = polyCoeffRange(difficulty);
  let p1, p2;

  if (difficulty === 'easy') {
    // Easy: a(bx + c) form — monomial × binomial
    // Variants: plain constant like 3(2x+5), or term like 4x(7x+8)
    const usesX = Math.random() < 0.4; // 40% chance of ax(...) form
    if (usesX) {
      // ax × (bx + c) → coeffs: ax = [0, a], (bx+c) = [c, b]
      const a = randomInt(2, range.max);
      const b = randomInt(1, range.max);
      let c = randomInt(1, range.max);
      if (Math.random() < 0.3) c = -c;
      p1 = [0, a];
      p2 = [c, b];
    } else {
      // a × (bx + c) → coeffs: a = [a], (bx+c) = [c, b]
      const a = randomInt(2, range.max);
      const b = randomInt(1, range.max);
      let c = randomInt(1, range.max);
      if (Math.random() < 0.3) c = -c;
      p1 = [a];
      p2 = [c, b];
    }
  } else if (difficulty === 'medium') {
    // Medium: two degree-1 polynomials (ax+b)(cx+d)
    p1 = randomPoly(1, range);
    p2 = randomPoly(1, range);
  } else {
    // Hard: two degree-2 polynomials
    p1 = randomPoly(2, range);
    p2 = randomPoly(2, range);
  }

  const product = multiplyPolys(p1, p2);
  res.json({
    id: `polymul-${Date.now()}-${Math.random()}`,
    p1, p2, product,
    p1Display: formatPoly(p1),
    p2Display: formatPoly(p2),
    productDisplay: formatPoly(product),
    resultDegree: product.length - 1,
  });
});

app.post('/polymul-api/check', (req, res) => {
  const { p1, p2, userCoeffs } = req.body || {};
  const product = multiplyPolys(p1, p2);
  const correct = product.length === userCoeffs.length && product.every((c, i) => Number(userCoeffs[i]) === c);
  res.json({ correct, correctCoeffs: product, correctDisplay: formatPoly(product), message: correct ? 'Correct' : 'Incorrect' });
});

/* ── Polynomial Factorization ─────────────────────── */
function factorCoeffRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 10 };
  if (difficulty === 'medium') return { min: 1, max: 20 };
  return { min: 1, max: 30 };
}

app.get('/polyfactor-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = factorCoeffRange(difficulty);
  // Generate from factors: (px + q)(rx + s) = prx² + (ps+qr)x + qs
  let p, q, r, s;
  p = randomInt(1, Math.min(range.max, 5));
  r = randomInt(1, Math.min(range.max, 5));
  q = randomInt(-range.max, range.max);
  s = randomInt(-range.max, range.max);
  if (q === 0) q = 1;
  if (s === 0) s = 1;
  const a = p * r;
  const b = p * s + q * r;
  const c = q * s;
  res.json({
    id: `polyfactor-${Date.now()}-${Math.random()}`,
    a, b, c,
    factors: { p, q, r, s },
    display: formatPoly([c, b, a]),
  });
});

app.post('/polyfactor-api/check', (req, res) => {
  const { a, b, c, userP, userQ, userR, userS } = req.body || {};
  // Check: (userP*x + userQ)(userR*x + userS) expands to ax² + bx + c
  const ua = Number(userP) * Number(userR);
  const ub = Number(userP) * Number(userS) + Number(userQ) * Number(userR);
  const uc = Number(userQ) * Number(userS);
  const correct = ua === Number(a) && ub === Number(b) && uc === Number(c);
  res.json({ correct, message: correct ? 'Correct' : 'Incorrect' });
});

/* ── Number Factorization (Prime) ─────────────────── */
function primeRange(difficulty) {
  if (difficulty === 'easy') return { min: 2, max: 100 };
  if (difficulty === 'medium') return { min: 2, max: 300 };
  return { min: 2, max: 1000 };
}
function primeFactors(n) {
  const factors = [];
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) { factors.push(d); n /= d; }
    d++;
  }
  if (n > 1) factors.push(n);
  return factors;
}

app.get('/primefactor-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = primeRange(difficulty);
  let n = randomInt(range.min, range.max);
  // Never give a prime number — ensure at least 2 prime factors
  while (primeFactors(n).length < 2) n = randomInt(range.min, range.max);
  res.json({
    id: `prime-${Date.now()}-${Math.random()}`,
    number: n,
    factors: primeFactors(n),
  });
});

app.post('/primefactor-api/check', (req, res) => {
  const { number, userFactors } = req.body || {};
  const correct = primeFactors(Number(number));
  const userSorted = (userFactors || []).map(Number).sort((a, b) => a - b);
  const isCorrect = correct.length === userSorted.length && correct.every((f, i) => f === userSorted[i]);
  res.json({ correct: isCorrect, correctFactors: correct, message: isCorrect ? 'Correct' : 'Incorrect' });
});

/* ── Quadratic Formula ────────────────────────────── */
function qfRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 10 };
  if (difficulty === 'medium') return { min: 1, max: 20 };
  return { min: 1, max: 30 };
}

app.get('/qformula-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = qfRange(difficulty);
  let a, b, c, disc;
  if (difficulty === 'easy') {
    // Guarantee integer roots: build from roots r1, r2 -> a(x-r1)(x-r2)
    const r1 = randomInt(-range.max, range.max);
    const r2 = randomInt(-range.max, range.max);
    a = 1;
    b = -(r1 + r2);
    c = r1 * r2;
  } else {
    a = randomInt(1, Math.min(range.max, 5));
    b = randomInt(-range.max, range.max);
    if (difficulty === 'medium') {
      // Guarantee real roots (disc >= 0)
      do {
        b = randomInt(-range.max, range.max);
        c = randomInt(-range.max, range.max);
      } while (b * b - 4 * a * c < 0);
    } else {
      c = randomInt(-range.max, range.max);
    }
  }
  disc = b * b - 4 * a * c;
  const roots = {};
  if (disc > 0) {
    roots.type = 'real_distinct';
    roots.r1 = parseFloat(((-b + Math.sqrt(disc)) / (2 * a)).toFixed(2));
    roots.r2 = parseFloat(((-b - Math.sqrt(disc)) / (2 * a)).toFixed(2));
  } else if (disc === 0) {
    roots.type = 'real_equal';
    roots.r1 = parseFloat((-b / (2 * a)).toFixed(2));
  } else {
    roots.type = 'complex';
    roots.realPart = parseFloat((-b / (2 * a)).toFixed(2));
    roots.imagPart = parseFloat((Math.sqrt(-disc) / (2 * a)).toFixed(2));
  }
  res.json({ id: `qf-${Date.now()}-${Math.random()}`, a, b, c, disc, roots });
});

app.post('/qformula-api/check', (req, res) => {
  const { a, b, c, userR1, userR2, userType } = req.body || {};
  const A = Number(a), B = Number(b), C = Number(c);
  const disc = B * B - 4 * A * C;
  let correct = false;
  const roots = {};
  if (disc > 0) {
    roots.type = 'real_distinct';
    roots.r1 = parseFloat(((-B + Math.sqrt(disc)) / (2 * A)).toFixed(2));
    roots.r2 = parseFloat(((-B - Math.sqrt(disc)) / (2 * A)).toFixed(2));
    const u1 = parseFloat(Number(userR1).toFixed(2));
    const u2 = parseFloat(Number(userR2).toFixed(2));
    correct = (Math.abs(u1 - roots.r1) < 0.05 && Math.abs(u2 - roots.r2) < 0.05) ||
              (Math.abs(u1 - roots.r2) < 0.05 && Math.abs(u2 - roots.r1) < 0.05);
  } else if (disc === 0) {
    roots.type = 'real_equal';
    roots.r1 = parseFloat((-B / (2 * A)).toFixed(2));
    correct = Math.abs(parseFloat(Number(userR1).toFixed(2)) - roots.r1) < 0.05;
  } else {
    roots.type = 'complex';
    roots.realPart = parseFloat((-B / (2 * A)).toFixed(2));
    roots.imagPart = parseFloat((Math.sqrt(-disc) / (2 * A)).toFixed(2));
    correct = Math.abs(Number(userR1) - roots.realPart) < 0.05 && Math.abs(Number(userR2) - roots.imagPart) < 0.05;
  }
  res.json({ correct, roots, message: correct ? 'Correct' : 'Incorrect' });
});

/* ── Simultaneous Equations (2×2 easy, 3×3 hard) ──── */
function simulRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 10 };
  return { min: 1, max: 15 };
}

app.get('/simul-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = simulRange(difficulty);
  const is2x2 = difficulty === 'easy';

  if (is2x2) {
    // 2×2: generate integer solutions, then build equations
    const x = randomInt(-range.max, range.max);
    const y = randomInt(-range.max, range.max);
    let a1 = randomInt(1, range.max), b1 = randomInt(1, range.max);
    let a2 = randomInt(1, range.max), b2 = randomInt(1, range.max);
    while (a1 * b2 === a2 * b1) { a2 = randomInt(1, range.max); b2 = randomInt(1, range.max); }
    if (Math.random() < 0.3) a1 = -a1;
    if (Math.random() < 0.3) b1 = -b1;
    if (Math.random() < 0.3) a2 = -a2;
    if (Math.random() < 0.3) b2 = -b2;
    const eqs = [
      { a: a1, b: b1, d: a1 * x + b1 * y },
      { a: a2, b: b2, d: a2 * x + b2 * y },
    ];
    res.json({
      id: `simul-${Date.now()}-${Math.random()}`,
      size: 2,
      eqs,
      solution: { x, y },
    });
  } else {
    // 3×3: generate integer solutions, then build equations
    const x = randomInt(-8, 8), y = randomInt(-8, 8), z = randomInt(-8, 8);
    let eqs;
    let attempts = 0;
    do {
      eqs = [];
      for (let i = 0; i < 3; i++) {
        let a = randomInt(1, Math.min(range.max, 10));
        let b = randomInt(1, Math.min(range.max, 10));
        let c = randomInt(1, Math.min(range.max, 10));
        if (Math.random() < 0.3) a = -a;
        if (Math.random() < 0.3) b = -b;
        if (Math.random() < 0.3) c = -c;
        eqs.push({ a, b, c, d: a * x + b * y + c * z });
      }
      const det = eqs[0].a * (eqs[1].b * eqs[2].c - eqs[1].c * eqs[2].b)
                - eqs[0].b * (eqs[1].a * eqs[2].c - eqs[1].c * eqs[2].a)
                + eqs[0].c * (eqs[1].a * eqs[2].b - eqs[1].b * eqs[2].a);
      if (det !== 0) break;
      attempts++;
    } while (attempts < 50);

    res.json({
      id: `simul-${Date.now()}-${Math.random()}`,
      size: 3,
      eqs,
      solution: { x, y, z },
    });
  }
});

app.post('/simul-api/check', (req, res) => {
  const { eqs, size, userX, userY, userZ } = req.body || {};
  const ux = Number(userX), uy = Number(userY), uz = Number(userZ || 0);
  let correct;
  if (Number(size) === 2) {
    correct = eqs.every(e => Math.abs(e.a * ux + e.b * uy - e.d) < 0.1);
  } else {
    correct = eqs.every(e => Math.abs(e.a * ux + e.b * uy + e.c * uz - e.d) < 0.1);
  }
  const solution = req.body.solution || {};
  res.json({ correct, solution, message: correct ? 'Correct' : 'Incorrect' });
});

function linearRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 5 };
  if (difficulty === 'medium') return { min: 1, max: 10 };
  return { min: 1, max: 15 };
}

/* ── Function Evaluation ──────────────────────────── */
app.get('/funceval-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = linearRange(difficulty);
  let formula, vars, answer;
  if (difficulty === 'easy') {
    const a = randomInt(1, range.max), b = randomInt(-range.max, range.max);
    const xVal = randomInt(-range.max, range.max);
    formula = `f(x) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}`;
    vars = { x: xVal };
    answer = parseFloat((a * xVal + b).toFixed(2));
  } else if (difficulty === 'medium') {
    const a = randomInt(1, range.max), b = randomInt(1, range.max), c = randomInt(-range.max, range.max);
    const xVal = randomInt(-10, 10), yVal = randomInt(-10, 10);
    formula = `f(x,y) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}y ${c >= 0 ? '+' : '−'} ${Math.abs(c)}`;
    vars = { x: xVal, y: yVal };
    answer = parseFloat((a * xVal + b * yVal + c).toFixed(2));
  } else {
    const a = randomInt(1, range.max), b = randomInt(1, range.max), cc = randomInt(1, range.max), d = randomInt(-range.max, range.max);
    const xVal = randomInt(-10, 10), yVal = randomInt(-10, 10), zVal = randomInt(-10, 10);
    formula = `f(x,y,z) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}y ${cc >= 0 ? '+' : '−'} ${Math.abs(cc)}z ${d >= 0 ? '+' : '−'} ${Math.abs(d)}`;
    vars = { x: xVal, y: yVal, z: zVal };
    answer = parseFloat((a * xVal + b * yVal + cc * zVal + d).toFixed(2));
  }
  res.json({ id: `func-${Date.now()}-${Math.random()}`, formula, vars, answer });
});

app.post('/funceval-api/check', (req, res) => {
  const { answer, userAnswer } = req.body || {};
  const correct = Math.abs(Number(userAnswer) - Number(answer)) < 0.05;
  res.json({ correct, correctAnswer: answer, message: correct ? 'Correct' : 'Incorrect' });
});

/* ── Line Equation (m and c from two points) ──────── */
app.get('/lineq-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = linearRange(difficulty);
  let x1, y1, x2, y2, m, c;
  // Ensure distinct x values and clean slope for easy
  if (difficulty === 'easy') {
    m = randomInt(-range.max, range.max);
    c = randomInt(-range.max, range.max);
    x1 = randomInt(-5, 5);
    x2 = randomInt(-5, 5);
    while (x2 === x1) x2 = randomInt(-5, 5);
    y1 = m * x1 + c;
    y2 = m * x2 + c;
  } else {
    x1 = randomInt(-range.max, range.max);
    y1 = randomInt(-range.max, range.max);
    x2 = randomInt(-range.max, range.max);
    while (x2 === x1) x2 = randomInt(-range.max, range.max);
    y2 = randomInt(-range.max, range.max);
    m = parseFloat(((y2 - y1) / (x2 - x1)).toFixed(2));
    c = parseFloat((y1 - m * x1).toFixed(2));
  }
  res.json({
    id: `lineq-${Date.now()}-${Math.random()}`,
    x1, y1, x2, y2, m, c,
  });
});

app.post('/lineq-api/check', (req, res) => {
  const { x1, y1, x2, y2, userM, userC } = req.body || {};
  const actualM = parseFloat(((Number(y2) - Number(y1)) / (Number(x2) - Number(x1))).toFixed(2));
  const actualC = parseFloat((Number(y1) - actualM * Number(x1)).toFixed(2));
  const correct = Math.abs(Number(userM) - actualM) < 0.05 && Math.abs(Number(userC) - actualC) < 0.05;
  res.json({ correct, m: actualM, c: actualC, message: correct ? 'Correct' : 'Incorrect' });
});

/* ── Basic Arithmetic (+, −, ×) ──────────────────── */
function arithRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 9 };
  if (difficulty === 'medium') return { min: 10, max: 99 };
  return { min: 100, max: 999 };
}

app.get('/basicarith-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = arithRange(difficulty);
  const ops = ['+', '−', '×'];
  const op = ops[randomInt(0, 2)];
  // Generate two numbers, each randomly positive or negative
  let a = randomInt(range.min, range.max);
  let b = randomInt(range.min, range.max);
  if (Math.random() < 0.4) a = -a;
  if (Math.random() < 0.4) b = -b;
  let answer;
  if (op === '+') answer = a + b;
  else if (op === '−') answer = a - b;
  else answer = a * b;
  // Build a readable prompt with proper sign handling
  const aStr = String(a);
  const bAbs = Math.abs(b);
  let prompt;
  if (op === '×') {
    prompt = `(${a}) × (${b})`;
  } else if (b < 0) {
    prompt = `${a} ${op} (${b})`;
  } else {
    prompt = `${a} ${op} ${b}`;
  }
  res.json({
    id: `arith-${Date.now()}-${Math.random()}`,
    a, b, op, prompt, answer,
  });
});

app.post('/basicarith-api/check', (req, res) => {
  const { a, b, op, answer } = req.body || {};
  let correctAnswer;
  if (op === '+') correctAnswer = Number(a) + Number(b);
  else if (op === '−') correctAnswer = Number(a) - Number(b);
  else correctAnswer = Number(a) * Number(b);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tenali app running on http://0.0.0.0:${PORT}`);
});
