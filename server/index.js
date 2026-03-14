const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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

  res.json({
    digits: safeDigits,
    a,
    b,
    prompt: `${a} + ${b}`,
    answer: a + b,
  });
});

app.post('/api/check', (req, res) => {
  const { a, b, answer } = req.body || {};
  const numericA = Number(a);
  const numericB = Number(b);
  const numericAnswer = Number(answer);
  const correctAnswer = numericA + numericB;
  const correct = numericAnswer === correctAnswer;

  res.json({
    correct,
    correctAnswer,
    message: correct ? 'Correct! 🎉' : 'Try again 🙂',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aryabhata server running on http://0.0.0.0:${PORT}`);
});
