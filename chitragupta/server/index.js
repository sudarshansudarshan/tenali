const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4001;
const questionsDir = path.join(__dirname, '..', 'questions');
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

app.use(cors());
app.use(express.json());
app.use(express.static(clientDistPath));

function loadQuestions() {
  const files = fs.readdirSync(questionsDir).filter((file) => file.endsWith('.json'));
  return files.map((file) => {
    const fullPath = path.join(questionsDir, file);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  });
}

let questions = loadQuestions();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, questions: questions.length });
});

app.get('/api/question', (_req, res) => {
  if (!questions.length) {
    return res.status(500).json({ error: 'No questions found' });
  }
  const q = questions[Math.floor(Math.random() * questions.length)];
  res.json({
    id: q.id,
    question: q.question,
    options: q.options,
    genre: q.genre || 'mixed'
  });
});

app.post('/api/check', (req, res) => {
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
    message: correct ? 'Correct! 🎉' : 'Wrong ❌'
  });
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Chitragupta server running on http://0.0.0.0:${PORT}`);
});
