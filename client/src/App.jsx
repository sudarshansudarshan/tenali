import { useEffect, useState } from 'react'
import './App.css'

const TOTAL_ADDITION = 20
const apiBase = (port) => `http://${window.location.hostname}:${port}/api`

function App() {
  const [mode, setMode] = useState(null)

  return (
    <div className="app-shell">
      <div className="card">
        {!mode ? (
          <Home onSelect={setMode} />
        ) : mode === 'gk' ? (
          <GKApp onBack={() => setMode(null)} />
        ) : mode === 'addition' ? (
          <AdditionApp onBack={() => setMode(null)} />
        ) : (
          <SqrtApp onBack={() => setMode(null)} />
        )}
      </div>
    </div>
  )
}

function Home({ onSelect }) {
  const apps = [
    { key: 'gk', name: 'General Knowledge', subtitle: 'Chitragupta quiz', color: 'purple' },
    { key: 'addition', name: 'Addition', subtitle: '20-question addition practice', color: 'blue' },
    { key: 'sqrt', name: 'Square Root', subtitle: 'Nearest-integer square root drill', color: 'green' },
  ]

  return (
    <>
      <h1>Tenali</h1>
      <p className="subtitle">Choose a learning game to begin</p>
      <div className="menu-grid">
        {apps.map((app) => (
          <button key={app.key} className={`menu-card ${app.color}`} onClick={() => onSelect(app.key)}>
            <span className="menu-title">{app.name}</span>
            <span className="menu-subtitle">{app.subtitle}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function GKApp({ onBack }) {
  const [question, setQuestion] = useState(null)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadQuestion = async () => {
    setLoading(true)
    setSelected('')
    setFeedback('')
    setIsCorrect(null)
    const res = await fetch(`${apiBase(4001)}/question`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
  }

  useEffect(() => {
    loadQuestion()
  }, [])

  const submit = async () => {
    if (!question || !selected) return
    const res = await fetch(`${apiBase(4001)}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answerOption: selected }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    setFeedback(data.correct ? data.message : `${data.message} Correct answer: ${data.correctAnswer}) ${data.correctAnswerText}`)
  }

  return (
    <QuizLayout title="General Knowledge" subtitle="Random question picker" onBack={onBack}>
      <div className="question-box">{loading || !question ? 'Loading question…' : question.question}</div>
      {question && (
        <div className="options-list">
          {question.options.map((option, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx]
            return (
              <label key={letter} className={`option-card ${selected === letter ? 'selected' : ''}`}>
                <input type="radio" name="gk" checked={selected === letter} onChange={() => setSelected(letter)} />
                <span><strong>{letter})</strong> {option}</span>
              </label>
            )
          })}
        </div>
      )}
      {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
      <div className="button-row">
        <button onClick={submit} disabled={!selected}>Submit</button>
        <button className="secondary" onClick={loadQuestion}>Next Question</button>
      </div>
    </QuizLayout>
  )
}

function AdditionApp({ onBack }) {
  const [digits, setDigits] = useState(1)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchQuestion = async (selectedDigits = digits) => {
    setLoading(true)
    setFeedback('')
    setAnswer('')
    const res = await fetch(`${apiBase(4002)}/question?digits=${selectedDigits}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
  }

  const startQuiz = async () => {
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    await fetchQuestion(digits)
  }

  const submitAnswer = async () => {
    if (!question || answer === '') return
    const res = await fetch(`${apiBase(4002)}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, answer: Number(answer) }),
    })
    const data = await res.json()
    const newScore = score + (data.correct ? 1 : 0)
    setScore(newScore)
    setFeedback(data.correct ? 'Correct' : `Incorrect. Right answer: ${data.correctAnswer}`)

    setTimeout(async () => {
      if (questionNumber >= TOTAL_ADDITION) {
        setFinished(true)
        setQuestion(null)
        return
      }
      setQuestionNumber((n) => n + 1)
      await fetchQuestion(digits)
    }, 700)
  }

  return (
    <QuizLayout title="Addition" subtitle="Choose a level and solve 20 addition questions" onBack={onBack}>
      <div className="top-mini-row"><div className="score-pill">Score: {score}</div></div>
      <div className="radio-group">
        {[1, 2, 3].map((value) => (
          <label key={value} className={`radio-pill ${digits === value ? 'active' : ''}`}>
            <input type="radio" checked={digits === value} onChange={() => setDigits(value)} disabled={started && !finished} />
            {value === 1 ? 'One digit' : value === 2 ? 'Two digits' : 'Three digits'}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box"><p className="welcome-text">The quiz is ready to begin.</p><button onClick={startQuiz}>Start Quiz</button></div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{TOTAL_ADDITION}</div>
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="number" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer" />
        <div className="button-row"><button onClick={submitAnswer} disabled={answer === '' || loading}>Submit</button></div>
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
      </>}
      {finished && <div className="welcome-box"><p className="welcome-text">Quiz complete.</p><p className="final-score">Final score: {score}/{TOTAL_ADDITION}</p><button onClick={startQuiz}>Play Again</button></div>}
    </QuizLayout>
  )
}

function SqrtApp({ onBack }) {
  const [started, setStarted] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const fetchQuestion = async (step) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    const res = await fetch(`${apiBase(4003)}/question?step=${step}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
  }

  const startQuiz = async () => {
    setStarted(true)
    setScore(0)
    setQuestionNumber(1)
    await fetchQuestion(1)
  }

  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) {
      if (answer === '') return
      const res = await fetch(`${apiBase(4003)}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: question.q, answer: Number(answer) }),
      })
      const data = await res.json()
      if (data.correct) setScore((s) => s + 1)
      setFeedback(data.correct ? `Correct ✅ √${question.q} ≈ ${data.sqrtRounded}` : `Incorrect. √${question.q} ≈ ${data.sqrtRounded}, so acceptable answers are ${data.floorAnswer} or ${data.ceilAnswer}.`)
      setRevealed(true)
      return
    }
    const next = questionNumber + 1
    setQuestionNumber(next)
    await fetchQuestion(next)
  }

  return (
    <QuizLayout title="Square Root" subtitle="Floor or ceiling is accepted" onBack={onBack}>
      <div className="top-mini-row"><div className="score-pill">Score: {score}</div></div>
      {!started && <div className="welcome-box"><p className="welcome-text">The square-root drill will keep going until you stop.</p><button onClick={startQuiz}>Start Drill</button></div>}
      {started && <>
        <div className="progress-pill center">Question {questionNumber}</div>
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="number" inputMode="numeric" value={answer} onChange={(e) => !revealed && setAnswer(e.target.value)} disabled={revealed} placeholder="Type your answer" />
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? 'Next Question' : 'Submit'}</button></div>
      </>}
    </QuizLayout>
  )
}

function QuizLayout({ title, subtitle, onBack, children }) {
  return (
    <>
      <div className="header-row">
        <button className="back-button" onClick={onBack}>← Home</button>
      </div>
      <h1>{title}</h1>
      <p className="subtitle">{subtitle}</p>
      {children}
    </>
  )
}

export default App
