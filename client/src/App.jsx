import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_BASE_URL || '';

const TOTAL_ADDITION = 20
const TOTAL_QUADRATIC = 20

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
        ) : mode === 'quadratic' ? (
          <QuadraticApp onBack={() => setMode(null)} />
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
    { key: 'quadratic', name: 'Quadratic', subtitle: 'Find y for y = ax² + bx + c', color: 'blue' },
    { key: 'sqrt', name: 'Square Root', subtitle: 'Nearest-integer square root drill', color: 'green' },
  ]

  const totalSlots = 16
  const emptySlots = totalSlots - apps.length

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
        {Array.from({ length: emptySlots }, (_, i) => (
          <div key={`empty-${i}`} className="menu-card placeholder">
            <span className="menu-title placeholder-text">Coming soon</span>
          </div>
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
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const loadQuestion = async () => {
    setLoading(true)
    setSelected('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    const res = await fetch(`${API}/gk-api/question`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
  }

  useEffect(() => {
    loadQuestion()
  }, [])

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (!selected) return
      const res = await fetch(`${API}/gk-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: question.id, answerOption: selected }),
      })
      const data = await res.json()
      setIsCorrect(data.correct)
      if (data.correct) setScore((s) => s + 1)
      setFeedback(data.correct
        ? `Correct! The answer is ${data.correctAnswer}) ${data.correctAnswerText}`
        : `Incorrect. The correct answer is ${data.correctAnswer}) ${data.correctAnswerText}`)
      setRevealed(true)
      return
    }

    await loadQuestion()
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      handleSubmitOrNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [question, selected, revealed, loading])

  return (
    <QuizLayout title="General Knowledge" subtitle="Random question picker" onBack={onBack}>
      <div className="top-mini-row"><div className="score-pill">Score: {score}</div></div>
      <div className="question-box">{loading || !question ? 'Loading question…' : question.question}</div>
      {question && (
        <div className="options-list">
          {question.options.map((option, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx]
            return (
              <label key={letter} className={`option-card ${selected === letter ? 'selected' : ''}`}>
                <input type="radio" name="gk" checked={selected === letter} onChange={() => !revealed && setSelected(letter)} disabled={revealed} />
                <span><strong>{letter})</strong> {option}</span>
              </label>
            )
          })}
        </div>
      )}
      {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
      <div className="button-row">
        <button onClick={handleSubmitOrNext} disabled={loading || (!revealed && !selected)}>{revealed ? 'Next Question' : 'Submit'}</button>
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
  const [revealed, setRevealed] = useState(false)

  const fetchQuestion = async (selectedDigits = digits) => {
    setLoading(true)
    setFeedback('')
    setAnswer('')
    setRevealed(false)
    const res = await fetch(`${API}/addition-api/question?digits=${selectedDigits}`)
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !started || finished) return
      event.preventDefault()
      handleSubmitOrNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, score, questionNumber, digits, loading])

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (answer === '') return
      const res = await fetch(`${API}/addition-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: question.a, b: question.b, answer: Number(answer) }),
      })
      const data = await res.json()
      const newScore = score + (data.correct ? 1 : 0)
      setScore(newScore)
      const reasoning = `${question.a} + ${question.b} = ${data.correctAnswer}`
      setFeedback(data.correct
        ? `Correct! ${reasoning}`
        : `Incorrect. ${reasoning}`)
      setRevealed(true)
      return
    }

    if (questionNumber >= TOTAL_ADDITION) {
      setFinished(true)
      setQuestion(null)
      return
    }

    setQuestionNumber((n) => n + 1)
    await fetchQuestion(digits)
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
        <input className="answer-input" type="number" inputMode="numeric" value={answer} onChange={(e) => !revealed && setAnswer(e.target.value)} disabled={revealed} placeholder="Type your answer" />
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (questionNumber >= TOTAL_ADDITION ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button></div>
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
      </>}
      {finished && <div className="welcome-box"><p className="welcome-text">Quiz complete.</p><p className="final-score">Final score: {score}/{TOTAL_ADDITION}</p><button onClick={startQuiz}>Play Again</button></div>}
    </QuizLayout>
  )
}


function QuadraticApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const fetchQuestion = async (selectedDifficulty = difficulty) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    const res = await fetch(`${API}/quadratic-api/question?difficulty=${selectedDifficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
  }

  const startQuiz = async () => {
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    await fetchQuestion(difficulty)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !started || finished) return
      event.preventDefault()
      handleSubmitOrNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, questionNumber, loading])

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (answer === '') return
      const res = await fetch(`${API}/quadratic-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: question.a, b: question.b, c: question.c, x: question.x, answer: Number(answer) }),
      })
      const data = await res.json()
      if (data.correct) setScore((s) => s + 1)
      const { a, b, c, x } = question
      const xSq = x * x
      const termA = a * xSq
      const termB = b * x
      const sign = (v) => v >= 0 ? `+ ${v}` : `− ${Math.abs(v)}`
      const reasoning = `y = ${a}(${x})² ${sign(b)}(${x}) ${sign(c)}\n= ${a}(${xSq}) ${sign(termB)} ${sign(c)}\n= ${termA} ${sign(termB)} ${sign(c)}\n= ${data.correctAnswer}`
      setFeedback(data.correct
        ? `Correct!\n${reasoning}`
        : `Incorrect.\n${reasoning}`)
      setRevealed(true)
      return
    }

    if (questionNumber >= TOTAL_QUADRATIC) {
      setFinished(true)
      setQuestion(null)
      return
    }

    setQuestionNumber((n) => n + 1)
    await fetchQuestion()
  }

  return (
    <QuizLayout title="Quadratic" subtitle="Given x, find y = ax² + bx + c" onBack={onBack}>
      <div className="top-mini-row"><div className="score-pill">Score: {score}</div></div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map((level) => (
          <label key={level} className={`radio-pill ${difficulty === level ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === level} onChange={() => setDifficulty(level)} disabled={started && !finished} />
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box"><p className="welcome-text">You will get 20 quadratic substitution questions.</p><button onClick={startQuiz}>Start Quiz</button></div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{TOTAL_QUADRATIC}</div>
        <div className="question-box">
          {loading || !question ? 'Loading question…' : (
            <>
              <span className="given">x = {question.x}</span>
              <span className="equation">y = {question.a}x² {question.b >= 0 ? '+' : '−'} {Math.abs(question.b)}x {question.c >= 0 ? '+' : '−'} {Math.abs(question.c)}</span>
            </>
          )}
        </div>
        <input className="answer-input" type="number" inputMode="numeric" value={answer} onChange={(e) => !revealed && setAnswer(e.target.value)} disabled={revealed} placeholder="y = ?" />
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (questionNumber >= TOTAL_QUADRATIC ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button></div>
      </>}
      {finished && <div className="welcome-box"><p className="welcome-text">Quiz complete.</p><p className="final-score">Final score: {score}/{TOTAL_QUADRATIC}</p><button onClick={startQuiz}>Play Again</button></div>}
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
    const res = await fetch(`${API}/sqrt-api/question?step=${step}`)
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !started) return
      event.preventDefault()
      handleSubmitOrNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, question, answer, revealed, questionNumber, loading])

  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) {
      if (answer === '') return
      const res = await fetch(`${API}/sqrt-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: question.q, answer: Number(answer) }),
      })
      const data = await res.json()
      if (data.correct) setScore((s) => s + 1)
      const reasoning = `√${question.q} = ${data.sqrtRounded}\n⌊${data.sqrtRounded}⌋ = ${data.floorAnswer}, ⌈${data.sqrtRounded}⌉ = ${data.ceilAnswer}`
      setFeedback(data.correct
        ? `Correct!\n${reasoning}`
        : `Incorrect.\n${reasoning}\nAcceptable answers: ${data.floorAnswer} or ${data.ceilAnswer}`)
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
