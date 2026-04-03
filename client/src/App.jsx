import { useEffect, useState, useRef } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_BASE_URL || '';

const DEFAULT_TOTAL = 20
const AUTO_ADVANCE_MS = 1500

/* ── Auto-advance Hook ──────────────────────────────── */
function useAutoAdvance(revealed, advanceFnRef, isCorrect) {
  useEffect(() => {
    if (!revealed || !isCorrect) return
    const id = setTimeout(() => advanceFnRef.current(), AUTO_ADVANCE_MS)
    return () => clearTimeout(id)
  }, [revealed, isCorrect])
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

/* ── Adaptive Tables App ────────────────────────────── */
/*
  Adaptation logic (rolling window of last WINDOW recent answers for current table):
  - avgTime < FAST_THRESH (3s) & accuracy ≥ 90%  → "mastered" → hide table, advance soon
  - avgTime < MEDIUM_THRESH (6s) & accuracy ≥ 70% → "comfortable" → hide table, keep drilling
  - otherwise → "learning" → show the reference table
  Advance to next table when mastered without the table shown for ADVANCE_COUNT answers.
*/
const WINDOW = 8                   // rolling window size
const FAST_THRESH = 3000           // ms — mastery speed
const MEDIUM_THRESH = 6000         // ms — comfortable speed
const ADVANCE_COUNT = 5            // consecutive mastered-without-table to advance

function AdaptiveTablesApp({ studentName }) {
  const storageKey = `tenali-tables-${studentName}`

  // Phases: 'setup' → 'playing' → 'finished'
  const [phase, setPhase] = useState('setup')
  const [currentTable, setCurrentTable] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (saved && saved.currentTable >= 2) return saved.currentTable
    } catch {}
    return 2
  })
  const [startTable, setStartTable] = useState(currentTable)

  // Quiz state
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [questionNum, setQuestionNum] = useState(0)
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [results, setResults] = useState([])

  // Adaptive state
  const [recentWindow, setRecentWindow] = useState([])   // {correct, timeMs}
  const [showTable, setShowTable] = useState(true)
  const [masteredWithout, setMasteredWithout] = useState(0) // consecutive mastered answers without table
  const [statusMsg, setStatusMsg] = useState('')

  const inputRef = useRef(null)
  const advanceFnRef = useRef(null)

  const save = (tbl) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ currentTable: tbl })) } catch {}
  }

  const generateQuestion = (tbl) => {
    const multiplier = Math.floor(Math.random() * 10) + 1
    return { table: tbl, multiplier, answer: tbl * multiplier }
  }

  const beginPractice = () => {
    const tbl = startTable
    setCurrentTable(tbl)
    save(tbl)
    setPhase('playing')
    setQuestionNum(0)
    setScore(0)
    setResults([])
    setRecentWindow([])
    setShowTable(true)
    setMasteredWithout(0)
    setStatusMsg('Learning — table shown')
    const q = generateQuestion(tbl)
    setQuestion(q)
    setAnswer('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    setStartTime(Date.now())
    setQuestionNum(1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const nextQuestion = (tbl) => {
    const table = tbl || currentTable
    const q = generateQuestion(table)
    setQuestion(q)
    setAnswer('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    setStartTime(Date.now())
    setQuestionNum(n => n + 1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  advanceFnRef.current = () => {
    nextQuestion()
  }

  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter key advances after wrong answers (auto-advance handles correct ones)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nextQuestion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, currentTable])

  // Evaluate the rolling window and decide adaptation
  const evaluate = (window) => {
    if (window.length < 3) return { level: 'learning', avgTime: Infinity, accuracy: 0 }
    const accuracy = window.filter(r => r.correct).length / window.length
    const avgTime = window.reduce((s, r) => s + r.timeMs, 0) / window.length
    if (avgTime < FAST_THRESH && accuracy >= 0.9) return { level: 'mastered', avgTime, accuracy }
    if (avgTime < MEDIUM_THRESH && accuracy >= 0.7) return { level: 'comfortable', avgTime, accuracy }
    return { level: 'learning', avgTime, accuracy }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (revealed || !question) return
    const userAns = parseInt(answer, 10)
    const correct = userAns === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)

    const speedLabel = elapsed < FAST_THRESH ? 'fast' : elapsed < MEDIUM_THRESH ? 'ok' : 'slow'
    const fb = correct
      ? `Correct! ${question.table} × ${question.multiplier} = ${question.answer} (${(elapsed / 1000).toFixed(1)}s — ${speedLabel})`
      : `${question.table} × ${question.multiplier} = ${question.answer} (you said ${userAns || '?'})`
    setFeedback(fb)

    setResults(r => [...r, {
      q: `${question.table} × ${question.multiplier}`,
      yourAnswer: answer || '?',
      correct: question.answer,
      isCorrect: correct,
      time: (elapsed / 1000).toFixed(1),
      table: question.table
    }])

    // Update rolling window
    const newWindow = [...recentWindow, { correct, timeMs: elapsed }].slice(-WINDOW)
    setRecentWindow(newWindow)

    // Evaluate and adapt
    const { level, avgTime, accuracy } = evaluate(newWindow)

    if (level === 'mastered' && !showTable) {
      // Already without table and mastered — count toward advancement
      const newCount = masteredWithout + 1
      setMasteredWithout(newCount)
      if (newCount >= ADVANCE_COUNT) {
        // Advance to next table!
        const nextTbl = currentTable + 1
        if (nextTbl <= 20) {
          setCurrentTable(nextTbl)
          save(nextTbl)
          setRecentWindow([])
          setShowTable(true)
          setMasteredWithout(0)
          setStatusMsg(`Great! Moving to ${nextTbl}× table`)
          // Next question will use the new table after state updates
          setTimeout(() => nextQuestion(nextTbl), AUTO_ADVANCE_MS)
          return // skip normal auto-advance
        } else {
          setPhase('finished')
          return
        }
      }
      setStatusMsg(`Mastered! (${newCount}/${ADVANCE_COUNT} to advance) — avg ${(avgTime / 1000).toFixed(1)}s`)
    } else if (level === 'mastered' && showTable) {
      // Mastered with table shown — hide the table
      setShowTable(false)
      setMasteredWithout(0)
      setStatusMsg(`Fast & accurate — table hidden! Prove it without help.`)
    } else if (level === 'comfortable') {
      if (showTable) {
        setShowTable(false)
        setStatusMsg(`Getting comfortable — table hidden. Avg ${(avgTime / 1000).toFixed(1)}s`)
      } else {
        setStatusMsg(`Comfortable — avg ${(avgTime / 1000).toFixed(1)}s, ${Math.round(accuracy * 100)}% correct`)
      }
      setMasteredWithout(0)
    } else {
      // Learning — show the table
      if (!showTable) {
        setShowTable(true)
        setStatusMsg(`Needs practice — table shown again`)
      } else {
        setStatusMsg(`Learning — keep practicing with the table`)
      }
      setMasteredWithout(0)
    }
  }

  // Render the reference table
  const renderTable = () => (
    <div className="ref-table">
      <div className="ref-table-title">{currentTable} × Table</div>
      <div className="ref-table-rows">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(m => (
          <div key={m} className="ref-table-row">
            <span>{currentTable} × {m}</span>
            <span>= {currentTable * m}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Setup screen: pick starting table ──
  if (phase === 'setup') {
    return (
      <div className="app-shell">
        <div className="card">
          <h1>{studentName}'s Tables</h1>
          <div className="welcome-box">
            <p className="welcome-text">Which table would you like to start from?</p>
            <div className="checkbox-group" style={{ marginBottom: '24px' }}>
              {Array.from({ length: 19 }, (_, i) => i + 2).map(n => (
                <label key={n} className={`checkbox-pill${startTable === n ? ' active' : ''}`}>
                  <input type="radio" name="startTable" checked={startTable === n}
                    onChange={() => setStartTable(n)} />
                  {n}×
                </label>
              ))}
            </div>
            <button onClick={beginPractice}>Start Practice</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Finished all tables ──
  if (phase === 'finished') {
    return (
      <div className="app-shell">
        <div className="card">
          <h1>Congratulations, {studentName}!</h1>
          <div className="welcome-box">
            <p className="welcome-text">You've mastered all tables up to 20×!</p>
            <div className="final-score">{score} correct out of {questionNum}</div>
            <button onClick={() => setPhase('setup')}>Start Over</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ──
  return (
    <div className="app-shell">
      <div className="card">
        <div className="header-row">
          <button className="back-button" onClick={() => setPhase('setup')}>← Change Table</button>
        </div>
        <h1>{studentName}'s Tables</h1>
        <div className="top-mini-row">
          <span className="score-pill">Score {score}</span>
          <span className="progress-pill">Q {questionNum}</span>
          <span className="timer-pill">{currentTable}× table</span>
        </div>
        {statusMsg && (
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--clr-text-soft)', margin: '4px 0 8px', fontWeight: 500 }}>
            {statusMsg}
          </p>
        )}

        <div className={showTable ? 'tables-layout' : ''}>
          {showTable && renderTable()}
          <div className="tables-quiz-area">
            {question && (
              <>
                <div className="question-box">
                  {question.table} × {question.multiplier} = ?
                </div>
                <form onSubmit={handleSubmit}>
                  <input
                    ref={inputRef}
                    className="answer-input"
                    type="text"
                    inputMode="numeric"
                    value={answer}
                    onChange={e => { if (/^-?\d*$/.test(e.target.value)) setAnswer(e.target.value) }}
                    placeholder="?"
                    disabled={revealed}
                    autoFocus
                  />
                  {!revealed && (
                    <div className="button-row">
                      <button type="submit" disabled={!answer}>Check</button>
                    </div>
                  )}
                </form>
                {feedback && (
                  <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>
                )}
                {revealed && (
                  <div className="button-row">
                    <button onClick={() => nextQuestion()}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── App Shell ───────────────────────────────────────── */
function App() {
  const [mode, setMode] = useState(null)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tenali-theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('tenali-theme', theme) } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // URL-based routing for student pages
  const pathname = window.location.pathname.replace(/\/$/, '').toLowerCase()
  if (pathname === '/taittiriya') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <AdaptiveTablesApp studentName="Taittiriya" />
      </>
    )
  }
  if (pathname === '/tatsavit') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <AdaptiveTablesApp studentName="Tatsavit" />
      </>
    )
  }
  if (pathname === '/intervalscheduling') {
    return <IntervalSchedulingApp />
  }
  if (pathname === '/extendedeuclid') {
    return <ExtendedEuclidApp />
  }

  const modeMap = {
    gk: GKApp, addition: AdditionApp, quadratic: QuadraticApp,
    multiply: MultiplyApp, vocab: VocabApp, spot: TwinHuntApp,
    sqrt: SqrtApp, polymul: PolyMulApp, polyfactor: PolyFactorApp,
    primefactor: PrimeFactorApp, qformula: QFormulaApp, simul: SimulApp,
    funceval: FuncEvalApp, lineq: LineEqApp, basicarith: BasicArithApp,
    custom: CustomApp,
  }
  const ActiveApp = mode ? modeMap[mode] : null

  return (
    <div className="app-shell">
      <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="card">
        {!mode ? (
          <Home onSelect={setMode} />
        ) : ActiveApp ? (
          <ActiveApp onBack={() => setMode(null)} />
        ) : (
          <Home onSelect={setMode} />
        )}
      </div>
    </div>
  )
}

/* ── Home ────────────────────────────────────────────── */
function Home({ onSelect }) {
  const allApps = [
    { key: 'gk', name: 'GK', subtitle: 'General Knowledge questions', color: 'purple' },
    { key: 'addition', name: 'Addition', subtitle: '20-question addition practice', color: 'blue' },
    { key: 'quadratic', name: 'Quadratic', subtitle: 'Find y for y = ax² + bx + c', color: 'blue' },
    { key: 'multiply', name: 'Multiplication', subtitle: 'Practice any times table (1–10)', color: 'green' },
    { key: 'vocab', name: 'Vocabulary', subtitle: 'Match words to definitions', color: 'blue' },
    { key: 'spot', name: 'Twin Hunt', subtitle: 'Find the common object', color: 'purple' },
    { key: 'sqrt', name: 'Square Root', subtitle: 'Nearest-integer square root drill', color: 'green' },
    { key: 'polymul', name: 'Poly Multiply', subtitle: 'Multiply two polynomials', color: 'blue' },
    { key: 'polyfactor', name: 'Poly Factor', subtitle: 'Factor a quadratic expression', color: 'green' },
    { key: 'primefactor', name: 'Prime Factors', subtitle: 'Break a number into primes', color: 'purple' },
    { key: 'qformula', name: 'Quadratics', subtitle: 'Find roots of ax² + bx + c = 0', color: 'blue' },
    { key: 'simul', name: 'Sim. Eq.', subtitle: '2×2 (easy) or 3×3 (hard)', color: 'purple' },
    { key: 'funceval', name: 'Functions', subtitle: 'Evaluate f(x), f(x,y), f(x,y,z)', color: 'blue' },
    { key: 'lineq', name: 'Line Equation', subtitle: 'Find m and c from two points', color: 'green' },
    { key: 'basicarith', name: 'Arithmetic', subtitle: '+, −, × with positive & negative', color: 'purple' },
    { key: 'custom', name: 'Custom Lesson', subtitle: 'Build your own mixed quiz', color: 'green' },
  ]

  const [search, setSearch] = useState('')

  const apps = search.trim()
    ? allApps.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(search.toLowerCase())
      )
    : allApps

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

  const rows = Math.ceil(apps.length / (cols || 1))

  return (
    <>
      <h1>Tenali</h1>
      <p className="subtitle">Choose a learning game to begin</p>
      <div className="search-bar-row">
        <input
          className="search-bar"
          type="text"
          placeholder="Search puzzles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="menu-grid" ref={gridRef}>
        {apps.map((app) => (
          <button key={app.key} className={`menu-card ${app.color}`} onClick={() => onSelect(app.key)}>
            <span className="menu-title">{app.name}</span>
            <span className="menu-subtitle">{app.subtitle}</span>
          </button>
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
  const [seenIds, setSeenIds] = useState([])
  const timer = useTimer()

  const loadQuestion = async (excludeIds) => {
    setLoading(true)
    setSelected('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    const ids = excludeIds || seenIds
    const excludeParam = ids.length ? `?exclude=${ids.join(',')}` : ''
    const res = await fetch(`${API}/gk-api/question${excludeParam}`)
    const data = await res.json()
    setQuestion(data)
    setSeenIds(prev => [...prev, data.id])
    setQuestionNumber((n) => n + 1)
    setLoading(false)
    timer.start()
  }

  useEffect(() => {
    loadQuestion([])
  }, [])

  const submitGK = async (option) => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    setSelected(option)
    const res = await fetch(`${API}/gk-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answerOption: option }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore((s) => s + 1)
    setFeedback(data.correct
      ? `Correct! The answer is ${data.correctAnswer}) ${data.correctAnswerText}`
      : `Incorrect. The correct answer is ${data.correctAnswer}) ${data.correctAnswerText}`)
    setResults((prev) => [...prev, {
      question: question.question.length > 50 ? question.question.slice(0, 50) + '…' : question.question,
      userAnswer: option,
      correctAnswer: `${data.correctAnswer}) ${data.correctAnswerText}`,
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) { if (selected) submitGK(selected); return }
    await loadQuestion()
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => loadQuestion()
  useAutoAdvance(revealed, advanceRef, isCorrect)

  // Keyboard: 1-4 / a-d instantly select+submit; Enter for submit/next
  const submitGKRef = useRef(submitGK)
  submitGKRef.current = submitGK
  const handleNextRef = useRef(handleSubmitOrNext)
  handleNextRef.current = handleSubmitOrNext

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Enter') { event.preventDefault(); handleNextRef.current(); return }
      if (revealed || loading || !question) return
      const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' }
      const letter = keyMap[event.key.toLowerCase()]
      if (letter && question.options.length >= ['A','B','C','D'].indexOf(letter) + 1) {
        event.preventDefault()
        submitGKRef.current(letter)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [revealed, loading, question])

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
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const fetchQuestion = async (selectedDigits = digits) => {
    setLoading(true)
    setFeedback('')
    setAnswer('')
    setRevealed(false)
    setIsCorrect(null)
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
      setIsCorrect(data.correct)
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
  useAutoAdvance(revealed, advanceRef, isCorrect)

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
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
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

/* ── Basic Arithmetic App (+, −, ×) ──────────────────── */
function BasicArithApp({ onBack }) {
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
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const fetchQuestion = async () => {
    setLoading(true)
    setFeedback(''); setAnswer(''); setRevealed(false); setIsCorrect(null)
    const res = await fetch(`${API}/basicarith-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    await fetchQuestion()
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!started || finished) return
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSubmitOrNext()
        return
      }
      // Keyboard typing for digits, minus, backspace — works even without input focus
      if (revealed || loading) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        setAnswer(prev => prev + event.key)
      } else if (event.key === '-') {
        event.preventDefault()
        setAnswer(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        setAnswer(prev => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, score, questionNumber, difficulty, loading, totalQ])

  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
      const res = await fetch(`${API}/basicarith-api/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: question.a, b: question.b, op: question.op, answer: Number(answer) }),
      })
      const data = await res.json()
      setIsCorrect(data.correct)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${question.prompt} = ${data.correctAnswer}` : `Incorrect. ${question.prompt} = ${data.correctAnswer}`)
      setResults(prev => [...prev, {
        question: question.prompt,
        userAnswer: answer,
        correctAnswer: String(data.correctAnswer),
        correct: data.correct,
        time: timeTaken,
      }])
      setRevealed(true)
      return
    }
    if (questionNumber >= totalQ) { setFinished(true); setQuestion(null); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await fetchQuestion()
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => handleSubmitOrNext()
  useAutoAdvance(revealed, advanceRef, isCorrect)

  return (
    <QuizLayout title="Basic Arithmetic" subtitle="Add, subtract, and multiply positive & negative numbers" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map(d => (
          <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} disabled={started && !finished} />
            {d === 'easy' ? '1 digit' : d === 'medium' ? '2 digits' : '3 digits'}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Solve +, −, and × problems with positive and negative numbers.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" />
        <NumPad value={answer} onChange={v => !revealed && setAnswer(v)} disabled={revealed} />
        <div className="button-row"><button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button></div>
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
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
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const fetchQuestion = async (selectedDifficulty = difficulty) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    setIsCorrect(null)
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
      setIsCorrect(data.correct)
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
  useAutoAdvance(revealed, advanceRef, isCorrect)

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
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
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
  const [isCorrect, setIsCorrect] = useState(null)
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
    setIsCorrect(null)
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
      setIsCorrect(correct)
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
  useAutoAdvance(revealed, advanceRef, isCorrect)

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
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
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

/* ── Vocab Builder App ──────────────────────────────── */
function VocabApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const [seenIds, setSeenIds] = useState([])
  const timer = useTimer()

  const loadQuestion = async (excludeIds) => {
    setLoading(true)
    setSelected('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    const ids = excludeIds || seenIds
    const excludeParam = ids.length ? `&exclude=${ids.join(',')}` : ''
    const res = await fetch(`${API}/vocab-api/question?difficulty=${difficulty}${excludeParam}`)
    const data = await res.json()
    setQuestion(data)
    setSeenIds(prev => [...prev, data.id])
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
    setSeenIds([])
    await loadQuestion([])
  }

  const submitVocab = async (option) => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    setSelected(option)
    const res = await fetch(`${API}/vocab-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answerOption: option }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore((s) => s + 1)
    setFeedback(data.correct
      ? `Correct! "${data.correctAnswerText}"`
      : `Incorrect. The right definition is: "${data.correctAnswerText}"`)
    const userDef = question.options[['A','B','C','D'].indexOf(option)]
    const truncate = (s) => s.length > 35 ? s.slice(0, 35) + '…' : s
    setResults((prev) => [...prev, {
      question: question.question,
      userAnswer: truncate(userDef),
      correctAnswer: truncate(data.correctAnswerText),
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) { if (selected) submitVocab(selected); return }
    if (questionNumber >= totalQ) { setFinished(true); setQuestion(null); timer.reset(); return }
    setQuestionNumber((n) => n + 1)
    await loadQuestion()
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = () => handleSubmitOrNext()
  useAutoAdvance(revealed, advanceRef, isCorrect)

  // Keyboard: 1-4 / a-d instantly select+submit; Enter for submit/next
  const submitVocabRef = useRef(submitVocab)
  submitVocabRef.current = submitVocab
  const handleNextRefV = useRef(handleSubmitOrNext)
  handleNextRefV.current = handleSubmitOrNext

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Enter') {
        if (!started || finished) return
        event.preventDefault()
        handleNextRefV.current()
        return
      }
      if (!started || finished || revealed || loading || !question) return
      const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' }
      const letter = keyMap[event.key.toLowerCase()]
      if (letter && question.options.length >= ['A','B','C','D'].indexOf(letter) + 1) {
        event.preventDefault()
        submitVocabRef.current(letter)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, revealed, loading, question])

  const difficultyLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', 'extra-hard': 'Extra Hard', hardest: 'Hardest' }

  return (
    <QuizLayout title="Vocab Builder" subtitle="Pick the correct definition for the word" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {Object.entries(difficultyLabels).map(([key, label]) => (
          <label key={key} className={`radio-pill ${difficulty === key ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === key} onChange={() => setDifficulty(key)} disabled={started && !finished} />
            {label}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Test your vocabulary across 5 difficulty levels.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder={String(DEFAULT_TOTAL)} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        <div className="question-box vocab-word">{loading || !question ? 'Loading question…' : question.question}</div>
        {question && (
          <div className="options-list">
            {question.options.map((option, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx]
              return (
                <label key={letter} className={`option-card ${selected === letter ? 'selected' : ''} ${revealed && letter === selected && !isCorrect ? 'option-wrong' : ''} ${revealed && question && letter === ['A','B','C','D'][question.options.indexOf(results[results.length-1]?.correctAnswer)] ? 'option-correct' : ''}`}>
                  <input type="radio" name="vocab" checked={selected === letter} onChange={() => !revealed && setSelected(letter)} disabled={revealed} />
                  <span><strong>{letter})</strong> {option}</span>
                </label>
              )
            })}
          </div>
        )}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row">
          <button onClick={handleSubmitOrNext} disabled={loading || (!revealed && !selected)}>{revealed ? (questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Twin Hunt App ────────────────────────────────────── */
const TWIN_SYMBOLS = [
  '🍎','🍊','🍋','🍇','🍉','🍓','🍒','🥝','🍌','🍑',
  '🌟','🌙','☀️','⚡','🔥','💧','🌈','❄️','🍀','🌸',
  '🐶','🐱','🐸','🐵','🐔','🐙','🦋','🐝','🐢','🐬',
  '⚽','🏀','🎾','🎯','🎲','🎸','🎨','📚','✏️','🔔',
]

function TwinHuntApp({ onBack }) {
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

  const scatterPositions = (n) => {
    const positions = []
    // Place first item near center with small jitter
    positions.push({
      x: 50 + (Math.random() - 0.5) * 12,
      y: 50 + (Math.random() - 0.5) * 12,
    })
    // Distribute remaining items in a ring with random jitter
    const remaining = n - 1
    const baseAngleOffset = Math.random() * Math.PI * 2
    for (let i = 0; i < remaining; i++) {
      const angle = baseAngleOffset + (i / remaining) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const radius = 28 + Math.random() * 10  // 28-38% from center
      const x = 50 + Math.cos(angle) * radius
      const y = 50 + Math.sin(angle) * radius
      positions.push({ x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) })
    }
    // Shuffle positions so center item isn't always first
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]]
    }
    return positions
  }

  const [leftPositions, setLeftPositions] = useState([])
  const [rightPositions, setRightPositions] = useState([])

  const generateRound = (n) => {
    const pool = [...TWIN_SYMBOLS].sort(() => Math.random() - 0.5)
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

    const left = shuffle([common, ...leftOthers])
    const right = shuffle([common, ...rightOthers])
    setLeftItems(left)
    setRightItems(right)
    setLeftPositions(scatterPositions(left.length))
    setRightPositions(scatterPositions(right.length))
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
  useAutoAdvance(revealed, advanceRef, isCorrect)

  return (
    <QuizLayout title="Twin Hunt" subtitle="Find the common object in both panels" onBack={onBack}>
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
        <div className="twin-panels">
          <div className="twin-panel">
            <div className="twin-circle">
              {leftItems.map((sym, i) => (
                <button key={i} type="button"
                  className={`twin-item ${revealed && sym === commonSymbol ? 'twin-match' : ''} ${revealed && sym !== commonSymbol ? 'twin-dim' : ''}`}
                  style={leftPositions[i] ? { left: `${leftPositions[i].x}%`, top: `${leftPositions[i].y}%` } : {}}
                  onClick={() => handlePick(sym)} disabled={revealed}>
                  {sym}
                </button>
              ))}
            </div>
          </div>
          <div className="twin-divider"></div>
          <div className="twin-panel">
            <div className="twin-circle">
              {rightItems.map((sym, i) => (
                <button key={i} type="button"
                  className={`twin-item ${revealed && sym === commonSymbol ? 'twin-match' : ''} ${revealed && sym !== commonSymbol ? 'twin-dim' : ''}`}
                  style={rightPositions[i] ? { left: `${rightPositions[i].x}%`, top: `${rightPositions[i].y}%` } : {}}
                  onClick={() => handlePick(sym)} disabled={revealed}>
                  {sym}
                </button>
              ))}
            </div>
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
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const fetchQuestion = async (step) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    setIsCorrect(null)
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
      setIsCorrect(data.correct)
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
  useAutoAdvance(revealed, advanceRef, isCorrect)

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
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
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

/* ── Polynomial Multiplication App ──────────────────── */
function PolyMulApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [userCoeffs, setUserCoeffs] = useState([])
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const loadQuestion = async () => {
    setLoading(true)
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    const res = await fetch(`${API}/polymul-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setUserCoeffs(new Array(data.resultDegree + 1).fill(''))
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
    await loadQuestion()
  }

  const handleSubmit = async () => {
    if (!question || revealed) return
    if (userCoeffs.some(c => c === '')) return
    const timeTaken = timer.stop()
    const res = await fetch(`${API}/polymul-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p1: question.p1, p2: question.p2, userCoeffs: userCoeffs.map(Number) }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    setFeedback(data.correct ? `Correct! ${question.productDisplay}` : `Incorrect. Answer: ${data.correctDisplay}`)
    setResults(prev => [...prev, {
      question: `(${question.p1Display})(${question.p2Display})`,
      userAnswer: userCoeffs.join(', '),
      correctAnswer: data.correctCoeffs.join(', '),
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
  const formatCoeffLabel = (i) => i === 0 ? 'constant' : i === 1 ? 'x' : `x${sup(i)}`

  return (
    <QuizLayout title="Poly Multiply" subtitle="Multiply two polynomials and enter the coefficients" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map(d => (
          <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} disabled={started && !finished} />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Multiply two polynomials and fill in the resulting coefficients.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        {question && <>
          <div className="question-box">
            <span className="poly-expr">({question.p1Display})</span> × <span className="poly-expr">({question.p2Display})</span>
          </div>
          <div className="coeff-inputs">
            {userCoeffs.map((c, i) => (
              <div key={i} className="coeff-field">
                <label className="coeff-label">{formatCoeffLabel(i)}</label>
                <input className="answer-input coeff-input" type="text" value={c} disabled={revealed}
                  onChange={e => { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) { const nc = [...userCoeffs]; nc[i] = v; setUserCoeffs(nc) } }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
              </div>
            ))}
          </div>
        </>}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row">
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading || (!revealed && userCoeffs.some(c => c === ''))}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Polynomial Factorization App ──────────────────── */
function PolyFactorApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [userP, setUserP] = useState('')
  const [userQ, setUserQ] = useState('')
  const [userR, setUserR] = useState('')
  const [userS, setUserS] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const loadQuestion = async () => {
    setLoading(true)
    setUserP(''); setUserQ(''); setUserR(''); setUserS('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    const res = await fetch(`${API}/polyfactor-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    await loadQuestion()
  }

  const handleSubmit = async () => {
    if (!question || revealed) return
    if (!userP || !userQ || !userR || !userS) return
    const timeTaken = timer.stop()
    const res = await fetch(`${API}/polyfactor-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userP: Number(userP), userQ: Number(userQ), userR: Number(userR), userS: Number(userS) }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    const { p, q, r, s } = question.factors
    setFeedback(data.correct ? `Correct! (${p}x ${q >= 0 ? '+' : '−'} ${Math.abs(q)})(${r}x ${s >= 0 ? '+' : '−'} ${Math.abs(s)})` : `Incorrect. One factorization: (${p}x ${q >= 0 ? '+' : '−'} ${Math.abs(q)})(${r}x ${s >= 0 ? '+' : '−'} ${Math.abs(s)})`)
    setResults(prev => [...prev, {
      question: question.display,
      userAnswer: `(${userP}x${Number(userQ)>=0?'+':''}${userQ})(${userR}x${Number(userS)>=0?'+':''}${userS})`,
      correctAnswer: `(${p}x${q>=0?'+':''}${q})(${r}x${s>=0?'+':''}${s})`,
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setter(v) }

  return (
    <QuizLayout title="Poly Factor" subtitle="Factor the quadratic into (px + q)(rx + s)" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map(d => (
          <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} disabled={started && !finished} />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Factor ax² + bx + c into (px + q)(rx + s).</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        {question && <>
          <div className="question-box">{question.display} = 0</div>
          <div className="factor-inputs">
            <span className="factor-group">(</span>
            <input className="answer-input factor-input" type="text" value={userP} onChange={valInput(setUserP)} disabled={revealed} placeholder="p" onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
            <span className="factor-group">x +</span>
            <input className="answer-input factor-input" type="text" value={userQ} onChange={valInput(setUserQ)} disabled={revealed} placeholder="q" onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
            <span className="factor-group">)(</span>
            <input className="answer-input factor-input" type="text" value={userR} onChange={valInput(setUserR)} disabled={revealed} placeholder="r" onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
            <span className="factor-group">x +</span>
            <input className="answer-input factor-input" type="text" value={userS} onChange={valInput(setUserS)} disabled={revealed} placeholder="s" onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
            <span className="factor-group">)</span>
          </div>
        </>}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`} style={{whiteSpace:'pre-line'}}>{feedback}</div>}
        <div className="button-row">
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading || (!revealed && (!userP || !userQ || !userR || !userS))}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Prime Factorization App ───────────────────────── */
function PrimeFactorApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [enteredFactors, setEnteredFactors] = useState([])
  const [currentInput, setCurrentInput] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const loadQuestion = async () => {
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    setEnteredFactors([]); setCurrentInput('')
    const res = await fetch(`${API}/primefactor-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setRemaining(data.number)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    await loadQuestion()
  }

  const addFactor = () => {
    const f = Number(currentInput)
    if (!f || f < 2 || remaining % f !== 0) return
    const newFactors = [...enteredFactors, f]
    const newRemaining = remaining / f
    setEnteredFactors(newFactors)
    setRemaining(newRemaining)
    setCurrentInput('')
    if (newRemaining === 1) {
      // Auto-check
      const timeTaken = timer.stop()
      const sorted = [...newFactors].sort((a, b) => a - b)
      const correct = question.factors.length === sorted.length && question.factors.every((v, i) => v === sorted[i])
      setIsCorrect(correct)
      if (correct) setScore(s => s + 1)
      setFeedback(correct ? `Correct! ${question.number} = ${question.factors.join(' × ')}` : `Incorrect. ${question.number} = ${question.factors.join(' × ')}`)
      setResults(prev => [...prev, {
        question: String(question.number),
        userAnswer: newFactors.join(' × '),
        correctAnswer: question.factors.join(' × '),
        correct,
        time: timeTaken,
      }])
      setRevealed(true)
    }
  }

  const handleGiveUp = () => {
    const timeTaken = timer.stop()
    setIsCorrect(false)
    setFeedback(`${question.number} = ${question.factors.join(' × ')}`)
    setResults(prev => [...prev, {
      question: String(question.number),
      userAnswer: enteredFactors.length ? enteredFactors.join(' × ') + ' ...' : '—',
      correctAnswer: question.factors.join(' × '),
      correct: false,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  const buildChain = () => {
    if (enteredFactors.length === 0) return String(question?.number || '')
    const parts = [String(question.number), '=', ...enteredFactors.flatMap((f, i) => i === 0 ? [String(f)] : ['×', String(f)])]
    if (remaining > 1) parts.push('×', String(remaining))
    return parts.join(' ')
  }

  return (
    <QuizLayout title="Prime Factors" subtitle="Break the number into its prime factors" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map(d => (
          <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} disabled={started && !finished} />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Enter prime factors one at a time. Watch the remaining number shrink!</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        {question && <>
          <div className="question-box prime-chain">{buildChain()}</div>
          {!revealed && remaining > 1 && <div className="prime-input-row">
            <input className="answer-input" type="text" value={currentInput} placeholder="Enter a prime factor"
              onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setCurrentInput(v) }}
              onKeyDown={e => { if (e.key === 'Enter') addFactor() }} autoFocus />
            <button onClick={addFactor} disabled={!currentInput}>Add</button>
            <button className="give-up-btn" onClick={handleGiveUp}>Give Up</button>
          </div>}
          <NumPad value={currentInput} onChange={setCurrentInput} onSubmit={addFactor} disabled={revealed || remaining <= 1} />
        </>}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        {revealed && <div className="button-row">
          <button onClick={() => advanceRef.current()}>{questionNumber >= totalQ ? 'Finish' : 'Next'}</button>
        </div>}
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Quadratic Formula App ─────────────────────────── */
function QFormulaApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [userR1, setUserR1] = useState('')
  const [userR2, setUserR2] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const loadQuestion = async () => {
    setLoading(true)
    setUserR1(''); setUserR2('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    const res = await fetch(`${API}/qformula-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    await loadQuestion()
  }

  const handleSubmit = async () => {
    if (!question || revealed || !userR1) return
    if (question.roots.type === 'real_distinct' && !userR2) return
    if (question.roots.type === 'complex' && !userR2) return
    const timeTaken = timer.stop()
    const res = await fetch(`${API}/qformula-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userR1: Number(userR1), userR2: Number(userR2), userType: question.roots.type }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    let correctStr = ''
    if (data.roots.type === 'real_distinct') correctStr = `Roots: ${data.roots.r1} and ${data.roots.r2}`
    else if (data.roots.type === 'real_equal') correctStr = `Root: ${data.roots.r1} (repeated)`
    else correctStr = `Roots: ${data.roots.realPart} ± ${data.roots.imagPart}i`
    setFeedback(data.correct ? `Correct! ${correctStr}` : `Incorrect. ${correctStr}`)
    setResults(prev => [...prev, {
      question: `${question.a}x² ${question.b>=0?'+':'−'} ${Math.abs(question.b)}x ${question.c>=0?'+':'−'} ${Math.abs(question.c)} = 0`,
      userAnswer: question.roots.type === 'real_equal' ? userR1 : `${userR1}, ${userR2}`,
      correctAnswer: correctStr,
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setter(v) }

  return (
    <QuizLayout title="Quadratic Formula" subtitle="Find the roots of ax² + bx + c = 0" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map(d => (
          <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} disabled={started && !finished} />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">{difficulty === 'easy' ? 'Integer roots only.' : difficulty === 'medium' ? 'Real roots (integer or decimal).' : 'May include complex roots.'}</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        {question && <>
          <div className="question-box">{question.a}x² {question.b >= 0 ? '+' : '−'} {Math.abs(question.b)}x {question.c >= 0 ? '+' : '−'} {Math.abs(question.c)} = 0</div>
          <div className="roots-inputs">
            {question.roots.type === 'complex' ? <>
              <div className="coeff-field"><label className="coeff-label">Real part</label>
                <input className="answer-input coeff-input" type="text" value={userR1} onChange={valInput(setUserR1)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
              <div className="coeff-field"><label className="coeff-label">Imaginary part</label>
                <input className="answer-input coeff-input" type="text" value={userR2} onChange={valInput(setUserR2)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            </> : question.roots.type === 'real_equal' ? <>
              <div className="coeff-field"><label className="coeff-label">Root (repeated)</label>
                <input className="answer-input coeff-input" type="text" value={userR1} onChange={valInput(setUserR1)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            </> : <>
              <div className="coeff-field"><label className="coeff-label">Root 1</label>
                <input className="answer-input coeff-input" type="text" value={userR1} onChange={valInput(setUserR1)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
              <div className="coeff-field"><label className="coeff-label">Root 2</label>
                <input className="answer-input coeff-input" type="text" value={userR2} onChange={valInput(setUserR2)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            </>}
          </div>
        </>}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row">
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading || (!revealed && !userR1)}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Simultaneous Equations App (2×2 easy, 3×3 hard) ── */
function SimulApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [userX, setUserX] = useState('')
  const [userY, setUserY] = useState('')
  const [userZ, setUserZ] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const is3x3 = question && question.size === 3

  const loadQuestion = async () => {
    setLoading(true)
    setUserX(''); setUserY(''); setUserZ('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    const res = await fetch(`${API}/simul-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    await loadQuestion()
  }

  const handleSubmit = async () => {
    if (!question || revealed || !userX || !userY) return
    if (is3x3 && !userZ) return
    const timeTaken = timer.stop()
    const body = { eqs: question.eqs, size: question.size, solution: question.solution, userX: Number(userX), userY: Number(userY) }
    if (is3x3) body.userZ = Number(userZ)
    const res = await fetch(`${API}/simul-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    const s = question.solution
    if (is3x3) {
      setFeedback(data.correct ? `Correct! (x, y, z) = (${s.x}, ${s.y}, ${s.z})` : `Incorrect. (x, y, z) = (${s.x}, ${s.y}, ${s.z})`)
      setResults(prev => [...prev, { question: '3×3 system', userAnswer: `(${userX}, ${userY}, ${userZ})`, correctAnswer: `(${s.x}, ${s.y}, ${s.z})`, correct: data.correct, time: timeTaken }])
    } else {
      setFeedback(data.correct ? `Correct! (x, y) = (${s.x}, ${s.y})` : `Incorrect. (x, y) = (${s.x}, ${s.y})`)
      setResults(prev => [...prev, { question: '2×2 system', userAnswer: `(${userX}, ${userY})`, correctAnswer: `(${s.x}, ${s.y})`, correct: data.correct, time: timeTaken }])
    }
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setter(v) }
  const fmtEq2 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y = ${eq.d}`
  const fmtEq3 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y ${eq.c >= 0 ? '+' : '−'} ${Math.abs(eq.c)}z = ${eq.d}`

  const subtitle = difficulty === 'easy' ? 'Solve the 2×2 system' : 'Solve the 3×3 system'
  const welcomeText = difficulty === 'easy'
    ? 'Solve for x and y in two simultaneous equations.'
    : 'Solve for x, y, and z in three simultaneous equations.'

  return (
    <QuizLayout title="Simultaneous Eq." subtitle={subtitle} onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'hard'].map(d => (
          <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} disabled={started && !finished} />
            {d === 'easy' ? 'Easy (2×2)' : 'Hard (3×3)'}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">{welcomeText}</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        {question && <>
          <div className="question-box equation-system">
            {question.eqs.map((eq, i) => <div key={i}>{is3x3 ? fmtEq3(eq) : fmtEq2(eq)}</div>)}
          </div>
          <div className="roots-inputs">
            <div className="coeff-field"><label className="coeff-label">x =</label>
              <input className="answer-input coeff-input" type="text" value={userX} onChange={valInput(setUserX)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            <div className="coeff-field"><label className="coeff-label">y =</label>
              <input className="answer-input coeff-input" type="text" value={userY} onChange={valInput(setUserY)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            {is3x3 && <div className="coeff-field"><label className="coeff-label">z =</label>
              <input className="answer-input coeff-input" type="text" value={userZ} onChange={valInput(setUserZ)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>}
          </div>
        </>}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row">
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading || (!revealed && (!userX || !userY || (is3x3 && !userZ)))}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Function Evaluation App ───────────────────────── */
function FuncEvalApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const loadQuestion = async () => {
    setLoading(true)
    setAnswer('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    const res = await fetch(`${API}/funceval-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    await loadQuestion()
  }

  const handleSubmit = async () => {
    if (!question || revealed || !answer) return
    const timeTaken = timer.stop()
    const res = await fetch(`${API}/funceval-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: question.answer, userAnswer: Number(answer) }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    const varStr = Object.entries(question.vars).map(([k, v]) => `${k}=${v}`).join(', ')
    setFeedback(data.correct ? `Correct! f(${varStr}) = ${data.correctAnswer}` : `Incorrect. f(${varStr}) = ${data.correctAnswer}`)
    setResults(prev => [...prev, {
      question: `${question.formula}, ${varStr}`,
      userAnswer: answer,
      correctAnswer: String(data.correctAnswer),
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  const varStr = question ? Object.entries(question.vars).map(([k, v]) => `${k} = ${v}`).join(', ') : ''

  return (
    <QuizLayout title="Functions" subtitle="Evaluate the function at the given values" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {[{k:'easy',l:'1 variable'},{k:'medium',l:'2 variables'},{k:'hard',l:'3 variables'}].map(({k,l}) => (
          <label key={k} className={`radio-pill ${difficulty === k ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === k} onChange={() => setDifficulty(k)} disabled={started && !finished} />
            {l}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Evaluate linear functions of 1, 2, or 3 variables.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        {question && <>
          <div className="question-box">
            <div>{question.formula}</div>
            <div className="given">Given: {varStr}</div>
          </div>
          <div className="single-input-row">
            <label className="coeff-label">f = </label>
            <input className="answer-input" type="text" value={answer} disabled={revealed}
              onChange={e => { const v = e.target.value; if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setAnswer(v) }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} autoFocus />
          </div>
          <NumPad value={answer} onChange={setAnswer} onSubmit={handleSubmit} disabled={revealed} />
        </>}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row">
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading || (!revealed && !answer)}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Line Equation App ─────────────────────────────── */
function LineEqApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [userM, setUserM] = useState('')
  const [userC, setUserC] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [results, setResults] = useState([])
  const timer = useTimer()

  const loadQuestion = async () => {
    setLoading(true)
    setUserM(''); setUserC('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    const res = await fetch(`${API}/lineq-api/question?difficulty=${difficulty}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    await loadQuestion()
  }

  const handleSubmit = async () => {
    if (!question || revealed || !userM || !userC) return
    const timeTaken = timer.stop()
    const res = await fetch(`${API}/lineq-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x1: question.x1, y1: question.y1, x2: question.x2, y2: question.y2, userM: Number(userM), userC: Number(userC) }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    setFeedback(data.correct ? `Correct! y = ${data.m}x ${data.c >= 0 ? '+' : '−'} ${Math.abs(data.c)}` : `Incorrect. y = ${data.m}x ${data.c >= 0 ? '+' : '−'} ${Math.abs(data.c)}`)
    setResults(prev => [...prev, {
      question: `(${question.x1},${question.y1}) (${question.x2},${question.y2})`,
      userAnswer: `m=${userM}, c=${userC}`,
      correctAnswer: `m=${data.m}, c=${data.c}`,
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setter(v) }

  return (
    <QuizLayout title="Line Equation" subtitle="Find m and c in y = mx + c from two points" onBack={onBack}>
      <div className="top-mini-row">
        {started && !finished && !revealed && <div className="timer-pill">{timer.elapsed}s</div>}
        <div className="score-pill">Score: {score}</div>
      </div>
      <div className="radio-group">
        {['easy', 'medium', 'hard'].map(d => (
          <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
            <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} disabled={started && !finished} />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </div>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Given two points, find the slope m and intercept c.</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
        {question && <>
          <div className="question-box">
            <div>Point A: ({question.x1}, {question.y1})</div>
            <div>Point B: ({question.x2}, {question.y2})</div>
            <div className="given">Find y = mx + c</div>
          </div>
          <div className="roots-inputs">
            <div className="coeff-field"><label className="coeff-label">m =</label>
              <input className="answer-input coeff-input" type="text" value={userM} onChange={valInput(setUserM)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            <div className="coeff-field"><label className="coeff-label">c =</label>
              <input className="answer-input coeff-input" type="text" value={userC} onChange={valInput(setUserC)} disabled={revealed} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
          </div>
        </>}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row">
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading || (!revealed && (!userM || !userC))}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Quiz Layout ─────────────────────────────────────── */
/* ── Custom Lesson App ────────────────────────────────── */
const CUSTOM_PUZZLES = [
  { key: 'basicarith', name: 'Basic Arithmetic' },
  { key: 'addition', name: 'Addition' },
  { key: 'quadratic', name: 'Quadratic' },
  { key: 'multiply', name: 'Multiplication' },
  { key: 'sqrt', name: 'Square Root' },
  { key: 'polymul', name: 'Poly Multiply' },
  { key: 'polyfactor', name: 'Poly Factor' },
  { key: 'primefactor', name: 'Prime Factors' },
  { key: 'qformula', name: 'Quadratic Formula' },
  { key: 'simul', name: 'Simultaneous Eq.' },
  { key: 'funceval', name: 'Functions' },
  { key: 'lineq', name: 'Line Equation' },
  { key: 'gk', name: 'General Knowledge' },
  { key: 'vocab', name: 'Vocab Builder' },
]

function fetchQuestionForType(type, difficulty) {
  const diffMap = { easy: 1, medium: 2, hard: 3 }
  const urls = {
    basicarith: `${API}/basicarith-api/question?difficulty=${difficulty}`,
    addition: `${API}/addition-api/question?digits=${diffMap[difficulty] || 1}`,
    quadratic: `${API}/quadratic-api/question?difficulty=${difficulty}`,
    multiply: `${API}/multiply-api/question?table=${Math.floor(Math.random() * 8) + 2}`,
    sqrt: `${API}/sqrt-api/question?step=${difficulty === 'easy' ? Math.floor(Math.random() * 10) + 1 : difficulty === 'medium' ? Math.floor(Math.random() * 25) + 11 : Math.floor(Math.random() * 25) + 36}`,
    polymul: `${API}/polymul-api/question?difficulty=${difficulty}`,
    polyfactor: `${API}/polyfactor-api/question?difficulty=${difficulty}`,
    primefactor: `${API}/primefactor-api/question?difficulty=${difficulty}`,
    qformula: `${API}/qformula-api/question?difficulty=${difficulty}`,
    simul: `${API}/simul-api/question?difficulty=${difficulty}`,
    funceval: `${API}/funceval-api/question?difficulty=${difficulty}`,
    lineq: `${API}/lineq-api/question?difficulty=${difficulty}`,
    gk: `${API}/gk-api/question`,
    vocab: `${API}/vocab-api/question?difficulty=${difficulty}`,
  }
  return fetch(urls[type]).then(r => r.json())
}

function getPromptForType(type, q) {
  if (!q) return 'Loading…'
  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
  switch (type) {
    case 'basicarith': case 'addition': return `${q.prompt} = ?`
    case 'quadratic': return `${q.prompt}`
    case 'multiply': return `${q.prompt} = ?`
    case 'sqrt': return `${q.prompt} = ?`
    case 'funceval': return `${q.formula}, evaluate at ${Object.entries(q.vars).map(([k,v]) => `${k} = ${v}`).join(', ')}`
    case 'polymul': return null // special render
    case 'polyfactor': return null // special render
    case 'primefactor': return `Find all prime factors of ${q.number}`
    case 'qformula': return `Find the roots of ${q.a}x² ${q.b >= 0 ? '+' : '−'} ${Math.abs(q.b)}x ${q.c >= 0 ? '+' : '−'} ${Math.abs(q.c)} = 0`
    case 'simul': return null // special render
    case 'lineq': return `Find slope (m) and intercept (c) for the line through (${q.x1}, ${q.y1}) and (${q.x2}, ${q.y2})`
    case 'gk': return q.question
    case 'vocab': return `What does "${q.question}" mean?`
    default: return ''
  }
}

function CustomApp({ onBack }) {
  // Setup state
  const [phase, setPhase] = useState('setup')
  const [selected, setSelected] = useState([])
  const [ordering, setOrdering] = useState('random')
  const [difficulty, setDifficulty] = useState('easy')
  const [numQuestions, setNumQuestions] = useState('20')

  // Quiz state
  const [plan, setPlan] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [question, setQuestion] = useState(null)
  const [curType, setCurType] = useState(null)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState([])
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useTimer()

  // Input state
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [userCoeffs, setUserCoeffs] = useState([])
  const [inputs, setInputs] = useState({})

  const totalQ = plan.length

  // Toggle puzzle selection
  const togglePuzzle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // Move puzzle up/down in order
  const movePuzzle = (idx, dir) => {
    const arr = [...selected]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setSelected(arr)
  }

  // Build question plan and start
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : 20
    let questionPlan = []
    if (ordering === 'sequential') {
      const perType = Math.floor(count / selected.length)
      const remainder = count % selected.length
      selected.forEach((key, i) => {
        const n = perType + (i < remainder ? 1 : 0)
        for (let j = 0; j < n; j++) questionPlan.push(key)
      })
    } else {
      for (let i = 0; i < count; i++) {
        questionPlan.push(selected[Math.floor(Math.random() * selected.length)])
      }
    }
    setPlan(questionPlan)
    setPhase('quiz')
    setScore(0)
    setResults([])
    setQIndex(0)
    await loadQuestion(questionPlan[0])
  }

  const resetInputs = () => {
    setAnswer(''); setSelectedOption(''); setUserCoeffs([]); setInputs({})
    setFeedback(''); setIsCorrect(null); setRevealed(false)
  }

  const loadQuestion = async (type) => {
    setLoading(true)
    resetInputs()
    setQuestion(null)   // clear stale question before changing type to prevent render crash
    setCurType(type)
    try {
      const data = await fetchQuestionForType(type, difficulty)
      if (data && !data.error) {
        setQuestion(data)
        if (type === 'polymul') setUserCoeffs(new Array(data.resultDegree + 1).fill(''))
      } else {
        // API returned an error — skip to next question or show fallback
        setQuestion(null)
      }
    } catch (err) {
      console.error('Failed to load question:', err)
      setQuestion(null)
    }
    setLoading(false)
    timer.start()
  }

  // Submit answer
  const handleSubmit = async (overrideOption) => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    let res, data, correct, correctDisplay, userDisplay
    const optionToUse = overrideOption || selectedOption

    switch (curType) {
      case 'basicarith': {
        if (answer === '') return
        res = await fetch(`${API}/basicarith-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, op: question.op, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! ${question.prompt} = ${data.correctAnswer}` : `Incorrect. ${question.prompt} = ${data.correctAnswer}`)
        break
      }
      case 'addition': {
        if (answer === '') return
        res = await fetch(`${API}/addition-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! ${question.a} + ${question.b} = ${data.correctAnswer}` : `Incorrect. ${question.a} + ${question.b} = ${data.correctAnswer}`)
        break
      }
      case 'quadratic': {
        if (answer === '') return
        res = await fetch(`${API}/quadratic-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, c: question.c, x: question.x, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! y = ${data.correctAnswer}` : `Incorrect. y = ${data.correctAnswer}`)
        break
      }
      case 'multiply': {
        if (answer === '') return
        res = await fetch(`${API}/multiply-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: question.table, multiplier: question.multiplier, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! ${question.prompt} = ${data.correctAnswer}` : `Incorrect. ${question.prompt} = ${data.correctAnswer}`)
        break
      }
      case 'sqrt': {
        if (answer === '') return
        res = await fetch(`${API}/sqrt-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: question.q, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = `⌊${data.sqrtRounded}⌋=${data.floorAnswer} or ⌈${data.sqrtRounded}⌉=${data.ceilAnswer}`; userDisplay = answer
        setFeedback(data.correct ? `Correct! √${question.q} ≈ ${data.sqrtRounded}` : `Incorrect. √${question.q} ≈ ${data.sqrtRounded} → ${data.floorAnswer} or ${data.ceilAnswer}`)
        break
      }
      case 'funceval': {
        if (answer === '') return
        res = await fetch(`${API}/funceval-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: question.answer, userAnswer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! = ${data.correctAnswer}` : `Incorrect. = ${data.correctAnswer}`)
        break
      }
      case 'polymul': {
        if (userCoeffs.some(c => c === '')) return
        res = await fetch(`${API}/polymul-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p1: question.p1, p2: question.p2, userCoeffs: userCoeffs.map(Number) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.correctDisplay; userDisplay = userCoeffs.join(', ')
        setFeedback(data.correct ? `Correct! ${question.productDisplay}` : `Incorrect. Answer: ${data.correctDisplay}`)
        break
      }
      case 'polyfactor': {
        const { p: up, q: uq, r: ur, s: us } = inputs
        if (!up || !uq || !ur || !us) return
        res = await fetch(`${API}/polyfactor-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userP: Number(up), userQ: Number(uq), userR: Number(ur), userS: Number(us) }) })
        data = await res.json()
        const f = question.factors
        correct = data.correct; correctDisplay = `(${f.p}x${f.q>=0?'+':''}${f.q})(${f.r}x${f.s>=0?'+':''}${f.s})`; userDisplay = `(${up}x${Number(uq)>=0?'+':''}${uq})(${ur}x${Number(us)>=0?'+':''}${us})`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      case 'primefactor': {
        const pf = (inputs.factors || '').split(/[,\s]+/).filter(Boolean).map(Number).sort((a,b) => a - b)
        if (pf.length === 0) return
        res = await fetch(`${API}/primefactor-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: question.number, userFactors: pf }) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.correctFactors.join(' × '); userDisplay = pf.join(' × ')
        setFeedback(data.correct ? `Correct! ${question.number} = ${correctDisplay}` : `Incorrect. ${question.number} = ${correctDisplay}`)
        break
      }
      case 'qformula': {
        const { r1, r2 } = inputs
        if (question.roots.type === 'real_equal' && !r1) return
        if (question.roots.type !== 'real_equal' && (!r1 || !r2)) return
        res = await fetch(`${API}/qformula-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userR1: Number(r1), userR2: Number(r2 || 0), userType: question.roots.type }) })
        data = await res.json()
        correct = data.correct
        const rt = data.roots
        correctDisplay = rt.type === 'real_distinct' ? `r₁ = ${rt.r1}, r₂ = ${rt.r2}` : rt.type === 'real_equal' ? `r = ${rt.r1}` : `${rt.realPart} ± ${rt.imagPart}i`
        userDisplay = question.roots.type === 'real_equal' ? r1 : `${r1}, ${r2}`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      case 'simul': {
        const { x: ux, y: uy, z: uz } = inputs
        if (!ux || !uy) return
        if (question.size === 3 && !uz) return
        const body = { eqs: question.eqs, size: question.size, solution: question.solution, userX: Number(ux), userY: Number(uy) }
        if (question.size === 3) body.userZ = Number(uz)
        res = await fetch(`${API}/simul-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        data = await res.json()
        correct = data.correct
        const s = question.solution
        correctDisplay = question.size === 3 ? `(${s.x}, ${s.y}, ${s.z})` : `(${s.x}, ${s.y})`
        userDisplay = question.size === 3 ? `(${ux}, ${uy}, ${uz})` : `(${ux}, ${uy})`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      case 'lineq': {
        const { m, c } = inputs
        if (!m || !c) return
        res = await fetch(`${API}/lineq-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x1: question.x1, y1: question.y1, x2: question.x2, y2: question.y2, userM: Number(m), userC: Number(c) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = `m = ${data.m}, c = ${data.c}`; userDisplay = `m = ${m}, c = ${c}`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      case 'gk': case 'vocab': {
        if (!optionToUse) return
        setSelectedOption(optionToUse)
        const url = curType === 'gk' ? `${API}/gk-api/check` : `${API}/vocab-api/check`
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: question.id, answerOption: optionToUse }) })
        data = await res.json()
        correct = data.correct; correctDisplay = `${data.correctAnswer}: ${data.correctAnswerText}`; userDisplay = optionToUse
        setFeedback(data.correct ? `Correct! ${data.correctAnswerText}` : `Incorrect. ${data.correctAnswerText}`)
        break
      }
      default: return
    }

    setIsCorrect(correct)
    if (correct) setScore(s => s + 1)
    const typeName = CUSTOM_PUZZLES.find(p => p.key === curType)?.name || curType
    setResults(prev => [...prev, {
      question: `[${typeName}] ${getPromptForType(curType, question) || '…'}`.slice(0, 80),
      userAnswer: userDisplay,
      correctAnswer: correctDisplay,
      correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (qIndex + 1 >= totalQ) { setPhase('finished'); timer.reset(); return }
    const next = qIndex + 1
    setQIndex(next)
    await loadQuestion(plan[next])
  }
  useAutoAdvance(revealed, advanceRef, isCorrect)

  // Keyboard: 1-4 / a-d instantly select+submit for GK/Vocab in custom mode
  const handleSubmitRefC = useRef(handleSubmit)
  handleSubmitRefC.current = handleSubmit
  useEffect(() => {
    if (phase !== 'quiz') return
    const onKeyDown = (event) => {
      if (revealed || loading) return
      if (curType !== 'gk' && curType !== 'vocab') return
      const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' }
      const letter = keyMap[event.key.toLowerCase()]
      if (letter && question && question.options) {
        event.preventDefault()
        handleSubmitRefC.current(letter)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, curType, question, loading, revealed])

  const valInput = (key) => (e) => {
    const v = e.target.value
    if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setInputs(prev => ({ ...prev, [key]: v }))
  }

  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
  const formatCoeffLabel = (i) => i === 0 ? 'constant' : i === 1 ? 'x' : `x${sup(i)}`
  const fmtEq2 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y = ${eq.d}`
  const fmtEq3 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y ${eq.c >= 0 ? '+' : '−'} ${Math.abs(eq.c)}z = ${eq.d}`

  // Render the right input UI for current puzzle type
  const renderInputs = () => {
    if (!question || !curType) return null
    switch (curType) {
      case 'basicarith': case 'addition': case 'quadratic': case 'multiply': case 'sqrt': case 'funceval':
        return <>
          <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
          <NumPad value={answer} onChange={v => !revealed && setAnswer(v)} disabled={revealed} />
        </>
      case 'gk': case 'vocab':
        if (!question.options) return null
        return <div className="options-grid">
          {question.options.map((opt) => (
            <button key={opt.option} className={`option-card ${selectedOption === opt.option ? 'selected' : ''} ${revealed && opt.option === (question.answerOption || question.correctAnswer) ? 'correct-option' : ''} ${revealed && selectedOption === opt.option && !isCorrect ? 'wrong-option' : ''}`} onClick={() => !revealed && setSelectedOption(opt.option)} disabled={revealed}>
              <strong>{opt.option}.</strong> {opt.text}
            </button>
          ))}
        </div>
      case 'polymul':
        return <div className="coeff-inputs">
          {userCoeffs.map((c, i) => (
            <div key={i} className="coeff-field">
              <label className="coeff-label">{formatCoeffLabel(i)}</label>
              <input className="answer-input coeff-input" type="text" value={c} disabled={revealed}
                onChange={e => { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) { const nc = [...userCoeffs]; nc[i] = v; setUserCoeffs(nc) } }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
            </div>
          ))}
        </div>
      case 'polyfactor':
        return <div className="factor-inputs">
          {[['p','p'],['q','q'],['r','r'],['s','s']].map(([key, label]) => (
            <div key={key} className="coeff-field">
              <label className="coeff-label">{label}</label>
              <input className="answer-input coeff-input" type="text" value={inputs[key] || ''} disabled={revealed} onChange={valInput(key)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
            </div>
          ))}
          <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-soft)', marginTop: 4 }}>Factor as (px + q)(rx + s)</div>
        </div>
      case 'primefactor':
        return <div className="single-input-row">
          <input className="answer-input" type="text" value={inputs.factors || ''} disabled={revealed} placeholder="e.g. 2, 3, 5" onChange={e => setInputs(prev => ({ ...prev, factors: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-soft)', marginTop: 4 }}>Enter all prime factors separated by commas</div>
        </div>
      case 'qformula':
        return <div className="roots-inputs">
          {question.roots.type === 'complex' ? <>
            <div className="coeff-field"><label className="coeff-label">Real part</label>
              <input className="answer-input coeff-input" type="text" value={inputs.r1 || ''} disabled={revealed} onChange={valInput('r1')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            <div className="coeff-field"><label className="coeff-label">Imag part</label>
              <input className="answer-input coeff-input" type="text" value={inputs.r2 || ''} disabled={revealed} onChange={valInput('r2')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
          </> : question.roots.type === 'real_equal' ? <>
            <div className="coeff-field"><label className="coeff-label">Root</label>
              <input className="answer-input coeff-input" type="text" value={inputs.r1 || ''} disabled={revealed} onChange={valInput('r1')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
          </> : <>
            <div className="coeff-field"><label className="coeff-label">r₁</label>
              <input className="answer-input coeff-input" type="text" value={inputs.r1 || ''} disabled={revealed} onChange={valInput('r1')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
            <div className="coeff-field"><label className="coeff-label">r₂</label>
              <input className="answer-input coeff-input" type="text" value={inputs.r2 || ''} disabled={revealed} onChange={valInput('r2')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
          </>}
        </div>
      case 'simul':
        return <div className="roots-inputs">
          <div className="coeff-field"><label className="coeff-label">x =</label>
            <input className="answer-input coeff-input" type="text" value={inputs.x || ''} disabled={revealed} onChange={valInput('x')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
          <div className="coeff-field"><label className="coeff-label">y =</label>
            <input className="answer-input coeff-input" type="text" value={inputs.y || ''} disabled={revealed} onChange={valInput('y')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
          {question.size === 3 && <div className="coeff-field"><label className="coeff-label">z =</label>
            <input className="answer-input coeff-input" type="text" value={inputs.z || ''} disabled={revealed} onChange={valInput('z')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>}
        </div>
      case 'lineq':
        return <div className="roots-inputs">
          <div className="coeff-field"><label className="coeff-label">m =</label>
            <input className="answer-input coeff-input" type="text" value={inputs.m || ''} disabled={revealed} onChange={valInput('m')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
          <div className="coeff-field"><label className="coeff-label">c =</label>
            <input className="answer-input coeff-input" type="text" value={inputs.c || ''} disabled={revealed} onChange={valInput('c')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} /></div>
        </div>
      default: return null
    }
  }

  // Render the question display
  const renderQuestion = () => {
    if (!question || !curType) return <div className="question-box">Loading…</div>
    const typeName = CUSTOM_PUZZLES.find(p => p.key === curType)?.name || curType

    if (curType === 'polymul') {
      return <>
        <div className="custom-type-badge">{typeName}</div>
        <div className="question-box">
          <span className="poly-expr">({question.p1Display})</span> × <span className="poly-expr">({question.p2Display})</span>
        </div>
      </>
    }
    if (curType === 'polyfactor') {
      return <>
        <div className="custom-type-badge">{typeName}</div>
        <div className="question-box">Factor: {question.display}</div>
      </>
    }
    if (curType === 'simul') {
      const is3 = question.size === 3
      return <>
        <div className="custom-type-badge">{typeName}</div>
        <div className="question-box equation-system">
          {question.eqs.map((eq, i) => <div key={i}>{is3 ? fmtEq3(eq) : fmtEq2(eq)}</div>)}
        </div>
      </>
    }
    return <>
      <div className="custom-type-badge">{typeName}</div>
      <div className="question-box">{getPromptForType(curType, question)}</div>
    </>
  }

  // ─── Setup Phase ─────────────────────────────────────
  if (phase === 'setup') {
    return (
      <QuizLayout title="Custom Lesson" subtitle="Build your own quiz from any combination of puzzles" onBack={onBack}>
        <div className="radio-group">
          {['easy', 'medium', 'hard'].map(d => (
            <label key={d} className={`radio-pill ${difficulty === d ? 'active' : ''}`}>
              <input type="radio" checked={difficulty === d} onChange={() => setDifficulty(d)} />
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </label>
          ))}
        </div>

        <div className="custom-section-label">Select puzzles:</div>
        <div className="custom-puzzle-grid">
          {CUSTOM_PUZZLES.map(p => (
            <label key={p.key} className={`custom-puzzle-check ${selected.includes(p.key) ? 'checked' : ''}`}>
              <input type="checkbox" checked={selected.includes(p.key)} onChange={() => togglePuzzle(p.key)} />
              {p.name}
            </label>
          ))}
        </div>

        <div className="custom-section-label">Question order:</div>
        <div className="radio-group">
          <label className={`radio-pill ${ordering === 'random' ? 'active' : ''}`}>
            <input type="radio" checked={ordering === 'random'} onChange={() => setOrdering('random')} /> Random
          </label>
          <label className={`radio-pill ${ordering === 'sequential' ? 'active' : ''}`}>
            <input type="radio" checked={ordering === 'sequential'} onChange={() => setOrdering('sequential')} /> Sequential
          </label>
        </div>

        {ordering === 'sequential' && selected.length > 1 && <>
          <div className="custom-section-label">Drag order (first → last):</div>
          <div className="custom-order-list">
            {selected.map((key, i) => {
              const p = CUSTOM_PUZZLES.find(x => x.key === key)
              return (
                <div key={key} className="custom-order-item">
                  <span className="custom-order-num">{i + 1}.</span>
                  <span className="custom-order-name">{p?.name}</span>
                  <button className="custom-order-btn" onClick={() => movePuzzle(i, -1)} disabled={i === 0}>↑</button>
                  <button className="custom-order-btn" onClick={() => movePuzzle(i, 1)} disabled={i === selected.length - 1}>↓</button>
                </div>
              )
            })}
          </div>
        </>}

        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row">
          <button onClick={startQuiz} disabled={selected.length === 0}>Start Custom Quiz</button>
        </div>
      </QuizLayout>
    )
  }

  // ─── Quiz Phase ──────────────────────────────────────
  if (phase === 'quiz') {
    return (
      <QuizLayout title="Custom Lesson" subtitle={`${selected.length} puzzle types · ${difficulty}`} onBack={onBack}>
        <div className="top-mini-row">
          {!revealed && <div className="timer-pill">{timer.elapsed}s</div>}
          <div className="score-pill">Score: {score}</div>
        </div>
        <div className="progress-pill center">Question {qIndex + 1}/{totalQ}</div>
        {renderQuestion()}
        {renderInputs()}
        {feedback && <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>}
        <div className="button-row">
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading}>
            {revealed ? (qIndex + 1 >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </QuizLayout>
    )
  }

  // ─── Finished Phase ──────────────────────────────────
  return (
    <QuizLayout title="Custom Lesson" subtitle="Quiz complete!" onBack={onBack}>
      <div className="welcome-box">
        <p className="final-score">Final score: {score}/{totalQ}</p>
        <ResultsTable results={results} />
        <button onClick={() => setPhase('setup')}>Play Again</button>
      </div>
    </QuizLayout>
  )
}

/* ── Interval Scheduling App ────────────────────────── */
function IntervalSchedulingApp() {
  const [intervals, setIntervals] = useState([])
  const [nextId, setNextId] = useState(1)
  const [result, setResult] = useState(null)
  const [step, setStep] = useState(-1) // -1 = not started, 0..n = stepping through
  const [sorted, setSorted] = useState([])
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tenali-theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('tenali-theme', theme) } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const TIMELINE_MAX = 24
  const COLORS = ['#e8864a', '#5cb87a', '#4a90d9', '#d94a8a', '#9b59b6', '#e6c84a', '#2ecc71', '#e74c3c', '#1abc9c', '#f39c12']

  // Drag state for creating intervals on the timeline
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const timelineRef = useRef(null)

  const getTimeFromX = (clientX) => {
    const rect = timelineRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const t = Math.round((x / rect.width) * TIMELINE_MAX)
    return Math.max(0, Math.min(TIMELINE_MAX, t))
  }

  const handleMouseDown = (e) => {
    if (result) return
    const t = getTimeFromX(e.clientX)
    setDragging(true)
    setDragStart(t)
    setDragEnd(t)
  }

  const handleMouseMove = (e) => {
    if (!dragging) return
    setDragEnd(getTimeFromX(e.clientX))
  }

  const handleMouseUp = () => {
    if (!dragging) return
    setDragging(false)
    const s = Math.min(dragStart, dragEnd)
    const e = Math.max(dragStart, dragEnd)
    if (e > s) {
      setIntervals(prev => [...prev, { id: nextId, start: s, end: e }])
      setNextId(n => n + 1)
    }
    setDragStart(null)
    setDragEnd(null)
  }

  // Touch support
  const handleTouchStart = (e) => {
    if (result) return
    const touch = e.touches[0]
    const t = getTimeFromX(touch.clientX)
    setDragging(true)
    setDragStart(t)
    setDragEnd(t)
  }

  const handleTouchMove = (e) => {
    if (!dragging) return
    const touch = e.touches[0]
    setDragEnd(getTimeFromX(touch.clientX))
  }

  const handleTouchEnd = () => {
    handleMouseUp()
  }

  const removeInterval = (id) => {
    if (result) return
    setIntervals(prev => prev.filter(i => i.id !== id))
  }

  const runGreedy = () => {
    const sortedByEnd = [...intervals].sort((a, b) => a.end - b.end || a.start - b.start)
    setSorted(sortedByEnd)
    setStep(0)
    setResult(null)
  }

  const stepForward = () => {
    if (step >= sorted.length) return
    setStep(s => s + 1)
  }

  const runFullAlgorithm = () => {
    setStep(sorted.length)
  }

  // Compute selected set up to current step
  const getSelectedAtStep = (upToStep) => {
    const selected = []
    let lastEnd = -Infinity
    for (let i = 0; i < Math.min(upToStep, sorted.length); i++) {
      if (sorted[i].start >= lastEnd) {
        selected.push(sorted[i])
        lastEnd = sorted[i].end
      }
    }
    return selected
  }

  const selectedIntervals = step >= 0 ? getSelectedAtStep(step) : []
  const isFinished = step >= sorted.length && step >= 0
  const currentConsidering = step >= 0 && step < sorted.length ? sorted[step] : null

  // Check if current interval would be rejected
  const wouldBeRejected = (() => {
    if (!currentConsidering) return false
    const sel = getSelectedAtStep(step)
    const lastEnd = sel.length > 0 ? sel[sel.length - 1].end : -Infinity
    return currentConsidering.start < lastEnd
  })()

  const reset = () => {
    setResult(null)
    setStep(-1)
    setSorted([])
  }

  const clearAll = () => {
    setIntervals([])
    setNextId(1)
    reset()
  }

  const loadExample = () => {
    clearAll()
    const examples = [
      { id: 1, start: 0, end: 6 },
      { id: 2, start: 1, end: 4 },
      { id: 3, start: 3, end: 5 },
      { id: 4, start: 5, end: 7 },
      { id: 5, start: 3, end: 9 },
      { id: 6, start: 5, end: 9 },
      { id: 7, start: 6, end: 10 },
      { id: 8, start: 8, end: 11 },
      { id: 9, start: 8, end: 12 },
      { id: 10, start: 2, end: 14 },
      { id: 11, start: 12, end: 16 },
    ]
    setIntervals(examples)
    setNextId(12)
  }

  const selectedSet = new Set(selectedIntervals.map(i => i.id))

  return (
    <>
      <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="app-shell">
        <div className="card is-wide">
          <h1>Interval Scheduling</h1>
          <p className="subtitle">
            Drag on the timeline to create intervals, then step through the greedy algorithm
          </p>

          {/* Algorithm explanation */}
          <div className="is-algo-explain">
            <strong>Greedy strategy:</strong> Sort all intervals by finish time. Then, scan left to right — accept an interval if it doesn't overlap the last accepted one, otherwise skip it. This always gives the maximum number of non-overlapping intervals.
          </div>

          {/* Timeline */}
          <div className="is-timeline-container">
            <div className="is-timeline-labels">
              {Array.from({ length: TIMELINE_MAX + 1 }, (_, i) => (
                <span key={i} className="is-timeline-label">{i}</span>
              ))}
            </div>
            <div
              className="is-timeline"
              ref={timelineRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Grid lines */}
              {Array.from({ length: TIMELINE_MAX + 1 }, (_, i) => (
                <div key={i} className="is-grid-line" style={{ left: `${(i / TIMELINE_MAX) * 100}%` }} />
              ))}

              {/* Existing intervals */}
              {intervals.map((intv, idx) => {
                const isSelected = selectedSet.has(intv.id)
                const isConsidering = currentConsidering && currentConsidering.id === intv.id
                const isRejected = isConsidering && wouldBeRejected
                const wasProcessed = step >= 0 && sorted.findIndex(s => s.id === intv.id) < step && !isSelected

                let className = 'is-interval'
                if (isConsidering && !isRejected) className += ' is-considering'
                if (isConsidering && isRejected) className += ' is-rejected'
                if (isSelected) className += ' is-selected'
                if (wasProcessed && !isSelected) className += ' is-skipped'

                return (
                  <div
                    key={intv.id}
                    className={className}
                    style={{
                      left: `${(intv.start / TIMELINE_MAX) * 100}%`,
                      width: `${((intv.end - intv.start) / TIMELINE_MAX) * 100}%`,
                      top: `${(idx % 6) * 34 + 4}px`,
                      backgroundColor: isSelected ? COLORS[idx % COLORS.length] : undefined,
                    }}
                    title={`[${intv.start}, ${intv.end})`}
                  >
                    <span className="is-interval-label">{intv.start}–{intv.end}</span>
                    {step < 0 && (
                      <button className="is-interval-remove" onClick={(e) => { e.stopPropagation(); removeInterval(intv.id) }}>×</button>
                    )}
                  </div>
                )
              })}

              {/* Drag preview */}
              {dragging && dragStart !== null && dragEnd !== null && (
                <div
                  className="is-interval is-preview"
                  style={{
                    left: `${(Math.min(dragStart, dragEnd) / TIMELINE_MAX) * 100}%`,
                    width: `${((Math.abs(dragEnd - dragStart)) / TIMELINE_MAX) * 100}%`,
                    top: `${(intervals.length % 6) * 34 + 4}px`,
                  }}
                >
                  <span className="is-interval-label">{Math.min(dragStart, dragEnd)}–{Math.max(dragStart, dragEnd)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="is-controls">
            {step < 0 ? (
              <>
                <button className="is-btn" onClick={loadExample}>Load Example</button>
                <button className="is-btn" onClick={clearAll} disabled={intervals.length === 0}>Clear All</button>
                <button className="is-btn is-btn-primary" onClick={runGreedy} disabled={intervals.length === 0}>
                  Run Greedy Algorithm
                </button>
              </>
            ) : (
              <>
                <button className="is-btn" onClick={reset}>Reset</button>
                {!isFinished && (
                  <>
                    <button className="is-btn is-btn-primary" onClick={stepForward}>
                      Next Step
                    </button>
                    <button className="is-btn" onClick={runFullAlgorithm}>Skip to End</button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Step-by-step log */}
          {step >= 0 && (
            <div className="is-log">
              <h3>Algorithm Trace</h3>
              <div className="is-log-header">
                Sorted by finish time: [{sorted.map(s => `[${s.start},${s.end})`).join(', ')}]
              </div>
              <div className="is-log-entries">
                {sorted.slice(0, step).map((intv, i) => {
                  const selUpTo = getSelectedAtStep(i + 1)
                  const wasSelected = selUpTo.some(s => s.id === intv.id) && !getSelectedAtStep(i).some(s => s.id === intv.id)
                  const lastAccepted = getSelectedAtStep(i)
                  const lastEnd = lastAccepted.length > 0 ? lastAccepted[lastAccepted.length - 1].end : 0

                  return (
                    <div key={i} className={`is-log-entry ${wasSelected ? 'is-log-accept' : 'is-log-reject'}`}>
                      <span className="is-log-step">Step {i + 1}:</span>
                      <span>Consider [{intv.start}, {intv.end})</span>
                      {wasSelected ? (
                        <span className="is-log-verdict is-accept">
                           Accept (start {intv.start} {'>'}= last end {lastEnd})
                        </span>
                      ) : (
                        <span className="is-log-verdict is-reject">
                           Reject (start {intv.start} {'<'} last end {lastEnd})
                        </span>
                      )}
                    </div>
                  )
                })}
                {currentConsidering && (
                  <div className={`is-log-entry is-log-current ${wouldBeRejected ? 'is-log-reject-pending' : 'is-log-accept-pending'}`}>
                    <span className="is-log-step">Step {step + 1}:</span>
                    <span>Considering [{currentConsidering.start}, {currentConsidering.end})…</span>
                    <span className="is-log-verdict is-pending">press Next Step</span>
                  </div>
                )}
              </div>

              {isFinished && (
                <div className="is-result">
                  <strong>Result:</strong> {selectedIntervals.length} interval{selectedIntervals.length !== 1 ? 's' : ''} selected
                  — [{selectedIntervals.map(s => `[${s.start},${s.end})`).join(', ')}]
                  <br />
                  <span className="is-result-note">This is the maximum possible set of non-overlapping intervals.</span>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="is-legend">
            <div className="is-legend-item"><span className="is-legend-swatch is-swatch-default" /> Unprocessed</div>
            <div className="is-legend-item"><span className="is-legend-swatch is-swatch-considering" /> Considering</div>
            <div className="is-legend-item"><span className="is-legend-swatch is-swatch-selected" /> Accepted</div>
            <div className="is-legend-item"><span className="is-legend-swatch is-swatch-rejected" /> Rejected</div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Extended Euclid App ───────────────────────────── */
function ExtendedEuclidApp() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [steps, setSteps] = useState(null)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tenali-theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('tenali-theme', theme) } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const compute = () => {
    const na = parseInt(a, 10)
    const nb = parseInt(b, 10)
    if (isNaN(na) || isNaN(nb) || (na === 0 && nb === 0)) return

    // Run extended Euclidean algorithm, recording every step
    const rows = []
    let r0 = Math.abs(na), r1 = Math.abs(nb)
    let s0 = 1, s1 = 0
    let t0 = 0, t1 = 1

    rows.push({ r: r0, s: s0, t: t0, q: null, step: 0 })
    rows.push({ r: r1, s: s1, t: t1, q: null, step: 1 })

    let i = 2
    while (r1 !== 0) {
      const q = Math.floor(r0 / r1)
      const r2 = r0 - q * r1
      const s2 = s0 - q * s1
      const t2 = t0 - q * t1

      rows.push({ r: r2, s: s2, t: t2, q, step: i })

      r0 = r1; r1 = r2
      s0 = s1; s1 = s2
      t0 = t1; t1 = t2
      i++
    }

    // Adjust signs if original inputs were negative
    const signA = na >= 0 ? 1 : -1
    const signB = nb >= 0 ? 1 : -1
    const gcd = r0
    const x = s0 * signA
    const y = t0 * signB

    setSteps({ rows, gcd, x, y, a: na, b: nb })
  }

  const loadExample = () => {
    setA('252')
    setB('198')
    setSteps(null)
  }

  return (
    <>
      <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="app-shell">
        <div className="card is-wide">
          <h1>Extended Euclidean Algorithm</h1>
          <p className="subtitle">
            Enter two integers to see the step-by-step computation of gcd(a, b) and coefficients x, y such that ax + by = gcd(a, b)
          </p>

          <div className="is-algo-explain">
            <strong>How it works:</strong> The algorithm repeatedly divides the larger number by the smaller and tracks coefficients.
            At each step: r_i = r_(i-2) − q_i · r_(i-1), and similarly for s_i and t_i. When the remainder reaches 0, the previous remainder is the GCD, and the coefficients give the linear combination.
          </div>

          <div className="ee-input-row">
            <div className="ee-field">
              <label className="ee-label">a</label>
              <input
                className="ee-input"
                type="number"
                value={a}
                onChange={e => { setA(e.target.value); setSteps(null) }}
                placeholder="e.g. 252"
                onKeyDown={e => e.key === 'Enter' && compute()}
              />
            </div>
            <div className="ee-field">
              <label className="ee-label">b</label>
              <input
                className="ee-input"
                type="number"
                value={b}
                onChange={e => { setB(e.target.value); setSteps(null) }}
                placeholder="e.g. 198"
                onKeyDown={e => e.key === 'Enter' && compute()}
              />
            </div>
          </div>

          <div className="is-controls">
            <button className="is-btn" onClick={loadExample}>Load Example</button>
            <button className="is-btn is-btn-primary" onClick={compute} disabled={!a || !b}>Compute</button>
            <button className="is-btn" onClick={() => { setA(''); setB(''); setSteps(null) }}>Clear</button>
          </div>

          {steps && (
            <>
              {/* Result summary */}
              <div className="is-result" style={{ marginTop: '24px' }}>
                <strong>gcd({steps.a}, {steps.b}) = {steps.gcd}</strong>
                <br />
                <span style={{ fontSize: '1.05rem' }}>
                  ({steps.x}) · {steps.a} + ({steps.y}) · {steps.b} = {steps.gcd}
                </span>
                <br />
                <span className="is-result-note">
                  Verification: {steps.x} × {steps.a} + {steps.y} × {steps.b} = {steps.x * steps.a + steps.y * steps.b}
                </span>
              </div>

              {/* Step table */}
              <div className="ee-table-wrap">
                <table className="ee-table">
                  <thead>
                    <tr>
                      <th>Step i</th>
                      <th>q_i</th>
                      <th>r_i</th>
                      <th>s_i</th>
                      <th>t_i</th>
                      <th>Equation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.rows.map((row, idx) => (
                      <tr key={idx} className={row.r === 0 ? 'ee-row-zero' : idx === steps.rows.length - 2 ? 'ee-row-gcd' : ''}>
                        <td>{row.step}</td>
                        <td>{row.q !== null ? row.q : '—'}</td>
                        <td><strong>{row.r}</strong></td>
                        <td>{row.s}</td>
                        <td>{row.t}</td>
                        <td className="ee-eq">
                          {row.r !== 0 ? (
                            <span>{row.r} = ({row.s}) · {Math.abs(steps.a)} + ({row.t}) · {Math.abs(steps.b)}</span>
                          ) : (
                            <span className="is-result-note">remainder = 0, stop</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Division steps breakdown */}
              <div className="ee-divisions">
                <h3>Division Steps</h3>
                {steps.rows.slice(2).map((row, idx) => {
                  const prev2 = steps.rows[idx]
                  const prev1 = steps.rows[idx + 1]
                  return (
                    <div key={idx} className="ee-division-step">
                      <span className="is-log-step">Step {idx + 1}:</span>
                      {prev2.r} = {row.q} × {prev1.r} + {row.r}
                      {row.r === 0 && <span className="is-result-note"> (done — gcd is {prev1.r})</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
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
