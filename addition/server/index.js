const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4002;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/question', (req, res) => {
  const digits = Number(req.query.digits || 1);
  const safeDigits = [1, 2, 3].includes(digits) ? digits : 1;
  const range = digitRange(safeDigits);
  const a = randomInt(range.min, range.max);
  const b = randomInt(range.min, range.max);
  res.json({ id: `${safeDigits}-${Date.now()}-${Math.random()}`, digits: safeDigits, a, b, prompt: `${a} + ${b}`, answer: a + b });
});

app.post('/api/check', (req, res) => {
  const { a, b, answer } = req.body || {};
  const correctAnswer = Number(a) + Number(b);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aryabhata Addition server running on http://0.0.0.0:${PORT}`);
});
