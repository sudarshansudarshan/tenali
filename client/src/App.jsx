import { useEffect, useState, useRef } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_BASE_URL || '';

const DEFAULT_TOTAL = 20
const AUTO_ADVANCE_MS = 1500

/* ── Auto-advance Hook ──────────────────────────────── */
function useAutoAdvance(revealed, advanceFnRef) {
  useEffect(() => {
    if (!revealed) return
    const id = setTimeout(() => advanceFnRef.current(), AUTO_ADVANCE_MS)
    return () => clearTimeout(id)
  }, [revealed])
}

/* ── Timer Hook ──────────────────────────────────────── */
function useTimer() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const intervalRef = useRef(null)

  const start = () => {
    startRef.current = Date.now()
    setElapsed(0)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 250)
  }

  const stop = () => {
    clearInterval(intervalRef.current)
    return Math.floor((Date.now() - startRef.current) / 1000)
  }

  const reset = () => {
    clearInterval(intervalRef.current)
    setElapsed(0)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  return { elapsed, start, stop, reset }
}

/* ── Results Table ───────────────────────────────────── */
function ResultsTable({ results }) {
  if (!results || results.length === 0) return null
  const totalTime = results.reduce((sum, r) => sum + r.time, 0)
  const avgTime = (totalTime / results.length).toFixed(1)
  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Question</th>
            <th>Your Answer</th>
            <th>Result</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} className={r.correct ? 'row-correct' : 'row-wrong'}>
              <td>{i + 1}</td>
              <td>{r.question}</td>
              <td>{r.userAnswer}</td>
              <td>{r.correct ? '✓' : `✗ (${r.correctAnswer})`}</td>
              <td>{r.time}s</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="results-summary">
        Total time: {totalTime}s &middot; Average: {avgTime}s per question
      </div>
    </div>
  )
}

/* ── Numeric Keypad ─────────────────────────────────── */
function NumPad({ value, onChange, onSubmit, disabled }) {
  const press = (key) => {
    if (disabled) return
    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key === '±') {
      onChange(value.startsWith('-') ? value.slice(1) : '-' + value)
    } else {
      onChange(value + key)
    }
  }

  return (
    <div className="numpad">
      <div className="numpad-row">
        {['1', '2', '3'].map((k) => (
          <button key={k} type="button" className="numpad-key" onClick={() => press(k)} disabled={disabled}>{k}</button>
        ))}
      </div>
      <div className="numpad-row">
        {['4', '5', '6'].map((k) => (
          <button key={k} type="button" className="numpad-key" onClick={() => press(k)} disabled={disabled}>{k}</button>
        ))}
      </div>
      <div className="numpad-row">
        {['7', '8', '9'].map((k) => (
          <button key={k} type="button" className="numpad-key" onClick={() => press(k)} disabled={disabled}>{k}</button>
        ))}
      </div>
      <div className="numpad-row">
        <button type="button" className="numpad-key numpad-special" onClick={() => press('±')} disabled={disabled}>±</button>
        <button type="button" className="numpad-key" onClick={() => press('0')} disabled={disabled}>0</button>
        <button type="button" className="numpad-key numpad-special" onClick={() => press('⌫')} disabled={disabled}>⌫</button>
      </div>
    </div>
  )
}

/* ── App Shell ───────────────────────────────────────── */
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
        ) : mode === 'multiply' ? (
          <MultiplyApp onBack={() => setMode(null)} />
        ) : mode === 'spot' ? (
          <SpotApp onBack={() => setMode(null)} />
        ) : (
          <SqrtApp onBack={() => setMode(null)} />
        )}
      </div>
    </div>
  )
}

