import { useState } from 'react'
import './App.css'

const TOTAL_QUESTIONS = 10

function App() {
  const [started, setStarted] = useState(false)
  const [question, setQuestion] = useState(null)
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [finished, setFinished] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)

  const loadQuestion = async () => {
    setLoading(true)
    setSelected('')
    setRevealed(false)
    setFeedback('')
    setIsCorrect(null)
    const res = await fetch('/api/question')
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
  }

  const startQuiz = async () => {
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    await loadQuestion()
  }

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (!selected) return
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: question.id, answerOption: selected }),
      })
      const data = await res.json()
      const nextScore = score + (data.correct ? 1 : 0)
      setScore(nextScore)
      setIsCorrect(data.correct)
      setFeedback(
        data.correct
          ? `Correct! ${data.correctAnswer}) ${data.correctAnswerText}`
          : `Wrong. Correct answer: ${data.correctAnswer}) ${data.correctAnswerText}`
      )
      setRevealed(true)
      return
    }

    if (questionNumber >= TOTAL_QUESTIONS) {
      setFinished(true)
      setQuestion(null)
      return
    }

    setQuestionNumber((n) => n + 1)
    await loadQuestion()
  }

  return (
    <div className="app-shell">
      <div className="card">
        <div className="top-bar">
          <div className="progress-pill">
            {started && !finished ? `Question ${questionNumber}/${TOTAL_QUESTIONS}` : `Quiz: ${TOTAL_QUESTIONS} questions`}
          </div>
          <div className="score-pill">Score: {score}</div>
        </div>

        <h1>Chitragupta</h1>
        <p className="subtitle">Random question quiz</p>

        {!started && !finished && (
          <div className="welcome-box">
            <p className="welcome-text">Welcome! The quiz is going to start.</p>
            <button onClick={startQuiz}>Start Quiz</button>
          </div>
        )}

        {started && !finished && (
          <>
            <div className="question-box">
              {loading || !question ? 'Loading question…' : question.question}
            </div>

            {question && (
              <div className="options-list">
                {question.options.map((option, idx) => {
                  const optionLetter = ['A', 'B', 'C', 'D'][idx]
                  return (
                    <label
                      key={optionLetter}
                      className={`option-card ${selected === optionLetter ? 'selected' : ''} ${revealed && question && optionLetter === selected ? 'answered' : ''}`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={optionLetter}
                        checked={selected === optionLetter}
                        onChange={() => !revealed && setSelected(optionLetter)}
                        disabled={revealed}
                      />
                      <span><strong>{optionLetter})</strong> {option}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}

            <div className="button-row">
              <button onClick={handleSubmitOrNext} disabled={loading || (!revealed && !selected)}>
                {revealed ? (questionNumber >= TOTAL_QUESTIONS ? 'Finish Quiz' : 'Next Question') : 'Submit'}
              </button>
            </div>
          </>
        )}

        {finished && (
          <div className="welcome-box">
            <p className="welcome-text">Quiz complete.</p>
            <p className="final-score">Final score: {score}/{TOTAL_QUESTIONS}</p>
            <button onClick={startQuiz}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
