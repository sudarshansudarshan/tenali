/**
 * @fileoverview Tenali - Educational Quiz Platform (React Frontend)
 *
 * This monolithic React application serves as the main frontend for Tenali, an adaptive
 * learning system with multiple quiz types. It includes:
 *
 * - Shared utility hooks: useTimer (elapsed time tracking), useAutoAdvance (auto-progression)
 * - Shared components: NumPad (numeric input), ResultsTable (quiz results display), QuizLayout (wrapper)
 * - Adaptive multiplication tables app: AdaptiveTablesApp with rolling-window algorithm
 * - Multiple quiz apps: GKApp, AdditionApp, BasicArithApp, QuadraticApp, MultiplyApp, VocabApp,
 *   and many more (SqrtApp, PolyMulApp, PolyFactorApp, PrimeFactorApp, QFormulaApp, SimulApp,
 *   FuncEvalApp, LineEqApp, CustomApp, TwinHuntApp, IntervalSchedulingApp, ExtendedEuclidApp)
 * - Home component with search and menu cards for app discovery
 * - App shell with theme toggle (dark/light), localStorage persistence
 * - URL-based routing system for student pages and different quizzes
 *
 * The app uses a state-machine pattern: most quiz apps cycle through setup → playing → finished phases.
 * Each quiz component manages its own state and communicates with backend APIs.
 *
 * Theme persistence: Dark/light mode preference stored in localStorage[tenali-theme]
 * Progress persistence: Adaptive tables app saves current table progress in localStorage
 */

import { useEffect, useState, useRef } from 'react'
import './App.css'

// API base URL from environment variables (Vite)
const API = import.meta.env.VITE_API_BASE_URL || '';

// Default number of questions for quizzes
const DEFAULT_TOTAL = 20
// Delay before auto-advancing to next question after correct answer (ms)
const AUTO_ADVANCE_MS = 1500

/**
 * useAutoAdvance Hook
 * Auto-advances to the next question after correct answer is revealed.
 * Only triggers if revealed=true AND isCorrect=true.
 * Calls advanceFnRef.current() after AUTO_ADVANCE_MS delay.
 *
 * @param {boolean} revealed - Whether the answer feedback is shown
 * @param {React.MutableRefObject<Function>} advanceFnRef - Ref to the advance function
 * @param {boolean} isCorrect - Whether the user's answer was correct
 */
function useAutoAdvance(revealed, advanceFnRef, isCorrect) {
  useEffect(() => {
    // Only auto-advance if the answer was revealed AND is correct
    if (!revealed || !isCorrect) return
    const id = setTimeout(() => advanceFnRef.current(), AUTO_ADVANCE_MS)
    return () => clearTimeout(id)
  }, [revealed, isCorrect])
}

/**
 * useTimer Hook
 * Tracks elapsed time for a quiz question. Maintains start time and running interval.
 * Provides methods to start, stop, and reset the timer.
 *
 * @returns {{elapsed: number, start: Function, stop: Function, reset: Function}}
 *   - elapsed: Current elapsed seconds (updated every 250ms)
 *   - start(): Initialize timer and begin counting
 *   - stop(): Stop timer and return total elapsed seconds
 *   - reset(): Clear timer and set elapsed to 0
 */
function useTimer() {
  // Current elapsed time in seconds, displayed to user
  const [elapsed, setElapsed] = useState(0)
  // Reference to the timestamp when timer started (using Date.now())
  const startRef = useRef(Date.now())
  // Reference to the setInterval ID for cleanup
  const intervalRef = useRef(null)

  /**
   * start(): Initialize and begin the timer
   * Records the current time, resets elapsed to 0, and starts interval updates
   */
  const start = () => {
    startRef.current = Date.now()
    setElapsed(0)
    clearInterval(intervalRef.current)
    // Update displayed elapsed time every 250ms (4x per second for smooth UI)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 250)
  }

  /**
   * stop(): Halt the timer and return the total elapsed time
   * Does NOT reset state; caller typically uses the returned value to record answer time
   */
  const stop = () => {
    clearInterval(intervalRef.current)
    return Math.floor((Date.now() - startRef.current) / 1000)
  }

  /**
   * reset(): Stop interval and clear elapsed time to 0
   * Used when finishing a quiz (stop timer and prepare for cleanup)
   */
  const reset = () => {
    clearInterval(intervalRef.current)
    setElapsed(0)
  }

  // Cleanup: ensure interval is cleared when component unmounts
  useEffect(() => () => clearInterval(intervalRef.current), [])

  return { elapsed, start, stop, reset }
}

/**
 * ResultsTable Component
 * Displays a summary table of all quiz answers: question, user's answer, correct answer, and time.
 * Shows row highlighting: green for correct, red for wrong.
 * Includes total time and average time per question in footer.
 *
 * @param {Object} props
 * @param {Array<{question: string, userAnswer: string, correctAnswer: string|number, correct: boolean, time: number}>} props.results
 *   Array of result objects from quiz attempts. Each has question text, user answer, correct answer, correctness flag, and time in seconds.
 * @returns {ReactElement|null} Table element or null if no results
 */
function ResultsTable({ results }) {
  // Hide table if empty or null
  if (!results || results.length === 0) return null
  // Calculate summary stats
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
            // Row is highlighted green if correct, red if wrong
            <tr key={i} className={r.correct ? 'row-correct' : 'row-wrong'}>
              <td>{i + 1}</td>
              <td>{r.question}</td>
              <td>{r.userAnswer}</td>
              {/* Show checkmark for correct, X with correct answer for wrong */}
              <td>{r.correct ? '✓' : `✗ (${r.correctAnswer})`}</td>
              <td>{r.time}s</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Summary stats at bottom */}
      <div className="results-summary">
        Total time: {totalTime}s &middot; Average: {avgTime}s per question
      </div>
    </div>
  )
}

/**
 * NumPad Component
 * Virtual numeric keypad for touch-friendly numeric input (0-9, ±, backspace).
 * Used in addition, quadratic, multiplication, and other numeric quizzes.
 *
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Callback when user presses a key: receives new value string
 * @param {Function} props.onSubmit - (Optional) Callback when user presses submit key
 * @param {boolean} props.disabled - If true, all buttons are disabled
 */

/**
 * renderFeedback — Renders feedback text. For solve feedback, renders a
 * structured card with highlighted answer and formatted explanation.
 * For normal correct/wrong feedback, renders inline text.
 */
function renderFeedback(feedback, isCorrect) {
  if (!feedback) return null
  const isSolve = isCorrect === false && feedback.startsWith('Solution:')
  if (!isSolve) {
    return <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>{feedback}</div>
  }
  // Parse solve feedback: "Solution: ANSWER\nExplanation..."
  const lines = feedback.split('\n')
  const answerLine = lines[0].replace('Solution: ', '').trim()
  const rawExplanation = lines.slice(1).filter(l => l.trim()).map(l => l.trim())

  // Group lines into steps: lines starting with a keyword or number are step headers
  const steps = []
  for (const line of rawExplanation) {
    // Detect step boundaries: numbered lines, "Step N:", "Answer:", "So,", "Therefore", etc.
    const isStepStart = /^(\d+[\.\):]|Step\s|Answer:|So[, ]|Therefore|Result:|Formula:|First|Next|Then|Finally|Multiply|Divide|Add|Subtract|Convert|Simplify|Calculate|Apply|Using|Problem:)/i.test(line)
    if (isStepStart || steps.length === 0) {
      steps.push(line)
    } else {
      // Append to previous step
      steps[steps.length - 1] += '\n' + line
    }
  }

  return (
    <div className="feedback solve">
      <div className="solve-answer-badge">{answerLine}</div>
      {steps.length > 0 && (
        <div className="solve-timeline">
          {steps.map((step, i) => (
            <div key={i} className="solve-step">
              <div className="solve-step-marker">
                <div className="solve-step-dot" />
                {i < steps.length - 1 && <div className="solve-step-line" />}
              </div>
              <div className="solve-step-content">{step}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * DifficultySlider — Interactive difficulty bar with draggable seeker.
 * Props:
 *   pct        — current position 0-100
 *   onChange   — (newPct: number) => void  called on drag/click with 0-100
 *   maxWidth   — optional, default 260
 */
function DifficultySlider({ pct, onChange, maxWidth = 260 }) {
  const barRef = useRef(null)
  const pctToPos = (p) => Math.min(100, Math.max(0, p))
  const handleInteraction = (clientX) => {
    const bar = barRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const newPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    onChange(newPct)
  }
  const onPointerDown = (e) => {
    e.preventDefault()
    handleInteraction(e.clientX)
    const onMove = (ev) => handleInteraction(ev.clientX)
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  return (
    <div ref={barRef} onPointerDown={onPointerDown} style={{ maxWidth, margin: '0.3rem auto 0.6rem', height: 20, borderRadius: 10, background: 'var(--color-border, #e0e0e0)', position: 'relative', cursor: 'pointer', touchAction: 'none' }}>
      <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 6, borderRadius: 3, background: 'linear-gradient(90deg, #4caf50, #ff9800, #f44336, #9c27b0)' }} />
      <div style={{
        position: 'absolute', top: 1, left: `calc(${pctToPos(pct)}% - 9px)`,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', border: '2.5px solid var(--clr-accent, #e8864a)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left 0.3s ease',
        pointerEvents: 'none'
      }} />
    </div>
  )
}

function NumPad({ value, onChange, onSubmit, disabled, showDecimal, showSlash, showCaret, showX }) {
  /**
   * press(key): Handle numpad key press
   * - '0'-'9': append to value
   * - '±': toggle negative sign (add or remove from start)
   * - '.': append decimal point (only if not already present)
   * - '/': append slash for fractions (only if not already present)
   * - '^': append caret for exponents (only if not already present)
   * - 'x': append variable x
   * - '⌫': delete last character (backspace)
   */
  const press = (key) => {
    if (disabled) return
    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key === '±') {
      onChange(value.startsWith('-') ? value.slice(1) : '-' + value)
    } else if (key === '.') {
      if (!value.includes('.')) onChange(value + '.')
    } else if (key === '/') {
      if (!value.includes('/')) onChange(value + '/')
    } else if (key === '^') {
      onChange(value + '^')
    } else if (key === 'x') {
      onChange(value + 'x')
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
        {showDecimal && <button type="button" className="numpad-key numpad-special" onClick={() => press('.')} disabled={disabled}>.</button>}
        {showSlash && <button type="button" className="numpad-key numpad-special" onClick={() => press('/')} disabled={disabled}>/</button>}
        {showCaret && <button type="button" className="numpad-key numpad-special" onClick={() => press('^')} disabled={disabled}>^</button>}
        {showX && <button type="button" className="numpad-key numpad-special" onClick={() => press('x')} disabled={disabled}>x</button>}
        <button type="button" className="numpad-key numpad-special" onClick={() => press('⌫')} disabled={disabled}>⌫</button>
      </div>
    </div>
  )
}

/**
 * AdaptiveTablesApp Component
 * Implements an adaptive multiplication tables learning system with rolling-window algorithm.
 * Dynamically hides/shows reference table based on student performance.
 * Automatically advances to next table when student demonstrates mastery.
 *
 * === ADAPTATION ALGORITHM ===
 * Uses a rolling window of the last WINDOW (8) answers to evaluate performance:
 *
 * For the current window, calculates:
 *   - accuracy: % of correct answers
 *   - avgTime: average time per question in milliseconds
 *
 * State transitions:
 *   "learning" state (bad performance):
 *     - avgTime ≥ 6000ms OR accuracy < 70%
 *     - Action: Show the reference table, reset advancement counter
 *     - Purpose: Student needs help to avoid frustration
 *
 *   "comfortable" state (medium performance):
 *     - avgTime < 6000ms AND accuracy ≥ 70%
 *     - Action: Hide the table to build confidence, but keep status visible
 *     - Purpose: Student can do it, but might need occasional reference
 *
 *   "mastered" state (excellent performance):
 *     - avgTime < 3000ms AND accuracy ≥ 90%
 *     - First time: Hide table and start advancement counter
 *     - Each subsequent mastered answer (without table): +1 to advancement counter
 *     - When counter reaches ADVANCE_COUNT (5): Advance to next table (2→3→...→20)
 *     - Purpose: Student has internalized the pattern
 *
 * === PERSISTENCE ===
 * Current table progress saved to localStorage[tenali-tables-{studentName}]
 * Allows student to resume from last table on page reload
 *
 * @param {Object} props
 * @param {string} props.studentName - Student's name (used for localStorage key and display)
 */

/**
 * ADAPTATION CONSTANTS
 * These control how aggressive the adaptive algorithm is and when advancement happens
 */
const WINDOW = 8                   // Rolling window: analyze last 8 answers for each table
const FAST_THRESH = 3000           // "Fast" speed threshold for mastery (ms)
const MEDIUM_THRESH = 6000         // "Comfortable" speed threshold (ms)
const ADVANCE_COUNT = 5            // How many consecutive "mastered without table" answers → advance to next table

function AdaptiveTablesApp({ studentName }) {
  // localStorage key for this student's progress: "tenali-tables-{studentName}"
  const storageKey = `tenali-tables-${studentName}`

  // === QUIZ FLOW STATE ===
  // Phases: 'setup' (choose starting table) → 'playing' (answering questions) → 'finished' (mastered all)
  const [phase, setPhase] = useState('setup')

  // Current multiplication table (2–20). Loaded from localStorage if student has previous progress.
  const [currentTable, setCurrentTable] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (saved && saved.currentTable >= 2) return saved.currentTable
    } catch {}
    return 2  // Default to 2× table for new students
  })

  // Starting table selected by student in setup phase (used if restarting)
  const [startTable, setStartTable] = useState(currentTable)

  // === QUIZ RUNTIME STATE ===
  // Current question object: {table, multiplier, answer}
  const [question, setQuestion] = useState(null)
  // User's text input (answer they're typing)
  const [answer, setAnswer] = useState('')
  // Feedback message shown after submission ("Correct! 3 × 4 = 12" or show correct answer)
  const [feedback, setFeedback] = useState('')
  // Boolean: is the current answer correct? (null until revealed)
  const [isCorrect, setIsCorrect] = useState(null)
  // Boolean: has the answer been revealed? (locks input, shows feedback)
  const [revealed, setRevealed] = useState(false)
  // Question counter (1, 2, 3, ...)
  const [questionNum, setQuestionNum] = useState(0)
  // Score: number of correct answers in this session
  const [score, setScore] = useState(0)
  // Timestamp when current question was generated (used to calc response time)
  const [startTime, setStartTime] = useState(null)
  // Array of all results this session: {q, yourAnswer, correct, time, table}
  const [results, setResults] = useState([])

  // === ADAPTIVE ALGORITHM STATE ===
  // Rolling window of recent answers: [{correct: bool, timeMs: number}, ...] (max length WINDOW)
  const [recentWindow, setRecentWindow] = useState([])
  // Boolean: should the reference table (2×1, 2×2, ..., 2×10) be shown?
  const [showTable, setShowTable] = useState(true)
  // Counter: how many consecutive "mastered without table" answers? When ≥ ADVANCE_COUNT, advance.
  const [masteredWithout, setMasteredWithout] = useState(0)
  // Status message shown below header: "Learning — table shown", "Mastered! (3/5 to advance)", etc.
  const [statusMsg, setStatusMsg] = useState('')

  // Ref to the answer input field (for focus management)
  const inputRef = useRef(null)
  // Ref to the "advance to next question" function (used by useAutoAdvance)
  const advanceFnRef = useRef(null)

  /**
   * save(tbl): Persist current table progress to localStorage
   * Allows student to resume from same table if page is reloaded
   */
  const save = (tbl) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ currentTable: tbl })) } catch {}
  }

  /**
   * generateQuestion(tbl): Create a new multiplication question
   * Generates random multiplier (1-10), returns {table, multiplier, answer}
   */
  const generateQuestion = (tbl) => {
    const multiplier = Math.floor(Math.random() * 10) + 1
    return { table: tbl, multiplier, answer: tbl * multiplier }
  }

  /**
   * beginPractice(): Transition from setup → playing phase
   * Initializes all quiz state and generates first question
   * Sets phase to 'playing' with chosen startTable and resets adaptive state
   */
  const beginPractice = () => {
    const tbl = startTable
    setCurrentTable(tbl)
    save(tbl)  // Persist choice to localStorage
    setPhase('playing')  // Move to playing phase
    // Reset all quiz counters and state
    setQuestionNum(0)
    setScore(0)
    setResults([])
    setRecentWindow([])  // Clear adaptive window
    setShowTable(true)   // Start by showing the reference table
    setMasteredWithout(0)  // Reset advancement counter
    setStatusMsg('Learning — table shown')
    // Generate and display first question
    const q = generateQuestion(tbl)
    setQuestion(q)
    setAnswer('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    setStartTime(Date.now())
    setQuestionNum(1)  // First question
    setTimeout(() => inputRef.current?.focus(), 50)  // Focus input field
  }

  /**
   * nextQuestion(tbl?): Advance to the next question
   * Generates new question for table (or currentTable if not specified)
   * Clears previous feedback and resets input state
   */
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

  // Update the advance function ref so useAutoAdvance can call it
  advanceFnRef.current = () => {
    nextQuestion()
  }

  // Auto-advance after correct answer (after AUTO_ADVANCE_MS delay)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Keyboard shortcut: Enter key advances to next question after wrong answer
  // (Auto-advance via useAutoAdvance handles correct answers)
  useEffect(() => {
    if (!revealed || isCorrect) return  // Only listen when wrong answer is revealed
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nextQuestion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, currentTable])

  /**
   * evaluate(window): Analyze rolling window to determine student's mastery level
   *
   * Window must have ≥3 answers to be meaningful; otherwise return default "learning"
   *
   * Calculates:
   *   - accuracy: (correct answers / total answers in window)
   *   - avgTime: average response time in milliseconds
   *
   * Returns classification object: {level, avgTime, accuracy}
   *   level: "mastered" | "comfortable" | "learning"
   *
   * Thresholds:
   *   - "mastered": avgTime < 3000ms AND accuracy ≥ 90%
   *   - "comfortable": avgTime < 6000ms AND accuracy ≥ 70%
   *   - "learning": anything else (student needs the table or more practice)
   */
  const evaluate = (window) => {
    // Not enough data yet; assume learning
    if (window.length < 3) return { level: 'learning', avgTime: Infinity, accuracy: 0 }

    // Calculate accuracy: what % of recent answers were correct?
    const accuracy = window.filter(r => r.correct).length / window.length

    // Calculate average response time in ms
    const avgTime = window.reduce((s, r) => s + r.timeMs, 0) / window.length

    // Determine mastery level based on speed and accuracy thresholds
    if (avgTime < FAST_THRESH && accuracy >= 0.9) return { level: 'mastered', avgTime, accuracy }
    if (avgTime < MEDIUM_THRESH && accuracy >= 0.7) return { level: 'comfortable', avgTime, accuracy }
    return { level: 'learning', avgTime, accuracy }
  }

  /**
   * handleSubmit(e): Process user's answer submission
   * This is the CORE ADAPTATION LOGIC where all decisions are made
   *
   * Flow:
   * 1. Validate answer (must be numeric)
   * 2. Score the answer (correct/incorrect)
   * 3. Add to rolling window
   * 4. Evaluate rolling window to determine new mastery level
   * 5. Adapt (show/hide table, advance tables, update status)
   */
  const handleSubmit = (e) => {
    e.preventDefault()
    if (revealed || !question) return

    // Parse user's answer and compare to correct answer
    const userAns = parseInt(answer, 10)
    const correct = userAns === question.answer
    const elapsed = Date.now() - startTime  // Time taken for this question

    // Reveal the correctness
    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)

    // Generate feedback message with speed label
    const speedLabel = elapsed < FAST_THRESH ? 'fast' : elapsed < MEDIUM_THRESH ? 'ok' : 'slow'
    const fb = correct
      ? `Correct! ${question.table} × ${question.multiplier} = ${question.answer} (${(elapsed / 1000).toFixed(1)}s — ${speedLabel})`
      : `${question.table} × ${question.multiplier} = ${question.answer} (you said ${userAns || '?'})`
    setFeedback(fb)

    // Record result for later display in results table
    setResults(r => [...r, {
      q: `${question.table} × ${question.multiplier}`,
      yourAnswer: answer || '?',
      correct: question.answer,
      isCorrect: correct,
      time: (elapsed / 1000).toFixed(1),
      table: question.table
    }])

    // === ADAPTATION: UPDATE ROLLING WINDOW ===
    // Keep only the last WINDOW answers; discard older ones
    const newWindow = [...recentWindow, { correct, timeMs: elapsed }].slice(-WINDOW)
    setRecentWindow(newWindow)

    // === ADAPTATION: EVALUATE PERFORMANCE ===
    // Analyze the rolling window to determine mastery level
    const { level, avgTime, accuracy } = evaluate(newWindow)

    // === ADAPTATION: DECISION TREE ===
    // Different actions based on current level and whether table is shown

    if (level === 'mastered' && !showTable) {
      // CASE: Student is fast & accurate WITHOUT the table
      // Action: Count this toward advancement threshold
      const newCount = masteredWithout + 1
      setMasteredWithout(newCount)

      if (newCount >= ADVANCE_COUNT) {
        // THRESHOLD REACHED: Student is ready for next table!
        const nextTbl = currentTable + 1
        if (nextTbl <= 20) {
          // Advance to next table (2→3, 3→4, ..., 19→20)
          setCurrentTable(nextTbl)
          save(nextTbl)  // Persist to localStorage
          setRecentWindow([])  // Clear window for fresh evaluation on new table
          setShowTable(true)   // Show table for new level (student learns it first)
          setMasteredWithout(0)  // Reset counter
          setStatusMsg(`Great! Moving to ${nextTbl}× table`)
          // Proceed to next question with new table
          setTimeout(() => nextQuestion(nextTbl), AUTO_ADVANCE_MS)
          return  // Skip normal auto-advance; we're explicitly calling nextQuestion
        } else {
          // nextTbl > 20: Student has finished all tables!
          setPhase('finished')
          return
        }
      }
      // Not yet at threshold; show progress toward advancement
      setStatusMsg(`Mastered! (${newCount}/${ADVANCE_COUNT} to advance) — avg ${(avgTime / 1000).toFixed(1)}s`)

    } else if (level === 'mastered' && showTable) {
      // CASE: Student is fast & accurate WITH the table
      // Action: Hide the table (student doesn't need it) and challenge them to prove it without
      setShowTable(false)
      setMasteredWithout(0)  // Reset counter; next answered without table will start count-up
      setStatusMsg(`Fast & accurate — table hidden! Prove it without help.`)

    } else if (level === 'comfortable') {
      // CASE: Student is doing okay (70-90% accuracy, 3-6s avg time)
      // Action: Hide table to encourage independence, but don't push too hard yet
      if (showTable) {
        setShowTable(false)
        setStatusMsg(`Getting comfortable — table hidden. Avg ${(avgTime / 1000).toFixed(1)}s`)
      } else {
        // Table already hidden; just update status
        setStatusMsg(`Comfortable — avg ${(avgTime / 1000).toFixed(1)}s, ${Math.round(accuracy * 100)}% correct`)
      }
      setMasteredWithout(0)  // Reset advancement counter (not ready yet)

    } else {
      // CASE: Student is still learning (< 70% accuracy or > 6s avg time)
      // Action: Ensure table is shown; reset advancement counter
      if (!showTable) {
        setShowTable(true)
        setStatusMsg(`Needs practice — table shown again`)
      } else {
        setStatusMsg(`Learning — keep practicing with the table`)
      }
      setMasteredWithout(0)  // Reset; student's not ready to advance
    }
  }

  const handleSolve = () => {
    if (!question || revealed) return
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: ${question.table} × ${question.multiplier} = ${question.answer}`)
  }

  /**
   * renderTable(): Render the visual reference multiplication table
   * Shows all 10 multiples (e.g., "2 × 1 = 2", "2 × 2 = 4", ..., "2 × 10 = 20")
   * Only rendered when showTable === true
   */
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

  // ========== RENDER: SETUP PHASE ==========
  // Allow student to choose which table to start from (2–20)
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

  // ========== RENDER: FINISHED PHASE ==========
  // Student has mastered all tables up to 20×
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

  // ========== RENDER: PLAYING PHASE ==========
  // Main quiz interface: show current table (if applicable), question, input, and reference table (if applicable)
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
                {renderFeedback(feedback, isCorrect)}
                {!revealed && (
                  <div className="button-row">
                    <button onClick={handleSolve} disabled={!answer} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
                  </div>
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

/* ── Scaffolded Tables App (Taittiriya) ──────────────────── */
/**
 * ScaffoldedTablesApp Component
 * A scaffolded multiplication quiz designed for a specific student.
 *
 * KEY DESIGN:
 *   - Starts by displaying 3 reference multiplication tables alongside the quiz
 *   - As the student answers faster, tables are removed one at a time
 *   - If the student makes errors after table removal, tables are restored
 *   - Fixed 30 questions per session with progress tracking
 *   - Remembers performance across sessions via localStorage
 *   - Shows average time, score, and per-question results at the end
 *
 * Scaffolding Logic:
 *   - 3 tables shown initially (current table + two neighbors)
 *   - After 5 consecutive fast+correct answers → remove one table
 *   - After 3 errors in the rolling window of 8 → restore one table
 *   - Tables are removed from the outside in (neighbors first, then current)
 *   - Tables are restored from inside out (current first, then neighbors)
 *
 * @param {Object} props
 * @param {string} props.studentName - Student's display name
 */
function ScaffoldedTablesApp({ studentName, defaultTable = 2 }) {
  const storageKey = `tenali-scaffold-${studentName}`

  // ── Constants ────────────────────────────────────────────────────────
  const FAST_MS = 5000                 // "Fast" answer threshold (ms)
  const LEVEL_STREAK = 5              // Fast+correct streak to unlock next level
  const MASTERY_STREAK = 10           // Consecutive correct+fast in Level 5 to master table
  const TOTAL_LEVELS = 5

  // ── App State ────────────────────────────────────────────────────────
  // 'choosing' → 'playing' → 'finished'
  const [appPhase, setAppPhase] = useState('choosing')
  const [currentTable, setCurrentTable] = useState(null)

  // ── Level:
  // 1 = show answer (13×2=26, student types 26)
  // 2 = partial table (5 rows, left or right column only)
  // 3 = shuffled full table (5 rows)
  // 4 = products only (13,26,39...) + reverse Q (13×?=39)
  // 5 = no table at all
  const [level, setLevel] = useState(1)

  // ── Quiz Runtime State ───────────────────────────────────────────────
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [questionNum, setQuestionNum] = useState(0)
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [results, setResults] = useState([])
  const [fastStreak, setFastStreak] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [shuffledRows, setShuffledRows] = useState([])
  const [mastered, setMastered] = useState(false)
  // Level 1: answer opacity (dims over time, disappears on typing)
  const [answerOpacity, setAnswerOpacity] = useState(1)
  const [hasTyped, setHasTyped] = useState(false)

  // ── Promotion Prompt State ─────────────────────────────────────────────
  const [promotionPrompt, setPromotionPrompt] = useState(null)

  // ── Celebration State ──────────────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false)

  // ── Timing tracker for spaced repetition ─────────────────────────────
  // { [multiplier]: { totalTime: ms, count: n } }
  const timingRef = useRef({})

  const recordTiming = (multiplier, elapsed) => {
    const t = timingRef.current
    if (!t[multiplier]) t[multiplier] = { totalTime: 0, count: 0 }
    t[multiplier].totalTime += elapsed
    t[multiplier].count += 1
  }

  const getSlowMultipliers = () => {
    const t = timingRef.current
    const entries = Object.entries(t).filter(([, v]) => v.count > 0)
    if (entries.length < 2) return [] // need enough data
    const totalTime = entries.reduce((s, [, v]) => s + v.totalTime, 0)
    const totalCount = entries.reduce((s, [, v]) => s + v.count, 0)
    const avgTime = totalTime / totalCount
    return entries
      .filter(([, v]) => (v.totalTime / v.count) > avgTime)
      .map(([m]) => parseInt(m, 10))
  }

  // ── Refs ──────────────────────────────────────────────────────────────
  const inputRef = useRef(null)
  const advanceFnRef = useRef(null)
  const celebrationRef = useRef(null)

  /**
   * shuffleArray: Fisher-Yates shuffle
   */
  const shuffleArray = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  /**
   * generateNewShuffledRows(mustInclude): Create shuffled multipliers 1-10,
   * guaranteeing mustInclude is in the first 5 if provided
   */
  const generateNewShuffledRows = (mustInclude) => {
    const all = shuffleArray(Array.from({ length: 10 }, (_, i) => i + 1))
    if (mustInclude && !all.slice(0, 5).includes(mustInclude)) {
      // Swap mustInclude into the first 5
      const idx = all.indexOf(mustInclude)
      const swapIdx = Math.floor(Math.random() * 5)
      ;[all[swapIdx], all[idx]] = [all[idx], all[swapIdx]]
    }
    return all
  }

  /**
   * pickMultiplier(): Pick a multiplier, biased toward slow ones
   * 60% chance to pick from slow multipliers (if any), 40% fully random
   */
  const pickMultiplier = () => {
    const slow = getSlowMultipliers()
    if (slow.length > 0 && Math.random() < 0.6) {
      return slow[Math.floor(Math.random() * slow.length)]
    }
    return Math.floor(Math.random() * 10) + 1
  }

  /**
   * generateQuestion(tbl, lvl): Create a question appropriate for the level
   * Level 1,2,3,5: normal → "13 × 3 = ?" answer = 39
   * Level 4: reverse → "13 × ? = 39" answer = 3 (student finds the multiplier)
   * Biased toward multipliers the student is slower on.
   */
  const generateQuestion = (tbl, lvl) => {
    const multiplier = pickMultiplier()
    const product = tbl * multiplier
    if (lvl === 4) {
      return { table: tbl, multiplier, product, answer: multiplier, reverse: true }
    }
    return { table: tbl, multiplier, product, answer: product, reverse: false }
  }

  /**
   * selectTable(tbl): User picks a table from the chooser screen
   */
  const selectTable = (tbl) => {
    setCurrentTable(tbl)
    setAppPhase('playing')
    setLevel(1)
    setQuestionNum(1)
    setScore(0)
    setResults([])
    setFastStreak(0)
    setMastered(false)
    setPromotionPrompt(null)
    setHasTyped(false)
    setAnswerOpacity(1)
    timingRef.current = {} // reset timing history for new table
    setStatusMsg('Level 1: See the answer, then type it!')
    const q = generateQuestion(tbl, 1)
    setQuestion(q)
    setAnswer('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    setStartTime(Date.now())
    setShuffledRows(generateNewShuffledRows(q.multiplier))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  /**
   * nextQuestion(): Advance to the next question
   */
  const nextQuestion = () => {
    if (mastered) {
      setAppPhase('finished')
      return
    }
    const q = generateQuestion(currentTable, level)
    setQuestion(q)
    setAnswer('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    setHasTyped(false)
    setAnswerOpacity(1)
    setStartTime(Date.now())
    setQuestionNum(n => n + 1)
    // Reshuffle for levels that show partial/shuffled tables
    if (level === 2 || level === 3) {
      setShuffledRows(generateNewShuffledRows(q.multiplier))
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Level 1: dim the answer gradually over 3 seconds
  useEffect(() => {
    if (level !== 1 || !question || revealed || hasTyped) return
    setAnswerOpacity(1)
    const interval = setInterval(() => {
      setAnswerOpacity(prev => {
        const next = prev - 0.05
        if (next <= 0) { clearInterval(interval); return 0 }
        return next
      })
    }, 150) // 20 steps × 150ms = 3 seconds to fully dim
    return () => clearInterval(interval)
  }, [level, question, revealed, hasTyped])

  // Don't auto-advance when promotion prompt is showing
  advanceFnRef.current = () => { if (!promotionPrompt) nextQuestion() }
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter key accepts promotion when prompt is showing
  useEffect(() => {
    if (!promotionPrompt) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); acceptPromotion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [promotionPrompt])

  useEffect(() => {
    if (!revealed || isCorrect || promotionPrompt) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nextQuestion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, questionNum, promotionPrompt])

  /**
   * handleSubmit(e): Process answer and level progression
   *
   * L1 → L2: After LEVEL_STREAK consecutive fast+correct
   * L2 → L3: After LEVEL_STREAK consecutive fast+correct
   * L3 → L4: After LEVEL_STREAK consecutive fast+correct
   * L4 mastery: After MASTERY_STREAK consecutive fast+correct
   */
  const handleSubmit = (e) => {
    e.preventDefault()
    if (revealed || !question) return

    const userAns = parseInt(answer, 10)
    const correct = userAns === question.answer
    const elapsed = Date.now() - startTime
    const fast = elapsed < FAST_MS

    // Record timing for spaced repetition (track actual multiplier regardless of question type)
    recordTiming(question.multiplier, elapsed)

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)

    // Build feedback string
    const qStr = question.reverse
      ? `${question.table} × ${question.answer} = ${question.product}`
      : `${question.table} × ${question.multiplier} = ${question.product}`
    const fb = correct
      ? `Correct! ${qStr} (${(elapsed / 1000).toFixed(1)}s)`
      : `${qStr} (you said ${userAns || '?'})`
    setFeedback(fb)

    const promptStr = question.reverse
      ? `${question.table} × ? = ${question.product}`
      : `${question.table} × ${question.multiplier}`
    setResults(r => [...r, {
      prompt: promptStr,
      userAnswer: answer || '?',
      correctAnswer: String(question.answer),
      correct,
      time: (elapsed / 1000).toFixed(1)
    }])

    // ── LEVEL PROGRESSION LOGIC ──────────────────────────────────────
    if (correct && fast) {
      const newStreak = fastStreak + 1
      setFastStreak(newStreak)

      if (level < 5) {
        if (newStreak >= LEVEL_STREAK) {
          setPromotionPrompt({ from: level, to: level + 1 })
          setStatusMsg('You\'re ready to level up!')
        } else {
          setStatusMsg(`Level ${level}: Streak ${newStreak}/${LEVEL_STREAK}`)
        }
      } else {
        // Level 5
        if (newStreak >= MASTERY_STREAK) {
          setPromotionPrompt({ from: 5, to: 'mastered' })
          setStatusMsg('You\'re ready to level up!')
        } else {
          setStatusMsg(`Level 5: ${newStreak}/${MASTERY_STREAK} to master!`)
        }
      }
    } else {
      setFastStreak(0)
      if (!correct) {
        setStatusMsg(`Incorrect. ${level <= 4 ? 'Check the reference and try again!' : 'Keep going!'}`)
      } else {
        setStatusMsg(`Correct but slow (${(elapsed / 1000).toFixed(1)}s). Under ${FAST_MS / 1000}s to count!`)
      }
    }
  }

  /**
   * Level descriptions for promotion prompts
   */
  const levelInfo = {
    2: { title: 'Half Table', desc: 'Only 5 rows shown — half the table to work with!' },
    3: { title: 'Shuffled Tables', desc: 'Full equations but shuffled randomly each time.' },
    4: { title: 'Reverse Challenge', desc: 'Just the products (13, 26, 39...) shown. You answer: 13 × ? = 39' },
    5: { title: 'No Table!', desc: 'No reference at all — answer from memory!' },
    mastered: { title: 'Table Mastered!', desc: 'You can see your results or keep practicing.' }
  }

  const acceptPromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    if (promo.to === 'mastered') {
      setMastered(true)
      setShowCelebration(true)
      setStatusMsg(`MASTERED! ${MASTERY_STREAK} in a row!`)
      setAppPhase('finished')
    } else {
      setLevel(promo.to)
      setFastStreak(0)
      setHasTyped(false)
      setAnswerOpacity(1)
      const q = generateQuestion(currentTable, promo.to)
      setQuestion(q)
      if (promo.to === 2 || promo.to === 3) setShuffledRows(generateNewShuffledRows(q.multiplier))
      setStatusMsg(`Level ${promo.to}: ${levelInfo[promo.to].title}`)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      setStartTime(Date.now())
      setQuestionNum(n => n + 1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const declinePromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    setFastStreak(0)
    setStatusMsg(`Staying at Level ${promo.from}. Keep practicing!`)
    nextQuestion()
  }

  /**
   * Confetti celebration effect — launches when student masters a table
   */
  useEffect(() => {
    if (!showCelebration || !celebrationRef.current) return
    const canvas = celebrationRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff9f43', '#00d2d3']
    const confetti = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 12 + 6,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10
    }))
    let frame
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let allDone = true
      confetti.forEach(c => {
        c.x += c.vx
        c.y += c.vy
        c.rot += c.rotSpeed
        c.vy += 0.05
        if (c.y < canvas.height + 50) allDone = false
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate((c.rot * Math.PI) / 180)
        ctx.fillStyle = c.color
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
        ctx.restore()
      })
      if (!allDone) frame = requestAnimationFrame(animate)
    }
    animate()
    return () => { if (frame) cancelAnimationFrame(frame) }
  }, [showCelebration, appPhase])

  /**
   * renderRefTable(): Render ordered reference table (Phase 1)
   */
  const renderRefTable = () => (
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

  /**
   * renderShuffledRefTable(): Render shuffled reference table (Phase 2)
   */
  const renderShuffledRefTable = () => (
    <div className="ref-table">
      <div className="ref-table-title">{currentTable} × Table (shuffled)</div>
      <div className="ref-table-rows">
        {shuffledRows.map(m => (
          <div key={m} className="ref-table-row">
            <span>{currentTable} × {m}</span>
            <span>= {currentTable * m}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const computeAvgTime = () => {
    if (results.length === 0) return '0.0'
    const totalTime = results.reduce((sum, r) => sum + parseFloat(r.time), 0)
    return (totalTime / results.length).toFixed(1)
  }

  // ══════════ RENDER: TABLE CHOOSER ══════════
  if (appPhase === 'choosing') {
    return (
      <div className="app-shell">
        <div className="card">
          <h1>Tenali's Tables Desk</h1>
          <p style={{ textAlign: 'center', color: 'var(--clr-text-soft)', margin: '0.5rem 0 1.5rem' }}>
            Pick a table to practice:
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
            maxWidth: '320px',
            margin: '0 auto'
          }}>
            {Array.from({ length: 18 }, (_, i) => i + 2).map(n => (
              <button
                key={n}
                onClick={() => selectTable(n)}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid var(--clr-accent)',
                  background: 'var(--clr-surface)',
                  color: 'var(--clr-accent)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { e.target.style.background = 'var(--clr-accent)'; e.target.style.color = '#fff' }}
                onMouseLeave={e => { e.target.style.background = 'var(--clr-surface)'; e.target.style.color = 'var(--clr-accent)' }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: FINISHED (MASTERED) ══════════
  if (appPhase === 'finished') {
    const nextTable = currentTable < 19 ? currentTable + 1 : null
    return (
      <div className="app-shell">
        {showCelebration && (
          <canvas
            ref={celebrationRef}
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}
          />
        )}
        <div className="card">
          <h1 style={{ fontSize: '2rem' }}>
            {studentName} MASTERED {currentTable}x!
          </h1>
          <div className="welcome-box">
            <p style={{ fontSize: '3rem', margin: '0.5rem 0' }}>
              {['🎉','🏆','⭐','🌟','🎊'][Math.floor(Math.random() * 5)]}
            </p>
            <p className="welcome-text" style={{ fontSize: '1.3rem', color: 'var(--clr-accent)' }}>
              Fantastic work! You nailed {PHASE3_MASTERY_STREAK} in a row!
            </p>
            <p className="final-score">Score: {score}/{questionNum}</p>
            <p style={{ fontSize: '1.1rem', margin: '0.5rem 0', color: 'var(--clr-accent)' }}>
              Average time: {computeAvgTime()}s per question
            </p>
            {nextTable && (
              <p style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem', fontWeight: 600 }}>
                Ready to try the {nextTable}x table next?
              </p>
            )}
            <div className="results-table" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Your Answer</th>
                    <th>Correct</th>
                    <th>Time</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={r.correct ? 'result-correct' : 'result-wrong'}>
                      <td>{i + 1}</td>
                      <td>{r.prompt}</td>
                      <td>{r.userAnswer}</td>
                      <td>{r.correctAnswer}</td>
                      <td>{r.time}s</td>
                      <td>{r.correct ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="button-row" style={{ marginTop: '1rem', gap: '0.5rem', display: 'flex', justifyContent: 'center' }}>
              {nextTable && (
                <button onClick={() => { setShowCelebration(false); selectTable(nextTable) }}>
                  Start {nextTable}x Table
                </button>
              )}
              <button
                onClick={() => { setShowCelebration(false); setAppPhase('choosing') }}
                style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}
              >
                Pick Another Table
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: PLAYING ══════════
  return (
    <div className="app-shell">
      {showCelebration && (
        <canvas
          ref={celebrationRef}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}
        />
      )}
      <div className="card" style={{ padding: '0.75rem', maxWidth: '400px' }}>
        {/* Compact header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-soft)' }}>
            {currentTable}x | Q{questionNum} | {score} correct
          </span>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
            background: level === 5 ? 'var(--clr-accent)' : 'var(--clr-surface)',
            color: level === 5 ? '#fff' : 'var(--clr-text-soft)',
            border: '1px solid var(--clr-border)'
          }}>
            Level {level}/{TOTAL_LEVELS}
          </span>
        </div>

        {/* Promotion prompt */}
        {promotionPrompt && (
          <div style={{
            textAlign: 'center', padding: '1.5rem 1rem', margin: '0.5rem 0',
            borderRadius: '12px', background: 'var(--clr-surface)', border: '2px solid var(--clr-accent)'
          }}>
            <p style={{ fontSize: '1.5rem', margin: '0 0 0.3rem' }}>
              {promotionPrompt.to === 'mastered' ? '🏆' : '🎉'}
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text)', margin: '0 0 0.3rem' }}>
              {promotionPrompt.to === 'mastered'
                ? `${MASTERY_STREAK} in a row! You mastered it!`
                : `Ready for Level ${promotionPrompt.to}?`}
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--clr-accent)', margin: '0 0 0.2rem' }}>
              {levelInfo[promotionPrompt.to]?.title}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)', margin: '0 0 1rem' }}>
              {levelInfo[promotionPrompt.to]?.desc}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button onClick={acceptPromotion} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', fontWeight: 700 }}>
                {promotionPrompt.to === 'mastered' ? 'See Results' : 'Level Up!'}
              </button>
              <button onClick={declinePromotion} style={{
                padding: '0.6rem 1.2rem', fontSize: '1rem', background: 'transparent',
                border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)'
              }}>
                {promotionPrompt.to === 'mastered' ? 'Keep Practicing' : 'Stay Here'}
              </button>
            </div>
          </div>
        )}

        {/* Question — on top, big */}
        {!promotionPrompt && question && (
          <div style={{
            textAlign: 'center', fontSize: '2rem', fontWeight: 800, padding: '0.5rem 0',
            color: 'var(--clr-text)', fontFamily: 'var(--font-display)'
          }}>
            {level === 1
              ? <>{question.table} × {question.multiplier} = <span style={{ opacity: answerOpacity, transition: 'opacity 0.15s' }}>{question.product}</span></>
              : question.reverse
                ? <>{question.table} × <span style={{ color: 'var(--clr-accent)' }}>?</span> = {question.product}</>
                : <>{question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>?</span></>
            }
          </div>
        )}

        {/* Reference table — varies by level */}
        {!promotionPrompt && level >= 2 && level <= 4 && (() => {
          const pad = (n) => String(n).padStart(String(currentTable * 10).length, '\u2007')

          // Level 4: products only
          if (level === 4) {
            const products = Array.from({ length: 10 }, (_, i) => currentTable * (i + 1))
            return (
              <div style={{
                margin: '0.4rem 0', padding: '0.5rem 0.8rem', borderRadius: '8px',
                background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600 }}>
                  {currentTable}x products
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center',
                  fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--clr-text)'
                }}>
                  {products.map((p, i) => (
                    <span key={i} style={{
                      padding: '2px 8px', borderRadius: '6px',
                      background: 'var(--clr-bg)', border: '1px solid var(--clr-border)'
                    }}>{p}</span>
                  ))}
                </div>
              </div>
            )
          }

          // Level 2: half table — 5 complete rows in a single column
          if (level === 2) {
            const rows = shuffledRows.slice(0, 5)
            return (
              <div style={{
                margin: '0.4rem 0', padding: '0.6rem 0.8rem', borderRadius: '8px',
                background: 'var(--clr-surface)', border: '1px solid var(--clr-border)'
              }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 600,
                  alignItems: 'center'
                }}>
                  {rows.map(m => (
                    <div key={m} style={{ display: 'flex', color: 'var(--clr-text)', whiteSpace: 'pre' }}>
                      <span style={{ minWidth: '4.5ch', textAlign: 'right' }}>{currentTable} × {String(m).padStart(2, '\u2007')}</span>
                      <span style={{ color: 'var(--clr-text)', fontWeight: 700, marginLeft: '0.4ch' }}> = {pad(currentTable * m)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          // Level 3: shuffled full table (5 rows, both sides)
          const rows = shuffledRows.slice(0, 5)
          return (
            <div style={{
              margin: '0.4rem 0', padding: '0.6rem 0.8rem', borderRadius: '8px',
              background: 'var(--clr-surface)', border: '1px solid var(--clr-border)'
            }}>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600 }}>shuffled</div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 1.5rem',
                fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 600
              }}>
                {rows.map(m => (
                  <div key={m} style={{ display: 'flex', color: 'var(--clr-text)', whiteSpace: 'pre' }}>
                    <span style={{ minWidth: '4.5ch', textAlign: 'right' }}>{currentTable} × {String(m).padStart(2, '\u2007')}</span>
                    <span style={{ color: 'var(--clr-text)', fontWeight: 700, marginLeft: '0.4ch' }}> = {pad(currentTable * m)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Answer input */}
        {!promotionPrompt && question && (
          <div style={{ marginTop: '0.4rem' }}>
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                className="answer-input"
                type="text"
                inputMode="numeric"
                value={answer}
                onChange={e => {
                  if (/^-?\d*$/.test(e.target.value)) {
                    setAnswer(e.target.value)
                    if (level === 1 && !hasTyped && e.target.value) {
                      setHasTyped(true)
                      setAnswerOpacity(0)
                    }
                  }
                }}
                placeholder="?"
                disabled={revealed}
                autoFocus
                style={{ fontSize: '1.5rem', textAlign: 'center', width: '100%', padding: '0.6rem' }}
              />
              {!revealed && (
                <div className="button-row" style={{ marginTop: '0.4rem' }}>
                  <button type="submit" disabled={!answer} style={{ width: '100%', padding: '0.6rem' }}>Check</button>
                </div>
              )}
            </form>
            {renderFeedback(feedback, isCorrect)}
            {revealed && !mastered && (
              <div className="button-row" style={{ marginTop: '0.3rem' }}>
                <button onClick={() => nextQuestion()} style={{ width: '100%', padding: '0.6rem' }}>Next</button>
              </div>
            )}
            {revealed && mastered && (
              <div className="button-row" style={{ marginTop: '0.3rem' }}>
                <button onClick={() => nextQuestion()} style={{ width: '100%', padding: '0.6rem' }}>See Results</button>
              </div>
            )}
          </div>
        )}

        {/* Status message */}
        {!promotionPrompt && statusMsg && (
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--clr-text-soft)', margin: '0.5rem 0 0', fontWeight: 500 }}>
            {statusMsg}
          </p>
        )}

        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <button
            onClick={() => setAppPhase('choosing')}
            style={{ background: 'transparent', border: 'none', color: 'var(--clr-text-soft)', fontSize: '0.75rem', padding: '0.3rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Change table
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Yazdan's 10-Level Tables App ──────────────────────────── */
/**
 * YazdanTablesApp — 10-level progressive multiplication mastery
 *
 * L1:  3 shuffled cards face-up, answer 1 question (×7 rounds)
 * L2:  5 shuffled cards face-up, answer 1 question (×5 rounds)
 * L3:  Ordered questions, answer fades out (×10)
 * L4:  Shuffled questions, answer fades out (×10)
 * L5:  MCQ with 4 options (×5)
 * L6:  10 shuffled cards face-up, answer 1 question (×5)
 * L7:  Reverse questions, answer fades (×10)
 * L8:  Fill in the blank — no hints (×5)
 * L9:  Match the following — 5 pairs
 * L10: Mixed final challenge — all formats (×10)
 */
function YazdanTablesApp({ studentName }) {
  const TOTAL_LEVELS = 10
  const FAST_MS = 6000
  const FADE_DURATION = 3000 // ms for answer to fully fade

  const ROUNDS_PER_LEVEL = { 1: 7, 2: 5, 3: 10, 4: 10, 5: 5, 6: 5, 7: 10, 8: 5, 9: 5, 10: 10 }

  // ── State ────────────────────────────────────────────────────────────
  const [appPhase, setAppPhase] = useState('choosing') // choosing | playing | promotion | finished
  const [currentTable, setCurrentTable] = useState(null)
  const [level, setLevel] = useState(1)
  const [round, setRound] = useState(0) // current round within level (1-based)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [results, setResults] = useState([])

  // Round-specific state
  const [cards, setCards] = useState([])        // cards shown (L1,2,6)
  const [question, setQuestion] = useState(null) // current question
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [answerOpacity, setAnswerOpacity] = useState(1)

  // MCQ state (L5, L10)
  const [mcqOptions, setMcqOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)

  // Match state (L9, L10)
  const [matchPairs, setMatchPairs] = useState([])
  const [matchAnswers, setMatchAnswers] = useState([])
  const [matchSelections, setMatchSelections] = useState({}) // { questionIdx: answerIdx }
  const [activeMatchQ, setActiveMatchQ] = useState(null)
  const [matchRevealed, setMatchRevealed] = useState(false)

  // L10 mixed mode
  const [mixedFormat, setMixedFormat] = useState(null) // 'standard' | 'mcq' | 'fill' | 'match'

  // Promotion
  const [promotionPrompt, setPromotionPrompt] = useState(null)

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false)

  const inputRef = useRef(null)
  const advanceFnRef = useRef(null)
  const celebrationRef = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────────
  const shuffleArray = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const allMultipliers = () => Array.from({ length: 10 }, (_, i) => i + 1)

  const pickRandom = (arr, n) => shuffleArray(arr).slice(0, n)

  const generateMCQOptions = (tbl, correctAnswer) => {
    const opts = new Set([correctAnswer])
    while (opts.size < 4) {
      // Generate plausible wrong answers: nearby products or common mistakes
      const strategies = [
        () => correctAnswer + Math.floor(Math.random() * 5) + 1,
        () => correctAnswer - Math.floor(Math.random() * 5) - 1,
        () => tbl * (Math.floor(Math.random() * 10) + 1),
        () => correctAnswer + tbl,
        () => correctAnswer - tbl,
      ]
      const val = strategies[Math.floor(Math.random() * strategies.length)]()
      if (val > 0 && val !== correctAnswer) opts.add(val)
    }
    return shuffleArray([...opts])
  }

  // ── Level Setup ─────────────────────────────────────────────────────
  const setupRound = (tbl, lvl, roundNum) => {
    setRevealed(false)
    setFeedback('')
    setIsCorrect(null)
    setAnswer('')
    setSelectedOption(null)
    setStartTime(Date.now())
    setMatchRevealed(false)
    setActiveMatchQ(null)

    if (lvl === 1 || lvl === 2 || lvl === 6) {
      // Card-based levels
      const numCards = lvl === 1 ? 3 : lvl === 2 ? 5 : 10
      const mults = pickRandom(allMultipliers(), numCards)
      const cardSet = mults.map(m => ({ multiplier: m, product: tbl * m }))
      setCards(cardSet)
      const picked = cardSet[Math.floor(Math.random() * cardSet.length)]
      setQuestion({ table: tbl, multiplier: picked.multiplier, answer: picked.product, reverse: false })
    } else if (lvl === 3) {
      // Ordered questions with fading
      const m = roundNum // 1-based, so questions go 1×tbl, 2×tbl...
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, reverse: false, fading: true })
      setAnswerOpacity(1)
    } else if (lvl === 4) {
      // Shuffled questions with fading
      const m = Math.floor(Math.random() * 10) + 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, reverse: false, fading: true })
      setAnswerOpacity(1)
    } else if (lvl === 5) {
      // MCQ
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      setQuestion({ table: tbl, multiplier: m, answer: product, reverse: false })
      setMcqOptions(generateMCQOptions(tbl, product))
    } else if (lvl === 7) {
      // Reverse questions with fading
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      setQuestion({ table: tbl, multiplier: m, answer: m, product, reverse: true, fading: true })
      setAnswerOpacity(1)
    } else if (lvl === 8) {
      // Fill in the blank
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      // Randomly choose blank position
      const blankType = ['multiplier', 'product'][Math.floor(Math.random() * 2)]
      if (blankType === 'multiplier') {
        setQuestion({ table: tbl, multiplier: m, answer: m, product, blankType: 'multiplier' })
      } else {
        setQuestion({ table: tbl, multiplier: m, answer: product, product, blankType: 'product' })
      }
    } else if (lvl === 9) {
      // Match the following
      const mults = pickRandom(allMultipliers(), 5)
      const pairs = mults.map(m => ({ multiplier: m, product: tbl * m }))
      setMatchPairs(pairs)
      setMatchAnswers(shuffleArray(pairs.map(p => p.product)))
      setMatchSelections({})
      setQuestion(null) // no single question
    } else if (lvl === 10) {
      // Mixed — pick a random format
      const formats = ['standard', 'mcq', 'fill', 'match']
      const fmt = formats[Math.floor(Math.random() * formats.length)]
      setMixedFormat(fmt)
      if (fmt === 'standard') {
        const m = Math.floor(Math.random() * 10) + 1
        setQuestion({ table: tbl, multiplier: m, answer: tbl * m, reverse: false })
      } else if (fmt === 'mcq') {
        const m = Math.floor(Math.random() * 10) + 1
        const product = tbl * m
        setQuestion({ table: tbl, multiplier: m, answer: product, reverse: false })
        setMcqOptions(generateMCQOptions(tbl, product))
      } else if (fmt === 'fill') {
        const m = Math.floor(Math.random() * 10) + 1
        const product = tbl * m
        const blankType = ['multiplier', 'product'][Math.floor(Math.random() * 2)]
        if (blankType === 'multiplier') {
          setQuestion({ table: tbl, multiplier: m, answer: m, product, blankType: 'multiplier' })
        } else {
          setQuestion({ table: tbl, multiplier: m, answer: product, product, blankType: 'product' })
        }
      } else {
        // match
        const mults = pickRandom(allMultipliers(), 5)
        const pairs = mults.map(m => ({ multiplier: m, product: tbl * m }))
        setMatchPairs(pairs)
        setMatchAnswers(shuffleArray(pairs.map(p => p.product)))
        setMatchSelections({})
        setQuestion(null)
      }
    }

    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Table Selection ─────────────────────────────────────────────────
  const selectTable = (tbl) => {
    setCurrentTable(tbl)
    setAppPhase('playing')
    setLevel(1)
    setRound(1)
    setScore(0)
    setTotalAnswered(0)
    setResults([])
    setShowCelebration(false)
    setPromotionPrompt(null)
    setStatusMsg('Level 1: Find the answer on the cards!')
    setupRound(tbl, 1, 1)
  }

  // ── Fading Effect for L3, L4, L7 ───────────────────────────────────
  useEffect(() => {
    if (!question?.fading || revealed) return
    setAnswerOpacity(1)
    const steps = 20
    const interval = setInterval(() => {
      setAnswerOpacity(prev => {
        const next = prev - (1 / steps)
        if (next <= 0) { clearInterval(interval); return 0 }
        return next
      })
    }, FADE_DURATION / steps)
    return () => clearInterval(interval)
  }, [question, revealed])

  // ── Advance Logic ──────────────────────────────────────────────────
  const advance = () => {
    if (promotionPrompt) return
    const maxRounds = ROUNDS_PER_LEVEL[level]
    if (round >= maxRounds) {
      // Level complete — show promotion
      setPromotionPrompt({ from: level, to: level < TOTAL_LEVELS ? level + 1 : 'mastered' })
      setStatusMsg(level < TOTAL_LEVELS ? 'Ready to level up!' : 'You did it!')
    } else {
      const nextRound = round + 1
      setRound(nextRound)
      setupRound(currentTable, level, nextRound)
    }
  }

  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter during promotion = accept
  useEffect(() => {
    if (!promotionPrompt) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); acceptPromotion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [promotionPrompt])

  // Enter after wrong answer = next
  useEffect(() => {
    if (!revealed || isCorrect || promotionPrompt) return
    const isMatchLevel = level === 9 || (level === 10 && mixedFormat === 'match')
    if (isMatchLevel) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, round, promotionPrompt])

  // ── Submit (for typed answers: L3,4,7,8, L10 standard/fill) ────────
  const handleSubmit = (e) => {
    e?.preventDefault()
    if (revealed || !question) return

    const userAns = parseInt(answer, 10)
    const correct = userAns === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)

    const qLabel = question.reverse
      ? `${question.table} × ? = ${question.product}`
      : question.blankType === 'multiplier'
        ? `${question.table} × ___ = ${question.product}`
        : question.blankType === 'product'
          ? `${question.table} × ${question.multiplier} = ___`
          : `${question.table} × ${question.multiplier}`

    setFeedback(correct
      ? `Correct! (${(elapsed / 1000).toFixed(1)}s)`
      : `Answer: ${question.answer}`)

    setResults(r => [...r, { prompt: qLabel, userAnswer: answer || '?', correctAnswer: String(question.answer), correct, time: (elapsed / 1000).toFixed(1) }])
  }

  // ── Submit for card-based levels (L1,2,6) ──────────────────────────
  const handleCardSubmit = (e) => {
    e?.preventDefault()
    if (revealed || !question) return
    const userAns = parseInt(answer, 10)
    const correct = userAns === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)
    setFeedback(correct ? `Correct! (${(elapsed / 1000).toFixed(1)}s)` : `Answer: ${question.answer}`)
    setResults(r => [...r, { prompt: `${question.table} × ${question.multiplier}`, userAnswer: answer || '?', correctAnswer: String(question.answer), correct, time: (elapsed / 1000).toFixed(1) }])
  }

  // ── MCQ Selection (L5, L10 mcq) ────────────────────────────────────
  const handleMCQSelect = (opt) => {
    if (revealed) return
    setSelectedOption(opt)
    const correct = opt === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)
    setFeedback(correct ? `Correct! (${(elapsed / 1000).toFixed(1)}s)` : `Answer: ${question.answer}`)
    setResults(r => [...r, { prompt: `${question.table} × ${question.multiplier}`, userAnswer: String(opt), correctAnswer: String(question.answer), correct, time: (elapsed / 1000).toFixed(1) }])
  }

  // ── Match Selection (L9, L10 match) ─────────────────────────────────
  const handleMatchSelect = (qIdx, aIdx) => {
    if (matchRevealed) return
    setMatchSelections(prev => ({ ...prev, [qIdx]: aIdx }))
  }

  const handleMatchSubmit = () => {
    if (matchRevealed) return
    const elapsed = Date.now() - startTime
    setMatchRevealed(true)
    let correctCount = 0
    matchPairs.forEach((pair, i) => {
      const selectedAnsIdx = matchSelections[i]
      if (selectedAnsIdx !== undefined && matchAnswers[selectedAnsIdx] === pair.product) {
        correctCount++
      }
    })
    const allCorrect = correctCount === matchPairs.length
    setIsCorrect(allCorrect)
    setRevealed(true)
    setScore(s => s + correctCount)
    setTotalAnswered(t => t + matchPairs.length)
    setFeedback(allCorrect ? `All matched! (${(elapsed / 1000).toFixed(1)}s)` : `${correctCount}/${matchPairs.length} correct`)

    matchPairs.forEach((pair, i) => {
      const selectedAnsIdx = matchSelections[i]
      const userAns = selectedAnsIdx !== undefined ? matchAnswers[selectedAnsIdx] : '?'
      setResults(r => [...r, { prompt: `${currentTable} × ${pair.multiplier}`, userAnswer: String(userAns), correctAnswer: String(pair.product), correct: userAns === pair.product, time: (elapsed / 1000).toFixed(1) }])
    })
  }

  // ── Promotion ──────────────────────────────────────────────────────
  const levelDescriptions = {
    1: '3 Cards — Find the answer',
    2: '5 Cards — Scan and find',
    3: 'Ordered — Answer fades away',
    4: 'Shuffled — Answer fades away',
    5: 'Multiple Choice — Pick the right one',
    6: '10 Cards — Full table scan',
    7: 'Reverse — Find the multiplier',
    8: 'Fill in the Blank — No hints',
    9: 'Match the Following — Connect pairs',
    10: 'Mixed Challenge — All formats!'
  }

  const acceptPromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    if (promo.to === 'mastered') {
      setShowCelebration(true)
      setAppPhase('finished')
    } else {
      setLevel(promo.to)
      setRound(1)
      setStatusMsg(`Level ${promo.to}: ${levelDescriptions[promo.to]}`)
      setupRound(currentTable, promo.to, 1)
    }
  }

  const declinePromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    setRound(1)
    setStatusMsg(`Staying at Level ${promo.from}. More practice!`)
    setupRound(currentTable, promo.from, 1)
  }

  // ── Confetti ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!showCelebration || !celebrationRef.current) return
    const canvas = celebrationRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff9f43', '#00d2d3']
    const confetti = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width, y: -Math.random() * canvas.height,
      w: Math.random() * 12 + 6, h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
      rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10
    }))
    let frame
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let allDone = true
      confetti.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rot += c.rotSpeed; c.vy += 0.05
        if (c.y < canvas.height + 50) allDone = false
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((c.rot * Math.PI) / 180)
        ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore()
      })
      if (!allDone) frame = requestAnimationFrame(animate)
    }
    animate()
    return () => { if (frame) cancelAnimationFrame(frame) }
  }, [showCelebration, appPhase])

  // ── Computed ───────────────────────────────────────────────────────
  const isMatchLevel = level === 9 || (level === 10 && mixedFormat === 'match')
  const isCardLevel = level === 1 || level === 2 || level === 6
  const isMCQLevel = level === 5 || (level === 10 && mixedFormat === 'mcq')
  const isTypedLevel = [3, 4, 7, 8].includes(level) || (level === 10 && ['standard', 'fill'].includes(mixedFormat))
  const maxRounds = ROUNDS_PER_LEVEL[level]

  // ══════════ RENDER: TABLE CHOOSER ══════════
  if (appPhase === 'choosing') {
    return (
      <div className="app-shell">
        <div className="card">
          <h1>{studentName}'s Levels (Tables)</h1>
          <p style={{ textAlign: 'center', color: 'var(--clr-text-soft)', margin: '0.5rem 0 1.5rem' }}>
            Pick a table to master:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', maxWidth: '320px', margin: '0 auto' }}>
            {Array.from({ length: 18 }, (_, i) => i + 2).map(n => (
              <button key={n} onClick={() => selectTable(n)}
                style={{ fontSize: '1.5rem', fontWeight: 700, padding: '1rem', borderRadius: '12px', border: '2px solid var(--clr-accent)', background: 'var(--clr-surface)', color: 'var(--clr-accent)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.background = 'var(--clr-accent)'; e.target.style.color = '#fff' }}
                onMouseLeave={e => { e.target.style.background = 'var(--clr-surface)'; e.target.style.color = 'var(--clr-accent)' }}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: FINISHED ══════════
  if (appPhase === 'finished') {
    return (
      <div className="app-shell">
        {showCelebration && <canvas ref={celebrationRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }} />}
        <div className="card">
          <h1 style={{ fontSize: '2rem' }}>{studentName} MASTERED {currentTable}x!</h1>
          <div className="welcome-box">
            <p style={{ fontSize: '3rem', margin: '0.5rem 0' }}>🏆</p>
            <p className="final-score">Score: {score}/{totalAnswered}</p>
            <div className="results-table" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              <table><thead><tr><th>#</th><th>Question</th><th>You</th><th>Answer</th><th>Time</th><th></th></tr></thead>
                <tbody>{results.map((r, i) => (
                  <tr key={i} className={r.correct ? 'result-correct' : 'result-wrong'}>
                    <td>{i + 1}</td><td>{r.prompt}</td><td>{r.userAnswer}</td><td>{r.correctAnswer}</td><td>{r.time}s</td><td>{r.correct ? '✓' : '✗'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="button-row" style={{ marginTop: '1rem', gap: '0.5rem', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setAppPhase('choosing')}>Pick Another Table</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: PLAYING ══════════
  return (
    <div className="app-shell">
      <div className="card" style={{ padding: '0.75rem', maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-soft)' }}>
            {currentTable}x | R{round}/{maxRounds} | {score} correct
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: level >= 8 ? 'var(--clr-accent)' : 'var(--clr-surface)', color: level >= 8 ? '#fff' : 'var(--clr-text-soft)', border: '1px solid var(--clr-border)' }}>
            Level {level}/{TOTAL_LEVELS}
          </span>
        </div>

        {/* ── Promotion Prompt ── */}
        {promotionPrompt && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', margin: '0.5rem 0', borderRadius: '12px', background: 'var(--clr-surface)', border: '2px solid var(--clr-accent)' }}>
            <p style={{ fontSize: '1.5rem', margin: '0 0 0.3rem' }}>{promotionPrompt.to === 'mastered' ? '🏆' : '🎉'}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text)', margin: '0 0 0.3rem' }}>
              {promotionPrompt.to === 'mastered' ? 'All 10 Levels Complete!' : `Ready for Level ${promotionPrompt.to}?`}
            </p>
            {promotionPrompt.to !== 'mastered' && (
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--clr-accent)', margin: '0 0 0.2rem' }}>
                {levelDescriptions[promotionPrompt.to]}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.8rem' }}>
              <button onClick={acceptPromotion} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', fontWeight: 700 }}>
                {promotionPrompt.to === 'mastered' ? 'See Results' : 'Level Up!'}
              </button>
              <button onClick={declinePromotion} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>
                {promotionPrompt.to === 'mastered' ? 'Keep Practicing' : 'Stay Here'}
              </button>
            </div>
          </div>
        )}

        {/* ── Card Levels (L1, L2, L6) ── */}
        {!promotionPrompt && isCardLevel && question && (
          <>
            <div style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, padding: '0.4rem 0', color: 'var(--clr-text)', fontFamily: 'var(--font-display)' }}>
              {question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>?</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', margin: '0.5rem 0' }}>
              {cards.map((c, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: '10px', background: 'var(--clr-surface)', border: '2px solid var(--clr-border)',
                  fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, textAlign: 'center', minWidth: '90px'
                }}>
                  <div style={{ color: 'var(--clr-text)' }}>{currentTable} × {c.multiplier}</div>
                  <div style={{ color: 'var(--clr-accent)', fontSize: '1.2rem' }}>= {c.product}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleCardSubmit}>
              <input ref={inputRef} className="answer-input" type="text" inputMode="numeric" value={answer}
                onChange={e => { if (/^-?\d*$/.test(e.target.value)) setAnswer(e.target.value) }}
                placeholder="?" disabled={revealed} autoFocus
                style={{ fontSize: '1.5rem', textAlign: 'center', width: '100%', padding: '0.6rem' }} />
              {!revealed && <div className="button-row" style={{ marginTop: '0.4rem' }}><button type="submit" disabled={!answer} style={{ width: '100%', padding: '0.6rem' }}>Check</button></div>}
            </form>
            {renderFeedback(feedback, isCorrect)}
            {revealed && <div className="button-row" style={{ marginTop: '0.3rem' }}><button onClick={advance} style={{ width: '100%', padding: '0.6rem' }}>{round >= maxRounds ? 'Continue' : 'Next'}</button></div>}
          </>
        )}

        {/* ── Fading / Typed Levels (L3, L4, L7, L8, L10 standard/fill) ── */}
        {!promotionPrompt && isTypedLevel && question && (
          <>
            <div style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, padding: '0.4rem 0', color: 'var(--clr-text)', fontFamily: 'var(--font-display)' }}>
              {question.blankType === 'multiplier' && (
                <>{question.table} × <span style={{ color: 'var(--clr-accent)' }}>___</span> = {question.product}</>
              )}
              {question.blankType === 'product' && (
                <>{question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>___</span></>
              )}
              {!question.blankType && question.reverse && (
                <><span style={{ color: 'var(--clr-accent)' }}>?</span> × {question.table} = {question.product}</>
              )}
              {!question.blankType && !question.reverse && (
                <>{question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>?</span></>
              )}
            </div>
            {/* Fading answer hint */}
            {question.fading && !revealed && answerOpacity > 0 && (
              <div style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 600, color: `rgba(150,150,150,${answerOpacity})`, transition: 'opacity 0.15s', margin: '-0.2rem 0 0.3rem' }}>
                {question.reverse ? `${question.multiplier} × ${question.table} = ${question.product}` : question.answer}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <input ref={inputRef} className="answer-input" type="text" inputMode="numeric" value={answer}
                onChange={e => { if (/^-?\d*$/.test(e.target.value)) setAnswer(e.target.value) }}
                placeholder="?" disabled={revealed} autoFocus
                style={{ fontSize: '1.5rem', textAlign: 'center', width: '100%', padding: '0.6rem' }} />
              {!revealed && <div className="button-row" style={{ marginTop: '0.4rem' }}><button type="submit" disabled={!answer} style={{ width: '100%', padding: '0.6rem' }}>Check</button></div>}
            </form>
            {renderFeedback(feedback, isCorrect)}
            {revealed && <div className="button-row" style={{ marginTop: '0.3rem' }}><button onClick={advance} style={{ width: '100%', padding: '0.6rem' }}>{round >= maxRounds ? 'Continue' : 'Next'}</button></div>}
          </>
        )}

        {/* ── MCQ Level (L5, L10 mcq) ── */}
        {!promotionPrompt && isMCQLevel && question && (
          <>
            <div style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, padding: '0.4rem 0', color: 'var(--clr-text)', fontFamily: 'var(--font-display)' }}>
              {question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>?</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '0.5rem 0' }}>
              {mcqOptions.map((opt, i) => {
                const isSelected = selectedOption === opt
                const isAnswer = opt === question.answer
                let bg = 'var(--clr-surface)'
                let border = '2px solid var(--clr-border)'
                if (revealed) {
                  if (isAnswer) { bg = '#d4edda'; border = '2px solid #28a745' }
                  else if (isSelected && !isAnswer) { bg = '#f8d7da'; border = '2px solid #dc3545' }
                }
                return (
                  <button key={i} onClick={() => handleMCQSelect(opt)} disabled={revealed}
                    style={{ padding: '0.8rem', fontSize: '1.2rem', fontWeight: 700, borderRadius: '10px', background: bg, border, cursor: revealed ? 'default' : 'pointer', color: 'var(--clr-text)' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
            {renderFeedback(feedback, isCorrect)}
            {revealed && <div className="button-row" style={{ marginTop: '0.3rem' }}><button onClick={advance} style={{ width: '100%', padding: '0.6rem' }}>{round >= maxRounds ? 'Continue' : 'Next'}</button></div>}
          </>
        )}

        {/* ── Match Level (L9, L10 match) ── */}
        {!promotionPrompt && isMatchLevel && matchPairs.length > 0 && (
          <>
            <div style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 700, padding: '0.3rem 0', color: 'var(--clr-text)' }}>
              Match each question to its answer
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '0.5rem 0' }}>
              {/* Questions column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matchPairs.map((pair, qIdx) => {
                  const isActive = activeMatchQ === qIdx
                  const hasSelection = matchSelections[qIdx] !== undefined
                  let bg = 'var(--clr-surface)'
                  let border = isActive ? '2px solid var(--clr-accent)' : '2px solid var(--clr-border)'
                  if (matchRevealed) {
                    const selIdx = matchSelections[qIdx]
                    const correct = selIdx !== undefined && matchAnswers[selIdx] === pair.product
                    bg = correct ? '#d4edda' : '#f8d7da'
                    border = correct ? '2px solid #28a745' : '2px solid #dc3545'
                  }
                  return (
                    <button key={qIdx} onClick={() => !matchRevealed && setActiveMatchQ(qIdx)}
                      style={{ padding: '8px 12px', borderRadius: '8px', background: bg, border, fontSize: '0.95rem', fontWeight: 600, fontFamily: 'monospace', cursor: matchRevealed ? 'default' : 'pointer', opacity: hasSelection && !isActive ? 0.7 : 1 }}>
                      {currentTable} × {pair.multiplier}
                    </button>
                  )
                })}
              </div>
              {/* Answers column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matchAnswers.map((ans, aIdx) => {
                  const isUsed = Object.values(matchSelections).includes(aIdx)
                  const isLinked = activeMatchQ !== null && matchSelections[activeMatchQ] === aIdx
                  let bg = isLinked ? 'var(--clr-accent)' : isUsed ? 'rgba(var(--clr-accent-rgb, 200,150,100), 0.15)' : 'var(--clr-surface)'
                  let color = isLinked ? '#fff' : 'var(--clr-text)'
                  if (matchRevealed) {
                    bg = 'var(--clr-surface)'
                    color = 'var(--clr-text)'
                  }
                  return (
                    <button key={aIdx} onClick={() => {
                      if (matchRevealed || activeMatchQ === null) return
                      handleMatchSelect(activeMatchQ, aIdx)
                      // Auto-advance to next unmatched question
                      const nextQ = matchPairs.findIndex((_, i) => i !== activeMatchQ && matchSelections[i] === undefined)
                      setActiveMatchQ(nextQ >= 0 ? nextQ : null)
                    }}
                      style={{ padding: '8px 12px', borderRadius: '8px', background: bg, border: '2px solid var(--clr-border)', fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', cursor: matchRevealed ? 'default' : 'pointer', color }}>
                      {ans}
                    </button>
                  )
                })}
              </div>
            </div>
            {!matchRevealed && Object.keys(matchSelections).length === matchPairs.length && (
              <div className="button-row" style={{ marginTop: '0.3rem' }}>
                <button onClick={handleMatchSubmit} style={{ width: '100%', padding: '0.6rem' }}>Check Matches</button>
              </div>
            )}
            {renderFeedback(feedback, isCorrect)}
            {matchRevealed && <div className="button-row" style={{ marginTop: '0.3rem' }}><button onClick={advance} style={{ width: '100%', padding: '0.6rem' }}>{round >= maxRounds ? 'Continue' : 'Next'}</button></div>}
          </>
        )}

        {/* Status */}
        {!promotionPrompt && statusMsg && (
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--clr-text-soft)', margin: '0.5rem 0 0', fontWeight: 500 }}>{statusMsg}</p>
        )}

        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <button onClick={() => setAppPhase('choosing')} style={{ background: 'transparent', border: 'none', color: 'var(--clr-text-soft)', fontSize: '0.75rem', padding: '0.3rem', cursor: 'pointer', textDecoration: 'underline' }}>Change table</button>
        </div>
      </div>
    </div>
  )
}

/* ── Jatin's 10-Level Table Learning Strategy ──────────────── */
/**
 * JatinTablesApp — 10-level structured multiplication learning
 *
 * L1:  Sequential recall — full table visible, forward+backward (×20)
 * L2:  Random recall — full table visible (×10)
 * L3:  Random recall — shuffled table (×10)
 * L4:  Partial shuffled table — 5 entries visible (×10)
 * L5:  Timed answer visibility — answer fades after 2s (×10)
 * L6:  MCQ — 4 options (×10)
 * L7:  Missing digit — one digit replaced by * (×10)
 * L8:  Hidden row — full table minus current row (×10)
 * L9:  Direct input — no assistance (×10)
 * L10: Fill in the blank — missing multiplier or result (×10)
 */
function JatinTablesApp({ studentName }) {
  const TOTAL_LEVELS = 10
  const FADE_DURATION = 2000

  const ROUNDS_PER_LEVEL = { 1: 20, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10 }

  // ── State ──────────────────────────────────────────────────────
  const [appPhase, setAppPhase] = useState('choosing')
  const [currentTable, setCurrentTable] = useState(null)
  const [level, setLevel] = useState(1)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [results, setResults] = useState([])

  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [answerOpacity, setAnswerOpacity] = useState(1)

  // MCQ state (L6)
  const [mcqOptions, setMcqOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)

  // Table display helpers
  const [shuffledRows, setShuffledRows] = useState([])

  // Promotion
  const [promotionPrompt, setPromotionPrompt] = useState(null)

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false)

  const inputRef = useRef(null)
  const advanceFnRef = useRef(null)
  const celebrationRef = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────
  const shuffleArray = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const allMultipliers = () => Array.from({ length: 10 }, (_, i) => i + 1)

  const generateMCQOptions = (tbl, correctAnswer) => {
    const opts = new Set([correctAnswer])
    while (opts.size < 4) {
      const strategies = [
        () => correctAnswer + Math.floor(Math.random() * 5) + 1,
        () => correctAnswer - Math.floor(Math.random() * 5) - 1,
        () => tbl * (Math.floor(Math.random() * 10) + 1),
        () => correctAnswer + tbl,
        () => correctAnswer - tbl,
      ]
      const val = strategies[Math.floor(Math.random() * strategies.length)]()
      if (val > 0 && val !== correctAnswer) opts.add(val)
    }
    return shuffleArray([...opts])
  }

  // Generate a missing-digit question from a product
  const generateMissingDigit = (product) => {
    const s = String(product)
    const pos = Math.floor(Math.random() * s.length)
    const missingDigit = parseInt(s[pos], 10)
    const masked = s.substring(0, pos) + '*' + s.substring(pos + 1)
    return { masked, missingDigit, pos }
  }

  const pad = (n) => String(n).padStart(3, '\u2007')

  // ── Level Setup ────────────────────────────────────────────────
  const setupRound = (tbl, lvl, roundNum) => {
    setRevealed(false)
    setFeedback('')
    setIsCorrect(null)
    setAnswer('')
    setSelectedOption(null)
    setStartTime(Date.now())
    setAnswerOpacity(1)

    if (lvl === 1) {
      // Sequential: rounds 1-10 forward, 11-20 backward
      const m = roundNum <= 10 ? roundNum : (21 - roundNum)
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, showTable: 'full' })
    } else if (lvl === 2) {
      // Random with full table
      const m = Math.floor(Math.random() * 10) + 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, showTable: 'full' })
    } else if (lvl === 3) {
      // Random with shuffled table
      const newRows = shuffleArray(allMultipliers())
      setShuffledRows(newRows)
      const m = Math.floor(Math.random() * 10) + 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, showTable: 'shuffled' })
    } else if (lvl === 4) {
      // Random with partial shuffled table (5 entries)
      const newRows = shuffleArray(allMultipliers()).slice(0, 5)
      setShuffledRows(newRows)
      const m = Math.floor(Math.random() * 10) + 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, showTable: 'partial' })
    } else if (lvl === 5) {
      // Timed answer visibility — show answer that fades
      const m = Math.floor(Math.random() * 10) + 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, fading: true })
    } else if (lvl === 6) {
      // MCQ
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      setQuestion({ table: tbl, multiplier: m, answer: product })
      setMcqOptions(generateMCQOptions(tbl, product))
    } else if (lvl === 7) {
      // Missing digit
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      const { masked, missingDigit } = generateMissingDigit(product)
      setQuestion({ table: tbl, multiplier: m, product, answer: missingDigit, masked })
    } else if (lvl === 8) {
      // Hidden row — full table minus the question row
      const m = Math.floor(Math.random() * 10) + 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, hiddenRow: m })
    } else if (lvl === 9) {
      // Direct input — no help
      const m = Math.floor(Math.random() * 10) + 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m })
    } else if (lvl === 10) {
      // Fill in the blank
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      const blankType = ['multiplier', 'product'][Math.floor(Math.random() * 2)]
      if (blankType === 'multiplier') {
        setQuestion({ table: tbl, multiplier: m, answer: m, product, blankType: 'multiplier' })
      } else {
        setQuestion({ table: tbl, multiplier: m, answer: product, product, blankType: 'product' })
      }
    }

    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Table Selection ────────────────────────────────────────────
  const selectTable = (tbl) => {
    setCurrentTable(tbl)
    setAppPhase('playing')
    setLevel(1)
    setRound(1)
    setScore(0)
    setTotalAnswered(0)
    setResults([])
    setShowCelebration(false)
    setPromotionPrompt(null)
    setStatusMsg('Level 1: Sequential — Full table visible')
    setupRound(tbl, 1, 1)
  }

  // ── Fading Effect for L5 ──────────────────────────────────────
  useEffect(() => {
    if (!question?.fading || revealed) return
    setAnswerOpacity(1)
    const steps = 20
    const interval = setInterval(() => {
      setAnswerOpacity(prev => {
        const next = prev - (1 / steps)
        if (next <= 0) { clearInterval(interval); return 0 }
        return next
      })
    }, FADE_DURATION / steps)
    return () => clearInterval(interval)
  }, [question, revealed])

  // ── Advance Logic ─────────────────────────────────────────────
  const advance = () => {
    if (promotionPrompt) return
    const maxRounds = ROUNDS_PER_LEVEL[level]
    if (round >= maxRounds) {
      setPromotionPrompt({ from: level, to: level < TOTAL_LEVELS ? level + 1 : 'mastered' })
      setStatusMsg(level < TOTAL_LEVELS ? 'Ready to level up!' : 'You did it!')
    } else {
      const nextRound = round + 1
      setRound(nextRound)
      setupRound(currentTable, level, nextRound)
    }
  }

  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter during promotion = accept
  useEffect(() => {
    if (!promotionPrompt) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); acceptPromotion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [promotionPrompt])

  // Enter after wrong answer = next
  useEffect(() => {
    if (!revealed || isCorrect || promotionPrompt) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, round, promotionPrompt])

  // ── Submit (typed answers: L1-5, L7-10) ───────────────────────
  const handleSubmit = (e) => {
    e?.preventDefault()
    if (revealed || !question) return

    const userAns = parseInt(answer, 10)
    const correct = userAns === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)

    let qLabel
    if (level === 7) {
      qLabel = `${question.table} × ${question.multiplier} = ${question.masked}`
    } else if (question.blankType === 'multiplier') {
      qLabel = `${question.table} × ___ = ${question.product}`
    } else if (question.blankType === 'product') {
      qLabel = `${question.table} × ${question.multiplier} = ___`
    } else {
      qLabel = `${question.table} × ${question.multiplier}`
    }

    setFeedback(correct
      ? `Correct! (${(elapsed / 1000).toFixed(1)}s)`
      : `Answer: ${question.answer}`)

    setResults(r => [...r, { prompt: qLabel, userAnswer: answer || '?', correctAnswer: String(question.answer), correct, time: (elapsed / 1000).toFixed(1) }])
  }

  // ── MCQ Selection (L6) ────────────────────────────────────────
  const handleMCQSelect = (opt) => {
    if (revealed) return
    setSelectedOption(opt)
    const correct = opt === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)
    setFeedback(correct ? `Correct! (${(elapsed / 1000).toFixed(1)}s)` : `Answer: ${question.answer}`)
    setResults(r => [...r, { prompt: `${question.table} × ${question.multiplier}`, userAnswer: String(opt), correctAnswer: String(question.answer), correct, time: (elapsed / 1000).toFixed(1) }])
  }

  // ── Promotion ─────────────────────────────────────────────────
  const levelDescriptions = {
    1: 'Sequential — Full table visible',
    2: 'Random — Full table visible',
    3: 'Random — Shuffled table',
    4: 'Random — Partial shuffled table',
    5: 'Timed — Answer fades away',
    6: 'MCQ — Pick the right one',
    7: 'Missing Digit — Find the *',
    8: 'Hidden Row — One row removed',
    9: 'Direct Input — No assistance',
    10: 'Fill in the Blank — Complete it!'
  }

  const acceptPromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    if (promo.to === 'mastered') {
      setShowCelebration(true)
      setAppPhase('finished')
    } else {
      setLevel(promo.to)
      setRound(1)
      setStatusMsg(`Level ${promo.to}: ${levelDescriptions[promo.to]}`)
      setupRound(currentTable, promo.to, 1)
    }
  }

  const declinePromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    setRound(1)
    setStatusMsg(`Staying at Level ${promo.from}. More practice!`)
    setupRound(currentTable, promo.from, 1)
  }

  // ── Confetti ──────────────────────────────────────────────────
  useEffect(() => {
    if (!showCelebration || !celebrationRef.current) return
    const canvas = celebrationRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff9f43', '#00d2d3']
    const confetti = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width, y: -Math.random() * canvas.height,
      w: Math.random() * 12 + 6, h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
      rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10
    }))
    let frame
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let allDone = true
      confetti.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rot += c.rotSpeed; c.vy += 0.05
        if (c.y < canvas.height + 50) allDone = false
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((c.rot * Math.PI) / 180)
        ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore()
      })
      if (!allDone) frame = requestAnimationFrame(animate)
    }
    animate()
    return () => { if (frame) cancelAnimationFrame(frame) }
  }, [showCelebration, appPhase])

  // ── Computed ───────────────────────────────────────────────────
  const maxRounds = ROUNDS_PER_LEVEL[level]
  const showsTable = [1, 2, 3, 4, 8].includes(level)
  const isMCQ = level === 6
  const isTyped = !isMCQ

  // ── Render: Table helper ──────────────────────────────────────
  const renderTable = () => {
    if (!question) return null

    if (level === 1 || level === 2) {
      // Full ordered table
      return (
        <div style={{
          margin: '0.4rem 0', padding: '0.6rem 0.8rem', borderRadius: '8px',
          background: 'var(--clr-surface)', border: '1px solid var(--clr-border)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600, textAlign: 'center' }}>
            Table of {currentTable}
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '3px',
            fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 600, alignItems: 'center'
          }}>
            {allMultipliers().map(m => (
              <div key={m} style={{ display: 'flex', color: 'var(--clr-text)', whiteSpace: 'pre' }}>
                <span style={{ minWidth: '4.5ch', textAlign: 'right' }}>{currentTable} × {String(m).padStart(2, '\u2007')}</span>
                <span style={{ color: 'var(--clr-text)', fontWeight: 700, marginLeft: '0.4ch' }}> = {pad(currentTable * m)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (level === 3) {
      // Shuffled full table
      return (
        <div style={{
          margin: '0.4rem 0', padding: '0.6rem 0.8rem', borderRadius: '8px',
          background: 'var(--clr-surface)', border: '1px solid var(--clr-border)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600, textAlign: 'center' }}>
            shuffled
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '3px',
            fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 600, alignItems: 'center'
          }}>
            {shuffledRows.map(m => (
              <div key={m} style={{ display: 'flex', color: 'var(--clr-text)', whiteSpace: 'pre' }}>
                <span style={{ minWidth: '4.5ch', textAlign: 'right' }}>{currentTable} × {String(m).padStart(2, '\u2007')}</span>
                <span style={{ color: 'var(--clr-text)', fontWeight: 700, marginLeft: '0.4ch' }}> = {pad(currentTable * m)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (level === 4) {
      // Partial shuffled table (5 entries)
      return (
        <div style={{
          margin: '0.4rem 0', padding: '0.6rem 0.8rem', borderRadius: '8px',
          background: 'var(--clr-surface)', border: '1px solid var(--clr-border)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600, textAlign: 'center' }}>
            partial (shuffled)
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '3px',
            fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 600, alignItems: 'center'
          }}>
            {shuffledRows.map(m => (
              <div key={m} style={{ display: 'flex', color: 'var(--clr-text)', whiteSpace: 'pre' }}>
                <span style={{ minWidth: '4.5ch', textAlign: 'right' }}>{currentTable} × {String(m).padStart(2, '\u2007')}</span>
                <span style={{ color: 'var(--clr-text)', fontWeight: 700, marginLeft: '0.4ch' }}> = {pad(currentTable * m)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (level === 8) {
      // Full table minus the hidden row
      return (
        <div style={{
          margin: '0.4rem 0', padding: '0.6rem 0.8rem', borderRadius: '8px',
          background: 'var(--clr-surface)', border: '1px solid var(--clr-border)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600, textAlign: 'center' }}>
            one row hidden
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '3px',
            fontSize: '1.05rem', fontFamily: 'monospace', fontWeight: 600, alignItems: 'center'
          }}>
            {allMultipliers().map(m => {
              if (m === question.hiddenRow) {
                return (
                  <div key={m} style={{ display: 'flex', color: 'var(--clr-accent)', whiteSpace: 'pre', fontStyle: 'italic' }}>
                    <span style={{ minWidth: '4.5ch', textAlign: 'right' }}>{currentTable} × {String(m).padStart(2, '\u2007')}</span>
                    <span style={{ fontWeight: 700, marginLeft: '0.4ch' }}> = ???</span>
                  </div>
                )
              }
              return (
                <div key={m} style={{ display: 'flex', color: 'var(--clr-text)', whiteSpace: 'pre' }}>
                  <span style={{ minWidth: '4.5ch', textAlign: 'right' }}>{currentTable} × {String(m).padStart(2, '\u2007')}</span>
                  <span style={{ color: 'var(--clr-text)', fontWeight: 700, marginLeft: '0.4ch' }}> = {pad(currentTable * m)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    return null
  }

  // ══════════ RENDER: TABLE CHOOSER ══════════
  if (appPhase === 'choosing') {
    return (
      <div className="app-shell">
        <div className="card">
          <h1>{studentName}'s Table Learning Strategy</h1>
          <p style={{ textAlign: 'center', color: 'var(--clr-text-soft)', margin: '0.5rem 0 1.5rem' }}>
            Pick a table to master:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', maxWidth: '320px', margin: '0 auto' }}>
            {Array.from({ length: 18 }, (_, i) => i + 2).map(n => (
              <button key={n} onClick={() => selectTable(n)}
                style={{ fontSize: '1.5rem', fontWeight: 700, padding: '1rem', borderRadius: '12px', border: '2px solid var(--clr-accent)', background: 'var(--clr-surface)', color: 'var(--clr-accent)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.background = 'var(--clr-accent)'; e.target.style.color = '#fff' }}
                onMouseLeave={e => { e.target.style.background = 'var(--clr-surface)'; e.target.style.color = 'var(--clr-accent)' }}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: FINISHED ══════════
  if (appPhase === 'finished') {
    return (
      <div className="app-shell">
        {showCelebration && <canvas ref={celebrationRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }} />}
        <div className="card">
          <h1 style={{ fontSize: '2rem' }}>{studentName} MASTERED {currentTable}x!</h1>
          <div className="welcome-box">
            <p style={{ fontSize: '3rem', margin: '0.5rem 0' }}>🏆</p>
            <p className="final-score">Score: {score}/{totalAnswered}</p>
            <div className="results-table" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              <table><thead><tr><th>#</th><th>Question</th><th>You</th><th>Answer</th><th>Time</th><th></th></tr></thead>
                <tbody>{results.map((r, i) => (
                  <tr key={i} className={r.correct ? 'result-correct' : 'result-wrong'}>
                    <td>{i + 1}</td><td>{r.prompt}</td><td>{r.userAnswer}</td><td>{r.correctAnswer}</td><td>{r.time}s</td><td>{r.correct ? '✓' : '✗'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="button-row" style={{ marginTop: '1rem', gap: '0.5rem', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setAppPhase('choosing')}>Pick Another Table</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: PLAYING ══════════
  return (
    <div className="app-shell">
      <div className="card" style={{ padding: '0.75rem', maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-soft)' }}>
            {currentTable}x | R{round}/{maxRounds} | {score} correct
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: level >= 8 ? 'var(--clr-accent)' : 'var(--clr-surface)', color: level >= 8 ? '#fff' : 'var(--clr-text-soft)', border: '1px solid var(--clr-border)' }}>
            Level {level}/{TOTAL_LEVELS}
          </span>
        </div>

        {/* ── Promotion Prompt ── */}
        {promotionPrompt && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', margin: '0.5rem 0', borderRadius: '12px', background: 'var(--clr-surface)', border: '2px solid var(--clr-accent)' }}>
            <p style={{ fontSize: '1.5rem', margin: '0 0 0.3rem' }}>{promotionPrompt.to === 'mastered' ? '🏆' : '🎉'}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text)', margin: '0 0 0.3rem' }}>
              {promotionPrompt.to === 'mastered' ? 'All 10 Levels Complete!' : `Ready for Level ${promotionPrompt.to}?`}
            </p>
            {promotionPrompt.to !== 'mastered' && (
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--clr-accent)', margin: '0 0 0.2rem' }}>
                {levelDescriptions[promotionPrompt.to]}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.8rem' }}>
              <button onClick={acceptPromotion} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', fontWeight: 700 }}>
                {promotionPrompt.to === 'mastered' ? 'See Results' : 'Level Up!'}
              </button>
              <button onClick={declinePromotion} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>
                {promotionPrompt.to === 'mastered' ? 'Keep Practicing' : 'Stay Here'}
              </button>
            </div>
          </div>
        )}

        {/* ── Question Display ── */}
        {!promotionPrompt && question && (
          <>
            {/* Question text */}
            <div style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, padding: '0.4rem 0', color: 'var(--clr-text)', fontFamily: 'var(--font-display)' }}>
              {level === 7 && (
                <>{question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)', letterSpacing: '2px' }}>{question.masked}</span></>
              )}
              {level === 10 && question.blankType === 'multiplier' && (
                <>{question.table} × <span style={{ color: 'var(--clr-accent)' }}>___</span> = {question.product}</>
              )}
              {level === 10 && question.blankType === 'product' && (
                <>{question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>___</span></>
              )}
              {level !== 7 && level !== 10 && (
                <>{question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>?</span></>
              )}
            </div>

            {/* Fading answer hint for L5 */}
            {level === 5 && question.fading && !revealed && answerOpacity > 0 && (
              <div style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 600, color: `rgba(150,150,150,${answerOpacity})`, transition: 'opacity 0.15s', margin: '-0.2rem 0 0.3rem' }}>
                {question.answer}
              </div>
            )}

            {/* Table display for levels that show tables */}
            {showsTable && renderTable()}

            {/* MCQ options for L6 */}
            {isMCQ && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '0.5rem 0' }}>
                {mcqOptions.map((opt, i) => {
                  const isSelected = selectedOption === opt
                  const isAnswer = opt === question.answer
                  let bg = 'var(--clr-surface)'
                  let border = '2px solid var(--clr-border)'
                  if (revealed) {
                    if (isAnswer) { bg = '#d4edda'; border = '2px solid #28a745' }
                    else if (isSelected && !isAnswer) { bg = '#f8d7da'; border = '2px solid #dc3545' }
                  }
                  return (
                    <button key={i} onClick={() => handleMCQSelect(opt)} disabled={revealed}
                      style={{ padding: '0.8rem', fontSize: '1.2rem', fontWeight: 700, borderRadius: '10px', background: bg, border, cursor: revealed ? 'default' : 'pointer', color: 'var(--clr-text)' }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Input for typed-answer levels */}
            {isTyped && (
              <form onSubmit={handleSubmit}>
                <input ref={inputRef} className="answer-input" type="text" inputMode="numeric" value={answer}
                  onChange={e => { if (/^-?\d*$/.test(e.target.value)) setAnswer(e.target.value) }}
                  placeholder={level === 7 ? 'missing digit' : '?'} disabled={revealed} autoFocus
                  style={{ fontSize: '1.5rem', textAlign: 'center', width: '100%', padding: '0.6rem' }} />
                {!revealed && <div className="button-row" style={{ marginTop: '0.4rem' }}><button type="submit" disabled={!answer} style={{ width: '100%', padding: '0.6rem' }}>Check</button></div>}
              </form>
            )}

            {renderFeedback(feedback, isCorrect)}
            {revealed && <div className="button-row" style={{ marginTop: '0.3rem' }}><button onClick={advance} style={{ width: '100%', padding: '0.6rem' }}>{round >= maxRounds ? 'Continue' : 'Next'}</button></div>}
          </>
        )}

        {/* Status */}
        {!promotionPrompt && statusMsg && (
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--clr-text-soft)', margin: '0.5rem 0 0', fontWeight: 500 }}>{statusMsg}</p>
        )}

        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <button onClick={() => setAppPhase('choosing')} style={{ background: 'transparent', border: 'none', color: 'var(--clr-text-soft)', fontSize: '0.75rem', padding: '0.3rem', cursor: 'pointer', textDecoration: 'underline' }}>Change table</button>
        </div>
      </div>
    </div>
  )
}

/* ── Lakshya's Mastery Multiplication Program ──────────────── */
/**
 * LakshyaTablesApp — 10-level mastery multiplication program
 *
 * Phase 1: Visualization & Observation
 *   L1:  Straight Order — answer shown, blurs in 3s, type before gone (×10)
 *   L2:  Reverse Order — answer shown, fades in 2s, type answer (×10)
 *   L3:  Full Table Straight — products shown in order, answer questions (×10)
 *   L4:  Full Table Reverse — products shown in reverse, answer questions (×10)
 *
 * Phase 2: Pattern Recognition
 *   L5:  Match Maker (MCQ) — jumbled options, pick correct (×10)
 *   L6:  Invisible Answer — 3 wrong answers shown, type the missing correct one (×10)
 *
 * Phase 3: The Ultimate Test
 *   L7:  Straight Quiz — sequential, no help (×10)
 *   L8:  Solve for X — table × X = product, find X (×10)
 *   L9:  Commutative Switch — if A×B=C, what is B×A? (×10)
 *   L10: Jumbled Mastery — random order, no help (×10)
 */
function LakshyaTablesApp({ studentName }) {
  const TOTAL_LEVELS = 10
  const FADE_L1 = 3000
  const FADE_L2 = 2000

  const ROUNDS_PER_LEVEL = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10 }

  // ── State ──────────────────────────────────────────────────────
  const [appPhase, setAppPhase] = useState('choosing')
  const [currentTable, setCurrentTable] = useState(null)
  const [level, setLevel] = useState(1)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [results, setResults] = useState([])

  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [answerOpacity, setAnswerOpacity] = useState(1)

  // MCQ state (L5)
  const [mcqOptions, setMcqOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)

  // L6 decoy list
  const [decoyList, setDecoyList] = useState([])

  // L10 shuffled order
  const [jumbledOrder, setJumbledOrder] = useState([])

  // Promotion
  const [promotionPrompt, setPromotionPrompt] = useState(null)

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false)

  const inputRef = useRef(null)
  const advanceFnRef = useRef(null)
  const celebrationRef = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────
  const shuffleArray = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const allMultipliers = () => Array.from({ length: 10 }, (_, i) => i + 1)

  const generateMCQOptions = (tbl, correctAnswer) => {
    const opts = new Set([correctAnswer])
    while (opts.size < 4) {
      const strategies = [
        () => correctAnswer + Math.floor(Math.random() * 5) + 1,
        () => correctAnswer - Math.floor(Math.random() * 5) - 1,
        () => tbl * (Math.floor(Math.random() * 10) + 1),
        () => correctAnswer + tbl,
        () => correctAnswer - tbl,
      ]
      const val = strategies[Math.floor(Math.random() * strategies.length)]()
      if (val > 0 && val !== correctAnswer) opts.add(val)
    }
    return shuffleArray([...opts])
  }

  // Generate 3 plausible wrong answers for L6 (Invisible Answer)
  const generateDecoys = (tbl, correctAnswer) => {
    const decoys = new Set()
    while (decoys.size < 3) {
      const strategies = [
        () => correctAnswer + Math.floor(Math.random() * 8) + 1,
        () => correctAnswer - Math.floor(Math.random() * 8) - 1,
        () => tbl * (Math.floor(Math.random() * 10) + 1),
        () => correctAnswer + tbl,
        () => correctAnswer - tbl,
        () => correctAnswer + Math.floor(Math.random() * 3) + 1,
      ]
      const val = strategies[Math.floor(Math.random() * strategies.length)]()
      if (val > 0 && val !== correctAnswer) decoys.add(val)
    }
    return shuffleArray([...decoys])
  }

  const pad = (n) => String(n).padStart(3, '\u2007')

  // ── Level Setup ────────────────────────────────────────────────
  const setupRound = (tbl, lvl, roundNum) => {
    setRevealed(false)
    setFeedback('')
    setIsCorrect(null)
    setAnswer('')
    setSelectedOption(null)
    setStartTime(Date.now())
    setAnswerOpacity(1)

    if (lvl === 1) {
      // Straight order with fading (3s)
      const m = roundNum
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, fading: true, fadeDuration: FADE_L1 })
    } else if (lvl === 2) {
      // Reverse order with fading (2s)
      const m = 11 - roundNum // 10, 9, 8, ... 1
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, fading: true, fadeDuration: FADE_L2 })
    } else if (lvl === 3) {
      // Full table straight — products shown in order, sequential questions
      const m = roundNum
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, showProducts: 'straight' })
    } else if (lvl === 4) {
      // Full table reverse — products shown in reverse, reverse questions
      const m = 11 - roundNum
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m, showProducts: 'reverse' })
    } else if (lvl === 5) {
      // MCQ
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      setQuestion({ table: tbl, multiplier: m, answer: product })
      setMcqOptions(generateMCQOptions(tbl, product))
    } else if (lvl === 6) {
      // Invisible Answer — 3 wrong options shown, correct is missing
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      setQuestion({ table: tbl, multiplier: m, answer: product })
      setDecoyList(generateDecoys(tbl, product))
    } else if (lvl === 7) {
      // Straight quiz — no help, sequential
      const m = roundNum
      setQuestion({ table: tbl, multiplier: m, answer: tbl * m })
    } else if (lvl === 8) {
      // Solve for X: table × X = product
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      setQuestion({ table: tbl, multiplier: m, answer: m, product, solveForX: true })
    } else if (lvl === 9) {
      // Commutative switch: if A×B=C, what is B×A?
      const m = Math.floor(Math.random() * 10) + 1
      const product = tbl * m
      setQuestion({ table: tbl, multiplier: m, answer: product, product, commutative: true })
    } else if (lvl === 10) {
      // Jumbled mastery — random, no help
      if (roundNum === 1) {
        setJumbledOrder(shuffleArray(allMultipliers()))
      }
      // Use jumbled order; for subsequent rounds we read from state
      // Since state update is async, compute inline
      const order = roundNum === 1 ? null : jumbledOrder
      if (roundNum === 1) {
        // Will be set by the setJumbledOrder above; use a fresh shuffle
        const fresh = shuffleArray(allMultipliers())
        setJumbledOrder(fresh)
        const m = fresh[0]
        setQuestion({ table: tbl, multiplier: m, answer: tbl * m })
      } else {
        const m = jumbledOrder[roundNum - 1] || (Math.floor(Math.random() * 10) + 1)
        setQuestion({ table: tbl, multiplier: m, answer: tbl * m })
      }
    }

    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Table Selection ────────────────────────────────────────────
  const selectTable = (tbl) => {
    setCurrentTable(tbl)
    setAppPhase('playing')
    setLevel(1)
    setRound(1)
    setScore(0)
    setTotalAnswered(0)
    setResults([])
    setShowCelebration(false)
    setPromotionPrompt(null)
    setStatusMsg('Phase 1 — Level 1: Straight Order')
    setupRound(tbl, 1, 1)
  }

  // ── Fading Effect for L1, L2 ──────────────────────────────────
  useEffect(() => {
    if (!question?.fading || revealed) return
    setAnswerOpacity(1)
    const duration = question.fadeDuration || 3000
    const steps = 20
    const interval = setInterval(() => {
      setAnswerOpacity(prev => {
        const next = prev - (1 / steps)
        if (next <= 0) { clearInterval(interval); return 0 }
        return next
      })
    }, duration / steps)
    return () => clearInterval(interval)
  }, [question, revealed])

  // ── Advance Logic ─────────────────────────────────────────────
  const advance = () => {
    if (promotionPrompt) return
    const maxRounds = ROUNDS_PER_LEVEL[level]
    if (round >= maxRounds) {
      setPromotionPrompt({ from: level, to: level < TOTAL_LEVELS ? level + 1 : 'mastered' })
      setStatusMsg(level < TOTAL_LEVELS ? 'Ready to level up!' : 'You did it!')
    } else {
      const nextRound = round + 1
      setRound(nextRound)
      setupRound(currentTable, level, nextRound)
    }
  }

  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter during promotion = accept
  useEffect(() => {
    if (!promotionPrompt) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); acceptPromotion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [promotionPrompt])

  // Enter after wrong answer = next
  useEffect(() => {
    if (!revealed || isCorrect || promotionPrompt) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, round, promotionPrompt])

  // ── Submit (typed answers) ────────────────────────────────────
  const handleSubmit = (e) => {
    e?.preventDefault()
    if (revealed || !question) return

    const userAns = parseInt(answer, 10)
    const correct = userAns === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)

    let qLabel
    if (question.solveForX) {
      qLabel = `${question.table} × X = ${question.product}`
    } else if (question.commutative) {
      qLabel = `${question.multiplier} × ${question.table}`
    } else {
      qLabel = `${question.table} × ${question.multiplier}`
    }

    setFeedback(correct
      ? `Correct! (${(elapsed / 1000).toFixed(1)}s)`
      : `Answer: ${question.answer}`)

    setResults(r => [...r, { prompt: qLabel, userAnswer: answer || '?', correctAnswer: String(question.answer), correct, time: (elapsed / 1000).toFixed(1) }])
  }

  // ── MCQ Selection (L5) ────────────────────────────────────────
  const handleMCQSelect = (opt) => {
    if (revealed) return
    setSelectedOption(opt)
    const correct = opt === question.answer
    const elapsed = Date.now() - startTime

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)
    setFeedback(correct ? `Correct! (${(elapsed / 1000).toFixed(1)}s)` : `Answer: ${question.answer}`)
    setResults(r => [...r, { prompt: `${question.table} × ${question.multiplier}`, userAnswer: String(opt), correctAnswer: String(question.answer), correct, time: (elapsed / 1000).toFixed(1) }])
  }

  // ── Promotion ─────────────────────────────────────────────────
  const levelDescriptions = {
    1: 'Straight Order — Focus & Speed',
    2: 'Reverse Order — The Memory Fade',
    3: 'Full Table Straight — Products in order',
    4: 'Full Table Reverse — Products reversed',
    5: 'The Match Maker — Pick correct answer',
    6: 'The Invisible Answer — Spot the missing one',
    7: 'Straight Quiz — No help',
    8: 'Solve for X — Find the multiplier',
    9: 'Commutative Switch — Flip and answer',
    10: 'Jumbled Mastery — Random challenge!'
  }

  const phaseForLevel = (lvl) => {
    if (lvl <= 4) return 'Phase 1 — '
    if (lvl <= 6) return 'Phase 2 — '
    return 'Phase 3 — '
  }

  const acceptPromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    if (promo.to === 'mastered') {
      setShowCelebration(true)
      setAppPhase('finished')
    } else {
      setLevel(promo.to)
      setRound(1)
      setStatusMsg(`${phaseForLevel(promo.to)}Level ${promo.to}: ${levelDescriptions[promo.to]}`)
      setupRound(currentTable, promo.to, 1)
    }
  }

  const declinePromotion = () => {
    const promo = promotionPrompt
    setPromotionPrompt(null)
    setRound(1)
    setStatusMsg(`Staying at Level ${promo.from}. More practice!`)
    setupRound(currentTable, promo.from, 1)
  }

  // ── Confetti ──────────────────────────────────────────────────
  useEffect(() => {
    if (!showCelebration || !celebrationRef.current) return
    const canvas = celebrationRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff9f43', '#00d2d3']
    const confetti = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width, y: -Math.random() * canvas.height,
      w: Math.random() * 12 + 6, h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
      rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10
    }))
    let frame
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let allDone = true
      confetti.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rot += c.rotSpeed; c.vy += 0.05
        if (c.y < canvas.height + 50) allDone = false
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((c.rot * Math.PI) / 180)
        ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore()
      })
      if (!allDone) frame = requestAnimationFrame(animate)
    }
    animate()
    return () => { if (frame) cancelAnimationFrame(frame) }
  }, [showCelebration, appPhase])

  // ── Computed ───────────────────────────────────────────────────
  const maxRounds = ROUNDS_PER_LEVEL[level]
  const isMCQ = level === 5

  // ══════════ RENDER: TABLE CHOOSER ══════════
  if (appPhase === 'choosing') {
    return (
      <div className="app-shell">
        <div className="card">
          <h1>{studentName}'s Mastery Multiplication Program</h1>
          <p style={{ textAlign: 'center', color: 'var(--clr-text-soft)', margin: '0.5rem 0 1.5rem' }}>
            Pick a table to master:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', maxWidth: '320px', margin: '0 auto' }}>
            {Array.from({ length: 18 }, (_, i) => i + 2).map(n => (
              <button key={n} onClick={() => selectTable(n)}
                style={{ fontSize: '1.5rem', fontWeight: 700, padding: '1rem', borderRadius: '12px', border: '2px solid var(--clr-accent)', background: 'var(--clr-surface)', color: 'var(--clr-accent)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.background = 'var(--clr-accent)'; e.target.style.color = '#fff' }}
                onMouseLeave={e => { e.target.style.background = 'var(--clr-surface)'; e.target.style.color = 'var(--clr-accent)' }}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: FINISHED ══════════
  if (appPhase === 'finished') {
    return (
      <div className="app-shell">
        {showCelebration && <canvas ref={celebrationRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }} />}
        <div className="card">
          <h1 style={{ fontSize: '2rem' }}>{studentName} MASTERED {currentTable}x!</h1>
          <div className="welcome-box">
            <p style={{ fontSize: '3rem', margin: '0.5rem 0' }}>🏆</p>
            <p className="final-score">Score: {score}/{totalAnswered}</p>
            <div className="results-table" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              <table><thead><tr><th>#</th><th>Question</th><th>You</th><th>Answer</th><th>Time</th><th></th></tr></thead>
                <tbody>{results.map((r, i) => (
                  <tr key={i} className={r.correct ? 'result-correct' : 'result-wrong'}>
                    <td>{i + 1}</td><td>{r.prompt}</td><td>{r.userAnswer}</td><td>{r.correctAnswer}</td><td>{r.time}s</td><td>{r.correct ? '✓' : '✗'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="button-row" style={{ marginTop: '1rem', gap: '0.5rem', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setAppPhase('choosing')}>Pick Another Table</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: PLAYING ══════════
  return (
    <div className="app-shell">
      <div className="card" style={{ padding: '0.75rem', maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-soft)' }}>
            {currentTable}x | R{round}/{maxRounds} | {score} correct
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: level >= 7 ? 'var(--clr-accent)' : 'var(--clr-surface)', color: level >= 7 ? '#fff' : 'var(--clr-text-soft)', border: '1px solid var(--clr-border)' }}>
            Level {level}/{TOTAL_LEVELS}
          </span>
        </div>

        {/* ── Promotion Prompt ── */}
        {promotionPrompt && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', margin: '0.5rem 0', borderRadius: '12px', background: 'var(--clr-surface)', border: '2px solid var(--clr-accent)' }}>
            <p style={{ fontSize: '1.5rem', margin: '0 0 0.3rem' }}>{promotionPrompt.to === 'mastered' ? '🏆' : '🎉'}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text)', margin: '0 0 0.3rem' }}>
              {promotionPrompt.to === 'mastered' ? 'All 10 Levels Complete!' : `Ready for Level ${promotionPrompt.to}?`}
            </p>
            {promotionPrompt.to !== 'mastered' && (
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--clr-accent)', margin: '0 0 0.2rem' }}>
                {levelDescriptions[promotionPrompt.to]}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.8rem' }}>
              <button onClick={acceptPromotion} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', fontWeight: 700 }}>
                {promotionPrompt.to === 'mastered' ? 'See Results' : 'Level Up!'}
              </button>
              <button onClick={declinePromotion} style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>
                {promotionPrompt.to === 'mastered' ? 'Keep Practicing' : 'Stay Here'}
              </button>
            </div>
          </div>
        )}

        {/* ── Question Area ── */}
        {!promotionPrompt && question && (
          <>
            {/* Question text */}
            <div style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, padding: '0.4rem 0', color: 'var(--clr-text)', fontFamily: 'var(--font-display)' }}>
              {question.solveForX && (
                <>{question.table} × <span style={{ color: 'var(--clr-accent)' }}>X</span> = {question.product}</>
              )}
              {question.commutative && (
                <>If {question.table} × {question.multiplier} = {question.product}, <br /><span style={{ fontSize: '1.4rem' }}>{question.multiplier} × {question.table} = <span style={{ color: 'var(--clr-accent)' }}>?</span></span></>
              )}
              {!question.solveForX && !question.commutative && (
                <>{question.table} × {question.multiplier} = <span style={{ color: 'var(--clr-accent)' }}>?</span></>
              )}
            </div>

            {/* Fading answer hint for L1, L2 */}
            {question.fading && !revealed && answerOpacity > 0 && (
              <div style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700, color: `rgba(150,150,150,${answerOpacity})`, transition: 'opacity 0.15s', margin: '-0.2rem 0 0.3rem' }}>
                {question.answer}
              </div>
            )}

            {/* Products strip for L3 (straight) */}
            {question.showProducts === 'straight' && (
              <div style={{
                margin: '0.4rem 0', padding: '0.5rem 0.8rem', borderRadius: '8px',
                background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600 }}>
                  Products of {currentTable}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--clr-text)' }}>
                  {allMultipliers().map(m => (
                    <span key={m} style={{
                      padding: '2px 8px', borderRadius: '6px',
                      background: 'var(--clr-bg)', border: '1px solid var(--clr-border)'
                    }}>{currentTable * m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Products strip for L4 (reverse) */}
            {question.showProducts === 'reverse' && (
              <div style={{
                margin: '0.4rem 0', padding: '0.5rem 0.8rem', borderRadius: '8px',
                background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600 }}>
                  Products of {currentTable} (reversed)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--clr-text)' }}>
                  {[...allMultipliers()].reverse().map(m => (
                    <span key={m} style={{
                      padding: '2px 8px', borderRadius: '6px',
                      background: 'var(--clr-bg)', border: '1px solid var(--clr-border)'
                    }}>{currentTable * m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* L6: Invisible Answer — show 3 decoys */}
            {level === 6 && (
              <div style={{
                margin: '0.4rem 0', padding: '0.5rem 0.8rem', borderRadius: '8px',
                background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-soft)', marginBottom: '4px', fontWeight: 600 }}>
                  The correct answer is NOT in this list:
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--clr-text)' }}>
                  {decoyList.map((d, i) => (
                    <span key={i} style={{
                      padding: '4px 12px', borderRadius: '8px',
                      background: 'var(--clr-bg)', border: '1px solid var(--clr-border)',
                      textDecoration: 'line-through', opacity: 0.7
                    }}>{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* MCQ options for L5 */}
            {isMCQ && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '0.5rem 0' }}>
                {mcqOptions.map((opt, i) => {
                  const isSelected = selectedOption === opt
                  const isAnswer = opt === question.answer
                  let bg = 'var(--clr-surface)'
                  let border = '2px solid var(--clr-border)'
                  if (revealed) {
                    if (isAnswer) { bg = '#d4edda'; border = '2px solid #28a745' }
                    else if (isSelected && !isAnswer) { bg = '#f8d7da'; border = '2px solid #dc3545' }
                  }
                  return (
                    <button key={i} onClick={() => handleMCQSelect(opt)} disabled={revealed}
                      style={{ padding: '0.8rem', fontSize: '1.2rem', fontWeight: 700, borderRadius: '10px', background: bg, border, cursor: revealed ? 'default' : 'pointer', color: 'var(--clr-text)' }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Input for typed-answer levels (all except L5 MCQ) */}
            {!isMCQ && (
              <form onSubmit={handleSubmit}>
                <input ref={inputRef} className="answer-input" type="text" inputMode="numeric" value={answer}
                  onChange={e => { if (/^-?\d*$/.test(e.target.value)) setAnswer(e.target.value) }}
                  placeholder={question.solveForX ? 'X = ?' : '?'} disabled={revealed} autoFocus
                  style={{ fontSize: '1.5rem', textAlign: 'center', width: '100%', padding: '0.6rem' }} />
                {!revealed && <div className="button-row" style={{ marginTop: '0.4rem' }}><button type="submit" disabled={!answer} style={{ width: '100%', padding: '0.6rem' }}>Check</button></div>}
              </form>
            )}

            {renderFeedback(feedback, isCorrect)}
            {revealed && <div className="button-row" style={{ marginTop: '0.3rem' }}><button onClick={advance} style={{ width: '100%', padding: '0.6rem' }}>{round >= maxRounds ? 'Continue' : 'Next'}</button></div>}
          </>
        )}

        {/* Status */}
        {!promotionPrompt && statusMsg && (
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--clr-text-soft)', margin: '0.5rem 0 0', fontWeight: 500 }}>{statusMsg}</p>
        )}

        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <button onClick={() => setAppPhase('choosing')} style={{ background: 'transparent', border: 'none', color: 'var(--clr-text-soft)', fontSize: '0.75rem', padding: '0.3rem', cursor: 'pointer', textDecoration: 'underline' }}>Change table</button>
        </div>
      </div>
    </div>
  )
}

/* ── Adaptive Mixed Quiz App (Tatsavit) ──────────────────── */
/**
 * AdaptiveMixedApp Component
 * An adaptive mixed-topic quiz for a specific student.
 *
 * Topics mixed randomly:
 *   1. Fraction Addition:    a/b + c/d (answer as simplified fraction)
 *   2. Fraction Multiplication: a/b × c/d (answer as simplified fraction)
 *   3. Monomial Addition:    ax^n + bx^n = (a+b)x^n
 *   4. Monomial Multiplication: ax^m × bx^n = (a*b)x^(m+n)
 *   5. Simple Addition:      a + b where a,b can be positive or negative
 *
 * Adaptive Difficulty:
 *   - Starts at level 1 (easiest), max level 5
 *   - Rolling window of 8 answers tracks speed and accuracy
 *   - Level increases when: accuracy >= 90% AND avgTime < 4s
 *   - Level decreases when: accuracy < 60% OR avgTime > 8s
 *   - Higher levels = larger numbers, bigger denominators, higher exponents
 *
 * Persists difficulty level in localStorage across sessions.
 *
 * @param {Object} props
 * @param {string} props.studentName - Student's display name
 */
function AdaptiveMixedApp({ studentName }) {
  // localStorage key for persisting adaptive state
  const storageKey = `tenali-mixed-${studentName}`

  // ── Constants ────────────────────────────────────────────────────────
  const TOTAL_QUESTIONS = 100
  const ADAPT_WINDOW = 8
  const FAST_THRESH_MS = 4000
  const SLOW_THRESH_MS = 8000
  const MAX_LEVEL = 5

  // ── Client-side GCD utility ──────────────────────────────────────────
  const clientGcd = (a, b) => {
    a = Math.abs(a); b = Math.abs(b)
    while (b) { [a, b] = [b, a % b] }
    return a
  }

  // ── Phase & Persisted State ──────────────────────────────────────────
  // No setup phase — auto-starts immediately
  const [phase, setPhase] = useState('playing') // 'playing' | 'finished'
  const [diffLevel, setDiffLevel] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (saved && saved.diffLevel >= 1 && saved.diffLevel <= MAX_LEVEL) return saved.diffLevel
    } catch {}
    return 1
  })

  // ── Quiz Runtime State ───────────────────────────────────────────────
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [questionNum, setQuestionNum] = useState(0)
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [results, setResults] = useState([])
  const [recentWindow, setRecentWindow] = useState([])
  const [statusMsg, setStatusMsg] = useState('')

  const inputRef = useRef(null)
  const advanceFnRef = useRef(null)

  /**
   * save(level): Persist difficulty level to localStorage
   */
  const save = (level) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ diffLevel: level })) } catch {}
  }

  // ── Question Generators ──────────────────────────────────────────────
  // Each returns {type, prompt, correctAnswer, explanation}

  /**
   * genFractionAdd(level): Generate a fraction addition question
   * Level controls denominator range: level 1→2-5, level 5→2-20
   */
  const genFractionAdd = (level) => {
    const maxDen = 3 + level * 3 // 6, 9, 12, 15, 18
    const d1 = Math.floor(Math.random() * (maxDen - 1)) + 2
    let d2 = Math.floor(Math.random() * (maxDen - 1)) + 2
    if (level >= 2) while (d2 === d1) d2 = Math.floor(Math.random() * (maxDen - 1)) + 2
    else d2 = d1 // Easy: same denominator
    const n1 = Math.floor(Math.random() * (d1 - 1)) + 1
    const n2 = Math.floor(Math.random() * (d2 - 1)) + 1
    // Compute correct answer
    const resNum = n1 * d2 + n2 * d1
    const resDen = d1 * d2
    const g = clientGcd(resNum, resDen)
    const ansNum = resNum / g
    const ansDen = resDen / g
    const display = ansDen === 1 ? `${ansNum}` : `${ansNum}/${ansDen}`
    return {
      type: 'fraction-add',
      prompt: `${n1}/${d1} + ${n2}/${d2}`,
      correctAnswer: display,
      explanation: `${n1}/${d1} + ${n2}/${d2} = ${display}`
    }
  }

  /**
   * genFractionMul(level): Generate a fraction multiplication question
   * Level controls denominator range
   */
  const genFractionMul = (level) => {
    const maxDen = 3 + level * 3
    const d1 = Math.floor(Math.random() * (maxDen - 1)) + 2
    const d2 = Math.floor(Math.random() * (maxDen - 1)) + 2
    const n1 = Math.floor(Math.random() * (d1 - 1)) + 1
    const n2 = Math.floor(Math.random() * (d2 - 1)) + 1
    const resNum = n1 * n2
    const resDen = d1 * d2
    const g = clientGcd(resNum, resDen)
    const ansNum = resNum / g
    const ansDen = resDen / g
    const display = ansDen === 1 ? `${ansNum}` : `${ansNum}/${ansDen}`
    return {
      type: 'fraction-mul',
      prompt: `${n1}/${d1} × ${n2}/${d2}`,
      correctAnswer: display,
      explanation: `${n1}/${d1} × ${n2}/${d2} = ${display}`
    }
  }

  /**
   * genMonomialAdd(level): Generate a monomial addition question
   * e.g., 3x² + 5x² = 8x²
   * Level controls coefficient range and exponent range
   */
  const genMonomialAdd = (level) => {
    const maxCoeff = 3 + level * 3 // 6, 9, 12, 15, 18
    const maxExp = Math.min(level + 1, 5) // 2, 3, 4, 5, 5
    const exp = Math.floor(Math.random() * maxExp) + 1
    let a = Math.floor(Math.random() * maxCoeff) + 1
    let b = Math.floor(Math.random() * maxCoeff) + 1
    // At higher levels, sometimes negate a coefficient
    if (level >= 3 && Math.random() < 0.4) a = -a
    if (level >= 3 && Math.random() < 0.4) b = -b
    const sum = a + b
    const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
    const expStr = exp === 1 ? '' : sup(exp)
    const fmtTerm = (c) => {
      if (c === 1) return `x${expStr}`
      if (c === -1) return `-x${expStr}`
      if (c < 0) return `-${Math.abs(c)}x${expStr}`
      return `${c}x${expStr}`
    }
    const prompt = `${fmtTerm(a)} + ${fmtTerm(b)}`
    const ansStr = sum === 0 ? '0' : sum === 1 ? `x${expStr}` : sum === -1 ? `-x${expStr}` : `${sum}x${expStr}`
    return {
      type: 'monomial-add',
      prompt: prompt.replace(/\s+/g, ' ').trim(),
      correctAnswer: ansStr,
      explanation: `${prompt.replace(/\s+/g, ' ').trim()} = ${ansStr}`
    }
  }

  /**
   * genMonomialMul(level): Generate a monomial multiplication question
   * e.g., 3x² × 5x³ = 15x⁵
   * Level controls coefficient range and exponent range
   */
  const genMonomialMul = (level) => {
    const maxCoeff = 2 + level * 2 // 4, 6, 8, 10, 12
    const maxExp = Math.min(level + 1, 5)
    const exp1 = Math.floor(Math.random() * maxExp) + 1
    const exp2 = Math.floor(Math.random() * maxExp) + 1
    let a = Math.floor(Math.random() * maxCoeff) + 1
    let b = Math.floor(Math.random() * maxCoeff) + 1
    if (level >= 3 && Math.random() < 0.3) a = -a
    if (level >= 3 && Math.random() < 0.3) b = -b
    const product = a * b
    const expSum = exp1 + exp2
    const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
    const fmtTerm = (c, e) => {
      const eStr = e === 1 ? '' : sup(e)
      if (c === 1) return `x${eStr}`
      if (c === -1) return `-x${eStr}`
      return `${c}x${eStr}`
    }
    const prompt = `(${fmtTerm(a, exp1)}) × (${fmtTerm(b, exp2)})`
    const ansStr = product === 1 ? `x${sup(expSum)}` : product === -1 ? `-x${sup(expSum)}` : `${product}x${expSum === 1 ? '' : sup(expSum)}`
    return {
      type: 'monomial-mul',
      prompt,
      correctAnswer: ansStr,
      explanation: `${prompt} = ${ansStr}`
    }
  }

  /**
   * genSimpleAdd(level): Generate a simple addition question with +/- numbers
   * Level controls number range: level 1→1-10, level 5→1-100
   */
  const genSimpleAdd = (level) => {
    const maxNum = 5 + level * 15 // 20, 35, 50, 65, 80
    let a = Math.floor(Math.random() * maxNum) + 1
    let b = Math.floor(Math.random() * maxNum) + 1
    // Randomly negate
    if (Math.random() < 0.5) a = -a
    if (Math.random() < 0.5) b = -b
    const sum = a + b
    const prompt = b >= 0 ? `${a} + ${b}` : `${a} + (${b})`
    return {
      type: 'simple-add',
      prompt,
      correctAnswer: String(sum),
      explanation: `${prompt} = ${sum}`
    }
  }

  /**
   * generateQuestion(level): Pick a random topic and generate a question
   */
  const generateRandomQuestion = (level) => {
    const generators = [genFractionAdd, genFractionMul, genMonomialAdd, genMonomialMul, genSimpleAdd]
    const gen = generators[Math.floor(Math.random() * generators.length)]
    return gen(level)
  }

  /**
   * startSession(): Start or restart a session
   * Resets all quiz state and generates first question
   */
  const startSession = () => {
    setPhase('playing')
    setQuestionNum(0)
    setScore(0)
    setResults([])
    setRecentWindow([])
    setStatusMsg(`Level ${diffLevel} — Let's go!`)
    const q = generateRandomQuestion(diffLevel)
    setQuestion(q)
    setAnswer('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    setStartTime(Date.now())
    setQuestionNum(1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Auto-start on first mount: generate first question immediately
  useEffect(() => {
    if (phase === 'playing' && !question) {
      const q = generateRandomQuestion(diffLevel)
      setQuestion(q)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      setStartTime(Date.now())
      setQuestionNum(1)
      setStatusMsg(`Level ${diffLevel} — Let's go!`)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [])

  /**
   * nextQuestion(): Advance to next question or finish
   */
  const nextQuestion = () => {
    if (questionNum >= TOTAL_QUESTIONS) {
      setPhase('finished')
      return
    }
    const q = generateRandomQuestion(diffLevel)
    setQuestion(q)
    setAnswer('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    setStartTime(Date.now())
    setQuestionNum(n => n + 1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  advanceFnRef.current = () => nextQuestion()
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter key after wrong answer
  useEffect(() => {
    if (!revealed || isCorrect) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nextQuestion() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, questionNum])

  /**
   * normalizeAnswer(str): Normalize an answer string for comparison
   * Removes spaces, handles x^ notation, normalizes superscripts
   */
  const normalizeAnswer = (str) => {
    let s = str.trim().replace(/\s+/g, '')
    // Convert x^ notation to superscript: x^2 → x², x^10 → x¹⁰
    s = s.replace(/x\^(\d+)/g, (_, digits) => {
      const sup = digits.split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
      return `x${sup}`
    })
    return s
  }

  /**
   * handleSubmit(e): Check user's answer and adapt difficulty
   */
  const handleSubmit = (e) => {
    e.preventDefault()
    if (revealed || !question) return
    if (answer.trim() === '') return

    const elapsed = Date.now() - startTime
    // Normalize both answers for comparison
    const userNorm = normalizeAnswer(answer)
    const correctNorm = normalizeAnswer(question.correctAnswer)
    const correct = userNorm === correctNorm

    setIsCorrect(correct)
    setRevealed(true)
    if (correct) setScore(s => s + 1)

    const fb = correct
      ? `Correct! ${question.explanation} (${(elapsed / 1000).toFixed(1)}s)`
      : `Incorrect. ${question.explanation}`
    setFeedback(fb)

    // Topic label for results
    const typeLabels = {
      'fraction-add': 'Frac +',
      'fraction-mul': 'Frac ×',
      'monomial-add': 'Mono +',
      'monomial-mul': 'Mono ×',
      'simple-add': 'Add ±'
    }

    setResults(r => [...r, {
      prompt: `[${typeLabels[question.type] || question.type}] ${question.prompt}`,
      userAnswer: answer,
      correctAnswer: question.correctAnswer,
      correct,
      time: (elapsed / 1000).toFixed(1)
    }])

    // ── ADAPTIVE DIFFICULTY ────────────────────────────────────────────
    const newWindow = [...recentWindow, { correct, timeMs: elapsed }].slice(-ADAPT_WINDOW)
    setRecentWindow(newWindow)

    if (newWindow.length >= 4) {
      const accuracy = newWindow.filter(r => r.correct).length / newWindow.length
      const avgTime = newWindow.reduce((s, r) => s + r.timeMs, 0) / newWindow.length

      if (accuracy >= 0.9 && avgTime < FAST_THRESH_MS && diffLevel < MAX_LEVEL) {
        // Level up!
        const newLevel = diffLevel + 1
        setDiffLevel(newLevel)
        save(newLevel)
        setStatusMsg(`Level up! Now at Level ${newLevel}`)
      } else if ((accuracy < 0.6 || avgTime > SLOW_THRESH_MS) && diffLevel > 1) {
        // Level down
        const newLevel = diffLevel - 1
        setDiffLevel(newLevel)
        save(newLevel)
        setStatusMsg(`Easing down to Level ${newLevel}. Take your time!`)
      } else {
        setStatusMsg(`Level ${diffLevel} — ${Math.round(accuracy * 100)}% correct, avg ${(avgTime / 1000).toFixed(1)}s`)
      }
    }
  }

  // Keyboard input for global key events (digits, minus, backspace, slash, x, ^)
  useEffect(() => {
    if (phase !== 'playing' || revealed) return
    const handleKey = (e) => {
      // Don't interfere if focused on the input already
      if (e.target === inputRef.current) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault(); setAnswer(prev => prev + e.key)
      } else if (e.key === '-') {
        e.preventDefault(); setAnswer(prev => prev + '-')
      } else if (e.key === '/') {
        e.preventDefault(); setAnswer(prev => prev + '/')
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault(); setAnswer(prev => prev + 'x')
      } else if (e.key === '^') {
        e.preventDefault(); setAnswer(prev => prev + '^')
      } else if (e.key === 'Backspace') {
        e.preventDefault(); setAnswer(prev => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, revealed])

  const handleSolve = () => {
    if (!question || revealed) return
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: ${question.correctAnswer}`)
  }

  const computeAvgTime = () => {
    if (results.length === 0) return '0.0'
    const total = results.reduce((sum, r) => sum + parseFloat(r.time), 0)
    return (total / results.length).toFixed(1)
  }

  // ══════════ RENDER: FINISHED ══════════
  if (phase === 'finished') {
    return (
      <div className="app-shell">
        <div className="card">
          <h1>{studentName}'s Results</h1>
          <div className="welcome-box">
            <p className="welcome-text">Session complete!</p>
            <p className="final-score">Score: {score}/{TOTAL_QUESTIONS}</p>
            <p style={{ fontSize: '1.1rem', margin: '0.5rem 0', color: 'var(--clr-accent)' }}>
              Average time: {computeAvgTime()}s per question
            </p>
            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
              Final difficulty: Level {diffLevel} of {MAX_LEVEL}
            </p>
            <div className="results-table" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Your Answer</th>
                    <th>Correct</th>
                    <th>Time</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={r.correct ? 'result-correct' : 'result-wrong'}>
                      <td>{i + 1}</td>
                      <td>{r.prompt}</td>
                      <td>{r.userAnswer}</td>
                      <td>{r.correctAnswer}</td>
                      <td>{r.time}s</td>
                      <td>{r.correct ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={startSession} style={{ marginTop: '1rem' }}>Play Again</button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════ RENDER: PLAYING ══════════
  return (
    <div className="app-shell">
      <div className="card">
        <h1>{studentName}'s Practice</h1>
        <div className="top-mini-row">
          <span className="score-pill">Score {score}</span>
          <span className="progress-pill">Q {questionNum}/{TOTAL_QUESTIONS}</span>
          <span className="timer-pill">Level {diffLevel}</span>
        </div>
        {statusMsg && (
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--clr-text-soft)', margin: '4px 0 8px', fontWeight: 500 }}>
            {statusMsg}
          </p>
        )}

        <div className="tables-quiz-area">
          {question && (
            <>
              <div className="question-box" style={{ fontSize: '1.4rem' }}>
                {question.prompt} = ?
              </div>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', margin: '0.25rem 0' }}>
                {question.type === 'fraction-add' || question.type === 'fraction-mul' ? 'Answer as simplified fraction (e.g., 3/4)' :
                 question.type === 'monomial-add' || question.type === 'monomial-mul' ? 'Answer with x (e.g., 8x^3 or -2x^2)' :
                 'Enter a number'}
              </p>
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  className="answer-input"
                  type="text"
                  value={answer}
                  onChange={e => { if (!revealed) setAnswer(e.target.value) }}
                  placeholder="Type your answer"
                  disabled={revealed}
                  autoFocus
                />
                {!revealed && (
                  <div className="button-row">
                    <button type="submit" disabled={!answer.trim()}>Check</button>
                  </div>
                )}
              </form>
              {renderFeedback(feedback, isCorrect)}
              {!revealed && (
                <div className="button-row">
                  <button onClick={handleSolve} disabled={!answer.trim()} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
                </div>
              )}
              {revealed && (
                <div className="button-row">
                  <button onClick={() => nextQuestion()}>
                    {questionNum >= TOTAL_QUESTIONS ? 'Finish' : 'Next'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * SuperTablesApp — 10-level progressive multiplication mastery
 *
 * Levels:
 *  1. Sequential Recall (horizontal 5+5 split, 20 questions)
 *  2. Random Recall (horizontal 5+5 split, 20 questions)
 *  3. Timed Answer Visibility (answer fades after 2s)
 *  4. Partial Shuffled Table (5 visible entries)
 *  5. Missing Digit Identification (type full answer)
 *  6. Multiple Choice Questions (4 options)
 *  7. Match the Following (3 pairs per round)
 *  8. Adaptive MCQ (tracks weak spots via sessionStorage)
 *  9. Direct Input (no assistance)
 * 10. Fill in the Blank (missing multiplier or answer)
 */
/**
 * SuperTables1App — Continuous adaptive drill with two phases:
 *
 * Phase 1 (WITH lookup): Shuffled reference table shown on top. Questions asked
 *   continuously. 3 slowest facts highlighted. Uses rolling window of last 10
 *   correct attempts per fact. Once ALL 10 facts have avg < 5s → Phase 2.
 *
 * Phase 2 (WITHOUT lookup): Same questions, no reference table. Once the student
 *   answers 5 consecutive correct for EVERY fact → done.
 */
function SuperTables1App() {
  const shuffle = (arr) => {
    const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
  }
  const genTable = (n) => Array.from({ length: 10 }, (_, i) => ({ multiplier: i + 1, expression: `${n} × ${i + 1}`, answer: n * (i + 1) }))

  // ── Session tracking (rolling window of last 10 correct attempts) ──
  const getStore = () => { try { return JSON.parse(sessionStorage.getItem('st1_data') || '{}') } catch { return {} } }
  const setStore = (d) => { sessionStorage.setItem('st1_data', JSON.stringify(d)) }

  const recordCorrect = (tbl, mul, ms) => {
    const d = getStore(); const k = `${tbl}x${mul}`
    if (!d[k]) d[k] = { times: [], streak: 0 }
    d[k].times.push(ms)
    if (d[k].times.length > 10) d[k].times = d[k].times.slice(-10) // rolling window of 10
    d[k].streak = (d[k].streak || 0) + 1
    setStore(d)
  }
  const recordWrong = (tbl, mul) => {
    const d = getStore(); const k = `${tbl}x${mul}`
    if (!d[k]) d[k] = { times: [], streak: 0 }
    d[k].streak = 0 // reset streak on wrong
    setStore(d)
  }
  const getAvg = (tbl, mul) => {
    const d = getStore(); const k = `${tbl}x${mul}`
    const info = d[k]
    if (!info || info.times.length === 0) return null
    // trimmed mean: drop top/bottom 10%
    const sorted = [...info.times].sort((a, b) => a - b)
    if (sorted.length <= 2) return sorted.reduce((a, b) => a + b, 0) / sorted.length
    const trim = Math.max(1, Math.round(sorted.length * 0.1))
    const mid = sorted.slice(trim, sorted.length - trim)
    return mid.length > 0 ? mid.reduce((a, b) => a + b, 0) / mid.length : sorted[Math.floor(sorted.length / 2)]
  }
  const getStreak = (tbl, mul) => {
    const d = getStore(); const k = `${tbl}x${mul}`
    return d[k] ? (d[k].streak || 0) : 0
  }
  // Eligible multipliers: 2–9 (skip ×1 and ×10, too easy)
  const ELIGIBLE = [2, 3, 4, 5, 6, 7, 8, 9]
  const FAST_THRESHOLD_MS = 3000 // under 3s = "super fast", ready to swap out
  const MIN_CORRECT_TO_JUDGE = 3  // need at least 3 correct answers to judge speed

  const getSlowest3 = (tbl) => {
    const scored = []
    for (const m of ELIGIBLE) {
      const avg = getAvg(tbl, m)
      scored.push({ m, avg: avg !== null ? avg : 99999 })
    }
    // If no data yet, pick 3 at random from eligible
    const hasData = scored.some(s => s.avg !== 99999)
    if (!hasData) return shuffle(scored.map(s => s.m)).slice(0, 3)
    scored.sort((a, b) => b.avg - a.avg) // slowest first
    return scored.slice(0, 3).map(s => s.m)
  }

  const allUnder5s = (tbl) => {
    for (let m = 1; m <= 10; m++) {
      const avg = getAvg(tbl, m)
      if (avg === null || avg >= 5000) return false
    }
    return true
  }
  const allStreak5 = (tbl) => {
    for (let m = 1; m <= 10; m++) {
      if (getStreak(tbl, m) < 5) return false
    }
    return true
  }

  // ── Cycling: fixate on 3 facts, swap out one at a time when it gets fast ──
  const cycleQueueRef = useRef([])
  const currentSlowSetRef = useRef([]) // always exactly 3 facts being drilled
  const lastAskedRef = useRef(null)

  const pickNext = (tbl) => {
    if (cycleQueueRef.current.length === 0) {
      if (currentSlowSetRef.current.length === 3) {
        // After a full rotation: check if any fact got "super fast"
        const set = [...currentSlowSetRef.current]
        let fastestIdx = -1, fastestAvg = Infinity
        for (let i = 0; i < set.length; i++) {
          const d = getStore(); const k = `${tbl}x${set[i]}`
          const times = d[k] ? d[k].times : []
          if (times.length >= MIN_CORRECT_TO_JUDGE) {
            const avg = stTrimmedMean(times)
            if (avg < fastestAvg) { fastestAvg = avg; fastestIdx = i }
          }
        }
        // If the fastest is under threshold, swap it out with a random eligible fact
        if (fastestIdx !== -1 && fastestAvg < FAST_THRESHOLD_MS) {
          const currentSet = new Set(set)
          const candidates = ELIGIBLE.filter(m => !currentSet.has(m))
          if (candidates.length > 0) {
            set[fastestIdx] = candidates[Math.floor(Math.random() * candidates.length)]
            currentSlowSetRef.current = [...set]
          }
        }
      } else {
        // First time: pick 3 slowest (or random if no data)
        currentSlowSetRef.current = getSlowest3(tbl)
      }
      // Refill queue: shuffle the 3 facts
      let shuffled = shuffle([...currentSlowSetRef.current])
      // Prevent consecutive repeat across cycle boundaries
      if (shuffled.length > 1 && shuffled[0] === lastAskedRef.current) {
        const swapIdx = 1 + Math.floor(Math.random() * (shuffled.length - 1))
        ;[shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]]
      }
      cycleQueueRef.current = shuffled
    }
    // Pop next from queue — ABSOLUTE guard: NEVER return same as last asked
    let next = cycleQueueRef.current.shift()
    if (next === lastAskedRef.current) {
      if (cycleQueueRef.current.length > 0) {
        // Put it back at end, take the next different one
        cycleQueueRef.current.push(next)
        next = cycleQueueRef.current.shift()
      } else {
        // Queue is empty and we got a repeat — pick a different one from the set
        const others = currentSlowSetRef.current.filter(m => m !== next)
        if (others.length > 0) {
          const picked = others[Math.floor(Math.random() * others.length)]
          // Rebuild queue with the rest (excluding what we just picked)
          cycleQueueRef.current = shuffle(currentSlowSetRef.current.filter(m => m !== picked))
          next = picked
        }
      }
    }
    lastAskedRef.current = next
    return next
  }

  // ── Styles (using Tenali CSS vars) ──
  const S = {
    page: { minHeight: '100vh', padding: '24px', fontFamily: 'var(--font-body, system-ui)', color: 'var(--clr-text)', background: 'var(--clr-bg)' },
    title: { fontSize: '2.5rem', fontWeight: 900, marginBottom: 8, fontFamily: 'var(--font-display)', color: 'var(--clr-text)' },
    subtitle: { fontSize: '1.1rem', color: 'var(--clr-text-soft)', marginBottom: 32 },
    card: { background: 'var(--clr-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)', padding: '28px 24px', maxWidth: 620, margin: '0 auto', color: 'var(--clr-text)' },
    numGrid: { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6, width: '100%', margin: '0 auto' },
    numBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', background: 'var(--clr-surface)', border: '2px solid var(--clr-border)', borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', transition: 'all var(--transition)', color: 'var(--clr-text)', fontFamily: 'var(--font-body)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    btn: { border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', transition: 'all var(--transition)', fontFamily: 'var(--font-body)' },
    btnPrimary: { background: 'var(--clr-accent)', color: '#fff' },
    input: { width: 120, textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, border: '2px solid var(--clr-accent)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', outline: 'none', background: 'var(--clr-input)', color: 'var(--clr-text)', fontFamily: 'var(--font-body)' },
    back: { background: 'none', border: 'none', color: 'var(--clr-accent)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', padding: 0, fontFamily: 'var(--font-body)' },
    th: { padding: '8px 6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-accent)', background: 'var(--clr-accent-soft)', border: '2px solid var(--clr-border)', whiteSpace: 'nowrap' },
    td: { padding: '8px 6px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', border: '2px solid var(--clr-border)', background: 'var(--clr-card)', color: 'var(--clr-text)', whiteSpace: 'nowrap' },
    tdSlow: { padding: '8px 6px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', border: '2px solid var(--clr-wrong)', background: 'var(--clr-wrong-bg)', color: 'var(--clr-wrong)', whiteSpace: 'nowrap' },
    thSlow: { padding: '8px 6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-wrong)', background: 'var(--clr-wrong-bg)', border: '2px solid var(--clr-wrong)', whiteSpace: 'nowrap' },
    fbOk: { marginTop: 16, padding: 16, borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'var(--clr-correct-bg)', border: '1px solid var(--clr-correct)' },
    fbNo: { marginTop: 16, padding: 16, borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'var(--clr-wrong-bg)', border: '1px solid var(--clr-wrong)' },
  }

  // ── State ──
  const [screen, setScreen] = useState('home') // home | drill | done
  const [tableNum, setTableNum] = useState(null)
  const [phase, setPhase] = useState(1) // 1 = with lookup, 2 = without
  const [currentMul, setCurrentMul] = useState(1)
  const [shuffledTable, setShuffledTable] = useState([])
  const [fb, setFb] = useState(null)
  const startTimeRef = useRef(Date.now()) // ref, not state — always synchronous, no stale closures
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const inputRef = useRef(null)

  const startDrill = (num) => {
    setTableNum(num)
    // clear previous data for this table to start fresh
    const d = getStore()
    for (let m = 1; m <= 10; m++) delete d[`${num}x${m}`]
    setStore(d)
    // reset cycling state
    cycleQueueRef.current = []
    currentSlowSetRef.current = []
    lastAskedRef.current = null
    displayedMulRef.current = null
    setPhase(1)
    setShuffledTable(genTable(num))
    const first = pickNext(num)
    displayedMulRef.current = first
    setCurrentMul(first)
    setFb(null)
    startTimeRef.current = Date.now()
    setQuestionsAnswered(0)
    setScreen('drill')
  }

  const goHome = () => { setScreen('home'); setTableNum(null) }

  const goPhase2 = () => {
    // reset cycling state for phase 2
    cycleQueueRef.current = []
    currentSlowSetRef.current = []
    lastAskedRef.current = null
    displayedMulRef.current = null
    setPhase(2)
    setShuffledTable(genTable(tableNum))
    setFb(null)
    const first = pickNext(tableNum)
    displayedMulRef.current = first
    setCurrentMul(first)
    startTimeRef.current = Date.now()
  }

  const advancingRef = useRef(false) // debounce guard
  const displayedMulRef = useRef(null) // tracks what's actually shown on screen

  const advance = () => {
    if (advancingRef.current) return // prevent double-fire
    advancingRef.current = true
    setTimeout(() => { advancingRef.current = false }, 300)
    setFb(null)
    if (phase === 2 && allStreak5(tableNum)) {
      setScreen('done')
      return
    }
    let next = pickNext(tableNum)
    if (next === displayedMulRef.current) next = pickNext(tableNum)
    if (next == null || next === displayedMulRef.current) {
      const others = currentSlowSetRef.current.filter(m => m !== displayedMulRef.current)
      if (others.length > 0) next = others[Math.floor(Math.random() * others.length)]
    }
    displayedMulRef.current = next
    lastAskedRef.current = next
    setCurrentMul(next)
    // Set startTime LAST, synchronously via ref — no stale closures possible
    startTimeRef.current = Date.now()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const val = parseInt(e.target.elements.ans.value, 10)
    if (isNaN(val)) return
    const correct = tableNum * currentMul
    const ok = val === correct
    const elapsed = Date.now() - startTimeRef.current // ref = always current, never stale
    if (ok) {
      recordCorrect(tableNum, currentMul, elapsed)
    } else {
      recordWrong(tableNum, currentMul)
    }
    setQuestionsAnswered(q => q + 1)
    setFb({ ok, correctAns: correct, elapsed })
    e.target.elements.ans.value = ''
  }

  // Focus management
  useEffect(() => { if (!fb && inputRef.current) inputRef.current.focus() }, [fb, currentMul])
  useEffect(() => {
    if (!fb || screen !== 'drill') return
    const handler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopImmediatePropagation()
        advance()
      }
    }
    // Use capture phase so this fires FIRST and stops the button click from also firing advance
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [fb, screen, currentMul, phase, tableNum, questionsAnswered])

  // ── Performance chart (same as SuperTables but using st1_data) ──
  const renderChart = () => {
    if (!tableNum) return null
    const bars = []
    let maxTime = 0
    for (let m = 1; m <= 10; m++) {
      const avg = getAvg(tableNum, m)
      const avgSec = avg !== null ? avg / 1000 : 0
      if (avgSec > maxTime) maxTime = avgSec
      bars.push({ m, avg: avgSec, streak: getStreak(tableNum, m) })
    }
    const hasData = bars.some(b => b.avg > 0)
    if (!hasData) return null
    // Fixed scale: always 10s max so bars shrink as you get faster
    maxTime = 10
    const chartH = 100
    const barW = `${100 / 10}%`
    const slow3 = new Set(currentSlowSetRef.current)
    return (
      <div style={{ marginTop: 20, padding: '12px 0 0' }}>
        <p style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--clr-text-soft)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Avg. Time (last 10 correct) — {phase === 1 ? 'Target: under 5s each' : 'Streak target: 5 each'}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', height: chartH, margin: '0 4px', borderBottom: '2px solid var(--clr-border)', borderLeft: '2px solid var(--clr-border)' }}>
          <span style={{ position: 'absolute', left: -4, top: 0, fontSize: '0.55rem', color: 'var(--clr-text-soft)', transform: 'translateX(-100%)' }}>10s</span>
          <span style={{ position: 'absolute', left: -4, bottom: -2, fontSize: '0.55rem', color: 'var(--clr-text-soft)', transform: 'translateX(-100%)' }}>0s</span>
          {/* 5s threshold line */}
          {phase === 1 && maxTime > 5 && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(5 / maxTime) * chartH}px`, borderTop: '2px dashed var(--clr-correct)', opacity: 0.5 }}>
              <span style={{ position: 'absolute', right: 0, top: -14, fontSize: '0.55rem', color: 'var(--clr-correct)', fontWeight: 700 }}>5s</span>
            </div>
          )}
          {bars.map(b => {
            const h = b.avg > 0 ? Math.max((b.avg / maxTime) * chartH, 4) : 0
            const isSlow = slow3.has(b.m)
            return (
              <div key={b.m} style={{ width: barW, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', padding: '0 1px', boxSizing: 'border-box' }}>
                {b.avg > 0 && <span style={{ fontSize: '0.5rem', color: 'var(--clr-text-soft)', marginBottom: 1, fontWeight: 600 }}>{b.avg.toFixed(1)}</span>}
                <div style={{
                  width: '65%', height: h, minWidth: 6, borderRadius: '3px 3px 0 0',
                  background: b.avg === 0 ? 'transparent' : isSlow ? 'var(--clr-wrong)' : b.avg < 5 ? 'var(--clr-correct)' : 'var(--clr-accent)',
                  opacity: b.avg === 0 ? 0.15 : 0.85, transition: 'height 0.3s',
                }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', margin: '3px 4px 0' }}>
          {bars.map(b => (
            <div key={b.m} style={{ width: barW, textAlign: 'center', fontSize: '0.55rem', fontWeight: 700, color: 'var(--clr-text-soft)' }}>
              ×{b.m}
              {phase === 2 && <div style={{ fontSize: '0.5rem', color: b.streak >= 5 ? 'var(--clr-correct)' : 'var(--clr-text-soft)' }}>{b.streak}/5</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── HOME ──
  if (screen === 'home') {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={S.title}>SuperTables 1</h1>
            <p style={S.subtitle}>Adaptive speed drill — master any table until it's automatic</p>
          </div>
          <div style={{ ...S.card, marginBottom: 24 }}>
            <h2 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--clr-text)' }}>
              Choose a multiplication table
            </h2>
            <div style={S.numGrid}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => startDrill(n)} style={S.numBtn}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--clr-accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--clr-accent)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'var(--clr-surface)'; e.currentTarget.style.color = 'var(--clr-text)'; e.currentTarget.style.borderColor = 'var(--clr-border)' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-soft)', margin: '0 0 4px' }}>Phase 1: Answer with lookup table until all facts &lt; 5 seconds</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-soft)', margin: 0 }}>Phase 2: No lookup — 5 consecutive correct per fact to finish</p>
          </div>
        </div>
      </div>
    )
  }

  // ── DRILL ──
  if (screen === 'drill') {
    // Safety: if slow set got cleared somehow, refill it
    if (currentSlowSetRef.current.length === 0 && tableNum) {
      currentSlowSetRef.current = getSlowest3(tableNum)
    }
    const slow3 = new Set(currentSlowSetRef.current)
    const table = genTable(tableNum)
    const correct = tableNum * currentMul

    return (
      <div style={S.page}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={goHome} style={S.back}>← Home</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-soft)' }}>Table of {tableNum}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: phase === 1 ? 'var(--clr-accent)' : 'var(--clr-correct)' }}>
                {phase === 1 ? 'Phase 1 — With Lookup' : 'Phase 2 — From Memory'}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-soft)', textAlign: 'right' }}>
              Q #{questionsAnswered + 1}
            </div>
          </div>

          {/* Phase 1: Lookup table — only the 3 facts currently being practiced */}
          {phase === 1 && (
            <div style={{ marginBottom: 20 }}>
              {(() => {
                // Show only the 3 focused facts; fallback to current question if set is empty
                let focused = shuffledTable.filter(e => slow3.has(e.multiplier))
                if (focused.length === 0) {
                  focused = shuffledTable.filter(e => e.multiplier === currentMul)
                }
                return focused.length > 0 ? (
                  <table style={{ margin: '0 auto', borderCollapse: 'collapse', width: 'auto', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        {focused.map((e, i) => (
                          <th key={i} style={S.thSlow}>{e.expression}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {focused.map((e, i) => (
                          <td key={i} style={S.tdSlow}>{e.answer}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                ) : null
              })()}
              {/* Phase 2 button — prominently below the lookup table */}
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button onClick={goPhase2} style={{
                  padding: '10px 28px', fontSize: '1rem', fontWeight: 700,
                  borderRadius: 'var(--radius-sm)', border: '2px solid var(--clr-accent)',
                  background: 'var(--clr-card)', color: 'var(--clr-accent)',
                  cursor: 'pointer', transition: 'all var(--transition)',
                  fontFamily: 'var(--font-body)',
                }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--clr-accent)'; e.currentTarget.style.color = '#fff' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'var(--clr-card)'; e.currentTarget.style.color = 'var(--clr-accent)' }}
                >
                  Ready? Go to Phase 2 →
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Status badges */}
          {phase === 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
              {table.map(e => {
                const streak = getStreak(tableNum, e.multiplier)
                const done = streak >= 5
                const isFocused = slow3.has(e.multiplier)
                return (
                  <div key={e.multiplier} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                    background: done ? 'var(--clr-correct-bg)' : isFocused ? 'var(--clr-wrong-bg)' : 'var(--clr-surface)',
                    color: done ? 'var(--clr-correct)' : isFocused ? 'var(--clr-wrong)' : 'var(--clr-text-soft)',
                    border: `1px solid ${done ? 'var(--clr-correct)' : isFocused ? 'var(--clr-wrong)' : 'var(--clr-border)'}`,
                  }}>
                    ×{e.multiplier}: {done ? '✓' : `${streak}/5`}
                  </div>
                )
              })}
            </div>
          )}

          {/* Question card */}
          <div style={S.card}>
            <div style={{ fontSize: '2rem', fontWeight: 900, textAlign: 'center', marginBottom: 24, color: 'var(--clr-text)', letterSpacing: '0.5px' }}>
              {tableNum} × {currentMul} = ?
            </div>

            {fb ? (
              <div style={fb.ok ? S.fbOk : S.fbNo}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: fb.ok ? 'var(--clr-correct)' : 'var(--clr-wrong)', margin: 0 }}>
                  {fb.ok ? '✓ Correct!' : `✗ The answer is ${fb.correctAns}`}
                </p>
                {fb.ok && fb.elapsed != null && <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-soft)', margin: '4px 0 0' }}>{(fb.elapsed / 1000).toFixed(1)}s</p>}
                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)', marginTop: 12, fontWeight: 600 }}>Press Enter →</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <input ref={inputRef} name="ans" type="number" style={S.input} placeholder="?" autoComplete="off" />
                <button type="submit" style={{ ...S.btn, ...S.btnPrimary }}>Submit</button>
              </form>
            )}
          </div>

          {/* Performance chart */}
          {renderChart()}
        </div>
      </div>
    )
  }

  // ── DONE ──
  if (screen === 'done') {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 40 }}>
          <div style={{ ...S.card, textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>🏆</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontFamily: 'var(--font-display)', color: 'var(--clr-text)' }}>
              Table of {tableNum} Mastered!
            </h2>
            <p style={{ color: 'var(--clr-text-soft)', margin: '0 0 8px' }}>
              All 10 facts answered correctly 5 times in a row — without any lookup.
            </p>
            <p style={{ color: 'var(--clr-text-soft)', fontSize: '0.85rem', margin: '0 0 24px' }}>
              Total questions answered: {questionsAnswered}
            </p>

            {/* Final times */}
            <div style={{ marginBottom: 24 }}>
              <table style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {genTable(tableNum).map((e, i) => (
                      <th key={i} style={S.th}>{e.expression}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {genTable(tableNum).map((e, i) => {
                      const avg = getAvg(tableNum, e.multiplier)
                      return <td key={i} style={S.td}>{avg !== null ? (avg / 1000).toFixed(1) + 's' : '—'}</td>
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <button onClick={goHome} style={{ ...S.btn, ...S.btnPrimary, fontSize: '1.1rem', padding: '12px 32px' }}>Practice Another Table</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function SuperTablesApp() {
  // ── helpers ───────────────────────────────────────────
  const stShuffle = (arr) => {
    const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
  }
  const stGenTable = (n) => Array.from({ length: 10 }, (_, i) => ({ multiplier: i + 1, expression: `${n} × ${i + 1}`, answer: n * (i + 1) }))
  const stDistractors = (correct, tbl) => {
    const tblAns = Array.from({ length: 10 }, (_, i) => tbl * (i + 1))
    const s = new Set()
    tblAns.forEach(a => { if (a !== correct) s.add(a) });
    [correct - 1, correct + 1, correct - tbl, correct + tbl, correct - 10, correct + 10].forEach(v => { if (v > 0 && v !== correct) s.add(v) })
    const picked = stShuffle([...s]).slice(0, 3)
    while (picked.length < 3) picked.push(correct + picked.length + 1)
    return stShuffle([correct, ...picked])
  }
  const stMask = (answer) => {
    const s = String(answer); const pos = Math.floor(Math.random() * s.length)
    return s.slice(0, pos) + '*' + s.slice(pos + 1)
  }
  // adaptive tracking — stores individual times for trimmed mean
  const stGetAdaptive = () => { try { return JSON.parse(sessionStorage.getItem('st_adaptive') || '{}') } catch { return {} } }
  const stSetAdaptive = (d) => { sessionStorage.setItem('st_adaptive', JSON.stringify(d)) }
  const stRecord = (tbl, mul, ok, ms) => {
    const d = stGetAdaptive(); const k = `${tbl}x${mul}`
    if (!d[k]) d[k] = { wrong: 0, attempts: 0, times: [] }
    // migrate old format (totalTime only) → new format (times array)
    if (!d[k].times) d[k].times = d[k].totalTime ? Array(d[k].attempts).fill(Math.round(d[k].totalTime / d[k].attempts)) : []
    // Only record time and count attempt for correct answers
    // Wrong answers just increment the wrong counter — not counted as an attempt
    if (ok) {
      d[k].attempts++; d[k].times.push(ms)
      if (d[k].times.length > 50) d[k].times = d[k].times.slice(-50)
    } else {
      d[k].wrong++
    }
    stSetAdaptive(d)
  }
  // Trimmed mean: discard bottom 10% and top 10%, average the middle 80%
  const stTrimmedMean = (times) => {
    if (!times || times.length === 0) return 0
    if (times.length <= 2) return times.reduce((a, b) => a + b, 0) / times.length
    const sorted = [...times].sort((a, b) => a - b)
    const trim = Math.max(1, Math.round(sorted.length * 0.1))
    const trimmed = sorted.slice(trim, sorted.length - trim)
    if (trimmed.length === 0) return sorted[Math.floor(sorted.length / 2)]
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length
  }
  const stWeak = (tbl) => {
    const d = stGetAdaptive(); const w = []
    for (let m = 1; m <= 10; m++) {
      const info = d[`${tbl}x${m}`]
      if (!info || info.attempts === 0) continue
      const avg = stTrimmedMean(info.times || [])
      if (info.wrong > 0 || avg > 5000) w.push({ m, sc: info.wrong * 2 + avg / 1000 })
    }
    return w.sort((a, b) => b.sc - a.sc).map(x => x.m)
  }

  // ── styles using Tenali CSS variables ─────────────────
  const S = {
    page: { minHeight: '100vh', padding: '24px', fontFamily: 'var(--font-body, system-ui)', color: 'var(--clr-text)', background: 'var(--clr-bg)' },
    center: { textAlign: 'center' },
    title: { fontSize: '2.5rem', fontWeight: 900, marginBottom: 8, fontFamily: 'var(--font-display)', color: 'var(--clr-text)' },
    subtitle: { fontSize: '1.1rem', color: 'var(--clr-text-soft)', marginBottom: 32 },
    card: { background: 'var(--clr-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)', padding: '28px 24px', maxWidth: 620, margin: '0 auto', color: 'var(--clr-text)' },
    btn: { border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', transition: 'all var(--transition)', fontFamily: 'var(--font-body)' },
    btnPrimary: { background: 'var(--clr-accent)', color: '#fff' },
    btnSecondary: { background: 'var(--clr-surface)', color: 'var(--clr-text)' },
    input: { width: 120, textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, border: '2px solid var(--clr-accent)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', outline: 'none', background: 'var(--clr-input)', color: 'var(--clr-text)', fontFamily: 'var(--font-body)' },
    optionBtn: { border: '2px solid var(--clr-border)', borderRadius: 'var(--radius-sm)', padding: '14px', fontWeight: 800, fontSize: '1.3rem', cursor: 'pointer', background: 'var(--clr-surface)', transition: 'all var(--transition)', color: 'var(--clr-text)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    tableWrap: { overflowX: 'auto', marginBottom: 24 },
    table: { margin: '0 auto', borderCollapse: 'collapse' },
    th: { padding: '10px 14px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--clr-accent)', background: 'var(--clr-accent-soft)', border: '2px solid var(--clr-border)' },
    td: { padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', border: '2px solid var(--clr-border)', background: 'var(--clr-card)', color: 'var(--clr-text)' },
    qLabel: { fontSize: '0.85rem', color: 'var(--clr-text-soft)', fontWeight: 600, marginBottom: 8 },
    qText: { fontSize: '2rem', fontWeight: 900, textAlign: 'center', marginBottom: 24, color: 'var(--clr-text)', letterSpacing: '0.5px' },
    fbOk: { marginTop: 16, padding: 16, borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'var(--clr-correct-bg)', border: '1px solid var(--clr-correct)' },
    fbNo: { marginTop: 16, padding: 16, borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'var(--clr-wrong-bg)', border: '1px solid var(--clr-wrong)' },
    back: { background: 'none', border: 'none', color: 'var(--clr-accent)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', padding: 0, fontFamily: 'var(--font-body)' },
    badge: { fontSize: '0.7rem', fontWeight: 700, color: 'var(--clr-accent)', background: 'var(--clr-accent-soft)', padding: '2px 8px', borderRadius: 99, display: 'inline-block' },
    numGrid: { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6, width: '100%', margin: '0 auto' },
    numBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', background: 'var(--clr-surface)', border: '2px solid var(--clr-border)', borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', transition: 'all var(--transition)', color: 'var(--clr-text)', fontFamily: 'var(--font-body)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    matchCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 12 },
    matchBtn: (active, matched) => ({ padding: '14px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '1.15rem', border: '2px solid', cursor: matched ? 'default' : 'pointer', opacity: matched ? 0.5 : 1, transition: 'all var(--transition)', fontFamily: 'var(--font-body)',
      borderColor: matched ? 'var(--clr-correct)' : active ? 'var(--clr-accent)' : 'var(--clr-border)',
      background: matched ? 'var(--clr-correct-bg)' : active ? 'var(--clr-accent-soft)' : 'var(--clr-card)',
      color: matched ? 'var(--clr-correct)' : active ? 'var(--clr-accent)' : 'var(--clr-text)' }),
    ansCol: (sel, matched) => ({ padding: '14px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '1.15rem', border: '2px solid', cursor: matched ? 'default' : sel ? 'pointer' : 'not-allowed', opacity: matched ? 0.5 : 1, transition: 'all var(--transition)', fontFamily: 'var(--font-body)',
      borderColor: matched ? 'var(--clr-correct)' : sel ? 'var(--clr-accent)' : 'var(--clr-border)',
      background: matched ? 'var(--clr-correct-bg)' : sel ? 'var(--clr-accent-soft)' : 'var(--clr-card)',
      color: matched ? 'var(--clr-correct)' : sel ? 'var(--clr-accent)' : 'var(--clr-text-soft)' }),
    // level progress bar
    progressBar: { display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto 24px', maxWidth: 400 },
    progressStep: (done, active) => ({ flex: 1, height: 6, borderRadius: 3, transition: 'all var(--transition)',
      background: done ? 'var(--clr-accent)' : active ? 'var(--clr-accent-soft)' : 'var(--clr-surface)' }),
  }

  // ── level metadata (unchanged logic) ──────────────────
  const LEVELS = [
    { id: 1, name: 'Sequential Recall', desc: 'Answer in order with the table visible', icon: '📋' },
    { id: 2, name: 'Random Recall', desc: 'Random questions with the table visible', icon: '🔀' },
    { id: 3, name: 'Timed Visibility', desc: 'See the answer briefly, then recall it', icon: '⏱️' },
    { id: 4, name: 'Partial Table', desc: 'Only 5 entries visible', icon: '🧩' },
    { id: 5, name: 'Missing Digit', desc: 'One digit hidden — type full answer', icon: '🔍' },
    { id: 6, name: 'Multiple Choice', desc: 'Pick from 4 options', icon: '🅰️' },
    { id: 7, name: 'Match Pairs', desc: 'Match 3 questions to answers', icon: '🔗' },
    { id: 8, name: 'Adaptive MCQ', desc: 'Focuses on your weak spots', icon: '🧠' },
    { id: 9, name: 'Direct Input', desc: 'No help — type from memory', icon: '✍️' },
    { id: 10, name: 'Fill in the Blank', desc: 'Find the missing value', icon: '📝' },
  ]

  // ── state (sequential progression) ────────────────────
  const [screen, setScreen] = useState('home') // home | play | levelDone | allDone
  const [tableNum, setTableNum] = useState(null)
  const [currentLevel, setCurrentLevel] = useState(1) // 1–10, auto-progresses
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [fb, setFb] = useState(null)
  const [phase, setPhase] = useState('show') // for L3
  const [selected, setSelected] = useState(null) // for L7
  const [matched, setMatched] = useState([]) // for L7
  const [wrong7, setWrong7] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const inputRef = useRef(null)

  // computed data
  const [questions, setQuestions] = useState([])
  const [visible, setVisible] = useState([])
  const [options, setOptions] = useState([])
  const [rounds, setRounds] = useState([])
  const [roundIdx, setRoundIdx] = useState(0)
  const [shuffledAns, setShuffledAns] = useState([])

  const lid = currentLevel
  const levelMeta = LEVELS[lid - 1] || LEVELS[0]
  const totalQ = lid <= 2 ? 20 : lid === 4 ? 5 : lid === 7 ? rounds.length * 3 : 10
  const cur = questions[Math.min(idx, questions.length - 1)] || { expression: '', answer: 0, multiplier: 1 }

  // ── adaptive weighting helper ──────────────────────────
  // Returns a shuffled question list that includes extra copies of weak facts.
  // `base` = full 10-entry table, `count` = desired question count.
  // Weak facts (from stWeak) get duplicated so they appear ~2× more often,
  // but mixed with others so it doesn't feel overwhelming.
  const stAdaptiveList = (base, num, count) => {
    const weak = new Set(stWeak(num).slice(0, 4)) // top 4 weakest
    if (weak.size === 0) return stShuffle(base).slice(0, count)
    const pool = []
    for (const e of base) {
      pool.push(e)
      if (weak.has(e.multiplier)) pool.push({ ...e }) // extra copy for weak facts
    }
    // shuffle and trim to count
    const shuffled = stShuffle(pool)
    if (shuffled.length >= count) return shuffled.slice(0, count)
    // if we need more, repeat the pool
    while (shuffled.length < count) shuffled.push(...stShuffle(base))
    return shuffled.slice(0, count)
  }

  // ── setup a level (called with table number + uses currentLevel) ──
  const setupLevel = (num, level) => {
    setScreen('play'); setIdx(0); setScore(0); setFb(null); setPhase('show')
    setSelected(null); setMatched([]); setWrong7(false); setRoundIdx(0); setStartTime(Date.now()); setWrongAttempts(0)
    const tbl = stGenTable(num)
    const first = tbl.slice(0, 5), second = tbl.slice(5)
    // L1 & L2: sequential/halved structure preserved, but weak facts from each half get extra reps
    if (level === 1) {
      const weak = new Set(stWeak(num).slice(0, 4))
      const firstQ = [...first]; first.forEach(e => { if (weak.has(e.multiplier)) firstQ.push(e) })
      const secondQ = [...second]; second.forEach(e => { if (weak.has(e.multiplier)) secondQ.push(e) })
      const fwd1 = firstQ.slice(0, 10), fwd2 = secondQ.slice(0, 10)
      while (fwd1.length < 10) fwd1.push(first[fwd1.length % first.length])
      while (fwd2.length < 10) fwd2.push(second[fwd2.length % second.length])
      setQuestions([...fwd1, ...fwd2]); setVisible(first)
    }
    else if (level === 2) {
      const weak = new Set(stWeak(num).slice(0, 4))
      const firstPool = [...first]; first.forEach(e => { if (weak.has(e.multiplier)) firstPool.push(e) })
      const secondPool = [...second]; second.forEach(e => { if (weak.has(e.multiplier)) secondPool.push(e) })
      const r1 = stShuffle(firstPool).slice(0, 10), r2 = stShuffle(secondPool).slice(0, 10)
      while (r1.length < 10) r1.push(first[r1.length % first.length])
      while (r2.length < 10) r2.push(second[r2.length % second.length])
      setQuestions([...stShuffle(r1), ...stShuffle(r2)]); setVisible(first)
    }
    else if (level === 3) { setQuestions(stAdaptiveList(tbl, num, 10)) }
    else if (level === 4) {
      // Prefer showing weak facts in the visible set
      const weak = new Set(stWeak(num).slice(0, 3))
      const weakEntries = tbl.filter(e => weak.has(e.multiplier))
      const others = stShuffle(tbl.filter(e => !weak.has(e.multiplier)))
      const v = stShuffle([...weakEntries, ...others].slice(0, 5))
      setVisible(v); setQuestions(stShuffle(v))
    }
    else if (level === 5) { setQuestions(stAdaptiveList(tbl, num, 10).map(e => ({ ...e, masked: stMask(e.answer) }))) }
    else if (level === 6) { const q = stAdaptiveList(tbl, num, 10); setQuestions(q); setOptions(stDistractors(q[0].answer, num)) }
    else if (level === 7) {
      // Ensure weak facts appear in the rounds
      const weak = new Set(stWeak(num).slice(0, 3))
      const weakEntries = tbl.filter(e => weak.has(e.multiplier))
      const others = stShuffle(tbl.filter(e => !weak.has(e.multiplier)))
      const ordered = [...weakEntries, ...others].slice(0, 9)
      const sh = stShuffle(ordered); const r = []
      for (let i = 0; i < sh.length; i += 3) r.push(sh.slice(i, i + 3))
      if (r.length === 0) r.push(stShuffle(tbl).slice(0, 3))
      setRounds(r); setShuffledAns(stShuffle(r[0].map(e => e.answer)))
    } else if (level === 8) {
      // L8 already fully adaptive — keep as is but use stAdaptiveList
      const weak = stWeak(num); const weakE = weak.slice(0, 5).map(m => tbl.find(e => e.multiplier === m)).filter(Boolean)
      const others = stShuffle(tbl.filter(e => !weak.includes(e.multiplier)))
      const mix = [...weakE]; for (const o of others) { if (mix.length >= 10) break; if (!mix.find(m => m.multiplier === o.multiplier)) mix.push(o) }
      while (mix.length < 10) mix.push(tbl[mix.length % 10])
      const q = stShuffle(mix); setQuestions(q); setOptions(stDistractors(q[0].answer, num))
    } else if (level === 9) { setQuestions(stAdaptiveList(tbl, num, 10)) }
    else if (level === 10) { setQuestions(stAdaptiveList(tbl, num, 10).map(e => ({ ...e, blankType: Math.random() > 0.5 ? 'multiplier' : 'answer' }))) }
  }

  // Start from table selection → always Level 1
  const startFromTable = (num) => {
    setTableNum(num); setCurrentLevel(1); setupLevel(num, 1)
  }

  // Continue to next level
  const continueToNext = () => {
    if (currentLevel < 10) {
      const next = currentLevel + 1
      setCurrentLevel(next); setupLevel(tableNum, next)
    } else {
      setScreen('allDone')
    }
  }

  // Reset everything
  const goHome = () => { setScreen('home'); setTableNum(null); setCurrentLevel(1) }

  // ── effects ───────────────────────────────────────────
  // options update on idx change for MCQ levels
  useEffect(() => {
    if (screen !== 'play' || !tableNum) return
    if ((lid === 6 || lid === 8) && questions[idx]) setOptions(stDistractors(questions[idx].answer, tableNum))
  }, [idx, screen])

  // L3 timed phases
  useEffect(() => {
    if (lid !== 3 || screen !== 'play') return
    if (phase === 'show') { const t = setTimeout(() => setPhase('fading'), 2000); return () => clearTimeout(t) }
    if (phase === 'fading') { const t = setTimeout(() => setPhase('ask'), 800); return () => clearTimeout(t) }
  }, [phase, idx, lid, screen])

  // L7 auto-advance after matching all 3
  useEffect(() => {
    if (lid !== 7 || matched.length !== 3) return
    const t = setTimeout(() => {
      const next = roundIdx + 1
      if (next < rounds.length) { setRoundIdx(next); setMatched([]); setSelected(null); setWrong7(false); setShuffledAns(stShuffle(rounds[next].map(e => e.answer))) }
      else { setRoundIdx(next) }
    }, 800)
    return () => clearTimeout(t)
  }, [matched, lid])

  useEffect(() => { setStartTime(Date.now()) }, [idx])
  useEffect(() => { if (!fb && inputRef.current) inputRef.current.focus() }, [idx, fb, phase])

  // Allow Enter key to advance when feedback is showing
  const nextBtnRef = useRef(null)
  useEffect(() => {
    if (fb && nextBtnRef.current) nextBtnRef.current.focus()
  }, [fb])
  useEffect(() => {
    if (!fb || screen !== 'play') return
    const handler = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fb, screen, idx, lid])

  // ── answer handlers (level logic unchanged) ───────────
  const handleInput = (e) => {
    e.preventDefault()
    const val = parseInt(e.target.elements.ans.value, 10)
    if (isNaN(val)) return
    let correctAns = cur.answer
    if (lid === 10) correctAns = cur.blankType === 'multiplier' ? cur.multiplier : cur.answer
    const ok = val === correctAns
    if (ok) setScore(s => s + 1)
    else setWrongAttempts(w => w + 1)
    stRecord(tableNum, cur.multiplier, ok, Date.now() - startTime)
    setFb({ ok, correctAns })
    e.target.elements.ans.value = ''
  }
  const handlePick = (ans) => {
    const ok = ans === cur.answer
    if (ok) setScore(s => s + 1)
    else setWrongAttempts(w => w + 1)
    stRecord(tableNum, cur.multiplier, ok, Date.now() - startTime)
    setFb({ ok, correctAns: cur.answer })
  }
  const advance = () => {
    setFb(null)
    if (lid === 3) setPhase('show')
    if (lid <= 2 && idx < 19) {
      const tbl = stGenTable(tableNum)
      if (idx === 9) setVisible(tbl.slice(5))
    }
    // Check if this was the last question → show level completion
    const nextIdx = idx + 1
    const thisTotal = lid <= 2 ? 20 : lid === 4 ? 5 : lid === 7 ? rounds.length * 3 : 10
    if (nextIdx >= thisTotal) {
      setIdx(nextIdx)
      setScreen('levelDone')
    } else {
      setIdx(nextIdx)
    }
  }

  // L1/L2 visible half
  const displayHalf = lid <= 2 && tableNum ? (idx < 10 ? stGenTable(tableNum).slice(0, 5) : stGenTable(tableNum).slice(5)) : []

  const done = lid === 7 ? (roundIdx >= rounds.length) : (idx >= totalQ && fb === null)

  // When L7 finishes via roundIdx, transition to levelDone
  useEffect(() => {
    if (lid === 7 && screen === 'play' && roundIdx >= rounds.length && rounds.length > 0) {
      setScreen('levelDone')
    }
  }, [roundIdx, rounds.length, lid, screen])

  // ── render helpers ────────────────────────────────────
  const renderLevelProgress = () => (
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <p style={{ fontSize: '0.9rem', color: 'var(--clr-text)', margin: '0 0 8px', fontWeight: 700 }}>
        Level {lid} of 10 — {levelMeta.name}
      </p>
      <div style={S.progressBar}>
        {LEVELS.map((_, i) => (
          <div key={i} style={S.progressStep(i + 1 < lid, i + 1 === lid)} />
        ))}
      </div>
    </div>
  )

  const renderTable = (entries, tblNum, hideM) => {
    const filtered = hideM != null ? entries.filter(e => e.multiplier !== hideM) : entries
    return (
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{filtered.map((e, i) => <th key={i} style={S.th}>{tblNum} × {e.multiplier}</th>)}</tr></thead>
          <tbody><tr>{filtered.map((e, i) => <td key={i} style={S.td}>{e.answer}</td>)}</tr></tbody>
        </table>
      </div>
    )
  }

  const renderFeedback = () => (
    <div style={fb.ok ? S.fbOk : S.fbNo}>
      <p style={{ fontWeight: 700, fontSize: '1.1rem', color: fb.ok ? 'var(--clr-correct)' : 'var(--clr-wrong)', margin: 0 }}>
        {fb.ok ? '✓ Correct!' : `✗ The answer is ${fb.correctAns}`}
      </p>
      <button ref={nextBtnRef} onClick={advance} style={{ ...S.btn, ...S.btnPrimary, marginTop: 12 }}>Next →</button>
    </div>
  )

  const renderInput = () => (
    <form onSubmit={handleInput} style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
      <input ref={inputRef} name="ans" type="number" style={S.input} placeholder="?" autoComplete="off" />
      <button type="submit" style={{ ...S.btn, ...S.btnPrimary }}>Submit</button>
    </form>
  )

  // ── Performance chart ──────────────────────────────────
  const renderPerformanceChart = () => {
    if (!tableNum) return null
    const d = stGetAdaptive()
    const bars = []
    let maxTime = 0
    for (let m = 1; m <= 10; m++) {
      const info = d[`${tableNum}x${m}`]
      const avg = info && info.attempts > 0 ? stTrimmedMean(info.times || []) / 1000 : 0
      if (avg > maxTime) maxTime = avg
      bars.push({ m, avg, attempts: info ? info.attempts : 0, wrong: info ? info.wrong : 0 })
    }
    const hasData = bars.some(b => b.attempts > 0)
    if (!hasData) return null
    maxTime = Math.max(maxTime, 1) // at least 1s scale
    const chartH = 120
    const barW = `${100 / 10}%`
    return (
      <div style={{ marginTop: 24, padding: '16px 0 0' }}>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-soft)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Avg. Time per Fact (seconds)
        </p>
        {/* Y-axis + bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, position: 'relative', height: chartH, margin: '0 4px', borderBottom: '2px solid var(--clr-border)', borderLeft: '2px solid var(--clr-border)' }}>
          {/* Y-axis labels */}
          <span style={{ position: 'absolute', left: -4, top: 0, fontSize: '0.6rem', color: 'var(--clr-text-soft)', transform: 'translateX(-100%)', whiteSpace: 'nowrap' }}>{maxTime.toFixed(1)}s</span>
          <span style={{ position: 'absolute', left: -4, top: '50%', fontSize: '0.6rem', color: 'var(--clr-text-soft)', transform: 'translateX(-100%) translateY(-50%)', whiteSpace: 'nowrap' }}>{(maxTime / 2).toFixed(1)}s</span>
          <span style={{ position: 'absolute', left: -4, bottom: -2, fontSize: '0.6rem', color: 'var(--clr-text-soft)', transform: 'translateX(-100%)', whiteSpace: 'nowrap' }}>0s</span>
          {/* Grid lines */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed var(--clr-border)', opacity: 0.5 }} />
          {/* Bars */}
          {bars.map(b => {
            const h = b.avg > 0 ? Math.max((b.avg / maxTime) * chartH, 4) : 0
            const isWeak = b.wrong > 0 || b.avg > maxTime * 0.7
            return (
              <div key={b.m} style={{ width: barW, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', padding: '0 2px', boxSizing: 'border-box' }}>
                {b.avg > 0 && <span style={{ fontSize: '0.55rem', color: 'var(--clr-text-soft)', marginBottom: 2, fontWeight: 600 }}>{b.avg.toFixed(1)}</span>}
                <div style={{
                  width: '70%', height: h, minWidth: 8,
                  borderRadius: '4px 4px 0 0',
                  background: b.attempts === 0 ? 'transparent' : isWeak ? 'var(--clr-wrong)' : 'var(--clr-accent)',
                  opacity: b.attempts === 0 ? 0.15 : 0.85,
                  transition: 'height 0.3s ease',
                }} />
              </div>
            )
          })}
        </div>
        {/* X-axis labels */}
        <div style={{ display: 'flex', margin: '4px 4px 0' }}>
          {bars.map(b => (
            <div key={b.m} style={{ width: barW, textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--clr-text-soft)' }}>
              ×{b.m}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── SCREENS ───────────────────────────────────────────

  // HOME — just pick a table, no level selection
  if (screen === 'home') {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={S.center}>
            <h1 style={S.title}>SuperTables</h1>
            <p style={S.subtitle}>Master multiplication through 10 progressive levels</p>
          </div>
          <div style={{ ...S.card, marginBottom: 24 }}>
            <h2 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--clr-text)' }}>
              Choose a multiplication table to begin
            </h2>
            <div style={S.numGrid}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => startFromTable(n)} style={S.numBtn}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--clr-accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--clr-accent)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'var(--clr-surface)'; e.currentTarget.style.color = 'var(--clr-text)'; e.currentTarget.style.borderColor = 'var(--clr-border)' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--clr-text-soft)' }}>
            You'll progress from Level 1 → 10 automatically
          </p>
        </div>
      </div>
    )
  }

  // LEVEL DONE — show score + Continue button
  if (screen === 'levelDone') {
    const pct = Math.round((score / totalQ) * 100)
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {renderLevelProgress()}
          <div style={{ ...S.card, textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>{pct === 100 ? '🏆' : pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪'}</div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: 'var(--clr-text)' }}>Level {lid} Complete!</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-soft)', margin: '0 0 16px' }}>{levelMeta.name}</p>
            <p style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--clr-accent)', margin: '0 0 4px' }}>{score}/{totalQ}</p>
            <p style={{ color: 'var(--clr-text-soft)', marginBottom: 24 }}>{pct}% correct{wrongAttempts > 0 ? ` · ${wrongAttempts} wrong` : ''}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              {currentLevel < 10 ? (
                <button onClick={continueToNext} style={{ ...S.btn, ...S.btnPrimary, fontSize: '1.1rem', padding: '12px 32px' }}>
                  Continue to Level {currentLevel + 1} →
                </button>
              ) : (
                <button onClick={() => setScreen('allDone')} style={{ ...S.btn, ...S.btnPrimary, fontSize: '1.1rem', padding: '12px 32px' }}>
                  See Final Results →
                </button>
              )}
              <button onClick={() => setupLevel(tableNum, currentLevel)} style={{ ...S.btn, ...S.btnSecondary, fontSize: '0.85rem' }}>Retry this level</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ALL DONE — completed all 10 levels
  if (screen === 'allDone') {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ ...S.card, textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>🎓</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontFamily: 'var(--font-display)', color: 'var(--clr-text)' }}>All 10 Levels Complete!</h2>
            <p style={{ color: 'var(--clr-text-soft)', margin: '0 0 8px' }}>Table of {tableNum}</p>
            <p style={{ fontSize: '1rem', color: 'var(--clr-text-soft)', margin: '0 0 32px' }}>
              You've mastered all levels for the {tableNum} times table. Great work!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <button onClick={goHome} style={{ ...S.btn, ...S.btnPrimary, fontSize: '1.1rem', padding: '12px 32px' }}>Practice Another Table</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // PLAY — Level 7 (match pairs) has its own layout
  if (lid === 7) {
    if (done) return null // handled by useEffect → levelDone
    const rd = rounds[Math.min(roundIdx, rounds.length - 1)]
    if (!rd) return null
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {renderLevelProgress()}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={goHome} style={S.back}>← Quit</button>
            <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)' }}>Table of {tableNum}</span>
          </div>
          <div style={S.card}>
            <p style={S.qLabel}>Round {roundIdx + 1} of {rounds.length}</p>
            <h2 style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: 16, fontWeight: 700, color: 'var(--clr-text)' }}>Match each question to its answer</h2>
            {wrong7 && <p style={{ textAlign: 'center', color: 'var(--clr-wrong)', fontSize: '0.85rem', fontWeight: 600 }}>Not a match — try again!</p>}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={S.matchCol}>
                {rd.map((e, i) => (
                  <button key={i} disabled={matched.includes(i)} onClick={() => { setSelected(i); setWrong7(false) }}
                    style={S.matchBtn(selected === i, matched.includes(i))}>{e.expression}</button>
                ))}
              </div>
              <div style={S.matchCol}>
                {shuffledAns.map((ans, i) => {
                  const isM = matched.some(mi => rd[mi].answer === ans)
                  return (
                    <button key={i} disabled={isM || selected === null} onClick={() => {
                      if (selected === null) return
                      if (rd[selected].answer === ans) { stRecord(tableNum, rd[selected].multiplier, true, Date.now() - startTime); setMatched(m => [...m, selected]); setScore(s => s + 1); setSelected(null) }
                      else { stRecord(tableNum, rd[selected].multiplier, false, Date.now() - startTime); setWrong7(true); setWrongAttempts(w => w + 1) }
                    }} style={S.ansCol(selected !== null, isM)}>{ans}</button>
                  )
                })}
              </div>
            </div>
          </div>
          {renderPerformanceChart()}
        </div>
      </div>
    )
  }

  // PLAY — generic (all other levels)
  const qText = lid === 5 ? `${cur.expression} = ${cur.masked}`
    : lid === 10 ? (cur.blankType === 'multiplier' ? `${tableNum} × ___ = ${cur.answer}` : `${tableNum} × ${cur.multiplier} = ___`)
    : `${cur.expression} = ?`

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {renderLevelProgress()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={goHome} style={S.back}>← Quit</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)' }}>Table of {tableNum}</span>
          <div style={{ width: 60 }} />
        </div>

        {/* Table display for L1, L2 */}
        {lid <= 2 && renderTable(displayHalf, tableNum)}

        {/* Table display for L4 */}
        {lid === 4 && renderTable(visible, tableNum)}

        <div style={S.card}>
          <p style={S.qLabel}>Question {idx + 1} of {totalQ}</p>
          <div style={S.qText}>{qText}</div>

          {/* L3: show/fade answer */}
          {lid === 3 && phase !== 'ask' && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--clr-accent)', transition: 'opacity 0.7s', opacity: phase === 'fading' ? 0 : 1 }}>{cur.answer}</span>
            </div>
          )}

          {/* L5 hint */}
          {lid === 5 && (
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <p style={{ color: 'var(--clr-accent)', fontSize: '1rem', fontWeight: 700, margin: '0 0 4px' }}>
                Type the FULL number (e.g. if 5* → type 52)
              </p>
              <p style={{ color: 'var(--clr-text-soft)', fontSize: '0.8rem', margin: 0 }}>
                Not just the missing digit — enter the complete answer
              </p>
            </div>
          )}

          {/* L8 hint */}
          {lid === 8 && <p style={{ textAlign: 'center', color: 'var(--clr-text-soft)', fontSize: '0.75rem', marginBottom: 12 }}>Adaptive — focuses on your weak spots</p>}

          {/* Input or MCQ */}
          {fb ? renderFeedback() : (
            (lid === 6 || lid === 8) ? (
              <div style={S.grid2}>
                {options.map((o, i) => (
                  <button key={i} onClick={() => handlePick(o)} style={S.optionBtn}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--clr-accent)'; e.currentTarget.style.background = 'var(--clr-accent-soft)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--clr-border)'; e.currentTarget.style.background = 'var(--clr-surface)' }}>
                    {o}
                  </button>
                ))}
              </div>
            ) : (lid === 3 && phase !== 'ask') ? null : renderInput()
          )}
        </div>
        {renderPerformanceChart()}
      </div>
    </div>
  )
}

/**
 * App Component (Main Shell)
 * Root component that handles:
 * - Theme toggle (dark/light mode) with localStorage persistence
 * - URL-based routing for student-specific pages
 * - Mode-based routing for different quiz types (home menu → quiz app)
 *
 * Theme system:
 *   - Loads from localStorage[tenali-theme] or defaults to 'dark'
 *   - Sets data-theme attribute on document.documentElement (CSS uses this)
 *   - Persists changes immediately to localStorage
 *
 * Routing system:
 *   1. URL-based routes (specific student pages):
 *      - /taittiriya → AdaptiveTablesApp for Taittiriya
 *      - /tatsavit → AdaptiveTablesApp for Tatsavit
 *      - /intervalscheduling → IntervalSchedulingApp
 *      - /extendedeuclid → ExtendedEuclidApp
 *   2. Mode-based routes (home menu):
 *      - null (no mode selected) → Home component (menu)
 *      - 'gk' → GKApp, 'addition' → AdditionApp, etc.
 *      - App uses modeMap to find the component class
 */
function App() {
  // Currently selected quiz mode (null = home menu, or key like 'gk', 'addition', etc.)
  const [mode, setMode] = useState(null)

  // Current theme: 'dark' or 'light'
  // Initialized from localStorage with fallback to 'dark'
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tenali-theme') || 'dark' } catch { return 'dark' }
  })

  // Sync theme to DOM and localStorage whenever it changes
  useEffect(() => {
    // Apply theme to document (CSS selectors use [data-theme="dark"] or [data-theme="light"])
    document.documentElement.setAttribute('data-theme', theme)
    // Persist to localStorage for future sessions
    try { localStorage.setItem('tenali-theme', theme) } catch {}
  }, [theme])

  /**
   * toggleTheme(): Switch between dark and light modes
   */
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // ========== ROUTING: URL-BASED (STUDENT PAGES) ==========
  // Check if current URL matches a specific student page
  const pathname = window.location.pathname.replace(/\/$/, '').toLowerCase()

  // Route: /tables → Generic 5-level scaffolded tables app
  if (pathname === '/tables') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <ScaffoldedTablesApp studentName="Student" />
      </>
    )
  }

  // Route: /taittiriya → Taittiriya's 5-level scaffolded tables app
  if (pathname === '/taittiriya') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <ScaffoldedTablesApp studentName="Taittiriya" />
      </>
    )
  }

  // Route: /lakshya → Lakshya's mastery multiplication program
  if (pathname === '/lakshya') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <LakshyaTablesApp studentName="Lakshya" />
      </>
    )
  }

  // Route: /jatin → Jatin's 10-level table learning strategy
  if (pathname === '/jatin') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <JatinTablesApp studentName="Jatin" />
      </>
    )
  }

  // Route: /yazdan → Yazdan's 10-level progressive tables mastery
  if (pathname === '/yazdan') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <YazdanTablesApp studentName="Yazdan" />
      </>
    )
  }

  // Route: /tatsavit → Tatsavit's 9-level progressive math drill
  if (pathname === '/tatsavit') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <TatsavitApp onBack={() => { window.location.href = '/' }} />
      </>
    )
  }

  // Route: /intervalscheduling → Interval Scheduling algorithm quiz
  if (pathname === '/intervalscheduling') {
    return <IntervalSchedulingApp />
  }

  // Route: /extendedeuclid → Extended Euclidean algorithm quiz
  if (pathname === '/extendedeuclid') {
    return <ExtendedEuclidApp />
  }

  // Route: /supertables1 → Adaptive speed drill (2-phase)
  if (pathname === '/supertables1') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <SuperTables1App />
      </>
    )
  }

  // Route: /supertables → 10-level progressive multiplication mastery
  if (pathname === '/supertables') {
    return (
      <>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <SuperTablesApp />
      </>
    )
  }

  // ========== ROUTING: MODE-BASED (HOME MENU + QUIZZES) ==========
  // Map quiz mode keys to their component classes
  const modeMap = {
    gk: GKApp,                    // General Knowledge
    addition: AdditionApp,         // Basic addition
    quadratic: QuadraticApp,       // Quadratic substitution
    multiply: MultiplyApp,         // Multiplication tables
    vocab: VocabApp,               // Vocabulary
    spot: TwinHuntApp,             // Twin Hunt (visual)
    sqrt: SqrtApp,                 // Square root
    polymul: PolyMulApp,           // Polynomial multiplication
    polyfactor: PolyFactorApp,     // Polynomial factoring
    primefactor: PrimeFactorApp,   // Prime factorization
    qformula: QFormulaApp,         // Quadratic formula
    simul: SimulApp,               // Simultaneous equations
    funceval: FuncEvalApp,         // Function evaluation
    lineq: LineEqApp,              // Line equation
    basicarith: BasicArithApp,     // Basic arithmetic (+, −, ×)
    fractionadd: FractionAddApp,   // Fraction addition
    surds: SurdsApp,               // Surds (simplify, add, multiply, rationalise)
    indices: IndicesApp,           // Indices (laws of exponents)
    sequences: SequencesApp,       // Sequences & Series
    ratio: RatioApp,               // Ratio & Proportion
    percent: PercentApp,           // Percentages
    sets: SetsApp,                 // Sets & Venn diagrams
    trig: TrigApp,                 // Trigonometry
    ineq: IneqApp,                 // Inequalities
    coordgeom: CoordGeomApp,       // Coordinate Geometry
    prob: ProbApp,                 // Probability
    stats: StatsApp,               // Statistics
    matrix: MatrixApp,             // Matrices
    vectors: VectorsApp,           // Vectors
    dotprod: DotProdApp,           // Dot Products
    transform: TransformApp,       // Transformations
    mensur: MensurApp,             // Mensuration
    bearings: BearingsApp,         // Bearings
    log: LogApp,                   // Logarithms
    diff: DiffApp,                 // Differentiation
    bases: BasesApp,               // Number Bases
    circleth: CircleThApp,         // Circle Theorems
    integ: IntegApp,               // Integration
    stdform: StdFormApp,           // Standard Form
    bounds: BoundsApp,             // Bounds
    sdt: SDTApp,                   // Speed, Distance, Time
    variation: VariationApp,       // Variation
    hcflcm: HcfLcmApp,            // HCF & LCM
    profitloss: ProfitLossApp,     // Profit & Loss
    rounding: RoundingApp,         // Rounding
    binomial: BinomialApp,         // Binomial Theorem
    complex: ComplexApp,           // Complex Numbers
    angles: AnglesApp,             // Angles
    triangles: TrianglesApp,       // Triangles
    congruence: CongruenceApp,     // Congruence
    pythag: PythagApp,             // Pythagoras' Theorem
    polygons: PolygonsApp,         // Polygons
    similarity: SimilarityApp,     // Similarity
    squaring: SquaringApp,         // Squaring (a+b)²
    lineareq: LinearEqApp,         // Linear Equations
    decimals: DecimalsApp,         // Decimals
    permcomb: PermCombApp,         // Permutations & Combinations
    limits: LimitsApp,             // Limits
    invtrig: InvTrigApp,           // Inverse Trigonometry
    remfactor: RemFactorApp,       // Remainder Theorem
    heron: HeronApp,               // Heron's Formula
    shares: SharesApp,             // Shares & Dividends
    banking: BankingApp,           // Banking (RD)
    gst: GSTApp,                   // GST
    section: SectionApp,           // Section Formula
    linprog: LinProgApp,           // Linear Programming
    circmeasure: CircMeasureApp,   // Circular Measure
    conics: ConicsApp,             // Conic Sections
    diffeq: DiffEqApp,             // Differential Equations
    tatsavit: TatsavitApp,         // Tatsavit (progressive math drill)
    randommix: RandomMixApp,       // Random Mix (adaptive)
    custom: CustomApp,             // Custom lesson builder
  }

  // Get the component to render (or null if mode not set)
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

/**
 * Home Component
 * Main menu screen showing all available quizzes in a searchable grid.
 * Displays quiz cards with color coding and allows filtering by name/subtitle.
 *
 * @param {Object} props
 * @param {Function} props.onSelect - Callback when user selects a quiz: receives mode key (e.g., 'gk')
 */
function Home({ onSelect }) {
  // Special featured apps (shown in highlighted first row)
  const featuredApps = [
    { key: 'randommix', name: 'Random Mix', subtitle: 'Adaptive cross-topic quiz', color: 'featured' },
    { key: 'custom', name: 'Custom Lesson', subtitle: 'Build your own mixed quiz', color: 'featured' },
  ]

  // All regular quiz apps sorted alphabetically by name
  const regularApps = [
    { key: 'addition', name: 'Addition', subtitle: '20-question addition practice', color: 'blue' },
    { key: 'angles', name: 'Angles', subtitle: 'Lines, points, parallel lines', color: 'green' },
    { key: 'basicarith', name: 'Arithmetic', subtitle: '+, −, × with positive & negative', color: 'purple' },
    { key: 'banking', name: 'Banking (RD)', subtitle: 'Interest & recurring deposits', color: 'blue' },
    { key: 'bearings', name: 'Bearings', subtitle: 'Three-figure bearings', color: 'green' },
    { key: 'binomial', name: 'Binomial Theorem', subtitle: 'Expansions & coefficients', color: 'purple' },
    { key: 'bounds', name: 'Bounds', subtitle: 'Upper & lower bounds', color: 'blue' },
    { key: 'circmeasure', name: 'Circular Measure', subtitle: 'Radians, arc length, sectors', color: 'green' },
    { key: 'circleth', name: 'Circle Theorems', subtitle: 'Angles, tangents, cyclic quads', color: 'purple' },
    { key: 'complex', name: 'Complex Numbers', subtitle: 'Add, multiply, modulus', color: 'blue' },
    { key: 'congruence', name: 'Congruence', subtitle: 'SSS, SAS, ASA, RHS', color: 'green' },
    { key: 'conics', name: 'Conic Sections', subtitle: 'Circle, parabola, ellipse, hyperbola', color: 'purple' },
    { key: 'coordgeom', name: 'Coord. Geometry', subtitle: 'Midpoint, distance, gradient', color: 'blue' },
    { key: 'decimals', name: 'Decimals', subtitle: 'Add, subtract, multiply, divide', color: 'blue' },
    { key: 'diff', name: 'Differentiation', subtitle: 'Power rule, turning points', color: 'purple' },
    { key: 'diffeq', name: 'Differential Eq.', subtitle: 'Order, degree, solve DEs', color: 'green' },
    { key: 'dotprod', name: 'Dot Products', subtitle: 'Vectors, matrices, fill blanks', color: 'blue' },
    { key: 'fractionadd', name: 'Fractions (Add)', subtitle: 'Add fractions and simplify', color: 'green' },
    { key: 'funceval', name: 'Functions', subtitle: 'Evaluate f(x), f(x,y), f(x,y,z)', color: 'green' },
    { key: 'gk', name: 'GK', subtitle: 'General Knowledge questions', color: 'purple' },
    { key: 'gst', name: 'GST', subtitle: 'Goods & Services Tax', color: 'purple' },
    { key: 'hcflcm', name: 'HCF & LCM', subtitle: 'Highest common factor & LCM', color: 'blue' },
    { key: 'heron', name: "Heron's Formula", subtitle: 'Triangle area from sides', color: 'blue' },
    { key: 'indices', name: 'Indices', subtitle: 'Laws of exponents', color: 'purple' },
    { key: 'ineq', name: 'Inequalities', subtitle: 'Linear & quadratic inequalities', color: 'green' },
    { key: 'integ', name: 'Integration', subtitle: 'Reverse differentiation & areas', color: 'blue' },
    { key: 'invtrig', name: 'Inverse Trig', subtitle: 'arcsin, arccos, arctan', color: 'green' },
    { key: 'limits', name: 'Limits', subtitle: 'Evaluate limits', color: 'purple' },
    { key: 'lineareq', name: 'Linear Equations', subtitle: 'Solve for x in one variable', color: 'blue' },
    { key: 'lineq', name: 'Line Equation', subtitle: 'Find m and c from two points', color: 'green' },
    { key: 'linprog', name: 'Linear Programming', subtitle: 'Optimize objective functions', color: 'green' },
    { key: 'log', name: 'Logarithms', subtitle: 'Evaluate, simplify, solve', color: 'purple' },
    { key: 'matrix', name: 'Matrices', subtitle: 'Add, multiply, determinant', color: 'blue' },
    { key: 'mensur', name: 'Mensuration', subtitle: 'Area, volume, surface area', color: 'green' },
    { key: 'multiply', name: 'Multiplication', subtitle: 'Practice any times table (2–19)', color: 'purple' },
    { key: 'bases', name: 'Number Bases', subtitle: 'Binary, decimal, hexadecimal', color: 'green' },
    { key: 'percent', name: 'Percentages', subtitle: 'Find, increase, reverse, compound', color: 'blue' },
    { key: 'permcomb', name: 'Perm. & Comb.', subtitle: 'Permutations & combinations', color: 'purple' },
    { key: 'polyfactor', name: 'Poly Factor', subtitle: 'Factor a quadratic expression', color: 'green' },
    { key: 'polymul', name: 'Poly Multiply', subtitle: 'Multiply two polynomials', color: 'blue' },
    { key: 'polygons', name: 'Polygons', subtitle: 'Interior & exterior angles', color: 'purple' },
    { key: 'primefactor', name: 'Prime Factors', subtitle: 'Break a number into primes', color: 'green' },
    { key: 'prob', name: 'Probability', subtitle: 'Single & combined events', color: 'blue' },
    { key: 'profitloss', name: 'Profit & Loss', subtitle: 'Cost price, discounts, markup', color: 'purple' },
    { key: 'pythag', name: "Pythagoras' Theorem", subtitle: 'Hypotenuse, legs, 3D', color: 'green' },
    { key: 'quadratic', name: 'Quadratic', subtitle: 'Find y for y = ax² + bx + c', color: 'blue' },
    { key: 'qformula', name: 'Quadratics (Formula)', subtitle: 'Find roots of ax² + bx + c = 0', color: 'purple' },
    { key: 'ratio', name: 'Ratio', subtitle: 'Ratio & proportion', color: 'green' },
    { key: 'remfactor', name: 'Remainder Theorem', subtitle: 'Remainder & factor theorem', color: 'blue' },
    { key: 'rounding', name: 'Rounding', subtitle: 'D.P., sig. figs, estimation', color: 'blue' },
    { key: 'section', name: 'Section Formula', subtitle: 'Midpoint, section, centroid', color: 'green' },
    { key: 'sequences', name: 'Sequences', subtitle: 'Arithmetic & geometric sequences', color: 'purple' },
    { key: 'shares', name: 'Shares & Dividends', subtitle: 'Shares, dividends, returns', color: 'purple' },
    { key: 'sets', name: 'Sets', subtitle: 'Union, intersection, Venn diagrams', color: 'blue' },
    { key: 'similarity', name: 'Similarity', subtitle: 'Scale factor, area & volume ratios', color: 'green' },
    { key: 'squaring', name: 'Squaring', subtitle: 'Square numbers using (a+b)²', color: 'purple' },
    { key: 'simul', name: 'Sim. Equations', subtitle: '2×2 (easy) or 3×3 (hard)', color: 'purple' },
    { key: 'sdt', name: 'Speed, Distance, Time', subtitle: 'Rate problems & conversions', color: 'blue' },
    { key: 'sqrt', name: 'Square Root', subtitle: 'Nearest-integer square root drill', color: 'green' },
    { key: 'stdform', name: 'Standard Form', subtitle: 'Scientific notation operations', color: 'purple' },
    { key: 'stats', name: 'Statistics', subtitle: 'Mean, median, mode, range', color: 'blue' },
    { key: 'surds', name: 'Surds', subtitle: 'Simplify, add, multiply, rationalise', color: 'green' },
    { key: 'tatsavit', name: 'Tatsavit', subtitle: 'Progressive 9-level math drill', color: 'blue' },
    { key: 'transform', name: 'Transformations', subtitle: 'Reflect, rotate, translate, enlarge', color: 'purple' },
    { key: 'triangles', name: 'Triangles', subtitle: 'Angle sum, isosceles, exterior', color: 'blue' },
    { key: 'trig', name: 'Trigonometry', subtitle: 'SOH-CAH-TOA, sine/cosine rule', color: 'green' },
    { key: 'variation', name: 'Variation', subtitle: 'Direct & inverse proportion', color: 'purple' },
    { key: 'vectors', name: 'Vectors', subtitle: 'Add, scale, magnitude', color: 'blue' },
    { key: 'vocab', name: 'Vocabulary', subtitle: 'Match words to definitions', color: 'green' },
    { key: 'spot', name: 'Twin Hunt', subtitle: 'Find the common object', color: 'purple' },
  ]

  // Combined list for search filtering
  const allApps = [...featuredApps, ...regularApps]

  // Hamburger menu open state
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Search term for filtering apps
  const [search, setSearch] = useState('')

  // Filtered lists
  const isSearching = search.trim() !== ''
  const matchFilter = (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.subtitle.toLowerCase().includes(search.toLowerCase())
  const filteredFeatured = isSearching ? featuredApps.filter(matchFilter) : featuredApps
  const filteredRegular = isSearching ? regularApps.filter(matchFilter) : regularApps
  const apps = isSearching ? allApps.filter(matchFilter) : allApps

  // Grid layout tracking (for responsive display)
  const gridRef = useRef(null)
  // Number of columns currently displayed (responsive)
  const [cols, setCols] = useState(4)

  // Update grid dimensions on resize (for responsive grid calculation)
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

  // Calculate number of rows for display (for grid dimension label at bottom)
  const rows = Math.ceil(apps.length / (cols || 1))

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '4px' }}>
          <img src="/tenali.png" alt="Tenali Raman" style={{ width: '80px', height: 'auto', flexShrink: 0 }} />
          <div>
            <h1 style={{ margin: 0 }}>Tenali</h1>
            <p className="subtitle" style={{ margin: 0 }}>Choose a learning game to begin</p>
          </div>
        </div>
        {/* Hamburger menu — top right */}
        <div ref={menuRef} style={{ position: 'absolute', top: '8px', right: '0' }}>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
            display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center'
          }} aria-label="Menu">
            <span style={{ display: 'block', width: '22px', height: '2.5px', background: 'var(--clr-text)', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s', transform: menuOpen ? 'rotate(45deg) translate(4.5px, 4.5px)' : 'none' }} />
            <span style={{ display: 'block', width: '22px', height: '2.5px', background: 'var(--clr-text)', borderRadius: '2px', transition: 'opacity 0.2s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: '22px', height: '2.5px', background: 'var(--clr-text)', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(4.5px, -4.5px)' : 'none' }} />
          </button>
          {menuOpen && <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 50,
            background: 'var(--clr-card)', border: '1.5px solid var(--clr-border)',
            borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-card)',
            padding: '6px 0', minWidth: '200px', overflow: 'hidden'
          }}>
            {featuredApps.map(app => (
              <button key={app.key} onClick={() => { setMenuOpen(false); onSelect(app.key) }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text)',
                fontFamily: 'var(--font-body)', fontSize: '0.95rem', transition: 'background var(--transition)'
              }} onMouseEnter={e => e.target.style.background = 'var(--clr-hover-strong)'}
                 onMouseLeave={e => e.target.style.background = 'none'}>
                <strong style={{ color: 'var(--clr-accent)' }}>{app.name}</strong>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--clr-text-soft)', marginTop: '2px' }}>{app.subtitle}</span>
              </button>
            ))}
          </div>}
        </div>
      </div>
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
        {filteredRegular.map((app) => (
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

/**
 * GKApp Component (General Knowledge Quiz)
 * Multiple-choice General Knowledge questions fetched from backend API.
 * Questions are randomly selected and not repeated (excludeIds parameter).
 * Questions continue indefinitely until user chooses to go back.
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function GKApp({ onBack }) {
  // Current question object: {id, question, options: [A, B, C, D], ...}
  const [question, setQuestion] = useState(null)
  // User's selected option: 'A', 'B', 'C', or 'D'
  const [selected, setSelected] = useState('')
  // Feedback message shown after submission
  const [feedback, setFeedback] = useState('')
  // Is the selected answer correct?
  const [isCorrect, setIsCorrect] = useState(null)
  // Is a question being fetched from the API?
  const [loading, setLoading] = useState(false)
  // Total correct answers so far
  const [score, setScore] = useState(0)
  // Has the answer been revealed (showing feedback)?
  const [revealed, setRevealed] = useState(false)
  // Question counter (1, 2, 3, ...)
  const [questionNumber, setQuestionNumber] = useState(0)
  // All result objects from this session
  const [results, setResults] = useState([])
  // Persist seen GK question IDs in localStorage to avoid repeats across sessions
  const GK_SEEN_KEY = 'tenali_gk_seen'
  const loadGKSeen = () => { try { return JSON.parse(localStorage.getItem(GK_SEEN_KEY) || '[]') } catch { return [] } }
  const saveGKSeen = (ids) => { try { localStorage.setItem(GK_SEEN_KEY, JSON.stringify(ids)) } catch {} }
  const [seenIds, setSeenIds] = useState(loadGKSeen)
  // Number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Total questions to answer
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Quiz started flag
  const [started, setStarted] = useState(false)
  // Quiz finished flag
  const [finished, setFinished] = useState(false)
  // Timer for tracking response time per question
  const timer = useTimer()

  /**
   * loadQuestion(excludeIds?): Fetch next GK question from API
   * Excludes previously seen questions to avoid repetition (persisted in localStorage)
   * Stops if total questions reached
   */
  const loadQuestion = async (excludeIds) => {
    if (questionNumber >= totalQ) {
      setFinished(true)
      timer.reset()
      return
    }
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
    // Track this question ID so we don't ask it again (persist to localStorage)
    const newSeen = [...ids, data.id]
    setSeenIds(newSeen)
    saveGKSeen(newSeen)
    setQuestionNumber((n) => n + 1)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize GK quiz with question count
   * Keeps existing seenIds from localStorage (only resets session state)
   */
  const startQuiz = () => {
    const count = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(0)
    setResults([])
    // Don't clear seenIds — keep the localStorage history for no-repeat
    loadQuestion(seenIds)
  }

  // Load first question only if started
  useEffect(() => {
    if (started && !finished && questionNumber === 0) {
      loadQuestion([])
    }
  }, [started])

  /**
   * submitGK(option): Submit selected answer and check correctness with API
   * Receives the feedback (correct answer + explanation) from backend
   */
  const submitGK = async (option) => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    setSelected(option)
    // POST to backend API to check the answer
    const res = await fetch(`${API}/gk-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answerOption: option }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore((s) => s + 1)
    // Show feedback with explanation
    setFeedback(data.correct
      ? `Correct! The answer is ${data.correctAnswer}) ${data.correctAnswerText}`
      : `Incorrect. The correct answer is ${data.correctAnswer}) ${data.correctAnswerText}`)
    // Record result for display
    setResults((prev) => [...prev, {
      question: question.question.length > 50 ? question.question.slice(0, 50) + '…' : question.question,
      userAnswer: option,
      correctAnswer: `${data.correctAnswer}) ${data.correctAnswerText}`,
      correct: data.correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  /**
   * handleSubmitOrNext(): Toggle between submit and next question
   * If not revealed: submit the selected answer
   * If revealed: load the next question
   */
  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) { if (selected) submitGK(selected); return }
    await loadQuestion()
  }

  /**
   * handleSolve(): Get the solution without submitting an answer
   * Fetches the correct answer from the API with solve: true flag
   */
  const handleSolve = async () => {
    if (revealed) return
    const timeTaken = timer.stop()
    // POST to backend API with solve flag to get the solution
    const res = await fetch(`${API}/gk-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answerOption: '', solve: true }),
    })
    const data = await res.json()
    setIsCorrect(false)
    const display = data.correctAnswer || ''
    const displayText = `${display}) ${data.correctAnswerText || ''}`
    const explanation = data.explanation || ''
    setFeedback(`Solution: ${displayText}${explanation ? '\n' + explanation : ''}`)
    setResults((prev) => [...prev, {
      question: question.question.length > 50 ? question.question.slice(0, 50) + '…' : question.question,
      userAnswer: '—',
      correctAnswer: displayText,
      correct: false,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  // Auto-advance after correct answer
  const advanceRef = useRef(() => {})
  advanceRef.current = () => loadQuestion()
  useAutoAdvance(revealed, advanceRef, isCorrect)

  // Keyboard shortcuts: 1-4 or a-d instantly select and submit answer; Enter for submit/next
  const submitGKRef = useRef(submitGK)
  submitGKRef.current = submitGK
  const handleNextRef = useRef(handleSubmitOrNext)
  handleNextRef.current = handleSubmitOrNext

  useEffect(() => {
    const onKeyDown = (event) => {
      // Enter: submit or next
      if (event.key === 'Enter') { event.preventDefault(); handleNextRef.current(); return }
      // Only allow number/letter shortcuts when not already revealed, loading, or no question
      if (revealed || loading || !question) return
      // Map 1-4 and a-d to A-D options
      const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' }
      const letter = keyMap[event.key.toLowerCase()]
      // Only allow if this option exists for this question
      if (letter && question.options.length >= ['A','B','C','D'].indexOf(letter) + 1) {
        event.preventDefault()
        submitGKRef.current(letter)  // Instantly select and submit
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [revealed, loading, question])

  return (
    <QuizLayout title="General Knowledge" subtitle="Random question picker" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Test your general knowledge with random questions!</p>
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmitOrNext} disabled={loading || !selected}>Submit</button>
            <button onClick={handleSolve} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={handleSubmitOrNext}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
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

/**
 * AdditionApp Component
 * Addition practice quiz with configurable difficulty (1-3 digits) and question count.
 * Phases: setup (choose difficulty) → playing (answer questions) → finished (results)
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function AdditionApp({ onBack }) {
  // Difficulty level: 'easy' (1-digit), 'medium' (2-digit), 'hard' (3-digit), 'extrahard' (4-digit)
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // User-entered number of questions to attempt
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz state: has quiz started?
  const [started, setStarted] = useState(false)
  // Has quiz finished (all questions answered)?
  const [finished, setFinished] = useState(false)
  // Current question object: {a, b, prompt}
  const [question, setQuestion] = useState(null)
  // User's text input (numeric answer)
  const [answer, setAnswer] = useState('')
  // Number of correct answers
  const [score, setScore] = useState(0)
  // Current question number (1, 2, 3, ...)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to attempt
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Feedback message after submission
  const [feedback, setFeedback] = useState('')
  // Is answer correct?
  const [isCorrect, setIsCorrect] = useState(null)
  // Is a question being fetched?
  const [loading, setLoading] = useState(false)
  // Has answer been revealed?
  const [revealed, setRevealed] = useState(false)
  // Results array for display
  const [results, setResults] = useState([])
  // Timer for response timing
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty
  const digitMap = { easy: 1, medium: 2, hard: 3, extrahard: 4 }

  /**
   * fetchQuestion(selectedDifficulty?): Fetch next addition question from API
   * Generates random a + b = ? with specified digit count
   */
  const fetchQuestion = async (selectedDifficulty = difficulty) => {
    setLoading(true)
    setFeedback('')
    setAnswer('')
    setRevealed(false)
    setIsCorrect(null)
    const res = await fetch(`${API}/addition-api/question?digits=${digitMap[effectiveDiff()]}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Transition to playing phase
   * Initialize quiz state and fetch first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setAdaptScore(0)
    adaptScoreRef.current = 0
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
  }, [started, finished, question, answer, revealed, score, questionNumber, difficulty, loading, totalQ])

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
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
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
    await fetchQuestion(difficulty)
  }

  /**
   * handleSolve(): Get the solution without submitting an answer
   * Fetches the correct answer from the API with solve: true flag
   */
  const handleSolve = async () => {
    if (revealed) return
    const timeTaken = timer.stop()
    // POST to backend API with solve flag to get the solution
    const res = await fetch(`${API}/addition-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, answer: '', solve: true }),
    })
    const data = await res.json()
    setIsCorrect(false)
    const reasoning = `${question.a} + ${question.b} = ${data.correctAnswer}`
    setFeedback(`Solution: ${reasoning}`)
    setResults((prev) => [...prev, {
      question: `${question.a} + ${question.b}`,
      userAnswer: '—',
      correctAnswer: data.correctAnswer,
      correct: false,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitOrNext() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const diffLabels = { easy: 'Easy — 1 digit', medium: 'Medium — 2 digits', hard: 'Hard — 3 digits', extrahard: 'Extra Hard — 4 digits' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Addition" subtitle="Choose a level and solve addition questions" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice addition!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="addition-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="addition-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder={String(DEFAULT_TOTAL)} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="text" value={answer} onChange={(e) => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" />
        <NumPad value={answer} onChange={(v) => !revealed && setAnswer(v)} disabled={revealed} />
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmitOrNext} disabled={loading || answer === ''}>Submit</button>
            <button onClick={handleSolve} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={handleSubmitOrNext}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/**
 * BasicArithApp Component
 * Basic arithmetic (+, −, ×) with positive and negative numbers.
 * Difficulty levels: easy (1-digit), medium (2-digit), hard (3-digit)
 * Supports keyboard shortcuts for faster entry (number keys, minus, backspace)
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function BasicArithApp({ onBack }) {
  // Difficulty level: 'easy', 'medium', 'hard', 'extrahard'
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // User-entered number of questions
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started?
  const [started, setStarted] = useState(false)
  // Quiz finished?
  const [finished, setFinished] = useState(false)
  // Current question: {a, b, op: '+' | '−' | '×', prompt}
  const [question, setQuestion] = useState(null)
  // User's numeric answer
  const [answer, setAnswer] = useState('')
  // Correct answer count
  const [score, setScore] = useState(0)
  // Current question number
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Feedback after submission
  const [feedback, setFeedback] = useState('')
  // Is answer correct?
  const [isCorrect, setIsCorrect] = useState(null)
  // Fetching?
  const [loading, setLoading] = useState(false)
  // Answer revealed?
  const [revealed, setRevealed] = useState(false)
  // Results array
  const [results, setResults] = useState([])
  // Timer
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * fetchQuestion(): Fetch next arithmetic question
   * Generates random a op b = ? with specified difficulty and operation
   */
  const fetchQuestion = async () => {
    setLoading(true)
    setFeedback(''); setAnswer(''); setRevealed(false); setIsCorrect(null)
    const res = await fetch(`${API}/basicarith-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize quiz and fetch first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    setAdaptScore(0); adaptScoreRef.current = 0
    await fetchQuestion()
  }

  // Keyboard shortcuts for faster numeric entry (without needing input focus)
  // Digits 0-9: append to answer
  // Minus (-): toggle negative sign
  // Backspace: delete last character
  // Enter: submit or next
  /**
   * Keyboard shortcut handler for BasicArithmeticApp:
   * - Enter: Submit answer or advance to next question
   * - 0-9: Append digit to answer
   * - Minus (-): Toggle negative sign prefix
   * - Backspace: Delete last character
   * Only active when quiz is running (started && !finished) and not revealed
   */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!started || finished) return
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSubmitOrNext()
        return
      }
      // Only allow keyboard shortcuts when not revealed or loading
      if (revealed || loading) return
      if (/^[0-9]$/.test(event.key)) {
        // Digit pressed: append to answer
        event.preventDefault()
        setAnswer(prev => prev + event.key)
      } else if (event.key === '-') {
        // Minus pressed: toggle negative sign
        event.preventDefault()
        setAnswer(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)
      } else if (event.key === 'Backspace') {
        // Backspace: delete last character
        event.preventDefault()
        setAnswer(prev => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, score, questionNumber, difficulty, loading, totalQ])

  /**
   * handleSubmitOrNext(): Submission and progression handler for BasicArithmeticApp
   * Phase 1 (not revealed):
   *   - Stop timer and POST user answer to /basicarith-api/check endpoint
   *   - Receive { correct, correctAnswer }
   *   - Show feedback and store result, then reveal answer
   * Phase 2 (revealed):
   *   - If all questions answered, finish quiz
   *   - Otherwise, increment questionNumber and fetch next question
   */
  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
      // POST to backend to validate answer for arithmetic operation: a op b
      const res = await fetch(`${API}/basicarith-api/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: question.a, b: question.b, op: question.op, answer: Number(answer) }),
      })
      const data = await res.json()
      setIsCorrect(data.correct)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${question.prompt} = ${data.correctAnswer}` : `Incorrect. ${question.prompt} = ${data.correctAnswer}`)
      // Store result with time taken
      setResults(prev => [...prev, {
        question: question.prompt,
        userAnswer: answer,
        correctAnswer: String(data.correctAnswer),
        correct: data.correct,
        time: timeTaken,
      }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
      setRevealed(true)
      return
    }
    // Quiz progression: check if quiz is finished
    if (questionNumber >= totalQ) { setFinished(true); setQuestion(null); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await fetchQuestion()
  }

  /**
   * handleSolve(): Get the solution without submitting an answer
   * Fetches the correct answer from the API with solve: true flag
   */
  const handleSolve = async () => {
    if (revealed) return
    const timeTaken = timer.stop()
    // POST to backend API with solve flag to get the solution
    const res = await fetch(`${API}/basicarith-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, op: question.op, answer: '', solve: true }),
    })
    const data = await res.json()
    setIsCorrect(false)
    setFeedback(`Solution: ${question.prompt} = ${data.correctAnswer}`)
    setResults(prev => [...prev, {
      question: question.prompt,
      userAnswer: '—',
      correctAnswer: String(data.correctAnswer),
      correct: false,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitOrNext() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const diffLabels = { easy: 'Easy — 1 digit', medium: 'Medium — 2 digits', hard: 'Hard — 3 digits', extrahard: 'Extra Hard — 4 digits' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Basic Arithmetic" subtitle="Add, subtract, and multiply positive & negative numbers" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice basic arithmetic!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="basicarith-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="basicarith-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" />
        <NumPad value={answer} onChange={v => !revealed && setAnswer(v)} disabled={revealed} />
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmitOrNext} disabled={loading || answer === ''}>Submit</button>
            <button onClick={handleSolve} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={handleSubmitOrNext}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/**
 * QuadraticApp Component
 * Quadratic function substitution practice: "Given x, find y = ax² + bx + c"
 * Difficulty levels: easy, medium, hard (varying coefficient magnitudes)
 * Generates random quadratic coefficients (a, b, c) and x values
 * Shows step-by-step working for each question
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function QuadraticApp({ onBack }) {
  // Difficulty level: 'easy', 'medium', 'hard', 'extrahard'
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to complete in this quiz session
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag
  const [started, setStarted] = useState(false)
  // Quiz finished flag
  const [finished, setFinished] = useState(false)
  // Current question object: {a, b, c, x} where formula is y = ax² + bx + c
  const [question, setQuestion] = useState(null)
  // User's string input for the y value answer
  const [answer, setAnswer] = useState('')
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions in this quiz session
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Feedback string with step-by-step calculation working
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress?
  const [loading, setLoading] = useState(false)
  // Answer revealed (transition from submit mode to next mode)?
  const [revealed, setRevealed] = useState(false)
  // Array of {question, userAnswer, correctAnswer, correct, time} objects
  const [results, setResults] = useState([])
  // Timer instance for tracking time spent per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * fetchQuestion(selectedDifficulty?): Fetch next quadratic substitution question from backend
   * Endpoint: /quadratic-api/question?difficulty={easy|medium|hard|extrahard}
   * Returns: {a, b, c, x} with the actual answer pre-calculated server-side
   * Resets form state and starts timer for this question
   */
  const fetchQuestion = async (selectedDifficulty = difficulty) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    setIsCorrect(null)
    // Fetch new question with specified difficulty
    const res = await fetch(`${API}/quadratic-api/question?difficulty=${effectiveDiff()}`)
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
    setAdaptScore(0)
    adaptScoreRef.current = 0
    await fetchQuestion(difficulty)
  }

  /**
   * Keyboard handler for QuadraticApp: Enter key to submit/next
   * Only active when quiz is running (started && !finished)
   */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !started || finished) return
      event.preventDefault()
      handleSubmitOrNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, questionNumber, loading, totalQ])

  /**
   * handleSubmitOrNext(): Submission and progression for QuadraticApp
   * Phase 1 (not revealed):
   *   - POST to /quadratic-api/check with {a, b, c, x, answer}
   *   - Receive { correct, correctAnswer }
   *   - Generate step-by-step working showing the calculation
   *   - Display feedback and reveal answer
   * Phase 2 (revealed):
   *   - If all questions answered, finish quiz
   *   - Otherwise, increment to next question and fetch it
   */
  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
      // POST to backend to validate quadratic substitution answer
      const res = await fetch(`${API}/quadratic-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: question.a, b: question.b, c: question.c, x: question.x, answer: Number(answer) }),
      })
      const data = await res.json()
      setIsCorrect(data.correct)
      if (data.correct) setScore((s) => s + 1)

      // Generate step-by-step working for feedback
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
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
      setRevealed(true)
      return
    }

    // Quiz progression: check if all questions have been answered
    if (questionNumber >= totalQ) {
      setFinished(true)
      setQuestion(null)
      timer.reset()
      return
    }

    setQuestionNumber((n) => n + 1)
    await fetchQuestion()
  }

  /**
   * handleSolve(): Get the solution without submitting an answer
   * Fetches the correct answer from the API with solve: true flag
   */
  const handleSolve = async () => {
    if (revealed) return
    const timeTaken = timer.stop()
    // POST to backend API with solve flag to get the solution
    const res = await fetch(`${API}/quadratic-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, c: question.c, x: question.x, answer: '', solve: true }),
    })
    const data = await res.json()
    setIsCorrect(false)
    // Generate step-by-step working for feedback
    const { a, b, c, x } = question
    const xSq = x * x
    const termA = a * xSq
    const termB = b * x
    const sign = (v) => v >= 0 ? `+ ${v}` : `− ${Math.abs(v)}`
    const reasoning = `y = ${a}(${x})² ${sign(b)}(${x}) ${sign(c)}\n= ${a}(${xSq}) ${sign(termB)} ${sign(c)}\n= ${termA} ${sign(termB)} ${sign(c)}\n= ${data.correctAnswer}`
    setFeedback(`Solution:\n${reasoning}`)
    setResults((prev) => [...prev, {
      question: `y = ${a}x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)}, x=${x}`,
      userAnswer: '—',
      correctAnswer: data.correctAnswer,
      correct: false,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitOrNext() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const diffLabels = { easy: 'Easy — Small coefficients', medium: 'Medium — Larger values', hard: 'Hard — Big coefficients', extrahard: 'Extra Hard — Very large' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Quadratic" subtitle="Given x, find y = ax² + bx + c" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice quadratic substitution!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="quadratic-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="quadratic-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder={String(DEFAULT_TOTAL)} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmitOrNext} disabled={loading || answer === ''}>Submit</button>
            <button onClick={handleSolve} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={handleSubmitOrNext}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/**
 * MultiplyApp Component
 * Multiplication tables practice with flexible table selection (2-9 times tables).
 * Key features:
 *   - User selects which multiplication tables to practice
 *   - All questions from selected tables are shuffled into a pool
 *   - Optional limit on number of questions (or use all available)
 *   - Instant local calculation (no API needed)
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function MultiplyApp({ onBack }) {
  // Array of selected multiplication table numbers (e.g., [2, 3, 5])
  const [selectedTables, setSelectedTables] = useState([])
  // User-entered question limit (empty string = use all available questions)
  const [numQuestions, setNumQuestions] = useState('')
  // Quiz started flag
  const [started, setStarted] = useState(false)
  // Quiz finished flag
  const [finished, setFinished] = useState(false)
  // Current question object: {table, multiplier, prompt: "table × multiplier"}
  const [question, setQuestion] = useState(null)
  // User's string input for the answer
  const [answer, setAnswer] = useState('')
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to answer in this quiz session
  const [totalQuestions, setTotalQuestions] = useState(0)
  // Feedback string showing correct/incorrect result
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // Loading state (not used locally, present for consistency)
  const [loading, setLoading] = useState(false)
  // Answer revealed flag (transition from submit mode to next mode)
  const [revealed, setRevealed] = useState(false)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Pre-shuffled pool of all questions from selected tables
  // Format: [{table: 2, multiplier: 1}, {table: 5, multiplier: 3}, ...]
  const [questionPool, setQuestionPool] = useState([])
  // Timer instance for tracking time spent per question
  const timer = useTimer()

  // Maximum possible questions (if all selected tables' 10 multipliers are included)
  // Used for displaying max limit to user
  const maxQuestions = selectedTables.length * 10

  /**
   * toggleTable(num): Add or remove multiplication table from selection
   * If table is already selected, remove it; otherwise add it
   */
  const toggleTable = (num) => {
    setSelectedTables((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    )
  }

  /**
   * buildPool(tables): Generate and shuffle complete question pool from selected tables
   * Algorithm:
   *   1. For each selected table, generate 10 questions (table × 1 through table × 10)
   *   2. Apply Fisher-Yates shuffle to randomize order
   * Returns: Shuffled array of {table, multiplier} objects
   */
  const buildPool = (tables) => {
    const pool = []
    tables.forEach((t) => {
      // Generate all 10 multiplication facts for this table (table × 1 through × 10)
      for (let m = 1; m <= 10; m++) {
        pool.push({ table: t, multiplier: m })
      }
    })
    // Fisher-Yates shuffle algorithm for unbiased randomization
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool
  }

  /**
   * nextFromPool(pool, index): Load question at given index from shuffled pool
   * Converts pool entry to question display format and resets form/state
   * Starts timer for the question
   */
  const nextFromPool = (pool, index) => {
    const q = pool[index]
    // Create question display from table and multiplier
    setQuestion({ table: q.table, multiplier: q.multiplier, prompt: `${q.table} × ${q.multiplier}` })
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    setIsCorrect(null)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize multiplication quiz
   * Process:
   *   1. Build shuffled pool from selected tables
   *   2. Limit to user-specified count (or all if field empty)
   *   3. Reset quiz state and load first question from pool
   */
  const startQuiz = () => {
    if (selectedTables.length === 0) return
    // Build pool of all possible questions from selected tables
    const pool = buildPool(selectedTables)
    // Limit to user-specified count, or use all available
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

  /**
   * Keyboard handler for MultiplyApp: Enter key
   * - Before quiz: Start quiz if tables are selected
   * - During quiz: Submit answer or advance to next
   */
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

  /**
   * handleSubmitOrNext(): Submission and progression for MultiplyApp
   * Phase 1 (not revealed):
   *   - Calculate expected answer locally (table × multiplier)
   *   - Compare with user input
   *   - Show feedback and store result
   * Phase 2 (revealed):
   *   - If all questions answered, finish quiz
   *   - Otherwise, load next question from pool
   * Note: No API call needed; multiplication validation is local
   */
  const handleSubmitOrNext = async () => {
    if (!question) return

    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
      // Calculate expected answer locally (no API required)
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

    // Quiz progression: check if all questions have been answered
    if (questionNumber >= totalQuestions) {
      setFinished(true)
      setQuestion(null)
      timer.reset()
      return
    }

    // Load next question from the pool
    const nextIdx = questionNumber
    setQuestionNumber((n) => n + 1)
    nextFromPool(questionPool, nextIdx)
  }

  /**
   * handleSolve(): Get the solution without submitting an answer
   * For multiplication, simply calculates the product locally
   */
  const handleSolve = async () => {
    if (revealed) return
    const timeTaken = timer.stop()
    // Calculate expected answer locally (no API required)
    const correctAnswer = question.table * question.multiplier
    setIsCorrect(false)
    const reasoning = `${question.table} × ${question.multiplier} = ${correctAnswer}`
    setFeedback(`Solution: ${reasoning}`)
    setResults((prev) => [...prev, {
      question: question.prompt,
      userAnswer: '—',
      correctAnswer,
      correct: false,
      time: timeTaken,
    }])
    setRevealed(true)
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
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((num) => (
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmitOrNext} disabled={loading || answer === ''}>Submit</button>
            <button onClick={handleSolve} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={handleSubmitOrNext}>{questionNumber >= totalQuestions ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
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

/**
 * VocabApp Component
 * Vocabulary definition matching quiz: "What does this word mean?"
 * Features:
 *   - Multiple-choice format: 4 definition options (A, B, C, D)
 *   - 5 difficulty levels: easy, medium, hard, extra-hard, hardest
 *   - Questions never repeat: tracks seen question IDs and excludes them
 *   - Keyboard shortcuts: 1-4 or a-d to select answer, Enter to submit
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function VocabApp({ onBack }) {
  // Difficulty level: 'easy' | 'medium' | 'hard' | 'extrahard'
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer in this session
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag
  const [started, setStarted] = useState(false)
  // Quiz finished flag
  const [finished, setFinished] = useState(false)
  // Current question object: {id, question: word, options: [def1, def2, def3, def4]}
  const [question, setQuestion] = useState(null)
  // Selected option letter: 'A' | 'B' | 'C' | 'D' (or empty)
  const [selected, setSelected] = useState('')
  // Feedback message after answer reveal
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress?
  const [loading, setLoading] = useState(false)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Answer revealed flag (transition from selection mode to next mode)
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions in this quiz session
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Persist seen Vocab question IDs in localStorage to avoid repeats across sessions
  const VOCAB_SEEN_KEY = 'tenali_vocab_seen'
  const loadVocabSeen = () => { try { return JSON.parse(localStorage.getItem(VOCAB_SEEN_KEY) || '[]') } catch { return [] } }
  const saveVocabSeen = (ids) => { try { localStorage.setItem(VOCAB_SEEN_KEY, JSON.stringify(ids)) } catch {} }
  const [seenIds, setSeenIds] = useState(loadVocabSeen)
  // Timer instance for tracking time spent per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => {
    const eff = isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty
    return eff === 'extrahard' ? 'extra-hard' : eff
  }

  /**
   * loadQuestion(excludeIds?): Fetch next vocabulary question from backend
   * Persists seen IDs to localStorage for cross-session no-repeat
   */
  const loadQuestion = async (excludeIds) => {
    setLoading(true)
    setSelected('')
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    const ids = excludeIds || seenIds
    const excludeParam = ids.length ? `&exclude=${ids.join(',')}` : ''
    const res = await fetch(`${API}/vocab-api/question?difficulty=${effectiveDiff()}${excludeParam}`)
    const data = await res.json()
    setQuestion(data)
    const newSeen = [...ids, data.id]
    setSeenIds(newSeen)
    saveVocabSeen(newSeen)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize vocabulary quiz
   * Keeps localStorage history for no-repeat across sessions
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    // Keep seenIds from localStorage — don't clear
    setAdaptScore(0)
    adaptScoreRef.current = 0
    await loadQuestion(seenIds)
  }

  /**
   * submitVocab(option): Submit user's definition choice and validate with backend
   * Process:
   *   1. Stop timer
   *   2. POST to /vocab-api/check with {id, answerOption}
   *   3. Receive { correct, correctAnswerText }
   *   4. Show feedback and store truncated definitions in results
   *   5. Reveal answer
   * Note: Definitions are truncated to 35 chars for results table display
   */
  const submitVocab = async (option) => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    setSelected(option)
    // POST to backend to validate the selected definition
    const res = await fetch(`${API}/vocab-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answerOption: option }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore((s) => s + 1)
    // Show feedback with correct answer text
    setFeedback(data.correct
      ? `Correct! "${data.correctAnswerText}"`
      : `Incorrect. The right definition is: "${data.correctAnswerText}"`)
    // Extract the user's selected definition from options array
    const userDef = question.options[['A','B','C','D'].indexOf(option)]
    // Truncate long definitions to fit in results table
    const truncate = (s) => s.length > 35 ? s.slice(0, 35) + '…' : s
    setResults((prev) => [...prev, {
      question: question.question,
      userAnswer: truncate(userDef),
      correctAnswer: truncate(data.correctAnswerText),
      correct: data.correct,
      time: timeTaken,
    }])
    if (isAdaptive) {
      setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  /**
   * handleSubmitOrNext(): Submission and progression handler
   * Phase 1 (not revealed): If user has selected an option, submit it
   * Phase 2 (revealed):
   *   - If all questions answered, finish quiz
   *   - Otherwise, increment question number and fetch next question
   */
  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) { if (selected) submitVocab(selected); return }
    if (questionNumber >= totalQ) { setFinished(true); setQuestion(null); timer.reset(); return }
    setQuestionNumber((n) => n + 1)
    await loadQuestion()
  }

  /**
   * handleSolve(): Get the solution without submitting an answer
   * Fetches the correct answer from the API with solve: true flag
   */
  const handleSolve = async () => {
    if (revealed) return
    const timeTaken = timer.stop()
    // POST to backend API with solve flag to get the solution
    const res = await fetch(`${API}/vocab-api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, answerOption: '', solve: true }),
    })
    const data = await res.json()
    setIsCorrect(false)
    // Show feedback with correct answer text
    setFeedback(`Solution: "${data.correctAnswerText}"`)
    // Truncate long definitions to fit in results table
    const truncate = (s) => s.length > 35 ? s.slice(0, 35) + '…' : s
    setResults((prev) => [...prev, {
      question: question.question,
      userAnswer: '—',
      correctAnswer: truncate(data.correctAnswerText),
      correct: false,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitOrNext() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const diffLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extrahard: 'Extra Hard' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  /**
   * Keyboard shortcuts for VocabApp:
   * - 1-4 or a-d: Select and immediately submit that option
   * - Enter: Submit selected answer or advance to next question
   * Options are only selectable when not revealed, not loading, question is loaded
   * Refs are used to maintain closure over latest function state
   */
  const submitVocabRef = useRef(submitVocab)
  submitVocabRef.current = submitVocab
  const handleNextRefV = useRef(handleSubmitOrNext)
  handleNextRefV.current = handleSubmitOrNext

  useEffect(() => {
    const onKeyDown = (event) => {
      // Enter key: submit or advance
      if (event.key === 'Enter') {
        if (!started || finished) return
        event.preventDefault()
        handleNextRefV.current()
        return
      }
      // Numeric and letter shortcuts only work during question (not revealed, not loading)
      if (!started || finished || revealed || loading || !question) return
      const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' }
      const letter = keyMap[event.key.toLowerCase()]
      // Validate that selected option exists in this question
      if (letter && question.options.length >= ['A','B','C','D'].indexOf(letter) + 1) {
        event.preventDefault()
        submitVocabRef.current(letter)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, revealed, loading, question])

  return (
    <QuizLayout title="Vocab Builder" subtitle="Pick the correct definition for the word" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Build your vocabulary!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="vocab-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="vocab-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder={String(DEFAULT_TOTAL)} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmitOrNext} disabled={loading || !selected}>Submit</button>
            <button onClick={handleSolve} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={handleSubmitOrNext}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Fraction Addition App ────────────────────────────────────── */
/**
 * FractionAddApp Component
 * Fraction addition quiz with three difficulty levels.
 *
 * Difficulty Levels:
 *   - Easy:   Same-denominator fractions (e.g., 2/5 + 1/5), denominators 2-10
 *   - Medium: Different denominators requiring LCD (e.g., 1/3 + 1/4), denominators 2-12
 *   - Hard:   Mixed numbers (e.g., 1⅔ + 2¼), denominators 2-15
 *
 * Features:
 *   - Custom fraction input UI with stacked numerator/denominator fields
 *   - Mixed number input (whole + fraction) for hard mode
 *   - All answers must be simplified to lowest terms
 *   - Auto-advance on correct answers, Enter key to advance on wrong
 *   - Keyboard: Tab between fields, Enter to submit
 *
 * State Machine: setup → playing → finished
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
/**
 * makeQuizApp — Factory for standard quiz components.
 * All share the same state machine: setup → playing → finished.
 * Differences are: title, subtitle, API path, difficulty labels, placeholders, field name for answer.
 */
// Adaptive difficulty helpers shared by all quiz apps
const ADAPT_DIFFS = ['easy', 'medium', 'hard', 'extrahard']
const ADAPT_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extrahard: 'Extra Hard' }
const ADAPT_COLORS = { easy: '#4caf50', medium: '#ff9800', hard: '#f44336', extrahard: '#9c27b0' }
function adaptiveLevel(score) { return ADAPT_DIFFS[Math.min(Math.max(Math.round(score), 0), 3)] }
function adaptivePct(score) { return Math.min(100, Math.max(0, (score / 3) * 100)) }

function makeQuizApp({ title, subtitle, apiPath, diffLabels, placeholders, tip, answerField }) {
  return function GeneratedQuizApp({ onBack }) {
    const diffs = Object.keys(diffLabels)
    const [difficulty, setDifficulty] = useState(diffs[0])
    const [isAdaptive, setIsAdaptive] = useState(false)
    const [adaptScore, setAdaptScore] = useState(0) // 0.0 (easy) → 3.0 (extrahard)
    const [reportAck, setReportAck] = useState('')
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
    const advanceFnRef = useRef(null)
    // Keep a ref for adaptive score so loadQuestion always sees latest
    const adaptScoreRef = useRef(0)
    // Guards against double-submit and double-advance race conditions
    const submittedRef = useRef(false)
    const advancedRef = useRef(false)

    const effectiveDifficulty = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

    const loadQuestion = async () => {
      setLoading(true)
      try {
        const diff = effectiveDifficulty()
        const r = await fetch(`${API}/${apiPath}/question?difficulty=${diff}`)
        const data = await r.json()
        setQuestion(data)
        setAnswer('')
        setFeedback('')
        setIsCorrect(null)
        setRevealed(false)
        submittedRef.current = false
        advancedRef.current = false
        timer.start()
      } catch (e) { console.error(`Failed to load ${title} question:`, e) }
      setLoading(false)
    }
    const startQuiz = () => {
      const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
      setTotalQ(t); setScore(0); setQuestionNumber(1); setResults([]); setStarted(true); setFinished(false)
      setAdaptScore(0); adaptScoreRef.current = 0
      submittedRef.current = false; advancedRef.current = false
    }
    useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])
    const advance = () => {
      if (advancedRef.current) return  // prevent double-advance (Enter + auto-advance race)
      advancedRef.current = true
      if (questionNumber >= totalQ) setFinished(true); else setQuestionNumber(n => n + 1)
    }
    advanceFnRef.current = advance
    useAutoAdvance(revealed, advanceFnRef, isCorrect)
    useEffect(() => {
      if (!revealed || isCorrect) return
      const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
      window.addEventListener('keydown', h)
      return () => window.removeEventListener('keydown', h)
    }, [revealed, isCorrect, questionNumber])

    const reportDifficulty = (wasDifficult) => {
      if (!isAdaptive) return
      setAdaptScore(prev => {
        const next = wasDifficult
          ? Math.max(0, prev - 0.5)
          : Math.min(3, prev + 0.3)
        adaptScoreRef.current = next
        return next
      })
      // Both buttons skip to the next question
      if (!revealed) {
        handleSkip()
      } else {
        advance()
      }
    }

    const handleSubmit = async () => {
      if (!question || revealed || !answer.trim()) return
      if (submittedRef.current) return  // prevent double-submit (rapid Enter presses)
      submittedRef.current = true
      const timeTaken = timer.stop()
      const payload = { ...question, [answerField || 'userAnswer']: answer.trim() }
      try {
        const r = await fetch(`${API}/${apiPath}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await r.json()
        setIsCorrect(data.correct); setRevealed(true)
        if (data.correct) setScore(s => s + 1)
        setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
        setResults(prev => [...prev, { prompt: question.prompt, userAnswer: answer.trim(), correctAnswer: data.display, correct: data.correct, time: timeTaken }])
        // Smooth adaptive adjustment
        if (isAdaptive) {
          setAdaptScore(prev => {
            const next = data.correct
              ? Math.min(3, prev + 0.25)  // gentle climb on correct
              : Math.max(0, prev - 0.35)  // slightly steeper drop on wrong
            adaptScoreRef.current = next
            return next
          })
        }
      } catch (e) { submittedRef.current = false; console.error(`Failed to check ${title} answer:`, e) }
    }

    const handleSolve = async () => {
      if (!question || revealed) return
      submittedRef.current = true
      timer.stop()
      const payload = { ...question, [answerField || 'userAnswer']: '', solve: true }
      try {
        const r = await fetch(`${API}/${apiPath}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await r.json()
        setIsCorrect(false); setRevealed(true)
        const display = data.display || data.correctAnswer || data.answer || ''
        const explanation = data.explanation || ''
        setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
        setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      } catch (e) { submittedRef.current = false; console.error(`Failed to solve ${title}:`, e) }
    }

    const handleSkip = () => {
      if (!question || revealed) return
      submittedRef.current = true
      timer.stop()
      setIsCorrect(false); setRevealed(true)
      setFeedback('Skipped — counted as incorrect.')
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(skipped)', correctAnswer: '—', correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    }

    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }
    const getPlaceholder = () => {
      if (typeof placeholders === 'string') return placeholders
      if (typeof placeholders === 'function') return placeholders(question, isAdaptive ? effectiveDifficulty() : difficulty)
      return placeholders?.[isAdaptive ? effectiveDifficulty() : difficulty] || 'Type your answer'
    }

    const curAdaptLevel = adaptiveLevel(adaptScore)

    return (
      <QuizLayout title={title} subtitle={subtitle} onBack={onBack} timer={started && !finished ? timer : null}>
        {!started && !finished && <div className="welcome-box">
          <p className="welcome-text">Practice {title.toLowerCase()}!</p>
          {tip && <p style={{ fontSize: '0.85rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>{tip}</p>}
          <div className="checkbox-group" style={{ marginBottom: '12px' }}>
            {diffs.map(d => (
              <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
                <input type="radio" name={`${apiPath}-diff`} checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
                {diffLabels[d]}
              </label>
            ))}
            <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
              <input type="radio" name={`${apiPath}-diff`} checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
              Adaptive
            </label>
          </div>
          {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>
            Starts easy and smoothly adjusts to your level as you answer.
          </p>}
          <div className="question-count-row">
            <label className="question-count-label">How many questions?</label>
            <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
          </div>
          <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
        </div>}
        {started && !finished && <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
            {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
          </div>
          {isAdaptive && (
            <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />
          )}
          {question && <div style={{ textAlign: 'center' }}>
            <div className="question-prompt" style={{ fontSize: '1.3rem', margin: '20px 0', lineHeight: '1.6' }}>{question.prompt}</div>
            <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder={getPlaceholder()} onKeyDown={handleKeyDown} autoFocus />
          </div>}
          {renderFeedback(feedback, isCorrect)}
          <div className="button-row">
            {!revealed ? <>
              <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
              <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
              {isAdaptive && <button onClick={handleSkip} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-text-soft)', color: 'var(--clr-text-soft)' }}>Skip</button>}
            </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
          </div>
          {isAdaptive && <div style={{ textAlign: 'center', margin: '10px 0 4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-soft)', marginRight: '8px' }}>How are you feeling?</span>
            <button onClick={() => reportDifficulty(false)} style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '8px', marginRight: '6px', background: 'transparent', border: '1px solid var(--clr-correct)', color: 'var(--clr-correct)', cursor: 'pointer' }}>Too Easy</button>
            <button onClick={() => reportDifficulty(true)} style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--clr-wrong)', color: 'var(--clr-wrong)', cursor: 'pointer' }}>Too Hard</button>
          </div>}
          {reportAck && <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--clr-accent)', margin: '6px 0', fontWeight: 500 }}>{reportAck}</div>}
          {results.length > 0 && <ResultsTable results={results} />}
        </>}
        {finished && <div className="welcome-box">
          <p className="welcome-text">Quiz complete!</p>
          <p className="final-score">Final score: {score}/{totalQ}</p>
          {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
          <ResultsTable results={results} />
          <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
        </div>}
      </QuizLayout>
    )
  }
}

// ── Generate all 14 new quiz apps ──────────────────────
const TrigApp = makeQuizApp({
  title: 'Trigonometry', subtitle: 'SOH-CAH-TOA, sine/cosine rule', apiPath: 'trig-api',
  diffLabels: { easy: 'Easy — Pythagoras', medium: 'Medium — Find Angle', hard: 'Hard — Sine Rule', extrahard: 'Extra Hard — Cosine/Area' },
  placeholders: 'e.g. 13 or 45.5',
})

const IneqApp = makeQuizApp({
  title: 'Inequalities', subtitle: 'Linear & quadratic inequalities', apiPath: 'ineq-api',
  diffLabels: { easy: 'Easy — Linear', medium: 'Medium — List integers', hard: 'Hard — Quadratic', extrahard: 'Extra Hard — Count' },
  placeholders: (q, d) => d === 'easy' ? 'e.g. x > 3' : d === 'medium' ? 'e.g. -1, 0, 1, 2' : d === 'hard' ? 'e.g. 1<=x<=5' : 'e.g. 7',
  tip: 'Use >= for ≥ and <= for ≤',
})

const CoordGeomApp = makeQuizApp({
  title: 'Coordinate Geometry', subtitle: 'Midpoint, distance, gradient', apiPath: 'coordgeom-api',
  diffLabels: { easy: 'Easy — Midpoint', medium: 'Medium — Distance', hard: 'Hard — Gradient', extrahard: 'Extra Hard — Perp. Bisector' },
  placeholders: (q, d) => d === 'easy' ? 'e.g. (3, 4)' : d === 'hard' || d === 'extrahard' ? 'e.g. 3/4 or 2' : 'e.g. 13',
})

const ProbApp = makeQuizApp({
  title: 'Probability', subtitle: 'Single & combined events', apiPath: 'prob-api',
  diffLabels: { easy: 'Easy — Simple', medium: 'Medium — Independent', hard: 'Hard — Or events', extrahard: 'Extra Hard — No replacement' },
  placeholders: 'e.g. 3/10',
})

const StatsApp = makeQuizApp({
  title: 'Statistics', subtitle: 'Mean, median, mode, range', apiPath: 'stats-api',
  diffLabels: { easy: 'Easy — Mean', medium: 'Medium — Median', hard: 'Hard — Mode/Range', extrahard: 'Extra Hard — Frequency' },
  placeholders: 'e.g. 12 or 7/3',
})

const MatrixApp = makeQuizApp({
  title: 'Matrices', subtitle: 'Add, multiply, determinant', apiPath: 'matrix-api',
  diffLabels: { easy: 'Easy — Addition', medium: 'Medium — Scalar ×', hard: 'Hard — Determinant', extrahard: 'Extra Hard — Multiply' },
  placeholders: (q, d) => d === 'hard' ? 'e.g. 7' : 'e.g. [1,2;3,4]',
  tip: 'Enter matrices as [a,b;c,d] — semicolon separates rows',
})

const VectorsApp = makeQuizApp({
  title: 'Vectors', subtitle: 'Add, scale, magnitude', apiPath: 'vectors-api',
  diffLabels: { easy: 'Easy — Addition', medium: 'Medium — Scalar ×', hard: 'Hard — Magnitude', extrahard: 'Extra Hard — Position' },
  placeholders: (q, d) => d === 'hard' ? 'e.g. 13' : 'e.g. (3, -2)',
})

// ── Matrix / Vector display helpers for DotProdApp ─────────────
function MatrixBox({ matrix, label }) {
  return (
    <div className="matrix-wrap">
      {label && <div className="matrix-label">{label}</div>}
      <div className="matrix-bracket">
        <span className="cap-tr" /><span className="cap-br" />
        <table>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                {row.map((val, j) => {
                  const isBlank = typeof val === 'string' && val.startsWith('?')
                  return <td key={j} className={isBlank ? 'blank-cell' : ''}>{val}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DotProdApp({ onBack }) {
  const DIFFS = ['easy', 'medium', 'hard', 'extrahard']
  const DIFF_LABELS_DP = { easy: 'Easy — 2D Dot', medium: 'Medium — 2D / 3D', hard: 'Hard — Matrix ×', extrahard: 'Extra Hard — Fill Blanks' }

  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  // Grid answer for matrix input (2D array of strings)
  const [gridAnswer, setGridAnswer] = useState([])
  const gridRefs = useRef([])
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()
  const advanceFnRef = useRef(null)
  const submittedRef = useRef(false)
  const advancedRef = useRef(false)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty
  const curAdaptLevel = adaptiveLevel(adaptScore)

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const diff = effectiveDiff()
      const r = await fetch(`${API}/dotprod-api/question?difficulty=${diff}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      submittedRef.current = false
      advancedRef.current = false
      // Initialize grid for all answer types
      if (data.type === 'dot2d' || data.type === 'dot3d') {
        // 1×1 grid for scalar dot product answer
        setGridAnswer([['']])
        gridRefs.current = [[null]]
      } else if (data.type === 'matmul') {
        const n = data.size
        setGridAnswer(Array.from({ length: n }, () => Array(n).fill('')))
        gridRefs.current = Array.from({ length: n }, () => Array(n).fill(null))
      } else if (data.type === 'matfill') {
        // Pre-fill known cells, leave blanks empty
        const blanksSet = new Set(data.blanks.map(([r, c]) => `${r},${c}`))
        const grid = data.matC.map((row, i) => row.map((val, j) => blanksSet.has(`${i},${j}`) ? '' : String(val)))
        setGridAnswer(grid)
        gridRefs.current = Array.from({ length: 4 }, () => Array(4).fill(null))
      } else {
        setGridAnswer([])
      }
      timer.start()
    } catch (e) { console.error('Failed to load Dot Products question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t); setScore(0); setQuestionNumber(1); setResults([]); setStarted(true); setFinished(false)
    setAdaptScore(0); adaptScoreRef.current = 0
    submittedRef.current = false; advancedRef.current = false
  }

  useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])

  const advance = () => {
    if (advancedRef.current) return
    advancedRef.current = true
    if (questionNumber >= totalQ) setFinished(true); else setQuestionNumber(n => n + 1)
  }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  // All question types now use grid input
  const isGridComplete = () => {
    if (!question) return false
    if (question.type === 'dot2d' || question.type === 'dot3d') return gridAnswer[0]?.[0]?.trim() !== ''
    if (question.type === 'matmul') return gridAnswer.every(row => row.every(v => v.trim() !== ''))
    if (question.type === 'matfill') return question.blanks.every(([r, c]) => gridAnswer[r]?.[c]?.trim() !== '')
    return answer.trim() !== ''
  }

  const handleSubmit = async () => {
    if (!question || revealed) return
    if (!isGridComplete()) return
    if (submittedRef.current) return  // prevent double-submit
    submittedRef.current = true
    // Build userAnswer string from grid
    let userAnswer
    if (question.type === 'dot2d' || question.type === 'dot3d') {
      userAnswer = gridAnswer[0][0].trim()
    } else if (question.type === 'matmul') {
      userAnswer = '[' + gridAnswer.map(row => row.join(',')).join(';') + ']'
    } else if (question.type === 'matfill') {
      userAnswer = question.blanks.map(([r, c]) => gridAnswer[r][c].trim()).join(',')
    } else {
      userAnswer = answer.trim()
    }
    const timeTaken = timer.stop()
    const payload = { ...question, userAnswer }
    try {
      const r = await fetch(`${API}/dotprod-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      setIsCorrect(data.correct); setRevealed(true)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer, correctAnswer: data.display, correct: data.correct, time: timeTaken }])
      if (isAdaptive) {
        setAdaptScore(prev => {
          const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35)
          adaptScoreRef.current = next
          return next
        })
      }
    } catch (e) { console.error('Failed to check Dot Products answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    setIsCorrect(false)
    setRevealed(true)
    const display = question.display || question.answer || '(solution unavailable)'
    setFeedback(`Solution: ${display}`)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }

  // Grid cell change handler — NO auto-tab; user must press Tab or click
  const handleGridChange = (row, col, val) => {
    if (revealed) return
    if (val !== '' && val !== '-' && !/^-?\d+$/.test(val)) return
    const newGrid = gridAnswer.map(r => [...r])
    newGrid[row][col] = val
    setGridAnswer(newGrid)
  }

  // ── Editable matrix grid input component ──────────────────────────
  const MatrixInput = ({ rows, cols, editableCells, label }) => {
    const allEditable = !editableCells
    const editSet = editableCells ? new Set(editableCells.map(([r, c]) => `${r},${c}`)) : null
    const isSmall = cols > 3

    return (
      <div className="matrix-wrap">
        {label && <div className="matrix-label">{label}</div>}
        <div className="matrix-bracket">
          <span className="cap-tr" /><span className="cap-br" />
          <table>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: cols }, (_, j) => {
                    const isEditable = allEditable || editSet.has(`${i},${j}`)
                    const val = gridAnswer[i]?.[j] ?? ''
                    if (isEditable) {
                      const cls = ['matrix-grid-cell', isSmall && 'small', revealed && (isCorrect ? 'revealed-correct' : 'revealed-wrong')].filter(Boolean).join(' ')
                      return (
                        <td key={j} style={{ padding: '3px' }}>
                          <input
                            ref={el => { if (!gridRefs.current[i]) gridRefs.current[i] = []; gridRefs.current[i][j] = el }}
                            type="text" value={val}
                            onChange={e => handleGridChange(i, j, e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={revealed} className={cls}
                          />
                        </td>
                      )
                    }
                    return <td key={j} className="matrix-grid-fixed">{val}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Rich prompt + input rendering ──────────────────────────
  const renderQuestion = () => {
    if (!question) return null
    const { type } = question

    if (type === 'dot2d' || type === 'dot3d') {
      const dim = question.vecA.length
      return (
        <div className="dotprod-question">
          <div className="hint-text">Find the dot product</div>
          <div className="dotprod-row">
            <MatrixBox matrix={[question.vecA]} label={`1×${dim}`} />
            <span className="matrix-op">·</span>
            <MatrixBox matrix={question.vecB.map(v => [v])} label={`${dim}×1`} />
            <span className="matrix-op">=</span>
            <MatrixInput rows={1} cols={1} label="A·B" />
          </div>
        </div>
      )
    }

    if (type === 'matmul') {
      const n = question.size
      return (
        <div className="dotprod-question">
          <div className="hint-text">Compute the matrix product A × B</div>
          <div className="dotprod-row">
            <MatrixBox matrix={question.matA} label="A" />
            <span className="matrix-op">×</span>
            <MatrixBox matrix={question.matB} label="B" />
            <span className="matrix-op">=</span>
            <MatrixInput rows={n} cols={n} label="A×B" />
          </div>
        </div>
      )
    }

    if (type === 'matfill') {
      return (
        <div className="dotprod-question">
          <div className="hint-text">Find the missing values in C = A × B</div>
          <div className="dotprod-row">
            <MatrixBox matrix={question.matA} label="A" />
            <span className="matrix-op">×</span>
            <MatrixBox matrix={question.matB} label="B" />
            <span className="matrix-op">=</span>
            <MatrixInput rows={4} cols={4} editableCells={question.blanks} label="C" />
          </div>
        </div>
      )
    }

    // Fallback
    return <div className="question-prompt" style={{ fontSize: '1.3rem', margin: '20px 0', lineHeight: '1.6' }}>{question.prompt}</div>
  }

  return (
    <QuizLayout title="Dot Products" subtitle="Vectors, matrix multiply, fill blanks" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice dot products & matrix multiplication!</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Easy/Medium: dot product of vectors. Hard: matrix multiply. Extra Hard: fill missing values.</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {DIFFS.map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="dotprod-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {DIFF_LABELS_DP[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="dotprod-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && (
          <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />
        )}
        {question && <div style={{ textAlign: 'center' }}>
          {renderQuestion()}
        </div>}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? (
            <>
              <button onClick={handleSolve} disabled={loading || !question} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
              <button onClick={handleSubmit} disabled={loading || !question || !isGridComplete()}>Submit</button>
            </>
          )
            : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

const TransformApp = makeQuizApp({
  title: 'Transformations', subtitle: 'Reflect, translate, rotate, enlarge', apiPath: 'transform-api',
  diffLabels: { easy: 'Easy — Reflect', medium: 'Medium — Translate', hard: 'Hard — Rotate', extrahard: 'Extra Hard — Enlarge' },
  placeholders: 'e.g. (-3, 4)',
})

const MensurApp = makeQuizApp({
  title: 'Mensuration', subtitle: 'Area, volume, surface area', apiPath: 'mensur-api',
  diffLabels: { easy: 'Easy — 2D Area', medium: 'Medium — Circle', hard: 'Hard — Volume', extrahard: 'Extra Hard — Surface Area' },
  placeholders: 'e.g. 150.72',
})

const BearingsApp = makeQuizApp({
  title: 'Bearings', subtitle: 'Three-figure bearings', apiPath: 'bearings-api',
  diffLabels: { easy: 'Easy — Compass', medium: 'Medium — Back bearing', hard: 'Hard — From coords', extrahard: 'Extra Hard — Components' },
  placeholders: 'e.g. 045 or 270',
})

const LogApp = makeQuizApp({
  title: 'Logarithms', subtitle: 'Evaluate, simplify, solve', apiPath: 'log-api',
  diffLabels: { easy: 'Easy — Evaluate', medium: 'Medium — Laws of logs', hard: 'Hard — Solve bˣ = n', extrahard: 'Extra Hard — Log equations' },
  placeholders: (q, d) => d === 'medium' ? 'e.g. 40 (the argument)' : 'e.g. 3',
})

const DiffApp = makeQuizApp({
  title: 'Differentiation', subtitle: 'Power rule, turning points', apiPath: 'diff-api',
  diffLabels: { easy: 'Easy — Power rule', medium: 'Medium — Polynomial', hard: 'Hard — Turning point x', extrahard: 'Extra Hard — Min/Max value' },
  placeholders: 'e.g. 12 or -3/2',
})

const BasesApp = makeQuizApp({
  title: 'Number Bases', subtitle: 'Binary, decimal, hexadecimal', apiPath: 'bases-api',
  diffLabels: { easy: 'Easy — Dec→Bin', medium: 'Medium — Bin→Dec', hard: 'Hard — Dec→Hex', extrahard: 'Extra Hard — Bin add / Hex→Bin' },
  placeholders: (q, d) => d === 'medium' ? 'e.g. 42' : d === 'hard' ? 'e.g. FF' : 'e.g. 101010',
})

const CircleThApp = makeQuizApp({
  title: 'Circle Theorems', subtitle: 'Angles, tangents, cyclic quads', apiPath: 'circle-api',
  diffLabels: { easy: 'Easy — Semicircle', medium: 'Medium — Centre/Circum', hard: 'Hard — Cyclic quad', extrahard: 'Extra Hard — Tangent' },
  placeholders: 'e.g. 45',
})

const IntegApp = makeQuizApp({
  title: 'Integration', subtitle: 'Reverse differentiation & areas', apiPath: 'integ-api',
  diffLabels: { easy: 'Easy — Power rule', medium: 'Medium — Definite integral', hard: 'Hard — Substitution', extrahard: 'Extra Hard — Area under curve' },
  placeholders: 'e.g. 3/4', tip: 'Use fractions like 3/4 if needed',
})

const StdFormApp = makeQuizApp({
  title: 'Standard Form', subtitle: 'Scientific notation operations', apiPath: 'stdform-api',
  diffLabels: { easy: 'Easy — Convert', medium: 'Medium — Multiply', hard: 'Hard — Divide', extrahard: 'Extra Hard — Add' },
  placeholders: 'e.g. 3.5 × 10^4', tip: 'Format: a × 10^n',
})

const BoundsApp = makeQuizApp({
  title: 'Bounds', subtitle: 'Upper & lower bounds, error intervals', apiPath: 'bounds-api',
  diffLabels: { easy: 'Easy — Lower bound', medium: 'Medium — Nearest 10', hard: 'Hard — Sum bounds', extrahard: 'Extra Hard — Division bounds' },
  placeholders: 'e.g. 4.25',
})

const SDTApp = makeQuizApp({
  title: 'Speed, Distance, Time', subtitle: 'Rate problems & conversions', apiPath: 'sdt-api',
  diffLabels: { easy: 'Easy — Distance', medium: 'Medium — Time', hard: 'Hard — Average speed', extrahard: 'Extra Hard — Convert' },
  placeholders: 'e.g. 120',
})

const VariationApp = makeQuizApp({
  title: 'Variation', subtitle: 'Direct & inverse proportion equations', apiPath: 'variation-api',
  diffLabels: { easy: 'Easy — Direct (y∝x)', medium: 'Medium — Inverse (y∝1/x)', hard: 'Hard — y∝x²', extrahard: 'Extra Hard — y∝1/√x' },
  placeholders: 'e.g. 24',
})

const HcfLcmApp = makeQuizApp({
  title: 'HCF & LCM', subtitle: 'Highest common factor & lowest common multiple', apiPath: 'hcflcm-api',
  diffLabels: { easy: 'Easy — HCF', medium: 'Medium — LCM', hard: 'Hard — Three numbers', extrahard: 'Extra Hard — Word problem' },
  placeholders: 'e.g. 60',
})

const ProfitLossApp = makeQuizApp({
  title: 'Profit & Loss', subtitle: 'Cost price, selling price, discounts', apiPath: 'profitloss-api',
  diffLabels: { easy: 'Easy — Find profit', medium: 'Medium — Profit %', hard: 'Hard — Discount', extrahard: 'Extra Hard — Successive discounts' },
  placeholders: 'e.g. 150',
})

const RoundingApp = makeQuizApp({
  title: 'Rounding', subtitle: 'Decimal places, significant figures, estimation', apiPath: 'rounding-api',
  diffLabels: { easy: 'Easy — Decimal places', medium: 'Medium — Sig. figures', hard: 'Hard — Truncation', extrahard: 'Extra Hard — Estimation' },
  placeholders: 'e.g. 3.14',
})

const BinomialApp = makeQuizApp({
  title: 'Binomial Theorem', subtitle: 'Expansions, coefficients, nCr', apiPath: 'binomial-api',
  diffLabels: { easy: 'Easy — nCr', medium: 'Medium — (1+x)^n', hard: 'Hard — (a+bx)^n', extrahard: 'Extra Hard — Specific term' },
  placeholders: 'e.g. 210',
})

const ComplexApp = makeQuizApp({
  title: 'Complex Numbers', subtitle: 'Add, multiply, modulus of complex numbers', apiPath: 'complex-api',
  diffLabels: { easy: 'Easy — Addition', medium: 'Medium — Multiplication', hard: 'Hard — Modulus', extrahard: 'Extra Hard — z²' },
  placeholders: (q, d) => d === 'hard' ? 'e.g. 13' : 'e.g. 3,-2 for 3-2i',
  tip: 'For complex answers give a,b where z = a + bi',
})

const AnglesApp = makeQuizApp({
  title: 'Angles', subtitle: 'Lines, points, parallel line angles', apiPath: 'angles-api',
  diffLabels: { easy: 'Easy — Straight line', medium: 'Medium — At a point', hard: 'Hard — Vertically opposite', extrahard: 'Extra Hard — Parallel lines' },
  placeholders: 'e.g. 65',
})

const TrianglesApp = makeQuizApp({
  title: 'Triangles', subtitle: 'Angle sum, isosceles, exterior angle', apiPath: 'triangles-api',
  diffLabels: { easy: 'Easy — Angle sum', medium: 'Medium — Isosceles', hard: 'Hard — Exterior angle', extrahard: 'Extra Hard — Multi-step' },
  placeholders: 'e.g. 72',
})

const CongruenceApp = makeQuizApp({
  title: 'Congruence', subtitle: 'SSS, SAS, ASA, RHS', apiPath: 'congruence-api',
  diffLabels: { easy: 'Easy — Find side', medium: 'Medium — Find angle', hard: 'Hard — Name the rule', extrahard: 'Extra Hard — In a figure' },
  placeholders: (q, d) => d === 'hard' ? 'e.g. SAS' : 'e.g. 7',
})

const PythagApp = makeQuizApp({
  title: "Pythagoras' Theorem", subtitle: 'Hypotenuse, legs, 3D diagonal', apiPath: 'pythag-api',
  diffLabels: { easy: 'Easy — Hypotenuse', medium: 'Medium — Shorter side', hard: 'Hard — Word problem', extrahard: 'Extra Hard — 3D diagonal' },
  placeholders: 'e.g. 13',
})

const PolygonsApp = makeQuizApp({
  title: 'Polygons', subtitle: 'Interior & exterior angles, diagonals', apiPath: 'polygons-api',
  diffLabels: { easy: 'Easy — Angle sum', medium: 'Medium — Each angle', hard: 'Hard — Find sides', extrahard: 'Extra Hard — Diagonals' },
  placeholders: 'e.g. 540',
})

const SimilarityApp = makeQuizApp({
  title: 'Similarity', subtitle: 'Scale factor, area & volume ratios', apiPath: 'similarity-api',
  diffLabels: { easy: 'Easy — Missing side', medium: 'Medium — Scale factor', hard: 'Hard — Area ratio', extrahard: 'Extra Hard — Volume ratio' },
  placeholders: 'e.g. 24',
})

const LinearEqApp = makeQuizApp({
  title: 'Linear Equations', subtitle: 'Solve for x', apiPath: 'lineareq-api',
  diffLabels: { easy: 'Easy — ax+b=c', medium: 'Medium — ax+b=cx+d', hard: 'Hard — a(bx+c)=d', extrahard: 'Extra Hard — (ax+b)/c=d' },
  placeholders: 'e.g. 3 or -2.5',
})

const DecimalsApp = makeQuizApp({
  title: 'Decimals', subtitle: 'Add, subtract, multiply, divide', apiPath: 'decimals-api',
  diffLabels: { easy: 'Easy — Add', medium: 'Medium — Subtract', hard: 'Hard — Multiply', extrahard: 'Extra Hard — Divide' },
  placeholders: 'e.g. 6.1',
})

const PermCombApp = makeQuizApp({
  title: 'Perm. & Comb.', subtitle: 'Permutations & combinations', apiPath: 'permcomb-api',
  diffLabels: { easy: 'Easy — nPr', medium: 'Medium — nCr', hard: 'Hard — Word problems', extrahard: 'Extra Hard — With/without repetition' },
  placeholders: 'e.g. 120',
})

const LimitsApp = makeQuizApp({
  title: 'Limits', subtitle: 'Evaluate limits', apiPath: 'limits-api',
  diffLabels: { easy: 'Easy — Direct sub', medium: 'Medium — Factorable', hard: 'Hard — Trig limits', extrahard: 'Extra Hard — Limits at infinity' },
  placeholders: 'e.g. 4 or 0.5',
})

const InvTrigApp = makeQuizApp({
  title: 'Inverse Trig', subtitle: 'arcsin, arccos, arctan', apiPath: 'invtrig-api',
  diffLabels: { easy: 'Easy — Basic values', medium: 'Medium — √ values', hard: 'Hard — Compositions', extrahard: 'Extra Hard — Principal values' },
  placeholders: 'e.g. 30 or 45',
})

const RemFactorApp = makeQuizApp({
  title: 'Remainder Theorem', subtitle: 'Remainder & factor theorem', apiPath: 'remfactor-api',
  diffLabels: { easy: 'Easy — Remainder (deg 2)', medium: 'Medium — Factor check', hard: 'Hard — Remainder (deg 3)', extrahard: 'Extra Hard — Find k' },
  placeholders: 'e.g. 7 or yes/no',
})

const HeronApp = makeQuizApp({
  title: "Heron's Formula", subtitle: 'Triangle area from sides', apiPath: 'heron-api',
  diffLabels: { easy: 'Easy — Semi-perimeter', medium: 'Medium — Integer area', hard: 'Hard — Decimal area', extrahard: 'Extra Hard — Find side' },
  placeholders: 'e.g. 24',
})

const SharesApp = makeQuizApp({
  title: 'Shares & Dividends', subtitle: 'Shares, dividends, returns', apiPath: 'shares-api',
  diffLabels: { easy: 'Easy — Find dividend', medium: 'Medium — Income', hard: 'Hard — Return %', extrahard: 'Extra Hard — Buy for target' },
  placeholders: 'e.g. 500',
})

const BankingApp = makeQuizApp({
  title: 'Banking (RD)', subtitle: 'Interest & recurring deposits', apiPath: 'banking-api',
  diffLabels: { easy: 'Easy — Simple interest', medium: 'Medium — Compound interest', hard: 'Hard — RD maturity', extrahard: 'Extra Hard — Find installment' },
  placeholders: 'e.g. 12600',
})

const GSTApp = makeQuizApp({
  title: 'GST', subtitle: 'Goods & Services Tax', apiPath: 'gst-api',
  diffLabels: { easy: 'Easy — GST amount', medium: 'Medium — Total with GST', hard: 'Hard — CGST+SGST', extrahard: 'Extra Hard — Input tax credit' },
  placeholders: 'e.g. 180',
})

const SectionApp = makeQuizApp({
  title: 'Section Formula', subtitle: 'Midpoint, section, centroid', apiPath: 'section-api',
  diffLabels: { easy: 'Easy — Midpoint', medium: 'Medium — Internal division', hard: 'Hard — Find ratio', extrahard: 'Extra Hard — Centroid' },
  placeholders: 'e.g. 3,5',
})

const LinProgApp = makeQuizApp({
  title: 'Linear Programming', subtitle: 'Optimize objective functions', apiPath: 'linprog-api',
  diffLabels: { easy: 'Easy — Evaluate at vertex', medium: 'Medium — Max from vertices', hard: 'Hard — 2-constraint LP', extrahard: 'Extra Hard — 3-constraint LP' },
  placeholders: 'e.g. 42',
})

const CircMeasureApp = makeQuizApp({
  title: 'Circular Measure', subtitle: 'Radians, arc length, sectors', apiPath: 'circmeasure-api',
  diffLabels: { easy: 'Easy — Deg→Rad', medium: 'Medium — Rad→Deg', hard: 'Hard — Arc length', extrahard: 'Extra Hard — Sector area' },
  placeholders: 'e.g. 1.57',
})

const ConicsApp = makeQuizApp({
  title: 'Conic Sections', subtitle: 'Circle, parabola, ellipse, hyperbola', apiPath: 'conics-api',
  diffLabels: { easy: 'Easy — Identify conic', medium: 'Medium — Circle radius', hard: 'Hard — Eccentricity', extrahard: 'Extra Hard — Focus of parabola' },
  placeholders: (q, d) => d === 'easy' ? 'e.g. circle' : 'e.g. 5',
})

const DiffEqApp = makeQuizApp({
  title: 'Differential Equations', subtitle: 'Order, degree, solve DEs', apiPath: 'diffeq-api',
  diffLabels: { easy: 'Easy — Find order', medium: 'Medium — Find degree', hard: 'Hard — Verify solution', extrahard: 'Extra Hard — Solve separable' },
  placeholders: (q, d) => d === 'hard' ? 'yes or no' : 'e.g. 2',
})

/* ── Tatsavit App ─────────────────────────────────── */
// 9-type progressive math drill for Tatsavit
const TATSAVIT_TYPE_NAMES = [
  'Tables (1-digit)', 'Tables (up to 20)', 'Squares', 'Square Root',
  'Monomial ×', 'Percentage', 'Addition', 'Subtraction', 'Negative Arithmetic'
]
const TATSAVIT_DIFF_LABELS = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard', extrahard: 'Extra Hard'
}

function TatsavitApp({ onBack }) {
  // ─────── Setup State ──────────────────────────────────
  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(true) // default to adaptive
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))

  // ─────── Quiz State ──────────────────────────────────
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
  const advanceFnRef = useRef(null)
  const submittedRef = useRef(false)
  const advancedRef = useRef(false)
  const inputRef = useRef(null)

  // ─────── Adaptive level tracking ──────────────────────
  // Float 0.0–8.0 mapping to 9 types; +0.3 correct, -0.4 wrong, +0.5 on 3-streak
  const [adaptLevel, setAdaptLevel] = useState(0)
  const adaptLevelRef = useRef(0)
  const streakRef = useRef(0)

  const currentLevel = () => Math.min(8, Math.max(0, Math.floor(adaptLevelRef.current)))

  // ─────── Per-type difficulty tracking ──────────────────
  // Each of the 9 types has its own difficulty index 0-3 (easy/medium/hard/extrahard)
  const TATSAVIT_DIFFS = ['easy', 'medium', 'hard', 'extrahard']
  const [typeDiffMap, setTypeDiffMap] = useState({}) // { typeIndex: diffIdx 0-3 }
  const getTypeDiff = (typeIdx) => typeDiffMap[typeIdx] ?? 0
  const setTypeDiff = (typeIdx, fn) => setTypeDiffMap(prev => {
    const cur = prev[typeIdx] ?? 0
    const next = typeof fn === 'function' ? fn(cur) : fn
    return { ...prev, [typeIdx]: Math.max(0, Math.min(3, next)) }
  })

  // ─────── Difficulty label for adaptive within-type scaling ─────
  const adaptiveDifficulty = () => {
    const typeIdx = question?.type ?? currentLevel()
    return TATSAVIT_DIFFS[getTypeDiff(typeIdx)] || 'easy'
  }

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const diff = isAdaptive ? adaptiveDifficulty() : difficulty
      const levelParam = isAdaptive ? `&level=${currentLevel()}` : ''
      const r = await fetch(`${API}/tatsavit-api/question?difficulty=${diff}${levelParam}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      submittedRef.current = false
      advancedRef.current = false
      timer.start()
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (e) { console.error('Failed to load Tatsavit question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(200, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setStarted(true)
    setFinished(false)
    setAdaptLevel(0)
    adaptLevelRef.current = 0
    streakRef.current = 0
    setTypeDiffMap({})
    submittedRef.current = false
    advancedRef.current = false
  }

  useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])

  // Track whether current question was answered correctly (for advance logic)
  const lastCorrectRef = useRef(false)

  const advance = () => {
    if (advancedRef.current) return
    advancedRef.current = true
    if (lastCorrectRef.current) {
      // Correct answer — counts toward total, move to next question
      if (questionNumber >= totalQ) setFinished(true)
      else setQuestionNumber(n => n + 1)
    } else {
      // Wrong answer — does NOT count; reload a fresh question at same number
      loadQuestion()
    }
  }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter to advance on wrong answer
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  // Per-type slow-answer thresholds (seconds) — if student exceeds this, ask easy/difficult
  // Each type has a base threshold; harder within-type difficulty adds a buffer
  const SLOW_THRESHOLDS = [
    8,   // 0: Single-digit tables (should be near-instant recall)
    10,  // 1: Tables up to 20 (slightly harder mental math)
    12,  // 2: Squares (squaring 2-digit numbers)
    15,  // 3: Square roots (estimation, trial and error)
    12,  // 4: Monomial multiplication (coefficients + exponents)
    20,  // 5: Percentages (multi-step: fraction of a number)
    10,  // 6: Addition (up to 3-digit)
    10,  // 7: Subtraction (up to 3-digit)
    12,  // 8: Negative arithmetic (sign tracking adds load)
  ]
  // Harder within-type difficulty gets extra seconds
  const diffBuffer = () => {
    const d = isAdaptive ? adaptiveDifficulty() : difficulty
    if (d === 'hard') return 3
    if (d === 'extrahard') return 5
    if (d === 'medium') return 1
    return 0
  }
  const getSlowThreshold = () => {
    const type = question?.type ?? 0
    return (SLOW_THRESHOLDS[type] || 15) + diffBuffer()
  }
  const [showSlowHint, setShowSlowHint] = useState(false)

  // Student self-reports difficulty — adjusts per-type difficulty (not global level)
  const [reportAck, setReportAck] = useState('')
  const reportDifficulty = (wasDifficult) => {
    if (!isAdaptive) { setShowSlowHint(false); return }
    const typeIdx = question?.type ?? currentLevel()
    if (wasDifficult) {
      setTypeDiff(typeIdx, d => d - 1)
    } else {
      setTypeDiff(typeIdx, d => d + 1)
    }
    setShowSlowHint(false)
    const typeName = TATSAVIT_TYPE_NAMES[typeIdx] || `Type ${typeIdx}`
    setReportAck(wasDifficult ? `Lowering ${typeName} difficulty...` : `Raising ${typeName} difficulty...`)
    setTimeout(() => setReportAck(''), 1500)
  }

  const handleSubmit = async () => {
    if (!question || revealed || !answer.trim()) return
    if (submittedRef.current) return
    submittedRef.current = true
    const timeTaken = timer.stop()
    setShowSlowHint(false)
    try {
      const r = await fetch(`${API}/tatsavit-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, userAnswer: answer.trim() }),
      })
      const data = await r.json()
      setIsCorrect(data.correct)
      setRevealed(true)
      lastCorrectRef.current = data.correct
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
      // Only record correct answers in results (wrong ones don't count)
      if (data.correct) {
        setResults(prev => [...prev, {
          question: `[${question.typeName}] ${question.prompt}`,
          userAnswer: answer.trim(),
          correctAnswer: data.display,
          correct: data.correct,
          time: timeTaken,
        }])
      }
      // If slow and adaptive, ask the student if it was easy or difficult
      const slowThresh = getSlowThreshold()
      if (isAdaptive && timeTaken > slowThresh) {
        setShowSlowHint(true)
      }
      // Adaptive progression — automatic adjustment
      if (isAdaptive) {
        const typeIdx = question?.type ?? currentLevel()
        // Adjust global level (which type appears next)
        setAdaptLevel(prev => {
          let next
          if (data.correct) {
            streakRef.current = streakRef.current >= 0 ? streakRef.current + 1 : 1
            const bump = timeTaken > slowThresh ? 0.15 : (streakRef.current >= 3 ? 0.5 : 0.3)
            next = Math.min(8, prev + bump)
          } else {
            streakRef.current = streakRef.current <= 0 ? streakRef.current - 1 : -1
            const penalty = timeTaken > slowThresh ? 0.6 : 0.4
            next = Math.max(0, prev - penalty)
          }
          adaptLevelRef.current = next
          return next
        })
        // Also adjust per-type difficulty (within-type scaling)
        if (data.correct && streakRef.current >= 3) {
          setTypeDiff(typeIdx, d => d + 1)
        } else if (!data.correct && streakRef.current <= -2) {
          setTypeDiff(typeIdx, d => d - 1)
        }
      }
    } catch (e) {
      submittedRef.current = false
      console.error('Failed to check Tatsavit answer:', e)
    }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    submittedRef.current = true
    timer.stop()
    setShowSlowHint(false)
    try {
      const r = await fetch(`${API}/tatsavit-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, userAnswer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true); lastCorrectRef.current = false
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
    } catch (e) { submittedRef.current = false; console.error('Failed to solve Tatsavit:', e) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }

  const levelPct = (adaptLevel / 8) * 100
  const levelColor = adaptLevel < 2 ? '#4caf50' : adaptLevel < 4 ? '#ff9800' : adaptLevel < 6 ? '#f44336' : '#9c27b0'

  return (
    <QuizLayout title="Tatsavit" subtitle="Progressive math drill — 9 levels" onBack={onBack} timer={started && !finished ? timer : null}>
      {/* ─── Setup screen: choose difficulty + question count ─── */}
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Mental math training for Tatsavit!</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--clr-dim)', marginBottom: '8px', textAlign: 'center' }}>
          9 question types: tables, squares, square roots, monomials, percentages, addition, subtraction, and negative arithmetic.
        </p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="tatsavit-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {TATSAVIT_DIFF_LABELS[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="tatsavit-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px', textAlign: 'center' }}>
          Starts with single-digit tables and progressively unlocks harder types as you answer correctly. 3 correct in a row levels up faster.
        </p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}

      {/* ─── Quiz phase ─── */}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Score {score}</div>
          <div className="progress-pill center">Q {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: levelColor, color: '#fff' }}>Level {currentLevel() + 1}: {TATSAVIT_TYPE_NAMES[currentLevel()]}</div>}
          {!isAdaptive && <div className="progress-pill">{question?.typeName || '...'}</div>}
        </div>
        {isAdaptive && (
          <DifficultySlider pct={levelPct} maxWidth={300} onChange={(p) => { const v = (p / 100) * 8; setAdaptLevel(v); adaptLevelRef.current = v }} />
        )}
        {question && <div style={{ textAlign: 'center' }}>
          <div className="question-box" style={{ fontSize: '1.4rem', margin: '16px auto', lineHeight: '1.6' }}>{question.prompt}</div>
          {question.inputHint && <div style={{ fontSize: '0.78rem', color: 'var(--clr-dim)', marginBottom: 8, textAlign: 'center' }}>{question.inputHint}</div>}
          <input ref={inputRef} className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder="Type your answer" onKeyDown={handleKeyDown} autoFocus style={{ textAlign: 'center' }} />
          <NumPad value={answer} onChange={v => !revealed && setAnswer(v)} disabled={revealed} showDecimal showCaret showX />
        </div>}
        {renderFeedback(feedback, isCorrect)}
        {showSlowHint && <div style={{ textAlign: 'center', margin: '8px 0', padding: '12px 16px', borderRadius: '10px', background: 'var(--clr-accent-soft)', border: '1px solid var(--clr-accent)', fontSize: '0.88rem' }}>
          <div style={{ marginBottom: '8px' }}>Was the previous question easy or difficult for you?</div>
          <button onClick={() => reportDifficulty(false)} style={{ fontSize: '0.84rem', padding: '6px 16px', borderRadius: '8px', marginRight: '8px', background: 'var(--clr-correct)', color: '#fff' }}>Easy</button>
          <button onClick={() => reportDifficulty(true)} style={{ fontSize: '0.84rem', padding: '6px 16px', borderRadius: '8px', background: 'var(--clr-wrong)', color: '#fff' }}>Difficult</button>
        </div>}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
            <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {/* Always-visible Easy/Difficult self-report buttons */}
        {isAdaptive && <div style={{ textAlign: 'center', margin: '10px 0 4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-soft)', marginRight: '8px' }}>How are you feeling?</span>
          <button onClick={() => reportDifficulty(false)} style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '8px', marginRight: '6px', background: 'transparent', border: '1px solid var(--clr-correct)', color: 'var(--clr-correct)', cursor: 'pointer' }}>Too Easy</button>
          <button onClick={() => reportDifficulty(true)} style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--clr-wrong)', color: 'var(--clr-wrong)', cursor: 'pointer' }}>Too Hard</button>
        </div>}
        {reportAck && <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--clr-accent)', margin: '6px 0', fontWeight: 500, transition: 'opacity 0.3s' }}>{reportAck}</div>}
      </>}

      {/* ─── Finished screen ─── */}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Completed {score} of {totalQ} questions</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', textAlign: 'center', marginTop: '-4px' }}>Wrong answers didn't count — only correct ones moved you forward.</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)', textAlign: 'center' }}>Reached level: <strong style={{ color: levelColor }}>{currentLevel() + 1} — {TATSAVIT_TYPE_NAMES[currentLevel()]}</strong></p>}
        <ResultsTable results={results} />
        <div className="button-row"><button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button></div>
      </div>}
    </QuizLayout>
  )
}

/* ── Squaring App ──────────────────────────────────── */
// (a+b)² = a² + 2ab + b²  — student fills all four boxes
function SquaringApp({ onBack }) {
  const DIFFS = ['easy', 'medium', 'hard', 'extrahard']
  const DIFF_LABELS_SQ = { easy: 'Easy — 11-19', medium: 'Medium — 20-49', hard: 'Hard — 50-99', extrahard: 'Extra Hard — 100-999' }

  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [question, setQuestion] = useState(null)
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState([])
  const timer = useTimer()
  const advanceFnRef = useRef(null)
  const submittedRef = useRef(false)
  const advancedRef = useRef(false)

  // Four input fields: a², b², 2ab, final answer
  const [valASq, setValASq] = useState('')
  const [valBSq, setValBSq] = useState('')
  const [val2AB, setVal2AB] = useState('')
  const [valFinal, setValFinal] = useState('')
  const refASq = useRef(null)
  const refBSq = useRef(null)
  const ref2AB = useRef(null)
  const refFinal = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty
  const curAdaptLevel = adaptiveLevel(adaptScore)

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const diff = effectiveDiff()
      const r = await fetch(`${API}/squaring-api/question?difficulty=${diff}`)
      const data = await r.json()
      setQuestion(data)
      setValASq(''); setValBSq(''); setVal2AB(''); setValFinal('')
      setFeedback(''); setIsCorrect(null); setRevealed(false)
      submittedRef.current = false; advancedRef.current = false
      timer.start()
      setTimeout(() => refASq.current?.focus(), 50)
    } catch (e) { console.error('Failed to load Squaring question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t); setScore(0); setQuestionNumber(1); setResults([]); setStarted(true); setFinished(false)
    setAdaptScore(0); adaptScoreRef.current = 0
    submittedRef.current = false; advancedRef.current = false
  }

  useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])

  const advance = () => { if (advancedRef.current) return; advancedRef.current = true; if (questionNumber >= totalQ) setFinished(true); else setQuestionNumber(n => n + 1) }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const isComplete = () => valASq.trim() !== '' && valBSq.trim() !== '' && val2AB.trim() !== '' && valFinal.trim() !== ''

  const handleSubmit = async () => {
    if (!question || revealed || !isComplete()) return
    if (submittedRef.current) return
    submittedRef.current = true
    const timeTaken = timer.stop()
    const userAnswer = `${valASq.trim()}|${valBSq.trim()}|${val2AB.trim()}|${valFinal.trim()}`
    try {
      const r = await fetch(`${API}/squaring-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...question, userAnswer }) })
      const data = await r.json()
      setIsCorrect(data.correct); setRevealed(true)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${question.n}² = ${question.answer}` : `Incorrect. ${question.display}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: valFinal.trim(), correctAnswer: String(question.answer), correct: data.correct, time: timeTaken }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) { submittedRef.current = false; console.error('Failed to check Squaring answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    submittedRef.current = true
    timer.stop()
    try {
      const r = await fetch(`${API}/squaring-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, userAnswer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { submittedRef.current = false; console.error('Failed to solve Squaring:', e) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }

  // Tab between the four fields
  const handleFieldKey = (e, nextRef) => {
    if (e.key === 'Tab' && !e.shiftKey && nextRef?.current) {
      e.preventDefault()
      nextRef.current.focus()
    }
    handleKeyDown(e)
  }

  const numInput = (val, setter, ref, nextRef, label, correctVal) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <label className="matrix-label">{label}</label>
      <input
        ref={ref}
        className={`matrix-grid-cell${revealed ? (isCorrect ? ' revealed-correct' : ' revealed-wrong') : ''}`}
        style={{ width: 90, height: 44, fontSize: '1.1rem' }}
        type="text" value={val}
        onChange={e => { if (!revealed) { const v = e.target.value; if (v === '' || /^-?\d+$/.test(v)) setter(v) } }}
        onKeyDown={e => handleFieldKey(e, nextRef)}
        disabled={revealed}
        placeholder="?"
      />
      {revealed && !isCorrect && <span style={{ fontSize: '0.78rem', color: '#f44336', fontWeight: 600 }}>{correctVal}</span>}
    </div>
  )

  return (
    <QuizLayout title="Squaring" subtitle="(a + b)² = a² + 2ab + b²" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Square numbers quickly using the identity (a + b)² = a² + 2ab + b²</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Split any number into a round part (a) and remainder (b), then fill in all four boxes.</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {DIFFS.map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="squaring-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {DIFF_LABELS_SQ[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="squaring-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && (
          <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />
        )}
        {question && <div style={{ textAlign: 'center' }}>
          <div className="question-prompt" style={{ fontSize: '1.4rem', margin: '16px 0 6px', lineHeight: '1.6' }}>
            {question.n}²
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--clr-dim)', marginBottom: 14 }}>
            Split as ({question.a} + {question.b})² &nbsp;→&nbsp; {question.a}² + 2·{question.a}·{question.b} + {question.b}²
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            {numInput(valASq, setValASq, refASq, refBSq, `${question.a}²`, question.aSq)}
            <span className="matrix-op" style={{ marginTop: 28 }}>+</span>
            {numInput(val2AB, setVal2AB, ref2AB, refBSq, `2·${question.a}·${question.b}`, question.twoAB)}
            <span className="matrix-op" style={{ marginTop: 28 }}>+</span>
            {numInput(valBSq, setValBSq, refBSq, refFinal, `${question.b}²`, question.bSq)}
            <span className="matrix-op" style={{ marginTop: 28 }}>=</span>
            {numInput(valFinal, setValFinal, refFinal, null, 'Answer', question.answer)}
          </div>
        </div>}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmit} disabled={loading || !question || !isComplete()}>Submit</button>
            <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Random Mix App ─────────────────────────────────── */
// Adaptive cross-topic quiz: random topics, progressive difficulty, skip topics
// Topics that work with a single text-input answer in Random Mix.
// Excluded: simul (needs x,y,z inputs), polymul (needs coefficient array),
// polyfactor (needs 4 factor inputs), primefactor (needs factor chain UI),
// qformula (needs two roots), dotprod (needs matrix grid).
const RANDOM_MIX_TOPICS = [
  { key: 'basicarith', name: 'Basic Arithmetic', api: 'basicarith-api' },
  { key: 'addition', name: 'Addition', api: 'addition-api' },
  { key: 'quadratic', name: 'Quadratic', api: 'quadratic-api' },
  { key: 'multiply', name: 'Multiplication', api: 'multiply-api' },
  { key: 'sqrt', name: 'Square Root', api: 'sqrt-api' },
  { key: 'funceval', name: 'Functions', api: 'funceval-api' },
  { key: 'lineq', name: 'Line Equation', api: 'lineq-api' },
  { key: 'fractionadd', name: 'Fractions', api: 'fractionadd-api' },
  { key: 'surds', name: 'Surds', api: 'surds-api' },
  { key: 'indices', name: 'Indices', api: 'indices-api' },
  { key: 'sequences', name: 'Sequences', api: 'sequences-api' },
  { key: 'ratio', name: 'Ratio', api: 'ratio-api' },
  { key: 'percent', name: 'Percentages', api: 'percent-api' },
  { key: 'sets', name: 'Sets', api: 'sets-api' },
  { key: 'trig', name: 'Trigonometry', api: 'trig-api' },
  { key: 'ineq', name: 'Inequalities', api: 'ineq-api' },
  { key: 'coordgeom', name: 'Coord. Geometry', api: 'coordgeom-api' },
  { key: 'prob', name: 'Probability', api: 'prob-api' },
  { key: 'stats', name: 'Statistics', api: 'stats-api' },
  { key: 'matrix', name: 'Matrices', api: 'matrix-api' },
  { key: 'vectors', name: 'Vectors', api: 'vectors-api' },
  { key: 'transform', name: 'Transformations', api: 'transform-api' },
  { key: 'mensur', name: 'Mensuration', api: 'mensur-api' },
  { key: 'bearings', name: 'Bearings', api: 'bearings-api' },
  { key: 'log', name: 'Logarithms', api: 'log-api' },
  { key: 'diff', name: 'Differentiation', api: 'diff-api' },
  { key: 'bases', name: 'Number Bases', api: 'bases-api' },
  { key: 'circleth', name: 'Circle Theorems', api: 'circle-api' },
  { key: 'integ', name: 'Integration', api: 'integ-api' },
  { key: 'stdform', name: 'Standard Form', api: 'stdform-api' },
  { key: 'bounds', name: 'Bounds', api: 'bounds-api' },
  { key: 'sdt', name: 'Speed/Distance/Time', api: 'sdt-api' },
  { key: 'variation', name: 'Variation', api: 'variation-api' },
  { key: 'hcflcm', name: 'HCF & LCM', api: 'hcflcm-api' },
  { key: 'profitloss', name: 'Profit & Loss', api: 'profitloss-api' },
  { key: 'rounding', name: 'Rounding', api: 'rounding-api' },
  { key: 'binomial', name: 'Binomial Theorem', api: 'binomial-api' },
  { key: 'complex', name: 'Complex Numbers', api: 'complex-api' },
  { key: 'angles', name: 'Angles', api: 'angles-api' },
  { key: 'triangles', name: 'Triangles', api: 'triangles-api' },
  { key: 'congruence', name: 'Congruence', api: 'congruence-api' },
  { key: 'pythag', name: "Pythagoras' Theorem", api: 'pythag-api' },
  { key: 'polygons', name: 'Polygons', api: 'polygons-api' },
  { key: 'similarity', name: 'Similarity', api: 'similarity-api' },
]

const DIFF_LEVELS = ['easy', 'medium', 'hard', 'extrahard']
const DIFF_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extrahard: 'Extra Hard' }
const DIFF_COLORS = { easy: '#4caf50', medium: '#ff9800', hard: '#f44336', extrahard: '#9c27b0' }

function RandomMixApp({ onBack }) {
  const [phase, setPhase] = useState('setup') // setup | playing | finished
  const [skippedTopics, setSkippedTopics] = useState(new Set())
  const [topicDiffMap, setTopicDiffMap] = useState({}) // { topicKey: diffIndex (0-3) }
  const [streak, setStreak] = useState(0) // positive = correct streak, negative = wrong streak
  const [question, setQuestion] = useState(null)
  const [currentTopic, setCurrentTopic] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [results, setResults] = useState([])
  const [totalQuestions, setTotalQuestions] = useState(20)
  const [numQInput, setNumQInput] = useState('20')
  const timer = useTimer()
  const advanceFnRef = useRef(null)
  const submittedRef = useRef(false)
  const advancedRef = useRef(false)
  // Track topic stats for the summary
  const [topicStats, setTopicStats] = useState({})
  const [reportAck, setReportAck] = useState('')

  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  const availableTopics = () => RANDOM_MIX_TOPICS.filter(t => !skippedTopics.has(t.key))

  const pickRandomTopic = () => {
    const pool = availableTopics()
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const getTopicDiff = (topicKey) => topicDiffMap[topicKey] ?? 0
  const currentDifficulty = () => DIFF_LEVELS[Math.min(getTopicDiff(currentTopic?.key), DIFF_LEVELS.length - 1)]
  const setTopicDiff = (topicKey, fn) => setTopicDiffMap(prev => {
    const cur = prev[topicKey] ?? 0
    const next = typeof fn === 'function' ? fn(cur) : fn
    return { ...prev, [topicKey]: Math.max(0, Math.min(DIFF_LEVELS.length - 1, next)) }
  })

  const loadQuestion = async () => {
    const topic = pickRandomTopic()
    if (!topic) {
      setFeedback('No topics left! Un-skip some topics or finish.')
      return
    }
    setLoading(true)
    setCurrentTopic(topic)
    try {
      const diff = DIFF_LEVELS[Math.min(getTopicDiff(topic.key), DIFF_LEVELS.length - 1)]
      const r = await fetch(`${API}/${topic.api}/question?difficulty=${diff}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      submittedRef.current = false
      advancedRef.current = false
      setQuestionNumber(n => n + 1)
      timer.reset()
      timer.start()
    } catch {
      setFeedback('Failed to load question. Trying another topic...')
      // Try again with a different topic
      setTimeout(loadQuestion, 300)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!question || revealed || answer.trim() === '') return
    if (submittedRef.current) return
    submittedRef.current = true
    const elapsed = timer.stop()
    try {
      const payload = { ...question, userAnswer: answer.trim() }
      const r = await fetch(`${API}/${currentTopic.api}/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await r.json()
      const correct = data.correct
      setIsCorrect(correct)
      setRevealed(true)
      setFeedback(correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)

      if (correct) {
        setScore(s => s + 1)
        const newStreak = streak >= 0 ? streak + 1 : 1
        setStreak(newStreak)
        // Level up this topic after 3 correct in a row
        if (newStreak >= 3) {
          setTopicDiff(currentTopic.key, d => d + 1)
          setStreak(0)
        }
      } else {
        const newStreak = streak <= 0 ? streak - 1 : -1
        setStreak(newStreak)
        // Level down this topic after 2 wrong in a row
        if (newStreak <= -2) {
          setTopicDiff(currentTopic.key, d => d - 1)
          setStreak(0)
        }
      }

      // Track per-topic stats
      setTopicStats(prev => {
        const s = prev[currentTopic.key] || { name: currentTopic.name, correct: 0, total: 0 }
        return { ...prev, [currentTopic.key]: { name: s.name, correct: s.correct + (correct ? 1 : 0), total: s.total + 1 } }
      })

      setResults(prev => [...prev, {
        question: `[${currentTopic.name}] ${getPromptForType(currentTopic.key, question) || question.prompt || '?'}`,
        userAnswer: answer.trim(),
        correctAnswer: data.display,
        correct,
        time: elapsed
      }])
    } catch {
      setFeedback('Error checking answer.')
    }
  }

  const advance = () => {
    if (advancedRef.current) return
    advancedRef.current = true
    if (questionNumber >= totalQuestions) {
      setPhase('finished')
    } else {
      loadQuestion()
    }
  }
  advanceFnRef.current = advance

  // Enter key handler for wrong answers
  useEffect(() => {
    if (!revealed || isCorrect) return
    const handler = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revealed, isCorrect, questionNumber])

  const skipTopic = () => {
    if (!currentTopic) return
    setSkippedTopics(prev => new Set([...prev, currentTopic.key]))
    // Don't count this as a question — decrement and load next
    setQuestionNumber(n => n - 1)
    loadQuestion()
  }

  const unskipTopic = (key) => {
    setSkippedTopics(prev => {
      const s = new Set(prev)
      s.delete(key)
      return s
    })
  }

  const handleSkip = () => {
    if (!question || revealed) return
    submittedRef.current = true
    timer.stop()
    setIsCorrect(false); setRevealed(true); setStreak(s => Math.min(s, 0) - 1)
    setFeedback('Skipped — counted as incorrect.')
    setResults(prev => [...prev, {
      question: `[${currentTopic?.name || '?'}] ${getPromptForType(currentTopic?.key, question) || question.prompt || '?'}`,
      userAnswer: '(skipped)', correctAnswer: '—', correct: false, time: 0
    }])
    if (currentTopic) setTopicDiff(currentTopic.key, d => d - 1)
  }

  const reportDifficulty = (wasDifficult) => {
    if (currentTopic) {
      if (wasDifficult) {
        setTopicDiff(currentTopic.key, d => d - 1); setStreak(0)
      } else {
        setTopicDiff(currentTopic.key, d => d + 1); setStreak(0)
      }
    }
    // Both buttons skip to the next question
    if (!revealed) {
      handleSkip()
    } else {
      advance()
    }
  }

  const handleSolve = async () => {
    if (!question || revealed || !currentTopic) return
    submittedRef.current = true
    timer.stop()
    try {
      const payload = { ...question, userAnswer: '', solve: true }
      const r = await fetch(`${API}/${currentTopic.api}/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, {
        question: `[${currentTopic.name}] ${getPromptForType(currentTopic.key, question) || question.prompt || '?'}`,
        userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0
      }])
    } catch { setFeedback('Error getting solution.') }
  }

  const startQuiz = () => {
    const n = parseInt(numQInput) || 20
    setTotalQuestions(Math.max(5, Math.min(100, n)))
    setPhase('playing')
    setScore(0)
    setQuestionNumber(0)
    setResults([])
    setTopicDiffMap({})
    setStreak(0)
    setSkippedTopics(new Set())
    setTopicStats({})
    setTimeout(loadQuestion, 0)
  }

  // ─── Setup Phase ─────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="app-card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <button className="back-button" onClick={onBack}>← Back</button>
        <h2 style={{ margin: '0.5rem 0' }}>Random Mix</h2>
        <p style={{ color: 'var(--color-text-dim)', margin: '0.3rem 0 1rem' }}>
          Adaptive cross-topic quiz. Questions come from random topics and difficulty adjusts to your level.
          You can skip any topic you don't want to see.
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: 600 }}>Number of questions: </label>
          <input type="number" value={numQInput} onChange={e => setNumQInput(e.target.value)}
            style={{ width: 70, padding: '0.3rem 0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            min={5} max={100} />
        </div>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Starts at <strong style={{ color: DIFF_COLORS.easy }}>Easy</strong>.
          3 correct in a row → level up.
          2 wrong in a row → level down.
          Topics drawn randomly from all {RANDOM_MIX_TOPICS.length} puzzles.
        </p>
        <button className="submit-btn" onClick={startQuiz} style={{ width: '100%', fontSize: '1.1rem' }}>
          Start Random Mix
        </button>
      </div>
    )
  }

  // ─── Finished Phase ──────────────────────────────
  if (phase === 'finished') {
    const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
    const topicEntries = Object.values(topicStats).sort((a, b) => b.total - a.total)
    return (
      <div className="app-card" style={{ maxWidth: 620, margin: '0 auto' }}>
        <button className="back-button" onClick={onBack}>← Back</button>
        <h2>Random Mix — Results</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <div className="stat-pill">{score}/{totalQuestions} correct ({pct}%)</div>
          <div className="stat-pill">Ended at {DIFF_LABELS[currentDifficulty()]} level</div>
          <div className="stat-pill">{Object.keys(topicStats).length} topics covered</div>
        </div>
        {topicEntries.length > 0 && (
          <div style={{ margin: '1rem 0' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Topic Breakdown</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {topicEntries.map(t => (
                <span key={t.name} style={{
                  padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.82rem',
                  background: t.correct === t.total ? 'var(--color-correct-bg)' : t.correct === 0 ? 'var(--color-wrong-bg)' : 'var(--color-surface-alt)',
                  color: 'var(--color-text)'
                }}>
                  {t.name}: {t.correct}/{t.total}
                </span>
              ))}
            </div>
          </div>
        )}
        <ResultsTable results={results} />
        <button className="submit-btn" onClick={() => setPhase('setup')} style={{ width: '100%', marginTop: '1rem' }}>
          Play Again
        </button>
      </div>
    )
  }

  // ─── Playing Phase ───────────────────────────────
  const diff = currentDifficulty()
  return (
    <div className="app-card" style={{ maxWidth: 620, margin: '0 auto' }}>
      <button className="back-button" onClick={onBack}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Random Mix</h2>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span className="stat-pill">Q{questionNumber}/{totalQuestions}</span>
          <span className="stat-pill" style={{ background: DIFF_COLORS[diff], color: '#fff' }}>{DIFF_LABELS[diff]}</span>
          <span className="stat-pill">{score} correct</span>
        </div>
      </div>

      {currentTopic && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
            Topic: {currentTopic.name}
          </span>
          {!revealed && (
            <button onClick={skipTopic} style={{
              background: 'none', border: '1px solid var(--color-border)', borderRadius: 8,
              padding: '0.2rem 0.6rem', fontSize: '0.78rem', color: 'var(--color-text-dim)',
              cursor: 'pointer'
            }}>
              Skip this topic
            </button>
          )}
        </div>
      )}

      {skippedTopics.size > 0 && (
        <div style={{ marginBottom: '0.6rem', fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
          Skipped: {[...skippedTopics].map(k => {
            const t = RANDOM_MIX_TOPICS.find(x => x.key === k)
            return (
              <span key={k} onClick={() => unskipTopic(k)} style={{
                display: 'inline-block', padding: '0.1rem 0.45rem', margin: '0.1rem', borderRadius: 8,
                background: 'var(--color-surface-alt)', cursor: 'pointer', textDecoration: 'line-through'
              }}>
                {t ? t.name : k} ✕
              </span>
            )
          })}
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', padding: '2rem 0' }}>Loading…</p>}

      {!loading && question && (
        <>
          <div className="question-prompt" style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0 1rem', fontSize: '1.1rem', lineHeight: 1.5 }}>
            {getPromptForType(currentTopic.key, question) || question.prompt || ''}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              className="answer-input"
              type="text"
              value={answer}
              onChange={e => { if (!revealed) setAnswer(e.target.value) }}
              disabled={revealed}
              placeholder="Type your answer"
              onKeyDown={e => { if (e.key === 'Enter' && !revealed) handleSubmit() }}
              style={{ flex: 1 }}
              autoFocus
            />
            {!revealed && (
              <>
                <button className="submit-btn" onClick={handleSubmit} disabled={answer.trim() === ''}>Submit</button>
                <button className="submit-btn" onClick={handleSolve} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
                <button className="submit-btn" onClick={handleSkip} style={{ background: 'transparent', border: '1px solid var(--clr-text-soft)', color: 'var(--clr-text-soft)' }}>Skip</button>
              </>
            )}
            {revealed && (
              <button className="submit-btn" onClick={advance}>
                {questionNumber >= totalQuestions ? 'Finish' : 'Next'}
              </button>
            )}
          </div>

          {/* Always-visible Easy/Difficult self-report buttons */}
          <div style={{ textAlign: 'center', margin: '10px 0 4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-soft)', marginRight: '8px' }}>How are you feeling?</span>
            <button onClick={() => reportDifficulty(false)} style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '8px', marginRight: '6px', background: 'transparent', border: '1px solid var(--clr-correct)', color: 'var(--clr-correct)', cursor: 'pointer' }}>Too Easy</button>
            <button onClick={() => reportDifficulty(true)} style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--clr-wrong)', color: 'var(--clr-wrong)', cursor: 'pointer' }}>Too Hard</button>
          </div>
          {reportAck && <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--clr-accent)', margin: '6px 0', fontWeight: 500 }}>{reportAck}</div>}

          {renderFeedback(feedback, isCorrect)}

          {revealed && isCorrect !== null && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '0.3rem' }}>
              {isCorrect ? (
                streak >= 2 && getTopicDiff(currentTopic?.key) < DIFF_LEVELS.length - 1
                  ? `🔥 ${streak} in a row! Levelling up next…`
                  : `✓ Streak: ${streak}`
              ) : (
                streak <= -1 && getTopicDiff(currentTopic?.key) > 0
                  ? `Levelling down next…`
                  : ''
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Sets App ───────────────────────────────────────── */
function SetsApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
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
  const advanceFnRef = useRef(null)
  const advancedRef = useRef(false)
  const submittedRef = useRef(false)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/sets-api/question?difficulty=${effectiveDiff()}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      submittedRef.current = false
      advancedRef.current = false
      timer.start()
    } catch (e) { console.error('Failed to load sets question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t); setScore(0); setQuestionNumber(1); setResults([]); setStarted(true); setFinished(false)
    setAdaptScore(0); adaptScoreRef.current = 0
    submittedRef.current = false
    advancedRef.current = false
  }

  useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])
  const advance = () => { if (advancedRef.current) return; advancedRef.current = true; if (questionNumber >= totalQ) setFinished(true); else setQuestionNumber(n => n + 1) }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const handleSubmit = async () => {
    if (!question || revealed || !answer.trim()) return
    if (submittedRef.current) return
    submittedRef.current = true
    const timeTaken = timer.stop()
    const payload = { ...question, userAnswer: answer.trim() }
    try {
      const r = await fetch(`${API}/sets-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      setIsCorrect(data.correct); setRevealed(true)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: answer.trim(), correctAnswer: data.display, correct: data.correct, time: timeTaken }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) { console.error('Failed to check sets answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    submittedRef.current = true
    timer.stop()
    try {
      const r = await fetch(`${API}/sets-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, userAnswer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { submittedRef.current = false; console.error('Failed to solve sets:', e) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }
  const diffLabels = { easy: 'Easy — List elements', medium: 'Medium — Cardinality', hard: 'Hard — 2-set Venn', extrahard: 'Extra Hard — 3-set Venn' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Sets" subtitle="Union, intersection, Venn diagrams" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice sets and Venn diagrams!</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>For listing elements, type like: 1, 3, 5 or {'{'}1, 3, 5{'}'}</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="sets-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="sets-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && <div style={{ textAlign: 'center' }}>
          <div className="question-prompt" style={{ fontSize: '1.3rem', margin: '20px 0', lineHeight: '1.6' }}>{question.prompt}</div>
          <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder={question.type === 'list' ? 'e.g. {1, 3, 5} or empty' : 'e.g. 12'} onKeyDown={handleKeyDown} autoFocus />
        </div>}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
            <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Sequences & Series App ─────────────────────────── */
function SequencesApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
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
  const advanceFnRef = useRef(null)
  const advancedRef = useRef(false)
  const submittedRef = useRef(false)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/sequences-api/question?difficulty=${effectiveDiff()}`)
      const data = await r.json()
      setQuestion(data); setAnswer(''); setFeedback(''); setIsCorrect(null); setRevealed(false); submittedRef.current = false; advancedRef.current = false; timer.start()
    } catch (e) { console.error('Failed to load sequences question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t); setScore(0); setQuestionNumber(1); setResults([]); setStarted(true); setFinished(false)
    setAdaptScore(0); adaptScoreRef.current = 0
    submittedRef.current = false
    advancedRef.current = false
  }

  useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])
  const advance = () => { if (advancedRef.current) return; advancedRef.current = true; if (questionNumber >= totalQ) setFinished(true); else setQuestionNumber(n => n + 1) }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const handleSubmit = async () => {
    if (!question || revealed || !answer.trim()) return
    if (submittedRef.current) return
    submittedRef.current = true
    const timeTaken = timer.stop()
    const payload = { ...question, answer: answer.trim() }
    try {
      const r = await fetch(`${API}/sequences-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      setIsCorrect(data.correct); setRevealed(true)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! Answer: ${data.display}` : `Incorrect. Answer: ${data.display}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: answer.trim(), correctAnswer: data.display, correct: data.correct, time: timeTaken }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) { console.error('Failed to check sequences answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    submittedRef.current = true
    timer.stop()
    try {
      const r = await fetch(`${API}/sequences-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, answer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { submittedRef.current = false; console.error('Failed to solve sequences:', e) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }
  const diffLabels = { easy: 'Easy — Arith. nth term', medium: 'Medium — Arith. sum', hard: 'Hard — Geom. nth term', extrahard: 'Extra Hard — Geom. sum' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Sequences & Series" subtitle="Arithmetic & geometric" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice sequences and series!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="seq-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="seq-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && <div style={{ textAlign: 'center' }}>
          <div className="question-prompt" style={{ fontSize: '1.4rem', margin: '20px 0' }}>{question.prompt}</div>
          <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder="e.g. 42 or 3/4" onKeyDown={handleKeyDown} autoFocus />
        </div>}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
            <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Ratio & Proportion App ────────────────────────── */
function RatioApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
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
  const advanceFnRef = useRef(null)
  const advancedRef = useRef(false)
  const submittedRef = useRef(false)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/ratio-api/question?difficulty=${effectiveDiff()}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      submittedRef.current = false
      advancedRef.current = false
      timer.start()
    } catch (e) { console.error('Failed to load ratio question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setStarted(true)
    setFinished(false)
    setAdaptScore(0)
    adaptScoreRef.current = 0
    submittedRef.current = false
    advancedRef.current = false
  }

  useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])
  const advance = () => { if (advancedRef.current) return; advancedRef.current = true; if (questionNumber >= totalQ) setFinished(true); else setQuestionNumber(n => n + 1) }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const handleSubmit = async () => {
    if (!question || revealed || !answer.trim()) return
    if (submittedRef.current) return
    submittedRef.current = true
    const timeTaken = timer.stop()
    const payload = { ...question, answer: answer.trim() }
    try {
      const r = await fetch(`${API}/ratio-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      setIsCorrect(data.correct)
      setRevealed(true)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: answer.trim(), correctAnswer: data.display, correct: data.correct, time: timeTaken }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) { console.error('Failed to check ratio answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    submittedRef.current = true
    timer.stop()
    try {
      const r = await fetch(`${API}/ratio-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, answer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { submittedRef.current = false; console.error('Failed to solve ratio:', e) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }
  const diffLabels = { easy: 'Easy — Simplify', medium: 'Medium — Divide', hard: 'Hard — Direct', extrahard: 'Extra Hard — Inverse' }
  const placeholders = { easy: 'e.g. 3:2', medium: 'e.g. 72, 48', hard: 'e.g. 32', extrahard: 'e.g. 8 or 8/3' }

  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Ratio & Proportion" subtitle="Simplify, divide, direct & inverse" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice ratio and proportion!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="ratio-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="ratio-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && <div style={{ textAlign: 'center' }}>
          <div className="question-prompt" style={{ fontSize: '1.4rem', margin: '20px 0' }}>{question.prompt}</div>
          <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder={placeholders[isAdaptive ? adaptiveLevel(adaptScore) : difficulty] || 'Type your answer'} onKeyDown={handleKeyDown} autoFocus />
        </div>}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
            <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Percentages App ────────────────────────────────── */
function PercentApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
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
  const advanceFnRef = useRef(null)
  const advancedRef = useRef(false)
  const submittedRef = useRef(false)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/percent-api/question?difficulty=${effectiveDiff()}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      submittedRef.current = false
      advancedRef.current = false
      timer.start()
    } catch (e) { console.error('Failed to load percent question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setStarted(true)
    setFinished(false)
    setAdaptScore(0)
    adaptScoreRef.current = 0
    submittedRef.current = false
    advancedRef.current = false
  }

  useEffect(() => { if (started && !finished && questionNumber > 0) loadQuestion() }, [started, questionNumber])
  const advance = () => { if (advancedRef.current) return; advancedRef.current = true; if (questionNumber >= totalQ) setFinished(true); else setQuestionNumber(n => n + 1) }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const handleSubmit = async () => {
    if (!question || revealed || !answer.trim()) return
    if (submittedRef.current) return
    submittedRef.current = true
    const timeTaken = timer.stop()
    const payload = { ...question, userAnswer: answer.trim().replace(/[$,]/g, '') }
    try {
      const r = await fetch(`${API}/percent-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      setIsCorrect(data.correct)
      setRevealed(true)
      if (data.correct) setScore(s => s + 1)
      setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: answer.trim(), correctAnswer: data.display, correct: data.correct, time: timeTaken }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) { console.error('Failed to check percent answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    submittedRef.current = true
    timer.stop()
    try {
      const r = await fetch(`${API}/percent-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, userAnswer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { submittedRef.current = false; console.error('Failed to solve percent:', e) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!revealed) handleSubmit() } }
  const diffLabels = { easy: 'Easy — Find %', medium: 'Medium — Increase/Decrease', hard: 'Hard — Reverse %', extrahard: 'Extra Hard — Compound' }

  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Percentages" subtitle="Find, increase, reverse, compound" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice percentages!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="pct-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="pct-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && <div style={{ textAlign: 'center' }}>
          <div className="question-prompt" style={{ fontSize: '1.4rem', margin: '20px 0' }}>{question.prompt}</div>
          <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder="Type your answer" onKeyDown={handleKeyDown} autoFocus />
        </div>}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
            <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Indices App ─────────────────────────────────────── */
/**
 * IndicesApp Component
 * Practice laws of exponents (indices) — IGCSE syllabus.
 * Easy: multiply/divide/power-of-power with variable bases
 * Medium: zero and negative exponents (numeric evaluation)
 * Hard: fractional exponents (numeric evaluation)
 * ExtraHard: negative fractional exponents, fraction bases
 *
 * For 'simplify' questions: user enters the resulting exponent (integer)
 * For 'evaluate' questions: user enters a number or fraction (e.g. "8", "1/4")
 */
function IndicesApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
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
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/indices-api/question?difficulty=${effectiveDiff()}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      timer.start()
    } catch (e) { console.error('Failed to load indices question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setStarted(true)
    setFinished(false)
    setAdaptScore(0)
    adaptScoreRef.current = 0
  }

  useEffect(() => {
    if (started && !finished && questionNumber > 0) loadQuestion()
  }, [started, questionNumber])

  const advance = () => {
    if (questionNumber >= totalQ) setFinished(true)
    else setQuestionNumber(n => n + 1)
  }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const handleSubmit = async () => {
    if (!question || revealed || !answer.trim()) return
    const timeTaken = timer.stop()

    const payload = { ...question, answer: answer.trim() }
    try {
      const r = await fetch(`${API}/indices-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await r.json()
      setIsCorrect(data.correct)
      setRevealed(true)
      if (data.correct) setScore(s => s + 1)

      const prompt = question.prompt
      setFeedback(data.correct
        ? `Correct! ${prompt} = ${data.display}`
        : `Incorrect. ${prompt} = ${data.display}`)

      setResults(prev => [...prev, {
        prompt,
        userAnswer: answer.trim(),
        correctAnswer: data.display,
        correct: data.correct,
        time: timeTaken
      }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) { console.error('Failed to check indices answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    timer.stop()
    try {
      const r = await fetch(`${API}/indices-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, answer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt: question.prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { console.error('Failed to solve indices:', e) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (revealed) advance()
      else handleSubmit()
    }
  }

  const diffLabels = { easy: 'Easy — Basic Laws', medium: 'Medium — Negative/Zero', hard: 'Hard — Fractional', extrahard: 'Extra Hard — Mixed' }
  const placeholders = { easy: 'Enter the exponent, e.g. 7', medium: 'e.g. 1 or 1/8', hard: 'e.g. 8 or 9', extrahard: 'e.g. 1/4 or 9/4' }

  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Indices" subtitle="Laws of exponents" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice laws of indices!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="idx-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="idx-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}

      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && (
          <div style={{ textAlign: 'center' }}>
            <div className="question-prompt" style={{ fontSize: '1.6rem', margin: '20px 0' }}>{question.prompt} = ?</div>
            {question.type === 'simplify' && <p style={{ fontSize: '0.85rem', color: 'var(--clr-dim)', margin: '0 0 8px' }}>Enter the exponent only (e.g. type 7 for {question.base}{'\u2077'})</p>}
            <input
              className="answer-input"
              type="text"
              value={answer}
              onChange={e => { if (!revealed) setAnswer(e.target.value) }}
              disabled={revealed}
              placeholder={placeholders[isAdaptive ? adaptiveLevel(adaptScore) : difficulty] || 'Type your answer'}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        )}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? (
            <>
              <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
              <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
            </>
          ) : (
            <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>
          )}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}

      {finished && (
        <div className="welcome-box">
          <p className="welcome-text">Quiz complete!</p>
          <p className="final-score">Final score: {score}/{totalQ}</p>
          {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
          <ResultsTable results={results} />
          <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
        </div>
      )}
    </QuizLayout>
  )
}

/* ── Surds App ─────────────────────────────────────── */
/**
 * SurdsApp Component
 * Practice simplifying, adding, multiplying, and rationalising surds.
 * Difficulty levels:
 *   Easy      — Simplify √n (e.g. √72 = 6√2)
 *   Medium    — Add/subtract like surds (e.g. 3√5 + 2√5 = 5√5)
 *   Hard      — Multiply surds and simplify (e.g. √6 × √10 = 2√15)
 *   ExtraHard — Rationalise denominators (e.g. 6/√3 = 2√3)
 *
 * User types answers using √ symbol (keyboard hint provided) or "sqrt".
 * Auto-advance on correct answers; Enter key advances after wrong answers.
 */
function SurdsApp({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
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
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  const loadQuestion = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/surds-api/question?difficulty=${effectiveDiff()}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      timer.start()
    } catch (e) { console.error('Failed to load surds question:', e) }
    setLoading(false)
  }

  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setStarted(true)
    setFinished(false)
    setAdaptScore(0)
    adaptScoreRef.current = 0
  }

  useEffect(() => {
    if (started && !finished && questionNumber > 0) loadQuestion()
  }, [started, questionNumber])

  const advance = () => {
    if (questionNumber >= totalQ) setFinished(true)
    else setQuestionNumber(n => n + 1)
  }
  advanceFnRef.current = advance
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  /** Normalize user input: replace "sqrt" with √, strip spaces */
  const normalizeAnswer = (s) => s.replace(/sqrt/gi, '√').replace(/\s+/g, ' ').trim()

  /** Build the prompt string shown for the question */
  const getPrompt = (q) => {
    if (!q) return ''
    if (q.type === 'simplify') return `Simplify √${q.n}`
    if (q.type === 'addsub') {
      const aStr = q.a === 1 ? '√' + q.r : q.a + '√' + q.r
      const bStr = q.b === 1 ? '√' + q.r : q.b + '√' + q.r
      return `${aStr} ${q.op} ${bStr}`
    }
    if (q.type === 'multiply') {
      const p1 = q.c1 === 1 ? '√' + q.r1 : q.c1 + '√' + q.r1
      const p2 = q.c2 === 1 ? '√' + q.r2 : q.c2 + '√' + q.r2
      return `${p1} × ${p2}`
    }
    if (q.type === 'rationalise') {
      if (q.subtype === 'simple') {
        const den = q.b === 1 ? '√' + q.r : q.b + '√' + q.r
        return `${q.a} ÷ (${den})`
      } else {
        const sign = q.q > 0 ? '+' : ''
        const qStr = Math.abs(q.q) === 1 ? (q.q > 0 ? '' : '-') : String(q.q)
        return `${q.a} ÷ (${q.p}${sign}${qStr}√${q.r})`
      }
    }
    return ''
  }

  const handleSubmit = async () => {
    if (!question || revealed) return
    const normalized = normalizeAnswer(answer)
    if (!normalized) return
    const timeTaken = timer.stop()

    const payload = { ...question, answer: normalized }

    try {
      const r = await fetch(`${API}/surds-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await r.json()
      setIsCorrect(data.correct)
      setRevealed(true)
      if (data.correct) setScore(s => s + 1)

      const prompt = getPrompt(question)
      setFeedback(data.correct
        ? `Correct! ${prompt} = ${data.display}`
        : `Incorrect. ${prompt} = ${data.display}`)

      setResults(prev => [...prev, {
        prompt,
        userAnswer: normalized,
        correctAnswer: data.display,
        correct: data.correct,
        time: timeTaken
      }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) { console.error('Failed to check surds answer:', e) }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    timer.stop()
    const prompt = getPrompt(question)
    try {
      const r = await fetch(`${API}/surds-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, answer: '', solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { console.error('Failed to solve surds:', e) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (revealed) advance()
      else handleSubmit()
    }
  }

  const diffLabels = { easy: 'Easy — Simplify', medium: 'Medium — Add/Sub', hard: 'Hard — Multiply', extrahard: 'Extra Hard — Rationalise' }

  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Surds" subtitle="Simplify, add, multiply, rationalise" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice working with surds!</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Tip: type √ using "sqrt" or copy-paste √</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="surds-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="surds-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}

      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && (
          <div style={{ textAlign: 'center' }}>
            <div className="question-prompt" style={{ fontSize: '1.6rem', margin: '20px 0' }}>{getPrompt(question)}</div>
            <input
              className="answer-input"
              type="text"
              value={answer}
              onChange={e => { if (!revealed) setAnswer(e.target.value) }}
              disabled={revealed}
              placeholder="e.g. 6√2"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        )}
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? (
            <>
              <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
              <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
            </>
          ) : (
            <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>
          )}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}

      {finished && (
        <div className="welcome-box">
          <p className="welcome-text">Quiz complete!</p>
          <p className="final-score">Final score: {score}/{totalQ}</p>
          {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
          <ResultsTable results={results} />
          <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
        </div>
      )}
    </QuizLayout>
  )
}

function FractionAddApp({ onBack }) {
  // ── State variables ──────────────────────────────────────────────────
  // Difficulty: 'easy' | 'medium' | 'hard' | 'extrahard'
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions (user-configurable, stored as string for input)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz phase flags
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  // Current question object from API
  const [question, setQuestion] = useState(null)
  // User's answer as a string: "3/4" or "2 3/4" for mixed numbers
  const [answer, setAnswer] = useState('')
  // Score tracking
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Feedback after submission
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  // Loading flag for API calls
  const [loading, setLoading] = useState(false)
  // Whether answer has been revealed (submitted)
  const [revealed, setRevealed] = useState(false)
  // Results log for ResultsTable
  const [results, setResults] = useState([])
  // Timer for per-question timing
  const timer = useTimer()

  // ── Refs for auto-advance ────────────────────────────────────────────
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * loadQuestion(): Fetch a new fraction-add question from the API.
   * Updates question state and resets answer fields.
   */
  const loadQuestion = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/fractionadd-api/question?difficulty=${effectiveDiff()}`)
      const data = await r.json()
      setQuestion(data)
      setAnswer('')
      setFeedback('')
      setIsCorrect(null)
      setRevealed(false)
      timer.start()
    } catch (e) {
      console.error('Failed to load fraction question:', e)
    }
    setLoading(false)
  }

  /**
   * startQuiz(): Initialize quiz with chosen settings.
   * Sets total questions, resets score and results, loads first question.
   */
  const startQuiz = () => {
    const t = Math.max(1, Math.min(100, Number(numQuestions) || DEFAULT_TOTAL))
    setTotalQ(t)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setAdaptScore(0)
    adaptScoreRef.current = 0
    setStarted(true)
    setFinished(false)
  }

  // Load question when quiz starts or question number changes
  useEffect(() => {
    if (started && !finished && questionNumber > 0) loadQuestion()
  }, [started, questionNumber])

  /**
   * advance(): Move to the next question or finish the quiz.
   * Called by auto-advance (correct) or Next button (wrong).
   */
  const advance = () => {
    if (questionNumber >= totalQ) {
      setFinished(true)
    } else {
      setQuestionNumber(n => n + 1)
    }
  }

  // Keep advanceFnRef updated for useAutoAdvance hook
  advanceFnRef.current = advance

  // Auto-advance after correct answer (1500ms delay)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  // Enter key to advance after wrong answer
  useEffect(() => {
    if (!revealed || isCorrect) return
    const handleKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, isCorrect, questionNumber])

  /**
   * parseAnswer(str): Parse user's answer string into {whole, num, den}
   * Accepts formats: "3/4", "2 3/4", "5", "2 5"
   * Returns null if invalid.
   */
  const parseAnswer = (str) => {
    const s = str.trim()
    if (!s) return null
    // Try "W N/D" (mixed number)
    const mixedMatch = s.match(/^(-?\d+)\s+(-?\d+)\/(\d+)$/)
    if (mixedMatch) return { whole: Number(mixedMatch[1]), num: Number(mixedMatch[2]), den: Number(mixedMatch[3]) }
    // Try "N/D" (simple fraction)
    const fracMatch = s.match(/^(-?\d+)\/(\d+)$/)
    if (fracMatch) return { whole: 0, num: Number(fracMatch[1]), den: Number(fracMatch[2]) }
    // Try plain number "N" (whole number, den=1)
    const numMatch = s.match(/^(-?\d+)$/)
    if (numMatch) return { whole: 0, num: Number(numMatch[1]), den: 1 }
    return null
  }

  /**
   * handleSubmit(): Validate and submit the user's answer.
   * Parses the text input (e.g., "3/4" or "2 3/4"), then POSTs to /fractionadd-api/check.
   */
  const handleSubmit = async () => {
    if (!question || revealed) return
    const parsed = parseAnswer(answer)
    if (!parsed || parsed.den === 0) return

    const timeTaken = timer.stop()
    const payload = {
      n1: question.n1, d1: question.d1,
      n2: question.n2, d2: question.d2,
      ansNum: parsed.num,
      ansDen: parsed.den,
      mixed: question.mixed || false,
    }
    if (question.mixed) {
      payload.w1 = question.w1
      payload.w2 = question.w2
      payload.ansWhole = parsed.whole
    }

    try {
      const r = await fetch(`${API}/fractionadd-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await r.json()

      setIsCorrect(data.correct)
      setRevealed(true)
      if (data.correct) setScore(s => s + 1)

      const prompt = question.mixed
        ? `${question.w1} ${question.n1}/${question.d1} + ${question.w2} ${question.n2}/${question.d2}`
        : `${question.n1}/${question.d1} + ${question.n2}/${question.d2}`

      setFeedback(data.correct
        ? `Correct! ${prompt} = ${data.display}`
        : `Incorrect. ${prompt} = ${data.display}`)

      setResults(prev => [...prev, {
        prompt,
        userAnswer: answer.trim(),
        correctAnswer: data.display,
        correct: data.correct,
        time: timeTaken
      }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
    } catch (e) {
      console.error('Failed to check fraction answer:', e)
    }
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    timer.stop()
    const prompt = question.mixed
      ? `${question.w1} ${question.n1}/${question.d1} + ${question.w2} ${question.n2}/${question.d2}`
      : `${question.n1}/${question.d1} + ${question.n2}/${question.d2}`
    try {
      const r = await fetch(`${API}/fractionadd-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, ansNum: '', ansDen: '', solve: true })
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.display || data.correctAnswer || data.answer || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { prompt, userAnswer: '(solved)', correctAnswer: display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { console.error('Failed to solve fraction:', e) }
  }

  /**
   * handleKeyDown(e): Handle Enter key to submit or advance.
   * Attached to the fraction input fields.
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (revealed) advance()
      else handleSubmit()
    }
  }

  /**
   * formatFraction(n, d): Render a fraction as a React element with
   * stacked numerator/denominator layout using CSS classes.
   */
  const formatFraction = (n, d) => (
    <span className="fraction-display">
      <span className="frac-num">{n}</span>
      <span className="frac-bar"></span>
      <span className="frac-den">{d}</span>
    </span>
  )

  /**
   * formatMixed(w, n, d): Render a mixed number as whole + fraction.
   */
  const formatMixed = (w, n, d) => (
    <span className="mixed-number">
      <span className="mixed-whole">{w}</span>
      {formatFraction(n, d)}
    </span>
  )

  const diffLabels = { easy: 'Easy — Same denominator', medium: 'Medium — Related denominators', hard: 'Hard — Different denominators', extrahard: 'Extra Hard — Mixed & improper' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <QuizLayout title="Fractions (Add)" subtitle="Add fractions and simplify" onBack={onBack} timer={started && !finished ? timer : null}>
      {/* ── Setup Phase ── */}
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice adding fractions!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="frac-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="frac-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}

      {/* ── Playing Phase ── */}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && (
          <div className="fraction-problem">
            {/* Render the problem: n1/d1 + n2/d2 or mixed numbers */}
            {question.mixed ? (
              <div className="fraction-expression">
                {formatMixed(question.w1, question.n1, question.d1)}
                <span className="frac-operator">+</span>
                {formatMixed(question.w2, question.n2, question.d2)}
                <span className="frac-operator">=</span>
              </div>
            ) : (
              <div className="fraction-expression">
                {formatFraction(question.n1, question.d1)}
                <span className="frac-operator">+</span>
                {formatFraction(question.n2, question.d2)}
                <span className="frac-operator">=</span>
              </div>
            )}

            {/* Single text input — type answer as "3/4" or "2 3/4" */}
            <input
              className="answer-input"
              type="text"
              value={answer}
              onChange={e => { if (!revealed) setAnswer(e.target.value) }}
              disabled={revealed}
              placeholder={question.mixed ? 'e.g. 2 3/4' : 'e.g. 3/4'}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        )}

        {renderFeedback(feedback, isCorrect)}

        <div className="button-row">
          {!revealed ? (
            <>
              <button onClick={handleSubmit} disabled={loading || !answer.trim()}>Submit</button>
              <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
            </>
          ) : (
            <button onClick={advance}>{questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question'}</button>
          )}
        </div>

        {results.length > 0 && <ResultsTable results={results} />}
      </>}

      {/* ── Finished Phase ── */}
      {finished && (
        <div className="welcome-box">
          <p className="welcome-text">Quiz complete!</p>
          <p className="final-score">Final score: {score}/{totalQ}</p>
          {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
          <ResultsTable results={results} />
          <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
        </div>
      )}
    </QuizLayout>
  )
}

/* ── Twin Hunt App ────────────────────────────────────── */
/**
 * TwinHuntApp Component
 * Spot-the-difference puzzle: Find the common emoji in both panels
 * Features:
 *   - Two side-by-side panels with randomly scattered emoji symbols
 *   - One symbol appears in both panels (the "match" to find)
 *   - User clicks the matching symbol in either panel to score
 *   - Configurable number of symbols per panel and rounds
 *   - Visual dimming and highlighting on reveal
 */

// Pool of 40 emoji symbols for twin hunt rounds
// Used to randomly select unique symbols for each round
const TWIN_SYMBOLS = [
  '🍎','🍊','🍋','🍇','🍉','🍓','🍒','🥝','🍌','🍑',
  '🌟','🌙','☀️','⚡','🔥','💧','🌈','❄️','🍀','🌸',
  '🐶','🐱','🐸','🐵','🐔','🐙','🦋','🐝','🐢','🐬',
  '⚽','🏀','🎾','🎯','🎲','🎸','🎨','📚','✏️','🔔',
]

function TwinHuntApp({ onBack }) {
  // Number of symbols per panel (default 5, configurable 3-15)
  const [count, setCount] = useState('5')
  // Game started flag
  const [started, setStarted] = useState(false)
  // Game finished flag
  const [finished, setFinished] = useState(false)
  // Current round number (1-indexed)
  const [round, setRound] = useState(0)
  // Total rounds to complete
  const [totalRounds, setTotalRounds] = useState(10)
  // User input for number of rounds (string to allow editing)
  const [numRoundsInput, setNumRoundsInput] = useState('10')
  // Number of correct matches found so far
  const [score, setScore] = useState(0)
  // Array of symbols on left panel (includes common symbol + unique ones)
  const [leftItems, setLeftItems] = useState([])
  // Array of symbols on right panel (includes common symbol + unique ones)
  const [rightItems, setRightItems] = useState([])
  // The symbol that appears in both panels (the "match" to find)
  const [commonSymbol, setCommonSymbol] = useState('')
  // Feedback message after user picks a symbol
  const [feedback, setFeedback] = useState('')
  // Is the user's pick correct? (null before pick, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // Round revealed/answered flag (disables further picks)
  const [revealed, setRevealed] = useState(false)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking time per round
  const timer = useTimer()

  /**
   * scatterPositions(n): Generate random scattered positions for n symbols in circular area
   * Algorithm:
   *   1. Place first symbol near center (50%, 50%) with small jitter
   *   2. Distribute remaining (n-1) symbols in a ring around center
   *      - Use equal angular spacing plus random jitter
   *      - Radius: 28-38% of container width from center
   *   3. Clamp all positions to 10-90% to keep in bounds
   *   4. Shuffle array so visual order doesn't reveal which is centered
   * Returns: Array of {x, y} percentages (0-100)
   */
  const scatterPositions = (n) => {
    const positions = []
    // Place first item near center with small random jitter (±6%)
    positions.push({
      x: 50 + (Math.random() - 0.5) * 12,
      y: 50 + (Math.random() - 0.5) * 12,
    })
    // Distribute remaining items in ring pattern
    const remaining = n - 1
    const baseAngleOffset = Math.random() * Math.PI * 2  // Random starting angle
    for (let i = 0; i < remaining; i++) {
      // Equal angular spacing plus small random jitter
      const angle = baseAngleOffset + (i / remaining) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      // Radius: 28-38% from center (adds visual spacing)
      const radius = 28 + Math.random() * 10
      const x = 50 + Math.cos(angle) * radius
      const y = 50 + Math.sin(angle) * radius
      // Clamp to bounds (10-90% to keep items visible in container)
      positions.push({ x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) })
    }
    // Fisher-Yates shuffle to obscure that first item is at center
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]]
    }
    return positions
  }

  // Cached position arrays for left and right panels
  const [leftPositions, setLeftPositions] = useState([])
  const [rightPositions, setRightPositions] = useState([])

  /**
   * generateRound(n): Generate a new round with n symbols per panel
   * Algorithm:
   *   1. Shuffle TWIN_SYMBOLS pool and select 2n-1 unique symbols
   *   2. First symbol is the "common" match (appears in both panels)
   *   3. Next n-1 symbols are unique to left panel
   *   4. Next n-1 symbols are unique to right panel
   *   5. Shuffle each panel's list independently for visual variety
   *   6. Generate random scattered positions for each panel
   * Resets feedback/reveal and starts timer for the round
   */
  const generateRound = (n) => {
    // Shuffle symbol pool and select 2n-1 unique symbols
    const pool = [...TWIN_SYMBOLS].sort(() => Math.random() - 0.5)
    const common = pool[0]  // Symbol that will appear in both panels
    const leftOthers = pool.slice(1, n)  // n-1 unique to left
    const rightOthers = pool.slice(n, 2 * n - 1)  // n-1 unique to right

    // Fisher-Yates shuffle for unbiased randomization
    const shuffle = (arr) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    // Create shuffled panels (each includes common symbol + unique ones)
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

  /**
   * startGame(): Initialize twin hunt game
   * Process:
   *   1. Validate and clamp symbols per panel (3-15 range)
   *   2. Validate and parse number of rounds (minimum 1)
   *   3. Reset game state
   *   4. Generate first round
   */
  const startGame = () => {
    // Clamp symbols per panel to 3-15 range
    const n = Math.max(3, Math.min(Number(count) || 5, 15))
    setCount(String(n))
    // Parse rounds count (default 10 if invalid)
    const rounds = numRoundsInput !== '' && Number(numRoundsInput) > 0 ? Number(numRoundsInput) : 10
    setTotalRounds(rounds)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setRound(1)
    setResults([])
    generateRound(n)
  }

  /**
   * handlePick(symbol): Process user's symbol pick
   * When user clicks a symbol:
   *   1. Check if it matches the common symbol
   *   2. Stop timer and store time
   *   3. Show feedback and store result
   *   4. Reveal answer (disable further picks this round)
   * Note: Each panel can have the match clicked, either is correct
   */
  const handlePick = (symbol) => {
    if (revealed) return  // Ignore picks after round already answered
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

  /**
   * Auto-advance to next round after correct answer (uses useAutoAdvance hook)
   * Progression logic:
   *   - If current round >= total rounds: finish game
   *   - Otherwise: increment round and generate next round with same symbol count
   * Ref is used to capture latest state for the hook
   */
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
        {renderFeedback(feedback, isCorrect)}
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
/**
 * SqrtApp Component
 * Square root estimation drill: "What is floor(√n) or ceil(√n)?"
 * Features:
 *   - Questions progress in steps (step parameter tracks progression)
 *   - Accepts both floor and ceiling values as correct
 *   - Unlimited mode: totalQ=0 means infinite questions
 *   - Shows both floor and ceiling values in feedback
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function SqrtApp({ onBack }) {
  // Difficulty level: 'easy' (1-5), 'medium' (6-10), 'hard' (11-20), 'extrahard' (21-50)
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // User-entered question limit (empty string = unlimited)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag
  const [started, setStarted] = useState(false)
  // Quiz finished flag
  const [finished, setFinished] = useState(false)
  // Current question object: {q: radicand, prompt: "√n"}
  const [question, setQuestion] = useState(null)
  // User's string input for the answer
  const [answer, setAnswer] = useState('')
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Feedback string with floor/ceiling values
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress?
  const [loading, setLoading] = useState(false)
  // Answer revealed flag
  const [revealed, setRevealed] = useState(false)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * fetchQuestion(step): Fetch next square root question
   * Endpoint: /sqrt-api/question?difficulty={easy|medium|hard|extrahard}
   * Returns: {q: radicand, prompt: "√n"}
   * Backend calculates sqrtRounded, floorAnswer, ceilAnswer for validation
   */
  const fetchQuestion = async (step) => {
    setLoading(true)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    setIsCorrect(null)
    // Fetch question for this difficulty
    const res = await fetch(`${API}/sqrt-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize square root quiz
   * Fetches first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    setAdaptScore(0)
    adaptScoreRef.current = 0
    await fetchQuestion(1)
  }

  /**
   * Keyboard handler for SqrtApp: Enter key to submit/next
   * Only active when quiz is running (started && !finished)
   */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !started || finished) return
      event.preventDefault()
      handleSubmitOrNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, finished, question, answer, revealed, questionNumber, loading, totalQ])

  /**
   * handleSubmitOrNext(): Submission and progression for SqrtApp
   * Phase 1 (not revealed):
   *   - POST to /sqrt-api/check with {q, answer}
   *   - Receive { correct, sqrtRounded, floorAnswer, ceilAnswer }
   *   - Show floor and ceiling values in feedback
   *   - Accept answers that are floor or ceiling (or both)
   * Phase 2 (revealed):
   *   - If limited and all questions answered, finish
   *   - If unlimited or questions remain, fetch next question
   */
  const handleSubmitOrNext = async () => {
    if (!question) return
    if (!revealed) {
      if (answer === '') return
      const timeTaken = timer.stop()
      // POST to backend to validate square root answer
      const res = await fetch(`${API}/sqrt-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: question.q, answer: Number(answer) }),
      })
      const data = await res.json()
      setIsCorrect(data.correct)
      if (data.correct) setScore((s) => s + 1)
      // Show floor and ceiling values for reference
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
      if (isAdaptive) {
        setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
      setRevealed(true)
      return
    }

    // Quiz progression: check if all questions answered
    if (questionNumber >= totalQ) {
      setFinished(true)
      setQuestion(null)
      timer.reset()
      return
    }

    // Load next question
    const next = questionNumber + 1
    setQuestionNumber(next)
    await fetchQuestion(next)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: √${question.q} = (approximately)`)
  }

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitOrNext() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  const diffLabels = { easy: 'Easy — up to 100', medium: 'Medium — up to 1000', hard: 'Hard — up to 10000', extrahard: 'Extra Hard — up to 100000' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Square Root" subtitle="Floor or ceiling is accepted" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice square roots!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="sqrt-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="sqrt-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} placeholder={String(DEFAULT_TOTAL)} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        <div className="question-box">{loading || !question ? 'Loading question…' : `${question.prompt} = ?`}</div>
        <input className="answer-input" type="text" value={answer} onChange={(e) => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" />
        <NumPad value={answer} onChange={(v) => !revealed && setAnswer(v)} disabled={revealed} />
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed && <button onClick={handleSolve} disabled={loading || answer === ''} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>}
          <button onClick={handleSubmitOrNext} disabled={loading || (!revealed && answer === '')}>{revealed ? (questionNumber >= totalQ ? 'Finish Quiz' : 'Next Question') : 'Submit'}</button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete.</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Polynomial Multiplication App ──────────────────── */
/**
 * PolyMulApp Component
 * Polynomial multiplication practice: Multiply two polynomials and enter result coefficients
 * Features:
 *   - User enters coefficients for each degree of the result polynomial
 *   - Difficulty levels: easy, medium, hard (control polynomial degrees/coefficients)
 *   - Displays polynomials in readable format with superscripts
 *   - Validates all coefficients before submission
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function PolyMulApp({ onBack }) {
  // Difficulty level: 'easy' | 'medium' | 'hard' | 'extrahard'
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag
  const [started, setStarted] = useState(false)
  // Quiz finished flag
  const [finished, setFinished] = useState(false)
  // Current question: {p1, p2, p1Display, p2Display, productDisplay, resultDegree}
  const [question, setQuestion] = useState(null)
  // Array of user-entered coefficients (strings, parallel to resultDegree length)
  const [userCoeffs, setUserCoeffs] = useState([])
  // Feedback string
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct?
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress?
  const [loading, setLoading] = useState(false)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Answer revealed flag
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * loadQuestion(): Fetch next polynomial multiplication question
   * Endpoint: /polymul-api/question?difficulty={easy|medium|hard|extrahard}
   * Returns: {p1, p2, p1Display, p2Display, productDisplay, resultDegree, correctCoeffs}
   * Initializes userCoeffs array with empty strings (one per degree)
   */
  const loadQuestion = async () => {
    setLoading(true)
    setFeedback('')
    setIsCorrect(null)
    setRevealed(false)
    const res = await fetch(`${API}/polymul-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    // Initialize empty coefficient array for this polynomial's degree
    setUserCoeffs(new Array(data.resultDegree + 1).fill(''))
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize polynomial multiplication quiz
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    setStarted(true)
    setFinished(false)
    setAdaptScore(0)
    adaptScoreRef.current = 0
    setScore(0)
    setQuestionNumber(1)
    setResults([])
    await loadQuestion()
  }

  /**
   * handleSubmit(): Validate and submit all coefficients
   * Checks that all coefficient fields are filled before submission
   * POSTs to /polymul-api/check with {p1, p2, userCoeffs}
   */
  const handleSubmit = async () => {
    if (!question || revealed) return
    // Require all coefficient fields to be filled
    if (userCoeffs.some(c => c === '')) return
    const timeTaken = timer.stop()
    // POST to backend to validate polynomial multiplication result
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
    if (isAdaptive) {
      setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    timer.stop()
    try {
      const r = await fetch(`${API}/polymul-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p1: question.p1, p2: question.p2, userCoeffs: [], solve: true }),
      })
      const data = await r.json()
      setIsCorrect(false); setRevealed(true)
      const display = data.correctDisplay || question.productDisplay || ''
      const explanation = data.explanation || ''
      setFeedback(`Solution: ${display}${explanation ? '\n' + explanation : ''}`)
      setResults(prev => [...prev, { question: `(${question.p1Display})(${question.p2Display})`, userAnswer: '(solved)', correctAnswer: data.correctCoeffs?.join(', ') || display, correct: false, time: 0 }])
      if (isAdaptive) {
        setAdaptScore(prev => Math.max(0, prev - 0.35))
      }
    } catch (e) { console.error('Failed to solve polymul:', e) }
  }

  /**
   * Auto-advance to next question after correct answer (uses useAutoAdvance hook)
   */
  const advance = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  advanceFnRef.current = advance
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  /**
   * sup(n): Convert digit to superscript character
   * Maps: 0→⁰, 1→¹, ..., 9→⁹
   */
  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')

  /**
   * formatCoeffLabel(i): Format label for coefficient at degree i
   * Returns: "constant" for i=0, "x" for i=1, "x²" for i=2, etc.
   */
  const formatCoeffLabel = (i) => i === 0 ? 'constant' : i === 1 ? 'x' : `x${sup(i)}`

  const diffLabels = { easy: 'Easy — Small terms', medium: 'Medium — Moderate', hard: 'Hard — Large terms', extrahard: 'Extra Hard — Higher degree' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Poly Multiply" subtitle="Multiply two polynomials and enter the coefficients" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Practice polynomial multiplication!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="polymul-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="polymul-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed ? <>
            <button onClick={handleSubmit} disabled={loading || userCoeffs.some(c => c === '')}>Submit</button>
            <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>
          </> : <button onClick={advance}>{questionNumber >= totalQ ? 'Finish' : 'Next'}</button>}
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Polynomial Factorization App ──────────────────── */
/**
 * PolyFactorApp Component
 * Polynomial factorization practice: Factor a polynomial into two linear factors
 * Features:
 *   - Questions of form: ax² + bx + c = (px + q)(rx + s)
 *   - User enters p, q, r, s coefficients for the two factors
 *   - Difficulty levels: easy, medium, hard (control polynomial complexity)
 *   - Validates that product of factors equals original polynomial
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function PolyFactorApp({ onBack }) {
  // ─────── Quiz State Management ──────────────────────────────────
  // Difficulty level: 'easy' | 'medium' | 'hard' | 'extrahard'
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag (controls welcome screen vs quiz content)
  const [started, setStarted] = useState(false)
  // Quiz finished flag (controls results screen)
  const [finished, setFinished] = useState(false)
  // Current question: {originalPoly, display, a, b, c, factors: {p, q, r, s}}
  const [question, setQuestion] = useState(null)
  // Coefficient p for first factor (px + q)
  const [userP, setUserP] = useState('')
  // Coefficient q for first factor
  const [userQ, setUserQ] = useState('')
  // Coefficient r for second factor (rx + s)
  const [userR, setUserR] = useState('')
  // Coefficient s for second factor
  const [userS, setUserS] = useState('')
  // Feedback message shown after submission
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress flag
  const [loading, setLoading] = useState(false)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Answer revealed flag (prevents further input after submission)
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to answer
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking elapsed time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * loadQuestion(): Fetch next polynomial factorization question
   * Endpoint: /polyfactor-api/question?difficulty={easy|medium|hard|extrahard}
   * Returns: {a, b, c, display, factors: {p, q, r, s}, ...}
   * Resets all factor fields to empty and initializes timer
   */
  const loadQuestion = async () => {
    setLoading(true)
    // Reset all four factor coefficient fields and feedback
    setUserP(''); setUserQ(''); setUserR(''); setUserS('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    // Fetch polynomial question from backend based on effective difficulty
    const res = await fetch(`${API}/polyfactor-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    // Start timer for this question
    timer.start()
  }

  /**
   * startQuiz(): Initialize polynomial factorization quiz
   * Parse numQuestions input, reset score/results, load first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    // Reset quiz state: mark as started, not finished, score to 0, question 1
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    setAdaptScore(0); adaptScoreRef.current = 0
    await loadQuestion()
  }

  /**
   * handleSubmit(): Validate and submit factor coefficients for polynomial factorization
   * Requirements:
   *   - All four coefficients (p, q, r, s) must be filled
   *   - Question must be loaded
   *   - Answer must not already be revealed
   * Validation: Checks that (userP*x + userQ)(userR*x + userS) = a*x² + b*x + c
   * API: POSTs to /polyfactor-api/check with coefficient values
   * Response: {correct: boolean}
   */
  const handleSubmit = async () => {
    if (!question || revealed) return
    // Validate: all four factor coefficients must be entered
    if (!userP || !userQ || !userR || !userS) return
    const timeTaken = timer.stop()
    // POST to backend to validate factorization
    const res = await fetch(`${API}/polyfactor-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userP: Number(userP), userQ: Number(userQ), userR: Number(userR), userS: Number(userS) }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    // Increment score if correct
    if (data.correct) setScore(s => s + 1)
    // Format feedback message using correct factors (p, q, r, s from question.factors)
    const { p, q, r, s } = question.factors
    setFeedback(data.correct ? `Correct! (${p}x ${q >= 0 ? '+' : '−'} ${Math.abs(q)})(${r}x ${s >= 0 ? '+' : '−'} ${Math.abs(s)})` : `Incorrect. One factorization: (${p}x ${q >= 0 ? '+' : '−'} ${Math.abs(q)})(${r}x ${s >= 0 ? '+' : '−'} ${Math.abs(s)})`)
    // Add result to history for results table
    setResults(prev => [...prev, {
      question: question.display,
      userAnswer: `(${userP}x${Number(userQ)>=0?'+':''}${userQ})(${userR}x${Number(userS)>=0?'+':''}${userS})`,
      correctAnswer: `(${p}x${q>=0?'+':''}${q})(${r}x${s>=0?'+':''}${s})`,
      correct: data.correct,
      time: timeTaken,
    }])
    if (isAdaptive) {
      setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    const { p, q, r, s } = question.factors
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: (${p}x ${q >= 0 ? '+' : '−'} ${Math.abs(q)})(${r}x ${s >= 0 ? '+' : '−'} ${Math.abs(s)})`)
  }

  /**
   * advance: Function for useAutoAdvance hook
   * Advances to next question or finishes quiz if all questions completed
   */
  const advance = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  advanceFnRef.current = advance
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)

  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advance() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  /**
   * valInput(setter): Create input change handler for factor coefficient fields
   * Validates input: empty string, minus sign, or integer format only (-?\d+)
   * Returns onChange handler that updates the given state setter
   * Usage: onChange={valInput(setUserP)}
   */
  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) setter(v) }

  const diffLabels = { easy: 'Easy — Simple factors', medium: 'Medium — Mixed signs', hard: 'Hard — Leading coefficient', extrahard: 'Extra Hard — Large coefficients' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Poly Factor" subtitle="Factor the quadratic into (px + q)(rx + s)" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Factor ax² + bx + c into (px + q)(rx + s).</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="polyfactor-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="polyfactor-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed && <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>}
          <button onClick={revealed ? () => advanceRef.current() : handleSubmit} disabled={loading || (!revealed && (!userP || !userQ || !userR || !userS))}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Prime Factorization App ───────────────────────── */
/**
 * PrimeFactorApp Component
 * Prime factorization drill: "Find all prime factors of n"
 * Features:
 *   - User enters prime factors one at a time (must be valid divisors)
 *   - Tracks remaining value after each factor is entered
 *   - Auto-checks answer when remaining value reaches 1 (all factors found)
 *   - Displays factors in sorted order, allows "Give Up" option
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function PrimeFactorApp({ onBack }) {
  // ─────── Quiz State Management ──────────────────────────────────
  // Difficulty level: 'easy' | 'medium' | 'hard' (affects size of numbers)
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag (controls welcome screen vs quiz content)
  const [started, setStarted] = useState(false)
  // Quiz finished flag (controls results screen)
  const [finished, setFinished] = useState(false)
  // Current question: {number: n, factors: [p1, p2, ...]}
  const [question, setQuestion] = useState(null)
  // Array of factors user has entered so far (e.g., [2, 3, 5])
  const [enteredFactors, setEnteredFactors] = useState([])
  // Current input field value (before "Add Factor" button is clicked)
  const [currentInput, setCurrentInput] = useState('')
  // Remaining number after dividing out all entered factors (n / product of entered)
  const [remaining, setRemaining] = useState(0)
  // Feedback message shown after all factors are found or user gives up
  const [feedback, setFeedback] = useState('')
  // Is the factorization correct/complete? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Factorization revealed/completed flag (prevents further input)
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to answer
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking elapsed time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * loadQuestion(): Fetch next prime factorization question
   * Endpoint: /primefactor-api/question?difficulty={easy|medium|hard}
   * Returns: {number: n, factors: [p1, p2, ...] (sorted)}
   * Initializes with number and sets remaining = number
   * Resets input fields and timer before starting
   */
  const loadQuestion = async () => {
    // Reset feedback and UI state
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    // Reset factor input fields
    setEnteredFactors([]); setCurrentInput(''); setInputError('')
    // Fetch prime factorization question from backend based on effective difficulty
    const res = await fetch(`${API}/primefactor-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    // Start with full number; it gets divided as factors are found
    setRemaining(data.number)
    timer.start()
  }

  /**
   * startQuiz(): Initialize prime factorization quiz
   * Parse numQuestions input, reset score/results, load first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    // Reset quiz state: mark as started, not finished, score to 0, question 1
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    setAdaptScore(0); adaptScoreRef.current = 0
    await loadQuestion()
  }

  /**
   * addFactor(): Add user-entered factor to list if valid
   * Validation:
   *   - Factor must be >= 2
   *   - Must evenly divide remaining number (no remainder)
   * Action:
   *   - Add to enteredFactors array
   *   - Update remaining = remaining / factor
   *   - Clear input field
   *   - If remaining becomes 1: all factors found, auto-check answer
   * Auto-check logic:
   *   - Compare sorted user factors against question.factors
   *   - Increment score if correct
   *   - Store result and mark revealed
   */
  // Shake + brief error message for invalid factor attempts
  const [inputError, setInputError] = useState('')
  const inputRef = useRef(null)

  const addFactor = () => {
    const f = Number(currentInput)
    // Validate: factor >= 2 and divides remaining evenly
    if (!f || f < 2) {
      setInputError('Enter a number ≥ 2')
      inputRef.current?.focus()
      return
    }
    if (remaining % f !== 0) {
      setInputError(`${f} does not divide ${remaining}`)
      inputRef.current?.focus()
      return
    }
    setInputError('')
    const newFactors = [...enteredFactors, f]
    const newRemaining = remaining / f
    setEnteredFactors(newFactors)
    setRemaining(newRemaining)
    setCurrentInput('')
    // Auto-check when factorization is complete (remaining = 1)
    if (newRemaining === 1) {
      const timeTaken = timer.stop()
      // Sort user's factors and compare to correct factors
      const sorted = [...newFactors].sort((a, b) => a - b)
      const correct = question.factors.length === sorted.length && question.factors.every((v, i) => v === sorted[i])
      setIsCorrect(correct)
      if (correct) setScore(s => s + 1)
      setFeedback(correct ? `Correct! ${question.number} = ${question.factors.join(' × ')}` : `Incorrect. ${question.number} = ${question.factors.join(' × ')}`)
      // Add result to history for results table
      setResults(prev => [...prev, {
        question: String(question.number),
        userAnswer: newFactors.join(' × '),
        correctAnswer: question.factors.join(' × '),
        correct,
        time: timeTaken,
      }])
      if (isAdaptive) {
        setAdaptScore(prev => { const next = correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
      }
      setRevealed(true)
    }
  }

  /**
   * handleGiveUp(): Mark answer as incomplete and reveal correct factorization
   * Records incomplete attempt in results as incorrect
   * Allows user to move to next question without finishing factorization
   */
  const handleGiveUp = () => {
    const timeTaken = timer.stop()
    setIsCorrect(false)
    setFeedback(`${question.number} = ${question.factors.join(' × ')}`)
    // Record partial attempt (shows ellipsis if some factors entered)
    setResults(prev => [...prev, {
      question: String(question.number),
      userAnswer: enteredFactors.length ? enteredFactors.join(' × ') + ' ...' : '—',
      correctAnswer: question.factors.join(' × '),
      correct: false,
      time: timeTaken,
    }])
    if (isAdaptive) {
      setAdaptScore(prev => { const next = Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  /**
   * advanceFnRef: Mutable ref to advance function for useAutoAdvance hook
   * Advances to next question or finishes quiz if all questions completed
   * Loaded asynchronously before auto-advance triggers
   */
  advanceFnRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  // Allow Enter key to advance when answer is wrong and revealed
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advanceFnRef.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  /**
   * buildChain(): Construct display string showing factorization progress
   * Format: "120 = 2 × 3 × 5 × 2" (shows what user has found so far)
   * If no factors entered: just shows the number "120"
   * If factorization incomplete: shows remaining unfactored portion "120 = 2 × 60"
   */
  const buildChain = () => {
    if (enteredFactors.length === 0) return String(question?.number || '')
    // Build expression: number = factor1 × factor2 × ... × remaining
    const parts = [String(question.number), '=', ...enteredFactors.flatMap((f, i) => i === 0 ? [String(f)] : ['×', String(f)])]
    // Append remaining unfactored portion if > 1
    if (remaining > 1) parts.push('×', String(remaining))
    return parts.join(' ')
  }

  const diffLabels = { easy: 'Easy — Small numbers', medium: 'Medium — 2-3 digit', hard: 'Hard — Larger composites', extrahard: 'Extra Hard — Big composites' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Prime Factors" subtitle="Break the number into its prime factors" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Enter prime factors one at a time. Watch the remaining number shrink!</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="primefactor-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="primefactor-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
        {question && <>
          <div className="question-box prime-chain">{buildChain()}</div>
          {!revealed && remaining > 1 && <div className="prime-input-row">
            <input ref={inputRef} className={`answer-input${inputError ? ' input-error' : ''}`} type="text" value={currentInput} placeholder="Enter a prime factor"
              onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) { setCurrentInput(v); setInputError('') } }}
              onKeyDown={e => { if (e.key === 'Enter') addFactor() }} autoFocus />
            <button onClick={addFactor} disabled={!currentInput}>Add</button>
            <button className="give-up-btn" onClick={handleGiveUp}>Give Up</button>
          </div>}
          {inputError && !revealed && <div className="feedback wrong" style={{ fontSize: '0.9rem', padding: '6px 14px', marginTop: 4 }}>{inputError}</div>}
          <NumPad value={currentInput} onChange={setCurrentInput} onSubmit={addFactor} disabled={revealed || remaining <= 1} />
        </>}
        {renderFeedback(feedback, isCorrect)}
        {revealed && <div className="button-row">
          <button onClick={() => advanceFnRef.current()}>{questionNumber >= totalQ ? 'Finish' : 'Next'}</button>
        </div>}
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Quadratic Formula App ─────────────────────────── */
/**
 * QFormulaApp Component
 * Quadratic formula practice: Find roots of ax² + bx + c = 0
 * Features:
 *   - Easy: real distinct integer roots
 *   - Medium: real roots (may be decimal)
 *   - Hard: may include complex roots (a ± bi)
 *   - Root type determines how many values user needs to enter
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function QFormulaApp({ onBack }) {
  // ─────── Quiz State Management ──────────────────────────────────
  // Difficulty level: 'easy' | 'medium' | 'hard'
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag (controls welcome screen vs quiz content)
  const [started, setStarted] = useState(false)
  // Quiz finished flag (controls results screen)
  const [finished, setFinished] = useState(false)
  // Current question: {a, b, c, roots: {type: 'real_distinct'|'real_equal'|'complex', r1, r2, ...}}
  const [question, setQuestion] = useState(null)
  // User's first root value (or real part for complex)
  const [userR1, setUserR1] = useState('')
  // User's second root value (or imaginary part for complex, required for distinct roots)
  const [userR2, setUserR2] = useState('')
  // Feedback message shown after submission
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress flag
  const [loading, setLoading] = useState(false)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Answer revealed flag (prevents further input after submission)
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to answer
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking elapsed time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * loadQuestion(): Fetch next quadratic formula question
   * Endpoint: /qformula-api/question?difficulty={easy|medium|hard}
   * Returns: {a, b, c, roots: {type, r1, r2, realPart, imagPart}}
   * Type determines required fields:
   *   - real_distinct: r1, r2 (two different real roots)
   *   - real_equal: r1 (one repeated root)
   *   - complex: realPart, imagPart (roots are a ± bi)
   */
  const loadQuestion = async () => {
    setLoading(true)
    // Reset root input fields
    setUserR1(''); setUserR2('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    // Fetch quadratic formula question from backend based on effective difficulty
    const res = await fetch(`${API}/qformula-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize quadratic formula quiz
   * Parse numQuestions input, reset score/results, load first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    // Reset quiz state: mark as started, not finished, score to 0, question 1
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    setAdaptScore(0); adaptScoreRef.current = 0
    await loadQuestion()
  }

  /**
   * handleSubmit(): Validate and submit root values for quadratic formula
   * Validation depends on root type:
   *   - real_equal: only r1 required
   *   - real_distinct: both r1 and r2 required
   *   - complex: both r1 (real) and r2 (imaginary) required
   * API: POSTs to /qformula-api/check with coefficient values and root type
   * Response: {correct: boolean, roots: {type, r1, r2, realPart, imagPart, ...}}
   */
  const handleSubmit = async () => {
    if (!question || revealed || !userR1) return
    // For real_distinct and complex, need both root values
    if (question.roots.type === 'real_distinct' && !userR2) return
    if (question.roots.type === 'complex' && !userR2) return
    const timeTaken = timer.stop()
    // POST to backend to validate roots
    const res = await fetch(`${API}/qformula-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userR1: Number(userR1), userR2: Number(userR2), userType: question.roots.type }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    // Format correct answer display based on root type
    let correctStr = ''
    if (data.roots.type === 'real_distinct') correctStr = `Roots: ${data.roots.r1} and ${data.roots.r2}`
    else if (data.roots.type === 'real_equal') correctStr = `Root: ${data.roots.r1} (repeated)`
    else correctStr = `Roots: ${data.roots.realPart} ± ${data.roots.imagPart}i`
    setFeedback(data.correct ? `Correct! ${correctStr}` : `Incorrect. ${correctStr}`)
    // Add result to history for results table
    setResults(prev => [...prev, {
      question: `${question.a}x² ${question.b>=0?'+':'−'} ${Math.abs(question.b)}x ${question.c>=0?'+':'−'} ${Math.abs(question.c)} = 0`,
      userAnswer: question.roots.type === 'real_equal' ? userR1 : `${userR1}, ${userR2}`,
      correctAnswer: correctStr,
      correct: data.correct,
      time: timeTaken,
    }])
    if (isAdaptive) {
      setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    // Format correct answer display based on root type
    let correctStr = ''
    if (question.roots.type === 'real_distinct') correctStr = `Roots: ${question.roots.r1} and ${question.roots.r2}`
    else if (question.roots.type === 'real_equal') correctStr = `Root: ${question.roots.r1} (repeated)`
    else correctStr = `Roots: ${question.roots.realPart} ± ${question.roots.imagPart}i`
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: ${correctStr}`)
  }

  /**
   * advanceFnRef: Mutable ref to advance function for useAutoAdvance hook
   * Advances to next question or finishes quiz if all questions completed
   * Loaded asynchronously before auto-advance triggers
   */
  advanceFnRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advanceFnRef.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  /**
   * valInput(setter): Create input change handler for root value fields
   * Validates input: empty string, minus sign, decimal point, or decimal number format (-?\d*\.?\d*)
   * Returns onChange handler that updates the given state setter
   * Usage: onChange={valInput(setUserR1)}
   */
  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setter(v) }

  const diffLabels = { easy: 'Easy — Integer roots', medium: 'Medium — Rational roots', hard: 'Hard — Complex roots', extrahard: 'Extra Hard — Large coefficients' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Quadratic Formula" subtitle="Find the roots of ax² + bx + c = 0" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Use the quadratic formula to find roots of ax² + bx + c = 0</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="qformula-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="qformula-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed && <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>}
          <button onClick={revealed ? () => advanceFnRef.current() : handleSubmit} disabled={loading || (!revealed && !userR1)}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Simultaneous Equations App (2×2 easy, 3×3 hard) ── */
/**
 * SimulApp Component
 * Simultaneous equations practice: Solve 2×2 or 3×3 systems
 * Features:
 *   - Easy: 2×2 systems (solve for x and y)
 *   - Hard: 3×3 systems (solve for x, y, and z)
 *   - Validates solution against provided system of equations
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function SimulApp({ onBack }) {
  // ─────── Quiz State Management ──────────────────────────────────
  // Difficulty level: 'easy' (2×2) | 'hard' (3×3)
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag (controls welcome screen vs quiz content)
  const [started, setStarted] = useState(false)
  // Quiz finished flag (controls results screen)
  const [finished, setFinished] = useState(false)
  // Current question: {size: 2|3, eqs: [{a, b, c, d}, ...], solution: {x, y, z}}
  const [question, setQuestion] = useState(null)
  // User's solution for x variable
  const [userX, setUserX] = useState('')
  // User's solution for y variable
  const [userY, setUserY] = useState('')
  // User's solution for z variable (only for 3×3 systems)
  const [userZ, setUserZ] = useState('')
  // Feedback message shown after submission
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress flag
  const [loading, setLoading] = useState(false)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Answer revealed flag (prevents further input after submission)
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to answer
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking elapsed time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  // ─────── Derived State ──────────────────────────────────
  // Whether current question is 3×3 (determines if z field is required)
  const is3x3 = question && question.size === 3

  /**
   * loadQuestion(): Fetch next simultaneous equations question
   * Endpoint: /simul-api/question?difficulty={easy|hard}
   * Returns: {size: 2|3, eqs: [{a, b, c, d}, ...], solution: {x, y, z}}
   * Equations format:
   *   - 2×2: ax + by = d (two equations, two unknowns)
   *   - 3×3: ax + by + cz = d (three equations, three unknowns)
   */
  const loadQuestion = async () => {
    setLoading(true)
    // Reset solution input fields
    setUserX(''); setUserY(''); setUserZ('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    // Fetch simultaneous equations question from backend based on effective difficulty
    const res = await fetch(`${API}/simul-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize simultaneous equations quiz
   * Parse numQuestions input, reset score/results, load first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    // Reset quiz state: mark as started, not finished, score to 0, question 1
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    setAdaptScore(0); adaptScoreRef.current = 0
    await loadQuestion()
  }

  /**
   * handleSubmit(): Validate and submit solution values for simultaneous equations
   * Validation:
   *   - For 2×2: x and y required
   *   - For 3×3: x, y, and z required
   * API: POSTs to /simul-api/check with equations, size, and solution values
   * Response: {correct: boolean}
   */
  const handleSubmit = async () => {
    if (!question || revealed || !userX || !userY) return
    // For 3×3 systems, z is also required
    if (is3x3 && !userZ) return
    const timeTaken = timer.stop()
    // Build request body with solution values
    const body = { eqs: question.eqs, size: question.size, solution: question.solution, userX: Number(userX), userY: Number(userY) }
    if (is3x3) body.userZ = Number(userZ)
    // POST to backend to validate solution
    const res = await fetch(`${API}/simul-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    // Format feedback message and result based on system size
    const s = question.solution
    if (is3x3) {
      setFeedback(data.correct ? `Correct! (x, y, z) = (${s.x}, ${s.y}, ${s.z})` : `Incorrect. (x, y, z) = (${s.x}, ${s.y}, ${s.z})`)
      setResults(prev => [...prev, { question: '3×3 system', userAnswer: `(${userX}, ${userY}, ${userZ})`, correctAnswer: `(${s.x}, ${s.y}, ${s.z})`, correct: data.correct, time: timeTaken }])
    } else {
      setFeedback(data.correct ? `Correct! (x, y) = (${s.x}, ${s.y})` : `Incorrect. (x, y) = (${s.x}, ${s.y})`)
      setResults(prev => [...prev, { question: '2×2 system', userAnswer: `(${userX}, ${userY})`, correctAnswer: `(${s.x}, ${s.y})`, correct: data.correct, time: timeTaken }])
    }
    if (isAdaptive) {
      setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    const s = question.solution
    const display = is3x3 ? `(x, y, z) = (${s.x}, ${s.y}, ${s.z})` : `(x, y) = (${s.x}, ${s.y})`
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: ${display}`)
  }

  /**
   * advanceFnRef: Mutable ref to advance function for useAutoAdvance hook
   * Advances to next question or finishes quiz if all questions completed
   * Loaded asynchronously before auto-advance triggers
   */
  advanceFnRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advanceFnRef.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  /**
   * valInput(setter): Create input change handler for solution value fields
   * Validates input: empty string, minus sign, decimal point, or decimal number format (-?\d*\.?\d*)
   * Returns onChange handler that updates the given state setter
   * Usage: onChange={valInput(setUserX)}
   */
  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setter(v) }
  /**
   * fmtEq2(eq): Format 2×2 equation for display
   * Input: {a, b, d} (coefficients from ax + by = d)
   * Output: "2x + 3y = 5" or "2x − 3y = 5" (uses minus sign character)
   */
  const fmtEq2 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y = ${eq.d}`
  /**
   * fmtEq3(eq): Format 3×3 equation for display
   * Input: {a, b, c, d} (coefficients from ax + by + cz = d)
   * Output: "2x + 3y − 4z = 5" (uses minus sign character for negatives)
   */
  const fmtEq3 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y ${eq.c >= 0 ? '+' : '−'} ${Math.abs(eq.c)}z = ${eq.d}`

  const diffLabels = { easy: 'Easy — 2×2 small', medium: 'Medium — 2×2 larger', hard: 'Hard — 3×3', extrahard: 'Extra Hard — 3×3 large' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Simultaneous Eq." subtitle={`Solve ${isAdaptive ? 'adaptive' : (effectiveDiff() === 'easy' ? '2×2' : '3×3')} systems`} onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Solve systems of linear equations</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="simul-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="simul-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed && <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>}
          <button onClick={revealed ? () => advanceFnRef.current() : handleSubmit} disabled={loading || (!revealed && (!userX || !userY || (is3x3 && !userZ)))}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Function Evaluation App ───────────────────────── */
/**
 * FuncEvalApp Component
 * Function evaluation practice: Evaluate f(x, y, z, ...) = ax + by + cz + ...
 * Features:
 *   - Easy: 1 variable (f(x) = ax + b)
 *   - Medium: 2 variables (f(x, y) = ax + by + c)
 *   - Hard: 3 variables (f(x, y, z) = ax + by + cz + d)
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function FuncEvalApp({ onBack }) {
  // ─────── Quiz State Management ──────────────────────────────────
  // Difficulty level: 'easy' | 'medium' | 'hard' (number of variables)
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag (controls welcome screen vs quiz content)
  const [started, setStarted] = useState(false)
  // Quiz finished flag (controls results screen)
  const [finished, setFinished] = useState(false)
  // Current question: {formula: "2x + 3y + 1", vars: {x: 2, y: 3}, answer: 10}
  const [question, setQuestion] = useState(null)
  // User's answer (the result of the function evaluation)
  const [answer, setAnswer] = useState('')
  // Feedback message shown after submission
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress flag
  const [loading, setLoading] = useState(false)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Answer revealed flag (prevents further input after submission)
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to answer
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking elapsed time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * loadQuestion(): Fetch next function evaluation question
   * Endpoint: /funceval-api/question?difficulty={easy|medium|hard}
   * Returns: {formula: "2x + 3", vars: {x: 5}, answer: 13}
   */
  const loadQuestion = async () => {
    setLoading(true)
    setAnswer('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    // Fetch function evaluation question from backend based on effective difficulty
    const res = await fetch(`${API}/funceval-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize function evaluation quiz
   * Parse numQuestions input, reset score/results, load first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    // Reset quiz state: mark as started, not finished, score to 0, question 1
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    setAdaptScore(0); adaptScoreRef.current = 0
    await loadQuestion()
  }

  /**
   * handleSubmit(): Validate and submit function evaluation answer
   * Validation: answer must be filled
   * API: POSTs to /funceval-api/check with correct answer and user's answer
   * Compares numerical values (allows for floating point tolerance)
   */
  const handleSubmit = async () => {
    if (!question || revealed || !answer) return
    const timeTaken = timer.stop()
    // POST to backend to validate function evaluation
    const res = await fetch(`${API}/funceval-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: question.answer, userAnswer: Number(answer) }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    // Format variable string for feedback (e.g., "x=2, y=3")
    const varStr = Object.entries(question.vars).map(([k, v]) => `${k}=${v}`).join(', ')
    setFeedback(data.correct ? `Correct! f(${varStr}) = ${data.correctAnswer}` : `Incorrect. f(${varStr}) = ${data.correctAnswer}`)
    // Add result to history for results table
    setResults(prev => [...prev, {
      question: `${question.formula}, ${varStr}`,
      userAnswer: answer,
      correctAnswer: String(data.correctAnswer),
      correct: data.correct,
      time: timeTaken,
    }])
    if (isAdaptive) {
      setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    const varStr = Object.entries(question.vars).map(([k, v]) => `${k}=${v}`).join(', ')
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: f(${varStr}) = ${question.answer}`)
  }

  /**
   * advanceFnRef: Mutable ref to advance function for useAutoAdvance hook
   * Advances to next question or finishes quiz if all questions completed
   * Loaded asynchronously before auto-advance triggers
   */
  advanceFnRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advanceFnRef.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  // Format variable string for display in question (e.g., "x = 2, y = 3")
  const varStr = question ? Object.entries(question.vars).map(([k, v]) => `${k} = ${v}`).join(', ') : ''

  const diffLabels = { easy: 'Easy — f(x)', medium: 'Medium — f(x,y)', hard: 'Hard — f(x,y,z)', extrahard: 'Extra Hard — Nested' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Functions" subtitle="Evaluate the function at the given values" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Evaluate linear functions</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="funceval-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="funceval-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed && <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>}
          <button onClick={revealed ? () => advanceFnRef.current() : handleSubmit} disabled={loading || (!revealed && !answer)}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Line Equation App ─────────────────────────────── */
/**
 * LineEqApp Component
 * Line equation practice: Find y = mx + c from two points
 * Given points (x1, y1) and (x2, y2), find slope m and y-intercept c
 * Calculation:
 *   m = (y2 - y1) / (x2 - x1)  [slope]
 *   c = y1 - m*x1             [y-intercept]
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function LineEqApp({ onBack }) {
  // ─────── Quiz State Management ──────────────────────────────────
  // Difficulty level: 'easy' | 'medium' | 'hard' (affects slope/intercept values)
  const [difficulty, setDifficulty] = useState('easy')
  // Adaptive mode enabled?
  const [isAdaptive, setIsAdaptive] = useState(false)
  // Adaptive score (0-3)
  const [adaptScore, setAdaptScore] = useState(0)
  const adaptScoreRef = useRef(0)
  // Number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState(String(DEFAULT_TOTAL))
  // Quiz started flag (controls welcome screen vs quiz content)
  const [started, setStarted] = useState(false)
  // Quiz finished flag (controls results screen)
  const [finished, setFinished] = useState(false)
  // Current question: {x1, y1, x2, y2}
  const [question, setQuestion] = useState(null)
  // User's slope value (m in y = mx + c)
  const [userM, setUserM] = useState('')
  // User's y-intercept value (c in y = mx + c)
  const [userC, setUserC] = useState('')
  // Feedback message shown after submission
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // API call in progress flag
  const [loading, setLoading] = useState(false)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Answer revealed flag (prevents further input after submission)
  const [revealed, setRevealed] = useState(false)
  // Current question number (1-indexed)
  const [questionNumber, setQuestionNumber] = useState(0)
  // Total questions to answer
  const [totalQ, setTotalQ] = useState(DEFAULT_TOTAL)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Timer instance for tracking elapsed time per question
  const timer = useTimer()
  const advanceFnRef = useRef(null)

  const effectiveDiff = () => isAdaptive ? adaptiveLevel(adaptScoreRef.current) : difficulty

  /**
   * loadQuestion(): Fetch next line equation question
   * Endpoint: /lineq-api/question?difficulty={easy|medium|hard}
   * Returns: {x1, y1, x2, y2} - two points on the line
   */
  const loadQuestion = async () => {
    setLoading(true)
    // Reset slope and intercept input fields
    setUserM(''); setUserC('')
    setFeedback(''); setIsCorrect(null); setRevealed(false)
    // Fetch line equation question from backend based on effective difficulty
    const res = await fetch(`${API}/lineq-api/question?difficulty=${effectiveDiff()}`)
    const data = await res.json()
    setQuestion(data)
    setLoading(false)
    timer.start()
  }

  /**
   * startQuiz(): Initialize line equation quiz
   * Parse numQuestions input, reset score/results, load first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : DEFAULT_TOTAL
    setTotalQ(count)
    // Reset quiz state: mark as started, not finished, score to 0, question 1
    setStarted(true); setFinished(false); setScore(0); setQuestionNumber(1); setResults([])
    setAdaptScore(0); adaptScoreRef.current = 0
    await loadQuestion()
  }

  /**
   * handleSubmit(): Validate and submit m and c values for line equation
   * Validation: both m (slope) and c (intercept) must be filled
   * API: POSTs to /lineq-api/check with two points and user's slope/intercept
   * Backend validates: m = (y2-y1)/(x2-x1) and c = y1 - m*x1
   */
  const handleSubmit = async () => {
    if (!question || revealed || !userM || !userC) return
    const timeTaken = timer.stop()
    // POST to backend to validate line equation
    const res = await fetch(`${API}/lineq-api/check`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x1: question.x1, y1: question.y1, x2: question.x2, y2: question.y2, userM: Number(userM), userC: Number(userC) }),
    })
    const data = await res.json()
    setIsCorrect(data.correct)
    if (data.correct) setScore(s => s + 1)
    // Format feedback message with correct m and c values
    setFeedback(data.correct ? `Correct! y = ${data.m}x ${data.c >= 0 ? '+' : '−'} ${Math.abs(data.c)}` : `Incorrect. y = ${data.m}x ${data.c >= 0 ? '+' : '−'} ${Math.abs(data.c)}`)
    // Add result to history for results table
    setResults(prev => [...prev, {
      question: `(${question.x1},${question.y1}) (${question.x2},${question.y2})`,
      userAnswer: `m=${userM}, c=${userC}`,
      correctAnswer: `m=${data.m}, c=${data.c}`,
      correct: data.correct,
      time: timeTaken,
    }])
    if (isAdaptive) {
      setAdaptScore(prev => { const next = data.correct ? Math.min(3, prev + 0.25) : Math.max(0, prev - 0.35); adaptScoreRef.current = next; return next })
    }
    setRevealed(true)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    setIsCorrect(false)
    setRevealed(true)
    setFeedback(`Solution: y = ${question.answer.m}x ${question.answer.c >= 0 ? '+' : '−'} ${Math.abs(question.answer.c)}`)
  }

  /**
   * advanceFnRef: Mutable ref to advance function for useAutoAdvance hook
   * Advances to next question or finishes quiz if all questions completed
   * Loaded asynchronously before auto-advance triggers
   */
  advanceFnRef.current = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return }
    setQuestionNumber(n => n + 1)
    await loadQuestion()
  }
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceFnRef, isCorrect)
  useEffect(() => {
    if (!revealed || isCorrect) return
    const h = (e) => { if (e.key === 'Enter') { e.preventDefault(); advanceFnRef.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [revealed, isCorrect, questionNumber])

  /**
   * valInput(setter): Create input change handler for m and c fields
   * Validates input: empty string, minus sign, decimal point, or decimal number format (-?\d*\.?\d*)
   * Returns onChange handler that updates the given state setter
   * Usage: onChange={valInput(setUserM)}
   */
  const valInput = (setter) => (e) => { const v = e.target.value; if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setter(v) }

  const diffLabels = { easy: 'Easy — Positive slope', medium: 'Medium — Any slope', hard: 'Hard — Fractional slope', extrahard: 'Extra Hard — Large coordinates' }
  const curAdaptLevel = adaptiveLevel(adaptScore)

  return (
    <QuizLayout title="Line Equation" subtitle="Find m and c in y = mx + c from two points" onBack={onBack} timer={started && !finished ? timer : null}>
      {!started && !finished && <div className="welcome-box">
        <p className="welcome-text">Given two points, find the slope m and intercept c.</p>
        <div className="checkbox-group" style={{ marginBottom: '12px' }}>
          {['easy', 'medium', 'hard', 'extrahard'].map(d => (
            <label key={d} className={`checkbox-pill${!isAdaptive && difficulty === d ? ' active' : ''}`}>
              <input type="radio" name="lineq-diff" checked={!isAdaptive && difficulty === d} onChange={() => { setDifficulty(d); setIsAdaptive(false) }} />
              {diffLabels[d]}
            </label>
          ))}
          <label className={`checkbox-pill${isAdaptive ? ' active' : ''}`} style={isAdaptive ? { background: 'linear-gradient(135deg, #4caf50, #ff9800, #f44336, #9c27b0)', color: '#fff', border: 'none' } : {}}>
            <input type="radio" name="lineq-diff" checked={isAdaptive} onChange={() => setIsAdaptive(true)} />
            Adaptive
          </label>
        </div>
        {isAdaptive && <p style={{ fontSize: '0.82rem', color: 'var(--clr-dim)', marginBottom: '8px' }}>Starts easy and smoothly adjusts to your level as you answer.</p>}
        <div className="question-count-row">
          <label className="question-count-label">How many questions?</label>
          <input className="answer-input question-count-input" type="text" value={numQuestions} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} />
        </div>
        <div className="button-row"><button onClick={startQuiz}>Start Quiz</button></div>
      </div>}
      {started && !finished && <>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <div className="progress-pill center">Question {questionNumber}/{totalQ}</div>
          {isAdaptive && <div className="progress-pill" style={{ background: ADAPT_COLORS[curAdaptLevel], color: '#fff' }}>{ADAPT_LABELS[curAdaptLevel]}</div>}
        </div>
        {isAdaptive && <DifficultySlider pct={adaptivePct(adaptScore)} onChange={(p) => { const v = (p / 100) * 3; setAdaptScore(v); adaptScoreRef.current = v }} />}
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed && <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>}
          <button onClick={revealed ? () => advanceFnRef.current() : handleSubmit} disabled={loading || (!revealed && (!userM || !userC))}>
            {revealed ? (questionNumber >= totalQ ? 'Finish' : 'Next') : 'Submit'}
          </button>
        </div>
        {results.length > 0 && <ResultsTable results={results} />}
      </>}
      {finished && <div className="welcome-box">
        <p className="welcome-text">Quiz complete!</p>
        <p className="final-score">Final score: {score}/{totalQ}</p>
        {isAdaptive && <p style={{ fontSize: '0.9rem', color: 'var(--clr-dim)' }}>Reached level: <strong style={{ color: ADAPT_COLORS[curAdaptLevel] }}>{ADAPT_LABELS[curAdaptLevel]}</strong></p>}
        <ResultsTable results={results} />
        <button onClick={() => { setStarted(false); setFinished(false) }}>Play Again</button>
      </div>}
    </QuizLayout>
  )
}

/* ── Quiz Layout ─────────────────────────────────────── */
/* ── Custom Lesson App ────────────────────────────────── */
/**
 * CUSTOM_PUZZLES: Static array mapping puzzle keys to display names
 * Used for puzzle selection UI in setup phase and results tracking
 * Keys must match API endpoint names and case types in CustomApp
 */
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
  { key: 'fractionadd', name: 'Fractions (Add)' },
  { key: 'surds', name: 'Surds' },
  { key: 'indices', name: 'Indices' },
  { key: 'sequences', name: 'Sequences' },
  { key: 'ratio', name: 'Ratio' },
  { key: 'percent', name: 'Percentages' },
  { key: 'sets', name: 'Sets' },
  { key: 'trig', name: 'Trigonometry' },
  { key: 'ineq', name: 'Inequalities' },
  { key: 'coordgeom', name: 'Coord. Geometry' },
  { key: 'prob', name: 'Probability' },
  { key: 'stats', name: 'Statistics' },
  { key: 'matrix', name: 'Matrices' },
  { key: 'vectors', name: 'Vectors' },
  { key: 'dotprod', name: 'Dot Products' },
  { key: 'transform', name: 'Transformations' },
  { key: 'mensur', name: 'Mensuration' },
  { key: 'bearings', name: 'Bearings' },
  { key: 'log', name: 'Logarithms' },
  { key: 'diff', name: 'Differentiation' },
  { key: 'bases', name: 'Number Bases' },
  { key: 'circleth', name: 'Circle Theorems' },
  { key: 'integ', name: 'Integration' },
  { key: 'stdform', name: 'Standard Form' },
  { key: 'bounds', name: 'Bounds' },
  { key: 'sdt', name: 'Speed, Distance, Time' },
  { key: 'variation', name: 'Variation' },
  { key: 'hcflcm', name: 'HCF & LCM' },
  { key: 'profitloss', name: 'Profit & Loss' },
  { key: 'rounding', name: 'Rounding' },
  { key: 'binomial', name: 'Binomial Theorem' },
  { key: 'complex', name: 'Complex Numbers' },
  { key: 'angles', name: 'Angles' },
  { key: 'triangles', name: 'Triangles' },
  { key: 'congruence', name: 'Congruence' },
  { key: 'pythag', name: "Pythagoras' Theorem" },
  { key: 'polygons', name: 'Polygons' },
  { key: 'similarity', name: 'Similarity' },
  { key: 'squaring', name: 'Squaring' },
  { key: 'tatsavit', name: 'Tatsavit' },
  { key: 'lineareq', name: 'Linear Equations' },
  { key: 'decimals', name: 'Decimals' },
  { key: 'permcomb', name: 'Perm. & Comb.' },
  { key: 'limits', name: 'Limits' },
  { key: 'invtrig', name: 'Inverse Trig' },
  { key: 'remfactor', name: 'Remainder Theorem' },
  { key: 'heron', name: "Heron's Formula" },
  { key: 'shares', name: 'Shares & Dividends' },
  { key: 'banking', name: 'Banking (RD)' },
  { key: 'gst', name: 'GST' },
  { key: 'section', name: 'Section Formula' },
  { key: 'linprog', name: 'Linear Programming' },
  { key: 'circmeasure', name: 'Circular Measure' },
  { key: 'conics', name: 'Conic Sections' },
  { key: 'diffeq', name: 'Differential Equations' },
]

/**
 * fetchQuestionForType(type, difficulty): Fetch a question for given puzzle type
 * Maps puzzle keys to API endpoints and parameter formats
 * Different puzzle types use different API endpoints with varying parameter styles
 * Returns: Promise<question object from backend>
 */
function fetchQuestionForType(type, difficulty) {
  // Map difficulty levels to numeric step values for some puzzle types
  const diffMap = { easy: 1, medium: 2, hard: 3 }
  const urls = {
    // Math puzzles with difficulty parameters
    basicarith: `${API}/basicarith-api/question?difficulty=${difficulty}`,
    addition: `${API}/addition-api/question?digits=${diffMap[difficulty] || 1}`,
    quadratic: `${API}/quadratic-api/question?difficulty=${difficulty}`,
    // Multiply: random multiplication table (2-9)
    multiply: `${API}/multiply-api/question?table=${Math.floor(Math.random() * 8) + 2}`,
    // Square root: step parameter mapped to difficulty (easy: 1-10, medium: 11-35, hard: 36-60)
    sqrt: `${API}/sqrt-api/question?step=${difficulty === 'easy' ? Math.floor(Math.random() * 10) + 1 : difficulty === 'medium' ? Math.floor(Math.random() * 25) + 11 : Math.floor(Math.random() * 25) + 36}`,
    polymul: `${API}/polymul-api/question?difficulty=${difficulty}`,
    polyfactor: `${API}/polyfactor-api/question?difficulty=${difficulty}`,
    primefactor: `${API}/primefactor-api/question?difficulty=${difficulty}`,
    qformula: `${API}/qformula-api/question?difficulty=${difficulty}`,
    simul: `${API}/simul-api/question?difficulty=${difficulty}`,
    funceval: `${API}/funceval-api/question?difficulty=${difficulty}`,
    lineq: `${API}/lineq-api/question?difficulty=${difficulty}`,
    // Trivia puzzles without difficulty (use defaults or random)
    gk: `${API}/gk-api/question`,
    vocab: `${API}/vocab-api/question?difficulty=${difficulty}`,
    // Fraction addition puzzle
    fractionadd: `${API}/fractionadd-api/question?difficulty=${difficulty}`,
    // Surds puzzle
    surds: `${API}/surds-api/question?difficulty=${difficulty}`,
    // Indices puzzle
    indices: `${API}/indices-api/question?difficulty=${difficulty}`,
    // Sequences & Series
    sequences: `${API}/sequences-api/question?difficulty=${difficulty}`,
    // Ratio & Proportion
    ratio: `${API}/ratio-api/question?difficulty=${difficulty}`,
    // Percentages
    percent: `${API}/percent-api/question?difficulty=${difficulty}`,
    // Sets
    sets: `${API}/sets-api/question?difficulty=${difficulty}`,
    trig: `${API}/trig-api/question?difficulty=${difficulty}`,
    ineq: `${API}/ineq-api/question?difficulty=${difficulty}`,
    coordgeom: `${API}/coordgeom-api/question?difficulty=${difficulty}`,
    prob: `${API}/prob-api/question?difficulty=${difficulty}`,
    stats: `${API}/stats-api/question?difficulty=${difficulty}`,
    matrix: `${API}/matrix-api/question?difficulty=${difficulty}`,
    vectors: `${API}/vectors-api/question?difficulty=${difficulty}`,
    dotprod: `${API}/dotprod-api/question?difficulty=${difficulty}`,
    transform: `${API}/transform-api/question?difficulty=${difficulty}`,
    mensur: `${API}/mensur-api/question?difficulty=${difficulty}`,
    bearings: `${API}/bearings-api/question?difficulty=${difficulty}`,
    log: `${API}/log-api/question?difficulty=${difficulty}`,
    diff: `${API}/diff-api/question?difficulty=${difficulty}`,
    bases: `${API}/bases-api/question?difficulty=${difficulty}`,
    circleth: `${API}/circle-api/question?difficulty=${difficulty}`,
    integ: `${API}/integ-api/question?difficulty=${difficulty}`,
    stdform: `${API}/stdform-api/question?difficulty=${difficulty}`,
    bounds: `${API}/bounds-api/question?difficulty=${difficulty}`,
    sdt: `${API}/sdt-api/question?difficulty=${difficulty}`,
    variation: `${API}/variation-api/question?difficulty=${difficulty}`,
    hcflcm: `${API}/hcflcm-api/question?difficulty=${difficulty}`,
    profitloss: `${API}/profitloss-api/question?difficulty=${difficulty}`,
    rounding: `${API}/rounding-api/question?difficulty=${difficulty}`,
    binomial: `${API}/binomial-api/question?difficulty=${difficulty}`,
    complex: `${API}/complex-api/question?difficulty=${difficulty}`,
    angles: `${API}/angles-api/question?difficulty=${difficulty}`,
    triangles: `${API}/triangles-api/question?difficulty=${difficulty}`,
    congruence: `${API}/congruence-api/question?difficulty=${difficulty}`,
    pythag: `${API}/pythag-api/question?difficulty=${difficulty}`,
    polygons: `${API}/polygons-api/question?difficulty=${difficulty}`,
    similarity: `${API}/similarity-api/question?difficulty=${difficulty}`,
    squaring: `${API}/squaring-api/question?difficulty=${difficulty}`,
    lineareq: `${API}/lineareq-api/question?difficulty=${difficulty}`,
    decimals: `${API}/decimals-api/question?difficulty=${difficulty}`,
    permcomb: `${API}/permcomb-api/question?difficulty=${difficulty}`,
    limits: `${API}/limits-api/question?difficulty=${difficulty}`,
    invtrig: `${API}/invtrig-api/question?difficulty=${difficulty}`,
    remfactor: `${API}/remfactor-api/question?difficulty=${difficulty}`,
    heron: `${API}/heron-api/question?difficulty=${difficulty}`,
    shares: `${API}/shares-api/question?difficulty=${difficulty}`,
    banking: `${API}/banking-api/question?difficulty=${difficulty}`,
    gst: `${API}/gst-api/question?difficulty=${difficulty}`,
    section: `${API}/section-api/question?difficulty=${difficulty}`,
    linprog: `${API}/linprog-api/question?difficulty=${difficulty}`,
    circmeasure: `${API}/circmeasure-api/question?difficulty=${difficulty}`,
    conics: `${API}/conics-api/question?difficulty=${difficulty}`,
    diffeq: `${API}/diffeq-api/question?difficulty=${difficulty}`,
    tatsavit: `${API}/tatsavit-api/question?difficulty=${difficulty}`,
  }
  return fetch(urls[type]).then(r => r.json())
}

/**
 * getPromptForType(type, q): Generate prompt text for given puzzle type and question
 * Some puzzle types (polymul, polyfactor, simul) require special rendering (return null)
 * Returns: String prompt or null if special render needed
 */
function getPromptForType(type, q) {
  if (!q) return 'Loading…'
  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
  switch (type) {
    case 'basicarith': case 'addition': return `${q.prompt} = ?`
    case 'quadratic': return `${q.prompt}`
    case 'multiply': return `${q.prompt} = ?`
    case 'sqrt': return `${q.prompt} = ?`
    case 'funceval': return `${q.formula}, evaluate at ${Object.entries(q.vars).map(([k,v]) => `${k} = ${v}`).join(', ')}`
    case 'polymul': return q.p1Display && q.p2Display ? `Expand: (${q.p1Display})(${q.p2Display})` : null
    case 'polyfactor': return q.display ? `Factorise: ${q.display}` : null
    case 'primefactor': return `Find all prime factors of ${q.number}`
    case 'qformula': return `Find the roots of ${q.a}x² ${q.b >= 0 ? '+' : '−'} ${Math.abs(q.b)}x ${q.c >= 0 ? '+' : '−'} ${Math.abs(q.c)} = 0`
    case 'simul': {
      if (!q.eqs) return null
      const fmtEq = (eq) => {
        const parts = []
        if (eq.a) parts.push(`${eq.a === 1 ? '' : eq.a === -1 ? '-' : eq.a}x`)
        if (eq.b) parts.push(`${eq.b > 0 && parts.length ? '+' : ''}${eq.b === 1 ? '' : eq.b === -1 ? '-' : eq.b}y`)
        if (eq.c) parts.push(`${eq.c > 0 && parts.length ? '+' : ''}${eq.c === 1 ? '' : eq.c === -1 ? '-' : eq.c}z`)
        return `${parts.join(' ')} = ${eq.d}`
      }
      return `Solve:\n${q.eqs.map(fmtEq).join('\n')}`
    }
    case 'lineq': return `Find slope (m) and intercept (c) for the line through (${q.x1}, ${q.y1}) and (${q.x2}, ${q.y2})`
    case 'gk': return q.question
    case 'vocab': return `What does "${q.question}" mean?`
    case 'fractionadd': return q.mixed ? `${q.w1} ${q.n1}/${q.d1} + ${q.w2} ${q.n2}/${q.d2} = ?` : `${q.n1}/${q.d1} + ${q.n2}/${q.d2} = ?`
    case 'surds': {
      if (q.type === 'simplify') return `Simplify √${q.n}`
      if (q.type === 'addsub') { const aS = q.a === 1 ? '√'+q.r : q.a+'√'+q.r; const bS = q.b === 1 ? '√'+q.r : q.b+'√'+q.r; return `${aS} ${q.op} ${bS} = ?` }
      if (q.type === 'multiply') { const p1 = q.c1 === 1 ? '√'+q.r1 : q.c1+'√'+q.r1; const p2 = q.c2 === 1 ? '√'+q.r2 : q.c2+'√'+q.r2; return `${p1} × ${p2} = ?` }
      if (q.type === 'rationalise' && q.subtype === 'simple') { const d = q.b===1 ? '√'+q.r : q.b+'√'+q.r; return `Rationalise: ${q.a} / (${d})` }
      if (q.type === 'rationalise' && q.subtype === 'conjugate') { const sg = q.q>0?'+':''; const qS = Math.abs(q.q)===1?(q.q>0?'':'-'):String(q.q); return `Rationalise: ${q.a} / (${q.p}${sg}${qS}√${q.r})` }
      return ''
    }
    case 'indices': return q.prompt ? `${q.prompt} = ?` : ''
    case 'sequences': return q.prompt || ''
    case 'ratio': return q.prompt || ''
    case 'percent': return q.prompt || ''
    case 'sets': return q.prompt || ''
    case 'trig': case 'ineq': case 'coordgeom': case 'prob': case 'stats':
    case 'matrix': case 'vectors': case 'dotprod': case 'transform': case 'mensur':
    case 'bearings': case 'log': case 'diff': case 'bases': case 'circleth':
    case 'integ': case 'stdform': case 'bounds': case 'sdt': case 'variation':
    case 'hcflcm': case 'profitloss': case 'rounding': case 'binomial': case 'complex':
    case 'angles': case 'triangles': case 'congruence': case 'pythag': case 'polygons': case 'similarity':
    case 'lineareq': case 'decimals': case 'permcomb': case 'limits': case 'invtrig':
    case 'remfactor': case 'heron': case 'shares': case 'banking': case 'gst':
    case 'section': case 'linprog': case 'circmeasure': case 'conics': case 'diffeq':
      return q.prompt || ''
    case 'squaring': return q.prompt || `Find ${q.n}²`
    case 'tatsavit': return q.prompt || ''
    default: return ''
  }
}

/**
 * CustomApp Component
 * Custom lesson builder: Combine any puzzle types into a custom quiz
 * Features:
 *   - Setup phase: select puzzles, difficulty, question order, count
 *   - Quiz phase: answer mixed questions from selected puzzle types
 *   - Finished phase: view results and replay option
 *   - Keyboard shortcuts: 1-4 or a-d to select multiple choice answers
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback to return to home menu
 */
function CustomApp({ onBack }) {
  // ─────── Setup Phase State ──────────────────────────────────
  // Current phase: 'setup' | 'quiz' | 'finished'
  const [phase, setPhase] = useState('setup')
  // Array of selected puzzle keys (e.g., ['basicarith', 'multiply'])
  const [selected, setSelected] = useState([])
  // Question ordering: 'random' | 'sequential' (affects question plan generation)
  const [ordering, setOrdering] = useState('random')
  // Difficulty level applied to all selected puzzle types: 'easy' | 'medium' | 'hard'
  const [difficulty, setDifficulty] = useState('easy')
  // Total number of questions to answer (as string for input field)
  const [numQuestions, setNumQuestions] = useState('20')

  // ─────── Quiz Phase State ──────────────────────────────────
  // Array of puzzle type keys ordered for this quiz (e.g., ['multiply', 'basicarith', 'multiply'])
  const [plan, setPlan] = useState([])
  // Current question index in plan (0-indexed)
  const [qIndex, setQIndex] = useState(0)
  // Current question object returned from API
  const [question, setQuestion] = useState(null)
  // Current puzzle type (key from CUSTOM_PUZZLES)
  const [curType, setCurType] = useState(null)
  // Number of correct answers so far
  const [score, setScore] = useState(0)
  // Array of {question, userAnswer, correctAnswer, correct, time} result objects
  const [results, setResults] = useState([])
  // Feedback message shown after submission
  const [feedback, setFeedback] = useState('')
  // Is the last answer correct? (null before submission, true/false after)
  const [isCorrect, setIsCorrect] = useState(null)
  // Answer revealed flag (prevents further input after submission)
  const [revealed, setRevealed] = useState(false)
  // API call in progress flag
  const [loading, setLoading] = useState(false)
  // Timer instance for tracking elapsed time per question
  const timer = useTimer()

  // ─────── Input State (for different puzzle types) ──────────────────────────────────
  // Single answer for most puzzle types (basicarith, addition, multiply, sqrt, funceval)
  const [answer, setAnswer] = useState('')
  // Selected option letter (A, B, C, D) for multiple choice questions (gk, vocab)
  const [selectedOption, setSelectedOption] = useState('')
  // Array of coefficient inputs for polymul puzzle
  const [userCoeffs, setUserCoeffs] = useState([])
  // Object for storing various inputs: {p, q, r, s} for polyfactor, {factors} for primefactor, {x, y, z} for simul, {m, c} for lineq, etc.
  const [inputs, setInputs] = useState({})

  // ─────── Derived State ──────────────────────────────────
  // Total number of questions in this quiz (length of plan)
  const totalQ = plan.length

  /**
   * togglePuzzle(key): Toggle selection of a puzzle type
   * Adds puzzle if not selected, removes if already selected
   * Updates selected array for UI rendering
   */
  const togglePuzzle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  /**
   * movePuzzle(idx, dir): Move a puzzle up/down in the sequential order list
   * dir: -1 for up, +1 for down
   * Bounds check: don't move if already at top (dir=-1) or bottom (dir=+1)
   * Used only when ordering === 'sequential'
   */
  const movePuzzle = (idx, dir) => {
    const arr = [...selected]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    // Swap array elements using destructuring
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setSelected(arr)
  }

  /**
   * startQuiz(): Build question plan and start quiz
   * Parse numQuestions input
   * Generate question plan based on ordering:
   *   - 'sequential': distribute count evenly across selected puzzles, questions appear in order
   *   - 'random': pick random puzzles from selected, questions appear in random order
   * Transition to 'quiz' phase and load first question
   */
  const startQuiz = async () => {
    const count = numQuestions !== '' && Number(numQuestions) > 0 ? Number(numQuestions) : 20
    let questionPlan = []
    if (ordering === 'sequential') {
      // Distribute count evenly: if count=10, selected=['a','b','c'], then 4,3,3
      const perType = Math.floor(count / selected.length)
      const remainder = count % selected.length
      selected.forEach((key, i) => {
        // First 'remainder' types get one extra question
        const n = perType + (i < remainder ? 1 : 0)
        for (let j = 0; j < n; j++) questionPlan.push(key)
      })
    } else {
      // Random order: pick random puzzle type for each question
      for (let i = 0; i < count; i++) {
        questionPlan.push(selected[Math.floor(Math.random() * selected.length)])
      }
    }
    setPlan(questionPlan)
    setPhase('quiz')
    setScore(0)
    setResults([])
    setQIndex(0)
    // Load first question asynchronously
    await loadQuestion(questionPlan[0])
  }

  /**
   * resetInputs(): Clear all input state and feedback
   * Called before loading each new question
   */
  const resetInputs = () => {
    setAnswer(''); setSelectedOption(''); setUserCoeffs([]); setInputs({})
    setFeedback(''); setIsCorrect(null); setRevealed(false)
  }

  /**
   * loadQuestion(type): Fetch and set up question for given puzzle type
   * Fetches from appropriate API endpoint based on puzzle type and difficulty
   * Initializes type-specific input state (e.g., polymul initializes userCoeffs array)
   * Clears stale question object first to prevent render issues during type change
   * Starts timer for this question
   */
  const loadQuestion = async (type) => {
    setLoading(true)
    resetInputs()
    // Clear stale question before changing type to prevent render errors
    setQuestion(null)
    setCurType(type)
    try {
      // Fetch question from type-specific API endpoint
      const data = await fetchQuestionForType(type, difficulty)
      if (data && !data.error) {
        setQuestion(data)
        // Initialize type-specific input: polymul needs coefficient array
        if (type === 'polymul') setUserCoeffs(new Array(data.resultDegree + 1).fill(''))
      } else {
        // API returned error object; leave question null
        setQuestion(null)
      }
    } catch (err) {
      console.error('Failed to load question:', err)
      setQuestion(null)
    }
    setLoading(false)
    timer.start()
  }

  /**
   * handleSubmit(overrideOption): Validate and submit answer for current puzzle type
   * Dispatches to type-specific validation logic based on curType
   * All branches: validate user input, POST to type-specific API check endpoint,
   *   update score/feedback/results, set revealed=true
   * overrideOption: allows keyboard shortcut handlers to pass selected option letter
   */
  const handleSubmit = async (overrideOption) => {
    if (!question || revealed) return
    const timeTaken = timer.stop()
    let res, data, correct, correctDisplay, userDisplay
    const optionToUse = overrideOption || selectedOption

    // Dispatch to type-specific submission logic
    switch (curType) {
      // ─────── Basic Arithmetic Puzzle ──────────────────────────────────
      case 'basicarith': {
        if (answer === '') return
        // POST to /basicarith-api/check: validate arithmetic answer
        res = await fetch(`${API}/basicarith-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, op: question.op, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! ${question.prompt} = ${data.correctAnswer}` : `Incorrect. ${question.prompt} = ${data.correctAnswer}`)
        break
      }
      // ─────── Addition Puzzle ──────────────────────────────────
      case 'addition': {
        if (answer === '') return
        // POST to /addition-api/check: validate addition answer
        res = await fetch(`${API}/addition-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! ${question.a} + ${question.b} = ${data.correctAnswer}` : `Incorrect. ${question.a} + ${question.b} = ${data.correctAnswer}`)
        break
      }
      // ─────── Quadratic Evaluation Puzzle ──────────────────────────────────
      case 'quadratic': {
        if (answer === '') return
        // POST to /quadratic-api/check: evaluate quadratic ax²+bx+c at given x
        res = await fetch(`${API}/quadratic-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, c: question.c, x: question.x, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! y = ${data.correctAnswer}` : `Incorrect. y = ${data.correctAnswer}`)
        break
      }
      // ─────── Multiplication Table Puzzle ──────────────────────────────────
      case 'multiply': {
        if (answer === '') return
        // POST to /multiply-api/check: validate multiplication table answer
        res = await fetch(`${API}/multiply-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: question.table, multiplier: question.multiplier, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! ${question.prompt} = ${data.correctAnswer}` : `Incorrect. ${question.prompt} = ${data.correctAnswer}`)
        break
      }
      // ─────── Square Root Puzzle ──────────────────────────────────
      case 'sqrt': {
        if (answer === '') return
        // POST to /sqrt-api/check: validate square root floor/ceiling answer
        res = await fetch(`${API}/sqrt-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: question.q, answer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = `⌊${data.sqrtRounded}⌋=${data.floorAnswer} or ⌈${data.sqrtRounded}⌉=${data.ceilAnswer}`; userDisplay = answer
        setFeedback(data.correct ? `Correct! √${question.q} ≈ ${data.sqrtRounded}` : `Incorrect. √${question.q} ≈ ${data.sqrtRounded} → ${data.floorAnswer} or ${data.ceilAnswer}`)
        break
      }
      // ─────── Function Evaluation Puzzle ──────────────────────────────────
      case 'funceval': {
        if (answer === '') return
        // POST to /funceval-api/check: evaluate f(x,y,z,...) at given values
        res = await fetch(`${API}/funceval-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: question.answer, userAnswer: Number(answer) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = String(data.correctAnswer); userDisplay = answer
        setFeedback(data.correct ? `Correct! = ${data.correctAnswer}` : `Incorrect. = ${data.correctAnswer}`)
        break
      }
      // ─────── Polynomial Multiply Puzzle ──────────────────────────────────
      case 'polymul': {
        if (userCoeffs.some(c => c === '')) return
        // POST to /polymul-api/check: validate polynomial multiplication result coefficients
        res = await fetch(`${API}/polymul-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p1: question.p1, p2: question.p2, userCoeffs: userCoeffs.map(Number) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.correctDisplay; userDisplay = userCoeffs.join(', ')
        setFeedback(data.correct ? `Correct! ${question.productDisplay}` : `Incorrect. Answer: ${data.correctDisplay}`)
        break
      }
      // ─────── Polynomial Factorization Puzzle ──────────────────────────────────
      case 'polyfactor': {
        const { p: up, q: uq, r: ur, s: us } = inputs
        if (!up || !uq || !ur || !us) return
        // POST to /polyfactor-api/check: validate polynomial factorization (px+q)(rx+s)
        res = await fetch(`${API}/polyfactor-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userP: Number(up), userQ: Number(uq), userR: Number(ur), userS: Number(us) }) })
        data = await res.json()
        const f = question.factors
        correct = data.correct; correctDisplay = `(${f.p}x${f.q>=0?'+':''}${f.q})(${f.r}x${f.s>=0?'+':''}${f.s})`; userDisplay = `(${up}x${Number(uq)>=0?'+':''}${uq})(${ur}x${Number(us)>=0?'+':''}${us})`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      // ─────── Prime Factorization Puzzle ──────────────────────────────────
      case 'primefactor': {
        const pf = (inputs.factors || '').split(/[,\s]+/).filter(Boolean).map(Number).sort((a,b) => a - b)
        if (pf.length === 0) return
        // POST to /primefactor-api/check: validate prime factorization (sorted list)
        res = await fetch(`${API}/primefactor-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: question.number, userFactors: pf }) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.correctFactors.join(' × '); userDisplay = pf.join(' × ')
        setFeedback(data.correct ? `Correct! ${question.number} = ${correctDisplay}` : `Incorrect. ${question.number} = ${correctDisplay}`)
        break
      }
      // ─────── Quadratic Formula Puzzle ──────────────────────────────────
      case 'qformula': {
        const { r1, r2 } = inputs
        if (question.roots.type === 'real_equal' && !r1) return
        if (question.roots.type !== 'real_equal' && (!r1 || !r2)) return
        // POST to /qformula-api/check: validate quadratic formula roots (type-dependent)
        res = await fetch(`${API}/qformula-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: question.a, b: question.b, c: question.c, userR1: Number(r1), userR2: Number(r2 || 0), userType: question.roots.type }) })
        data = await res.json()
        correct = data.correct
        const rt = data.roots
        // Format display based on root type (real_distinct, real_equal, or complex)
        correctDisplay = rt.type === 'real_distinct' ? `r₁ = ${rt.r1}, r₂ = ${rt.r2}` : rt.type === 'real_equal' ? `r = ${rt.r1}` : `${rt.realPart} ± ${rt.imagPart}i`
        userDisplay = question.roots.type === 'real_equal' ? r1 : `${r1}, ${r2}`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      // ─────── Simultaneous Equations Puzzle ──────────────────────────────────
      case 'simul': {
        const { x: ux, y: uy, z: uz } = inputs
        if (!ux || !uy) return
        if (question.size === 3 && !uz) return
        const body = { eqs: question.eqs, size: question.size, solution: question.solution, userX: Number(ux), userY: Number(uy) }
        if (question.size === 3) body.userZ = Number(uz)
        // POST to /simul-api/check: validate simultaneous equation solution (2×2 or 3×3)
        res = await fetch(`${API}/simul-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        data = await res.json()
        correct = data.correct
        const s = question.solution
        correctDisplay = question.size === 3 ? `(${s.x}, ${s.y}, ${s.z})` : `(${s.x}, ${s.y})`
        userDisplay = question.size === 3 ? `(${ux}, ${uy}, ${uz})` : `(${ux}, ${uy})`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      // ─────── Line Equation Puzzle ──────────────────────────────────
      case 'lineq': {
        const { m, c } = inputs
        if (!m || !c) return
        // POST to /lineq-api/check: validate line equation y=mx+c from two points
        res = await fetch(`${API}/lineq-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x1: question.x1, y1: question.y1, x2: question.x2, y2: question.y2, userM: Number(m), userC: Number(c) }) })
        data = await res.json()
        correct = data.correct; correctDisplay = `m = ${data.m}, c = ${data.c}`; userDisplay = `m = ${m}, c = ${c}`
        setFeedback(data.correct ? `Correct! ${correctDisplay}` : `Incorrect. ${correctDisplay}`)
        break
      }
      // ─────── Fraction Addition Puzzle ──────────────────────────────────
      case 'fractionadd': {
        if (answer === '') return
        // For fraction add in custom mode, accept answer as a single number (simplified result)
        // Build payload matching the standalone component format
        const fracPayload = {
          n1: question.n1, d1: question.d1,
          n2: question.n2, d2: question.d2,
          mixed: question.mixed || false,
        }
        if (question.mixed) {
          fracPayload.w1 = question.w1; fracPayload.w2 = question.w2
          // In custom mode, parse "W N/D" or "N/D" from answer string
          fracPayload.ansWhole = 0; fracPayload.ansNum = Number(answer); fracPayload.ansDen = 1
        } else {
          fracPayload.ansNum = Number(answer); fracPayload.ansDen = 1
        }
        res = await fetch(`${API}/fractionadd-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fracPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = answer
        setFeedback(data.correct ? `Correct! = ${data.display}` : `Incorrect. = ${data.display}`)
        break
      }
      // ─────── Surds Puzzle ──────────────────────────────────
      case 'surds': {
        if (answer === '') return
        const surdAnswer = answer.replace(/sqrt/gi, '√').trim()
        const surdPayload = { ...question, answer: surdAnswer }
        res = await fetch(`${API}/surds-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(surdPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = surdAnswer
        setFeedback(data.correct ? `Correct! = ${data.display}` : `Incorrect. = ${data.display}`)
        break
      }
      // ─────── Indices Puzzle ──────────────────────────────────
      case 'indices': {
        if (answer === '') return
        const idxPayload = { ...question, answer: answer.trim() }
        res = await fetch(`${API}/indices-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(idxPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = answer.trim()
        setFeedback(data.correct ? `Correct! = ${data.display}` : `Incorrect. = ${data.display}`)
        break
      }
      // ─────── Sequences & Series ──────────────────────────────────
      case 'sequences': {
        if (answer === '') return
        const seqPayload = { ...question, answer: answer.trim() }
        res = await fetch(`${API}/sequences-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(seqPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = answer.trim()
        setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
        break
      }
      // ─────── Ratio & Proportion ──────────────────────────────────
      case 'ratio': {
        if (answer === '') return
        const ratPayload = { ...question, answer: answer.trim() }
        res = await fetch(`${API}/ratio-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ratPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = answer.trim()
        setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
        break
      }
      // ─────── Percentages ──────────────────────────────────
      case 'percent': {
        if (answer === '') return
        const pctPayload = { ...question, userAnswer: answer.trim().replace(/[$,]/g, '') }
        res = await fetch(`${API}/percent-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pctPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = answer.trim()
        setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
        break
      }
      // ─────── Sets ──────────────────────────────────
      case 'sets': {
        if (answer === '') return
        const setsPayload = { ...question, userAnswer: answer.trim() }
        res = await fetch(`${API}/sets-api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(setsPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = answer.trim()
        setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
        break
      }
      // ─────── Generic API puzzles ──────────────────────────────────
      case 'trig': case 'ineq': case 'coordgeom': case 'prob': case 'stats':
      case 'matrix': case 'vectors': case 'dotprod': case 'transform': case 'mensur':
      case 'bearings': case 'log': case 'diff': case 'bases': case 'circleth':
      case 'integ': case 'stdform': case 'bounds': case 'sdt': case 'variation':
      case 'hcflcm': case 'profitloss': case 'rounding': case 'binomial': case 'complex':
      case 'angles': case 'triangles': case 'congruence': case 'pythag': case 'polygons': case 'similarity': case 'squaring': case 'tatsavit':
      case 'lineareq': case 'decimals': case 'permcomb': case 'limits': case 'invtrig':
      case 'remfactor': case 'heron': case 'shares': case 'banking': case 'gst':
      case 'section': case 'linprog': case 'circmeasure': case 'conics': case 'diffeq': {
        if (answer === '') return
        const apiMap = { trig: 'trig-api', ineq: 'ineq-api', coordgeom: 'coordgeom-api', prob: 'prob-api', stats: 'stats-api', matrix: 'matrix-api', vectors: 'vectors-api', dotprod: 'dotprod-api', transform: 'transform-api', mensur: 'mensur-api', bearings: 'bearings-api', log: 'log-api', diff: 'diff-api', bases: 'bases-api', circleth: 'circle-api', integ: 'integ-api', stdform: 'stdform-api', bounds: 'bounds-api', sdt: 'sdt-api', variation: 'variation-api', hcflcm: 'hcflcm-api', profitloss: 'profitloss-api', rounding: 'rounding-api', binomial: 'binomial-api', complex: 'complex-api', angles: 'angles-api', triangles: 'triangles-api', congruence: 'congruence-api', pythag: 'pythag-api', polygons: 'polygons-api', similarity: 'similarity-api', squaring: 'squaring-api', tatsavit: 'tatsavit-api', lineareq: 'lineareq-api', decimals: 'decimals-api', permcomb: 'permcomb-api', limits: 'limits-api', invtrig: 'invtrig-api', remfactor: 'remfactor-api', heron: 'heron-api', shares: 'shares-api', banking: 'banking-api', gst: 'gst-api', section: 'section-api', linprog: 'linprog-api', circmeasure: 'circmeasure-api', conics: 'conics-api', diffeq: 'diffeq-api' }
        const genPayload = { ...question, userAnswer: answer.trim() }
        res = await fetch(`${API}/${apiMap[curType]}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(genPayload) })
        data = await res.json()
        correct = data.correct; correctDisplay = data.display; userDisplay = answer.trim()
        setFeedback(data.correct ? `Correct! ${data.display}` : `Incorrect. Answer: ${data.display}`)
        break
      }
      // ─────── Multiple Choice Puzzles (GK, Vocab) ──────────────────────────────────
      case 'gk': case 'vocab': {
        if (!optionToUse) return
        setSelectedOption(optionToUse)
        const url = curType === 'gk' ? `${API}/gk-api/check` : `${API}/vocab-api/check`
        // POST to type-specific check endpoint: validate multiple choice answer
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: question.id, answerOption: optionToUse }) })
        data = await res.json()
        correct = data.correct; correctDisplay = `${data.correctAnswer}: ${data.correctAnswerText}`; userDisplay = optionToUse
        setFeedback(data.correct ? `Correct! ${data.correctAnswerText}` : `Incorrect. ${data.correctAnswerText}`)
        break
      }
      default: return
    }

    // Update score, feedback, and results (common for all puzzle types)
    setIsCorrect(correct)
    if (correct) setScore(s => s + 1)
    // Get puzzle type name for results display
    const typeName = CUSTOM_PUZZLES.find(p => p.key === curType)?.name || curType
    // Add result entry with truncated question display (max 80 chars)
    setResults(prev => [...prev, {
      question: `[${typeName}] ${getPromptForType(curType, question) || '…'}`.slice(0, 80),
      userAnswer: userDisplay,
      correctAnswer: correctDisplay,
      correct,
      time: timeTaken,
    }])
    setRevealed(true)
  }

  const handleSolve = async () => {
    if (!question || revealed) return
    setIsCorrect(false)
    setRevealed(true)
    // For most puzzle types, display is available from question object
    const display = question.display || question.answer || '(solution unavailable)'
    setFeedback(`Solution: ${display}`)
  }

  /**
   * advanceRef: Mutable ref to advance function for useAutoAdvance hook
   * Advances to next question or transitions to 'finished' phase if all questions completed
   * Loaded asynchronously before auto-advance triggers
   */
  const advanceRef = useRef(() => {})
  advanceRef.current = async () => {
    if (qIndex + 1 >= totalQ) { setPhase('finished'); timer.reset(); return }
    const next = qIndex + 1
    setQIndex(next)
    await loadQuestion(plan[next])
  }
  // Auto-advance to next question when answer is correct and revealed (uses useAutoAdvance hook)
  useAutoAdvance(revealed, advanceRef, isCorrect)

  /**
   * Keyboard shortcut handler: 1-4 or a-d to select+submit for GK/Vocab questions
   * Only active during quiz phase on multiple choice questions
   * Prevents default behavior and triggers handleSubmit with selected letter option
   * Cleanup: removes event listener on unmount or dependency change
   */
  const handleSubmitRefC = useRef(handleSubmit)
  handleSubmitRefC.current = handleSubmit
  useEffect(() => {
    if (phase !== 'quiz') return
    const onKeyDown = (event) => {
      if (revealed || loading) return
      if (curType !== 'gk' && curType !== 'vocab') return
      // Map number keys 1-4 and letter keys a-d to option letters A-D
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

  /**
   * valInput(key): Create input change handler for multi-field inputs object
   * Validates input: empty string, minus sign, decimal point, or decimal number format (-?\d*\.?\d*)
   * Returns onChange handler that updates inputs[key]
   * Usage: onChange={valInput('m')} -> setInputs({...inputs, m: newValue})
   */
  const valInput = (key) => (e) => {
    const v = e.target.value
    if (v === '' || v === '-' || v === '.' || /^-?\d*\.?\d*$/.test(v)) setInputs(prev => ({ ...prev, [key]: v }))
  }

  /**
   * sup(n): Convert digit to superscript character
   * Maps: 0→⁰, 1→¹, ..., 9→⁹
   */
  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')
  /**
   * formatCoeffLabel(i): Format label for coefficient at degree i
   * Returns: "constant" for i=0, "x" for i=1, "x²" for i=2, etc.
   */
  const formatCoeffLabel = (i) => i === 0 ? 'constant' : i === 1 ? 'x' : `x${sup(i)}`
  /**
   * fmtEq2(eq): Format 2×2 equation for display
   * Input: {a, b, d} (coefficients from ax + by = d)
   * Output: "2x + 3y = 5" or "2x − 3y = 5" (uses minus sign character)
   */
  const fmtEq2 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y = ${eq.d}`
  /**
   * fmtEq3(eq): Format 3×3 equation for display
   * Input: {a, b, c, d} (coefficients from ax + by + cz = d)
   * Output: "2x + 3y − 4z = 5" (uses minus sign character for negatives)
   */
  const fmtEq3 = (eq) => `${eq.a}x ${eq.b >= 0 ? '+' : '−'} ${Math.abs(eq.b)}y ${eq.c >= 0 ? '+' : '−'} ${Math.abs(eq.c)}z = ${eq.d}`

  /**
   * renderInputs(): Return appropriate input UI for current puzzle type
   * Different puzzle types require different input components (text, coefficients, options, etc.)
   * Returns: JSX component or null if type not recognized
   */
  const renderInputs = () => {
    if (!question || !curType) return null
    // Dispatch to type-specific input rendering
    switch (curType) {
      case 'basicarith': case 'addition': case 'quadratic': case 'multiply': case 'sqrt': case 'funceval': case 'fractionadd':
        return <>
          <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) { const v = e.target.value; if (v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v)) setAnswer(v) } }} disabled={revealed} placeholder="Type your answer" onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
          <NumPad value={answer} onChange={v => !revealed && setAnswer(v)} disabled={revealed} />
        </>
      case 'surds':
        return <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder="e.g. 6√2 (type sqrt for √)" onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
      case 'indices':
        return <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder={question?.type === 'simplify' ? 'Enter the exponent, e.g. 7' : 'e.g. 8 or 1/4'} onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
      case 'sequences':
        return <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder="e.g. 42 or 3/4" onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
      case 'ratio':
        return <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder={question?.type === 'simplify' ? 'e.g. 3:2' : question?.type?.startsWith('divide') ? 'e.g. 72, 48' : 'Type your answer'} onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
      case 'percent':
        return <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder="Type your answer" onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
      case 'sets':
        return <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder={question?.type === 'list' ? 'e.g. {1, 3, 5}' : 'e.g. 12'} onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
      case 'trig': case 'ineq': case 'coordgeom': case 'prob': case 'stats':
      case 'matrix': case 'vectors': case 'dotprod': case 'transform': case 'mensur':
      case 'bearings': case 'log': case 'diff': case 'bases': case 'circleth':
      case 'integ': case 'stdform': case 'bounds': case 'sdt': case 'variation':
      case 'hcflcm': case 'profitloss': case 'rounding': case 'binomial': case 'complex':
      case 'angles': case 'triangles': case 'congruence': case 'pythag': case 'polygons': case 'similarity': case 'squaring': case 'tatsavit':
      case 'lineareq': case 'decimals': case 'permcomb': case 'limits': case 'invtrig':
      case 'remfactor': case 'heron': case 'shares': case 'banking': case 'gst':
      case 'section': case 'linprog': case 'circmeasure': case 'conics': case 'diffeq':
        return <input className="answer-input" type="text" value={answer} onChange={e => { if (!revealed) setAnswer(e.target.value) }} disabled={revealed} placeholder="Type your answer" onKeyDown={e => { if (e.key === 'Enter') revealed ? advanceRef.current() : handleSubmit() }} />
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

  /**
   * renderQuestion(): Return appropriate question display for current puzzle type
   * Some puzzle types require custom rendering (polymul, polyfactor, simul)
   * Others use generic prompt display via getPromptForType()
   * Always shows puzzle type badge above question
   * Returns: JSX component with question display
   */
  const renderQuestion = () => {
    if (!question || !curType) return <div className="question-box">Loading…</div>
    const typeName = CUSTOM_PUZZLES.find(p => p.key === curType)?.name || curType

    // Polynomial multiplication: show (p1) × (p2)
    if (curType === 'polymul') {
      return <>
        <div className="custom-type-badge">{typeName}</div>
        <div className="question-box">
          <span className="poly-expr">({question.p1Display})</span> × <span className="poly-expr">({question.p2Display})</span>
        </div>
      </>
    }
    // Polynomial factorization: show "Factor: expression"
    if (curType === 'polyfactor') {
      return <>
        <div className="custom-type-badge">{typeName}</div>
        <div className="question-box">Factor: {question.display}</div>
      </>
    }
    // Simultaneous equations: show system of equations formatted
    if (curType === 'simul') {
      const is3 = question.size === 3
      return <>
        <div className="custom-type-badge">{typeName}</div>
        <div className="question-box equation-system">
          {question.eqs.map((eq, i) => <div key={i}>{is3 ? fmtEq3(eq) : fmtEq2(eq)}</div>)}
        </div>
      </>
    }
    // Default: use generic prompt from getPromptForType()
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
        {renderFeedback(feedback, isCorrect)}
        <div className="button-row">
          {!revealed && <button onClick={handleSolve} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--clr-accent)', color: 'var(--clr-accent)' }}>Solve</button>}
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
/**
 * IntervalSchedulingApp Component
 * Interactive visualization of the greedy algorithm for interval scheduling
 * Features:
 *   - Drag on timeline to create intervals
 *   - Step through greedy algorithm with accept/reject decisions
 *   - See which intervals are selected (non-overlapping maximum set)
 *   - Algorithm proof: sort by finish time, greedily select non-overlapping intervals
 *
 * Algorithm: For maximum non-overlapping intervals:
 *   1. Sort all intervals by finish time
 *   2. Scan left to right
 *   3. Select interval if its start >= last selected interval's end
 *   4. Otherwise, skip it (greedy choice)
 *   Result: Always gives optimal solution
 */
function IntervalSchedulingApp() {
  // ─────── Interval State ──────────────────────────────────
  // Array of {id, start, end} intervals created by user
  const [intervals, setIntervals] = useState([])
  // Next ID to assign to new intervals (auto-increment)
  const [nextId, setNextId] = useState(1)
  // Algorithm result (used to lock UI during stepping)
  const [result, setResult] = useState(null)
  // Current step in algorithm: -1=not started, 0..n=stepping through, n=finished
  const [step, setStep] = useState(-1)
  // Intervals sorted by finish time (computed when algorithm runs)
  const [sorted, setSorted] = useState([])
  // Theme preference: 'dark' or 'light'
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tenali-theme') || 'dark' } catch { return 'dark' }
  })

  // ─────── Theme Persistence ──────────────────────────────────
  // Sync theme to DOM and localStorage when changed
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('tenali-theme', theme) } catch {}
  }, [theme])

  // Toggle between dark and light mode
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // ─────── Timeline Constants ──────────────────────────────────
  // Maximum time value on timeline (24 units)
  const TIMELINE_MAX = 24
  // Colors for selected intervals (cycles through these)
  const COLORS = ['#e8864a', '#5cb87a', '#4a90d9', '#d94a8a', '#9b59b6', '#e6c84a', '#2ecc71', '#e74c3c', '#1abc9c', '#f39c12']

  // ─────── Drag State (for timeline interaction) ──────────────────────────────────
  // Is user currently dragging to create interval?
  const [dragging, setDragging] = useState(false)
  // Drag start time (in timeline units)
  const [dragStart, setDragStart] = useState(null)
  // Drag end time (in timeline units)
  const [dragEnd, setDragEnd] = useState(null)
  // Ref to timeline container DOM element
  const timelineRef = useRef(null)

  /**
   * getTimeFromX(clientX): Convert client X coordinate to timeline time unit
   * Maps pixel position within timeline to 0..TIMELINE_MAX range
   * Clamps result to valid range
   */
  const getTimeFromX = (clientX) => {
    const rect = timelineRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const t = Math.round((x / rect.width) * TIMELINE_MAX)
    return Math.max(0, Math.min(TIMELINE_MAX, t))
  }

  /**
   * handleMouseDown(e): Start dragging interval on timeline
   * Disabled if algorithm result is showing (UI locked during visualization)
   * Sets dragging state and initial drag time
   */
  const handleMouseDown = (e) => {
    if (result) return
    const t = getTimeFromX(e.clientX)
    setDragging(true)
    setDragStart(t)
    setDragEnd(t)
  }

  /**
   * handleMouseMove(e): Update drag end time while dragging
   * Called continuously during mouse movement
   */
  const handleMouseMove = (e) => {
    if (!dragging) return
    setDragEnd(getTimeFromX(e.clientX))
  }

  /**
   * handleMouseUp(): Complete interval creation
   * Creates interval if drag distance > 0 (start != end)
   * Adds to intervals array with next available ID
   * Resets drag state
   */
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

  // ─────── Touch Support ──────────────────────────────────
  /**
   * handleTouchStart(e): Start dragging on touch device
   */
  const handleTouchStart = (e) => {
    if (result) return
    const touch = e.touches[0]
    const t = getTimeFromX(touch.clientX)
    setDragging(true)
    setDragStart(t)
    setDragEnd(t)
  }

  /**
   * handleTouchMove(e): Update drag during touch movement
   */
  const handleTouchMove = (e) => {
    if (!dragging) return
    const touch = e.touches[0]
    setDragEnd(getTimeFromX(touch.clientX))
  }

  /**
   * handleTouchEnd(): Complete touch drag (reuses mouse up logic)
   */
  const handleTouchEnd = () => {
    handleMouseUp()
  }

  /**
   * removeInterval(id): Delete interval from list
   * Disabled if algorithm result is showing
   */
  const removeInterval = (id) => {
    if (result) return
    setIntervals(prev => prev.filter(i => i.id !== id))
  }

  /**
   * runGreedy(): Start greedy algorithm visualization
   * Sorts intervals by finish time (then start time as tiebreaker)
   * Initializes step=0 (ready to process first interval)
   */
  const runGreedy = () => {
    const sortedByEnd = [...intervals].sort((a, b) => a.end - b.end || a.start - b.start)
    setSorted(sortedByEnd)
    setStep(0)
    setResult(null)
  }

  /**
   * stepForward(): Advance to next step in algorithm
   * No-op if already at end (step >= sorted.length)
   */
  const stepForward = () => {
    if (step >= sorted.length) return
    setStep(s => s + 1)
  }

  /**
   * runFullAlgorithm(): Skip to end (step = sorted.length)
   * Shows final result immediately without stepping through
   */
  const runFullAlgorithm = () => {
    setStep(sorted.length)
  }

  /**
   * getSelectedAtStep(upToStep): Compute selected intervals up to given step
   * Uses greedy strategy:
   *   - Iterate through sorted intervals (by finish time)
   *   - Include interval if start >= lastEnd (no overlap with previous)
   *   - Skip otherwise
   * Returns: Array of selected {id, start, end} intervals
   */
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

  // ─────── Derived State ──────────────────────────────────
  // Set of selected interval IDs at current step
  const selectedIntervals = step >= 0 ? getSelectedAtStep(step) : []
  // Is algorithm finished? (stepped past all intervals)
  const isFinished = step >= sorted.length && step >= 0
  // Current interval being considered (null if finished or not started)
  const currentConsidering = step >= 0 && step < sorted.length ? sorted[step] : null

  /**
   * wouldBeRejected: Is current interval rejected by greedy algorithm?
   * Checks if currentConsidering.start < lastEnd of selected set
   * If true, interval overlaps with last selected interval
   */
  const wouldBeRejected = (() => {
    if (!currentConsidering) return false
    const sel = getSelectedAtStep(step)
    const lastEnd = sel.length > 0 ? sel[sel.length - 1].end : -Infinity
    return currentConsidering.start < lastEnd
  })()

  /**
   * reset(): Reset algorithm state (go back to "before run")
   * Clears step, sorted intervals, and result
   */
  const reset = () => {
    setResult(null)
    setStep(-1)
    setSorted([])
  }

  /**
   * clearAll(): Reset everything (intervals, step, sorted)
   * Prepares for new scenario
   */
  const clearAll = () => {
    setIntervals([])
    setNextId(1)
    reset()
  }

  /**
   * loadExample(): Load predefined example intervals for demonstration
   * Useful for testing without manual creation
   */
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

  // Set of selected interval IDs for quick lookup in render
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

/* ── Extended Euclidean Algorithm App ──────────────── */
/**
 * ExtendedEuclidApp Component
 * Interactive extended Euclidean algorithm visualization
 * Features:
 *   - Compute gcd(a, b) and coefficients x, y such that ax + by = gcd(a, b)
 *   - Step-by-step table showing r, s, t values and quotients
 *   - Division breakdown showing each step: r_i = q_i * r_(i+1) + r_(i+2)
 *   - Verification: shows ax + by = gcd result
 *
 * Algorithm (Extended Euclidean):
 *   1. Initialize r_0=a, r_1=b, s_0=1, s_1=0, t_0=0, t_1=1
 *   2. While r_1 ≠ 0:
 *        q = floor(r_0 / r_1)
 *        r_2 = r_0 - q*r_1
 *        s_2 = s_0 - q*s_1
 *        t_2 = t_0 - q*t_1
 *        Shift: r_0←r_1, r_1←r_2, s_0←s_1, s_1←s_2, t_0←t_1, t_1←t_2
 *   3. gcd = r_0, x = s_0, y = t_0
 *   Invariant: r_i = s_i*a + t_i*b (verified in table)
 */
function ExtendedEuclidApp() {
  // ─────── Input State ──────────────────────────────────
  // First integer input (as string for input field)
  const [a, setA] = useState('')
  // Second integer input (as string for input field)
  const [b, setB] = useState('')
  // Computation results: {rows, gcd, x, y, a, b} or null if not computed
  const [steps, setSteps] = useState(null)
  // Theme preference: 'dark' or 'light'
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tenali-theme') || 'dark' } catch { return 'dark' }
  })

  // ─────── Theme Persistence ──────────────────────────────────
  // Sync theme to DOM and localStorage when changed
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('tenali-theme', theme) } catch {}
  }, [theme])

  // Toggle between dark and light mode
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  /**
   * compute(): Run extended Euclidean algorithm using BigInt
   * Supports arbitrarily large integers (20+ digits)
   * Computes step-by-step table: rows with {r, s, t, q, step} (all as strings for React)
   * Adjusts final x,y for negative inputs
   */
  const compute = () => {
    const strA = a.trim(), strB = b.trim()
    if (!strA || !strB || !/^-?\d+$/.test(strA) || !/^-?\d+$/.test(strB)) return
    let na, nb
    try { na = BigInt(strA); nb = BigInt(strB) } catch { return }
    if (na === 0n && nb === 0n) return

    // ─────── Initialize Algorithm (BigInt for precision)
    const rows = []
    let r0 = na < 0n ? -na : na
    let r1 = nb < 0n ? -nb : nb
    let s0 = 1n, s1 = 0n
    let t0 = 0n, t1 = 1n

    // Record initial rows (convert to strings for React rendering)
    const S = v => String(v)
    rows.push({ r: S(r0), s: S(s0), t: S(t0), q: null, step: 0 })
    rows.push({ r: S(r1), s: S(s1), t: S(t1), q: null, step: 1 })

    // ─────── Main Loop: Euclid's Algorithm
    let i = 2
    while (r1 !== 0n) {
      const q = r0 / r1
      const r2 = r0 - q * r1
      const s2 = s0 - q * s1
      const t2 = t0 - q * t1

      rows.push({ r: S(r2), s: S(s2), t: S(t2), q: S(q), step: i })

      r0 = r1; r1 = r2
      s0 = s1; s1 = s2
      t0 = t1; t1 = t2
      i++
    }

    // ─────── Final Results
    const signA = na >= 0n ? 1n : -1n
    const signB = nb >= 0n ? 1n : -1n
    const gcd = r0
    const x = s0 * signA
    const y = t0 * signB
    const absA = na < 0n ? -na : na
    const absB = nb < 0n ? -nb : nb

    setSteps({
      rows, gcd: S(gcd), x: S(x), y: S(y),
      a: S(na), b: S(nb), absA: S(absA), absB: S(absB),
      verification: S(x * na + y * nb)
    })
  }

  /**
   * loadExample(): Load predefined example (252, 198)
   * gcd(252, 198) = 18
   */
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
            At each step: r<sub>i</sub> = r<sub>i−2</sub> − q<sub>i</sub> · r<sub>i−1</sub>, and similarly for s<sub>i</sub> and t<sub>i</sub>. When the remainder reaches 0, the previous remainder is the GCD, and the coefficients give the linear combination.
          </div>

          <div className="ee-input-row">
            <div className="ee-field">
              <label className="ee-label">a</label>
              <input
                className="ee-input"
                type="text"
                inputMode="numeric"
                value={a}
                onChange={e => { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) { setA(v); setSteps(null) } }}
                placeholder="e.g. 12345678901234567890"
                onKeyDown={e => e.key === 'Enter' && compute()}
              />
            </div>
            <div className="ee-field">
              <label className="ee-label">b</label>
              <input
                className="ee-input"
                type="text"
                inputMode="numeric"
                value={b}
                onChange={e => { const v = e.target.value; if (v === '' || v === '-' || /^-?\d+$/.test(v)) { setB(v); setSteps(null) } }}
                placeholder="e.g. 98765432109876543210"
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
              <div className="is-result" style={{ marginTop: '24px', wordBreak: 'break-all' }}>
                <strong>gcd({steps.a}, {steps.b}) = {steps.gcd}</strong>
                <br />
                <span style={{ fontSize: '1.05rem' }}>
                  ({steps.x}) × {steps.a} + ({steps.y}) × {steps.b} = {steps.gcd}
                </span>
                <br />
                <span className="is-result-note">
                  Verification: {steps.x} × {steps.a} + {steps.y} × {steps.b} = {steps.verification}
                </span>
              </div>

              {/* Step table */}
              <div className="ee-table-wrap">
                <table className="ee-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>q<sub>i</sub></th>
                      <th>r<sub>i</sub></th>
                      <th>s<sub>i</sub></th>
                      <th>t<sub>i</sub></th>
                      <th>Equation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.rows.map((row, idx) => (
                      <tr key={idx} className={row.r === '0' ? 'ee-row-zero' : idx === steps.rows.length - 2 ? 'ee-row-gcd' : ''}>
                        <td>{row.step}</td>
                        <td>{row.q !== null ? row.q : '—'}</td>
                        <td><strong>{row.r}</strong></td>
                        <td>{row.s}</td>
                        <td>{row.t}</td>
                        <td className="ee-eq">
                          {row.r !== '0' ? (
                            <span>{row.r} = ({row.s}) × {steps.absA} + ({row.t}) × {steps.absB}</span>
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
                      {row.r === '0' && <span className="is-result-note"> (done — gcd is {prev1.r})</span>}
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

/**
 * QuizLayout Component
 * Wrapper layout for quiz apps (PolyFactorApp, PrimeFactorApp, QFormulaApp, etc.)
 * Provides consistent header with back button and title section
 * All quiz content is rendered via children prop
 *
 * @param {Object} props
 * @param {string} props.title - Main heading (e.g., "Prime Factors")
 * @param {string} props.subtitle - Subtitle/description
 * @param {Function} props.onBack - Callback when back button is clicked
 * @param {React.ReactNode} props.children - Quiz content to display
 */
function QuizLayout({ title, subtitle, onBack, children, timer }) {
  return (
    <>
      <div className="header-row">
        <button className="back-button" onClick={onBack}>← Home</button>
        {timer && <div className="timer-pill">{timer.elapsed}s</div>}
      </div>
      <h1>{title}</h1>
      <p className="subtitle">{subtitle}</p>
      {children}
    </>
  )
}

// Export main App component (entry point)
export default App