/* ── Home ────────────────────────────────────────────── */
function Home({ onSelect }) {
  const apps = [
    { key: 'gk', name: 'General Knowledge', subtitle: 'Chitragupta quiz', color: 'purple' },
    { key: 'addition', name: 'Addition', subtitle: '20-question addition practice', color: 'blue' },
    { key: 'quadratic', name: 'Quadratic', subtitle: 'Find y for y = ax² + bx + c', color: 'blue' },
    { key: 'multiply', name: 'Multiplication', subtitle: 'Practice any times table (1–10)', color: 'green' },
    { key: 'spot', name: 'Spot It', subtitle: 'Find the common object', color: 'purple' },
    { key: 'sqrt', name: 'Square Root', subtitle: 'Nearest-integer square root drill', color: 'green' },
  ]

  const totalSlots = 16
  const emptySlots = totalSlots - apps.length

  const gridRef = useRef(null)
  const [cols, setCols] = useState(4)

  useEffect(() => {
    const updateCols = () => {
      if (!gridRef.current) return
      const style = window.getComputedStyle(gridRef.current)
      const columns = style.getPropertyValue('grid-template-columns').split(' ').length
      setCols(columns)
    }
    updateCols()
    window.addEventListener('resize', updateCols)
    return () => window.removeEventListener('resize', updateCols)
  }, [])

  const rows = Math.ceil(totalSlots / cols)

  return (
    <>
      <h1>Tenali</h1>
      <p className="subtitle">Choose a learning game to begin</p>
      <div className="menu-grid" ref={gridRef}>
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
      <div className="grid-dimension">{rows} × {cols}</div>
    </>
  )
}

/* ── GK App ──────────────────────────────────────────── */
function GKApp({ onBack }) {
  const [question, setQuestion] = useState(null)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const loadQuestion = async () => {
    setLoading(true)
    setSelected('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    const res = await fetch(`${API}/gk-api/question`)
    const data = await res.json()
    setQuestion(data)
    setQuestionNumber((n) => n + 1)
    setLoading(false)
    timer.start()
  }

  useEffect(() => {
    loadQuestion()
  }, [])

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (!selected) return
      const timeTaken = timer.stop()
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
      setResults((prev) => [...prev, {
        question: question.question.length > 50 ? question.question.slice(0, 50) + '…' : question.question,
        userAnswer: selected,
        correctAnswer: `${data.correctAnswer}) ${data.correctAnswerText}`,
        correct: data.correct,
        time: timeTaken,
      }])
      setRevealed(true)
      return
    }

    await loadQuestion()
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => loadQuestion()
  useAutoAdvance(revealed, advanceRef)

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
      <div className="top-mini-row">
        {!loading && question && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
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
      {results.length > 0 && <ResultsTable results={results} />}
    </QuizLayout>
  )
}

