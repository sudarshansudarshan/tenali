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

app.get('/gk-api/question', (_req, res) => {
  if (!questions.length) {
    return res.status(500).json({ error: 'No questions found' });
  }
  const q = questions[Math.floor(Math.random() * questions.length)];
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

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tenali app running on http://0.0.0.0:${PORT}`);
});
