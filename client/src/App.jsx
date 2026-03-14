import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:4000`;

function App() {
  const [digits, setDigits] = useState(1);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchQuestion = async (selectedDigits) => {
    setLoading(true);
    setFeedback('');
    setIsCorrect(null);
    setAnswer('');

    const response = await fetch(`${API_BASE}/api/question?digits=${selectedDigits}`);
    const data = await response.json();
    setQuestion(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestion(digits);
  }, [digits]);

  const checkAnswer = async () => {
    if (!question || answer === '') return;

    const response = await fetch(`${API_BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, answer: Number(answer) }),
    });

    const data = await response.json();
    setFeedback(data.correct ? data.message : `${data.message} The correct answer is ${data.correctAnswer}.`);
    setIsCorrect(data.correct);
  };

  return (
    <div className="app-shell">
      <div className="card">
        <h1>Aryabhata</h1>
        <p className="subtitle">Fun addition practice for kids</p>

        <div className="radio-group">
          {[1, 2, 3].map((value) => (
            <label key={value} className={`radio-pill ${digits === value ? 'active' : ''}`}>
              <input
                type="radio"
                name="digits"
                value={value}
                checked={digits === value}
                onChange={() => setDigits(value)}
              />
              {value}-digit
            </label>
          ))}
        </div>

        <div className="question-box">
          {loading || !question ? 'Loading...' : `${question.prompt} = ?`}
        </div>

        <input
          className="answer-input"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Type your answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <div className="button-row">
          <button onClick={checkAnswer}>Check Answer</button>
          <button className="secondary" onClick={() => fetchQuestion(digits)}>Next Question</button>
        </div>

        {feedback && (
          <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