/* ── Addition App ────────────────────────────────────── */
function AdditionApp({ onBack }) {
  const [digits, setDigits] = useState(1)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const fetchQuestion = async (selectedDigits = digits) => {
    setLoading(true)
    setFeedback('')
    setAnswer('')
    setRevealed(false)
    const res = await fetch(`${API}/addition-api/question?digits=${selectedDigits}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
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
  }, [started, finished, question, answer, revealed, score, questionNumber, digits, loading, totalQ])

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
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
      setResults((prev) => [...prev, {
        question: `${question.a} + ${question.b}`,
        userAnswer: answer,
        correctAnswer: data.correctAnswer,
        correct: data.correct,
        time: timeTaken,
      }])
      setRevealed(true)
      return
    }

    if (questionNumber >= totalQ) {
      setFinished(true)
      setQuestion(null)
      timer.reset()
      return
    }

    setQuestionNumber((n) => n + 1)
    await fetchQuestion(digits)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => handleSubmitOrNext()
  useAutoAdvance(revealed, advanceRef)

  return (
    <QuizLayout title="Addition" subtitle="Choose a level and solve addition questions" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {[1, 2, 3].map((value) => (
          <label key={value} className={`radio-pill ${digits === value ? 'active' : ''}`}>
            <input type="radio" checked={digits === value} onChange={() => setDigits(value)} disabled={started && !finished} />
            {value === 1 ? 'One digit' : value === 2 ? 'Two digits' : 'Three digits'}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">The quiz is ready to begin.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder={String(DEFAULT_TOTAL)} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="text" value={answer} onChange={(e) => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" />
        <NumPad value={answer} onChange={(v) => !revealed && setAnswer(v)} disabled={revealed} />
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button></div>
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={startQuiz}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Quadratic App ───────────────────────────────────── */
function QuadraticApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const fetchQuestion = async (selectedDifficulty = difficulty) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    const res = await fetch(`${API}/quadratic-api/question?difficulty=${selectedDifficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
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
  }, [started, finished, question, answer, revealed, questionNumber, loading, totalQ])

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
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
      setResults((prev) => [...prev, {
        question: `y = ${a}x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)}, x=${x}`,
        userAnswer: answer,
        correctAnswer: data.correctAnswer,
        correct: data.correct,
        time: timeTaken,
      }])
      setRevealed(true)
      return
    }

    if (questionNumber >= totalQ) {
      setFinished(true)
      setQuestion(null)
      timer.reset()
      return
    }

    setQuestionNumber((n) => n + 1)
    await fetchQuestion()
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => handleSubmitOrNext()
  useAutoAdvance(revealed, advanceRef)

  return (
    <QuizLayout title="Quadratic" subtitle="Given x, find y = ax² + bx + c" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map((level) => (
          <label key={level} className={`radio-pill ${difficulty === level ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === level} onChange={() => setDifficulty(level)} disabled={started && !finished} />
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Quadratic substitution practice.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder={String(DEFAULT_TOTAL)} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        <div className="question-box">
          {loading || !question ? 'Loading question…' : (
            <>
              <span className="given">x = {question.x}</span>
              <span className="equation">y = {question.a === 1 ? '' : question.a === -1 ? '−' : question.a}x² {question.b >= 0 ? '+' : '−'} {Math.abs(question.b) === 1 ? '' : Math.abs(question.b)}x {question.c >= 0 ? '+' : '−'} {Math.abs(question.c)}</span>
            </>
          )}
        </div>
        <input className="answer-input" type="text" value={answer} onChange={(e) => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="y = ?" />
        <NumPad value={answer} onChange={(v) => !revealed && setAnswer(v)} disabled={revealed} />
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button></div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={startQuiz}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Multiplication App ─────────────────────────────── */
function MultiplyApp({ onBack }) {
  const [selectedTables, setSelectedTables] = useState([])
  const [numQuestions, setNumQuestions] = useState('')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const [questionPool, setQuestionPool] = useState([])
  const timer = useTimer()

  const maxQuestions = selectedTables.length * 10

  const toggleTable = (num) => {
    setSelectedTables((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    )
  }

  const buildPool = (tables) => {
    const pool = []
    tables.forEach((t) => {
      for (let m = 1; m <= 10; m++) {
        pool.push({ table: t, multiplier: m })
      }
    })
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool
  }

  const nextFromPool = (pool, index) => {
    const q = pool[index]
    setQuestion({ table: q.table, multiplier: q.multiplier, prompt: `${q.table} × ${q.multiplier}` })
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    setLoading(false)
    timer.start()
  }

  const startQuiz = () => {
    if (selectedTables.length === 0) return
    const pool = buildPool(selectedTables)
    const count = numQuestions !== '' ? Math.min(Number(numQuestions), pool.length) : pool.length
    const trimmedPool = pool.slice(0, count)
    setQuestionPool(trimmedPool)
    setTotalQuestions(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    nextFromPool(trimmedPool, 0)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      if (!started && selectedTables.length > 0) {
        startQuiz()
      } else if (started && !finished) {
        handleSubmitOrNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, questionNumber, loading, selectedTables, questionPool])

  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
      const correctAnswer = question.table * question.multiplier
      const correct = Number(answer) === correctAnswer
      if (correct) setScore((s) => s + 1)
      const reasoning = `${question.table} × ${question.multiplier} = ${correctAnswer}`
      setFeedback(correct
        ? `Correct! ${reasoning}`
        : `Incorrect. ${reasoning}`)
      setResults((prev) => [...prev, {
        question: question.prompt,
        userAnswer: answer,
        correctAnswer,
        correct,
        time: timeTaken,
      }])
      setRevealed(true)
      return
    }

    if (questionNumber >= totalQuestions) {
      setFinished(true)
      setQuestion(null)
      timer.reset()
      return
    }

    const nextIdx = questionNumber
    setQuestionNumber((n) => n + 1)
    nextFromPool(questionPool, nextIdx)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => handleSubmitOrNext()
  useAutoAdvance(revealed, advanceRef)

  const tablesLabel = selectedTables.sort((a, b) => a - b).join(', ')

  return (
    <QuizLayout title="Multiplication" subtitle="Practice your times tables" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      {!started && !finished && (
        <div className="welcome-box">
          <p className="welcome-text">Select the tables you want to practice</p>
          <div className="checkbox-group">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <label key={num} className={`checkbox-pill ${selectedTables.includes(num) ? 'active' : ''}`}>
                <input type="checkbox" checked={selectedTables.includes(num)} onChange={() => toggleTable(num)} />
                {num}
              </label>
            ))}
          </div>
          {selectedTables.length > 0 && (
            <div className="question-count-row">
              <label className="question-count-label">How many questions?</label>
              <input
                className="answer-input question-count-input"
                type="text"
                value={numQuestions}
                onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }}
                placeholder={`All ${maxQuestions}`}
              />
            </div>
          )}
          <div className="button-row">
            <button onClick={startQuiz} disabled={selectedTables.length === 0}>
              Start Quiz ({numQuestions && Number(numQuestions) > 0 ? Math.min(Number(numQuestions), maxQuestions) : maxQuestions} questions)
            </button>
          </div>
        </div>
      )}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQuestions} — Tables: {tablesLabel}</div>
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="text" value={answer} onChange={(e) => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" />
        <NumPad value={answer} onChange={(v) => !revealed && setAnswer(v)} disabled={revealed} />
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (questionNumber >= totalQuestions ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button></div>
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete — Tables: {tablesLabel}</p>
        <p className="final-score">Final score: {score}/{totalQuestions}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false); setSelectedTables([]); setQuestionPool([]); setNumQuestions('') }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Spot It App ────────────────────────────────────── */
const SPOT_SYMBOLS = [
  '🍎','🍊','🍋','🍇','🍉','🍓','🍒','🥝','🍌','🍑',
  '🌟','🌙','☀️','⚡','🔥','💧','🌈','❄️','🍀','🌸',
  '🐶','🐱','🐸','🐵','🐔','🐙','🦋','🐝','🐢','🐬',
  '⚽','🏀','🎾','🎯','🎲','🎸','🎨','📚','✏️','🔔',
]

function SpotApp({ onBack }) {
  const [count, setCount] = useState('5')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [round, setRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(10)
  const [numRoundsInput, setNumRoundsInput] = useState('10')
  const [score, setScore] = useState(0)
  const [leftItems, setLeftItems] = useState([])
  const [rightItems, setRightItems] = useState([])
  const [commonSymbol, setCommonSymbol] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const generateRound = (n) => {
    const pool = [...SPOT_SYMBOLS].sort(() => Math.random() - 0.5)
    const common = pool[0]
    const leftOthers = pool.slice(1, n)
    const rightOthers = pool.slice(n, 2 * n - 1)

    const shuffle = (arr) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    setLeftItems(shuffle([common, ...leftOthers]))
    setRightItems(shuffle([common, ...rightOthers]))
    setCommonSymbol(common)
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    timer.start()
  }

  const startGame = () => {
    const n = Math.max(3, Math.min(Number(count) || 5, 15))
    setCount(String(n))
    const rounds = numRoundsInput !== '' && Number(numRoundsInput) > 0 ? Number(numRoundsInput) : 10
    setTotalRounds(rounds)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setRound(1)
    setResults([])
    generateRound(n)
  }

  const handlePick = (symbol) => {
    if (revealed) return
    const timeTaken = timer.stop()
    const correct = symbol === commonSymbol
    if (correct) setScore((s) => s + 1)
    setIsCorrect(correct)
    setFeedback(correct
      ? `Correct! ${commonSymbol} was the match.`
      : `Wrong — you picked ${symbol}. The match was ${commonSymbol}.`)
    setResults((prev) => [...prev, {
      question: `Round ${round}`,
      userAnswer: symbol,
      correctAnswer: commonSymbol,
      correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => {
    if (round >= totalRounds) {
      setFinished(true)
      timer.reset()
      return
    }
    setRound((r) => r + 1)
    generateRound(Number(count))
  }
  useAutoAdvance(revealed, advanceRef)

  return (
    <QuizLayout title="Spot It" subtitle="Find the common object in both panels" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      {!started && !finished && (
        <div className="welcome-box">
          <p className="welcome-text">Two panels, one match. Tap the common object!</p>
          <div className="question-count-row">
            <label className="question-count-label">Objects per panel</label>
            <input className="answer-input question-count-input" type="text" value={count}
              onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setCount(v) }}
              placeholder="5" />
          </div>
          <div className="question-count-row">
            <label className="question-count-label">How many rounds?</label>
            <input className="answer-input question-count-input" type="text" value={numRoundsInput}
              onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumRoundsInput(v) }}
              placeholder="10" />
          </div>
          <div className="button-row">
            <button onClick={startGame}>Start Game</button>
          </div>
        </div>
      )}
      {started && !finished && <>
        <div className="progress-pill center">Round {round}/{totalRounds}</div>
        <div className="spot-panels">
          <div className="spot-panel">
            {leftItems.map((sym, i) => (
              <button key={i} type="button" className={`spot-item ${revealed && sym === commonSymbol ? 'spot-match' : ''} ${revealed && sym !== commonSymbol ? 'spot-dim' : ''}`}
                onClick={() => handlePick(sym)} disabled={revealed}>
                {sym}
              </button>
            ))}
          </div>
          <div className="spot-divider"></div>
          <div className="spot-panel">
            {rightItems.map((sym, i) => (
              <button key={i} type="button" className={`spot-item ${revealed && sym === commonSymbol ? 'spot-match' : ''} ${revealed && sym !== commonSymbol ? 'spot-dim' : ''}`}
                onClick={() => handlePick(sym)} disabled={revealed}>
                {sym}
              </button>
            ))}
          </div>
        </div>
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Game complete!</p>
        <p className="final-score">Score: {score}/{totalRounds}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
      {started && !finished && results.length > 0 && <ResultsTable results={results} />}
    </QuizLayout>
  )
}

/* ── Square Root App ─────────────────────────────────── */
function SqrtApp({ onBack }) {
  const [numQuestions, setNumQuestions] = useState('')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const fetchQuestion = async (step) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    const res = await fetch(`${API}/sqrt-api/question?step=${step}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : 0
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    await fetchQuestion(1)
  }

  const unlimited = totalQ === 0

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !started || finished) return
      event.preventDefault()
      handleSubmitOrNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, questionNumber, loading, totalQ])

  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
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
      setResults((prev) => [...prev, {
        question: `√${question.q}`,
        userAnswer: answer,
        correctAnswer: `${data.floorAnswer} or ${data.ceilAnswer}`,
        correct: data.correct,
        time: timeTaken,
      }])
      setRevealed(true)
      return
    }

    if (!unlimited && questionNumber >= totalQ) {
      setFinished(true)
      setQuestion(null)
      timer.reset()
      return
    }

    const next = questionNumber + 1
    setQuestionNumber(next)
    await fetchQuestion(next)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => handleSubmitOrNext()
  useAutoAdvance(revealed, advanceRef)

  return (
    <QuizLayout title="Square Root" subtitle="Floor or ceiling is accepted" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">The square-root drill.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder="Unlimited" />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Drill</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}{!unlimited ? `/${totalQ}` : ''}</div>
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="text" value={answer} onChange={(e) => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" />
        <NumPad value={answer} onChange={(v) => !revealed && setAnswer(v)} disabled={revealed} />
        {feedback && <div className={`feedback ${feedback.startsWith('Correct') ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (!unlimited && questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button></div>
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false); setNumQuestions('') }}>Play Again</button>
      </div>}
      {!finished && results.length > 0 && <ResultsTable results={results} />}
    </QuizLayout>
  )
}

/* ── Quiz Layout ─────────────────────────────────────── */
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
