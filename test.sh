#!/bin/bash
# test.sh — Tests the SuperTables1 cycling logic in isolation
# Usage: ./test.sh

set -e
cd "$(dirname "$0")"

echo "🧪 Running SuperTables1 cycling logic tests..."
echo ""

node --eval '
// ═══════════════════════════════════════════════════════════
// Extract the pure logic from App.jsx and test it
// ═══════════════════════════════════════════════════════════

const ELIGIBLE = [2, 3, 4, 5, 6, 7, 8, 9]
const FAST_THRESHOLD_MS = 3000
const MIN_CORRECT_TO_JUDGE = 3

// ── Simulated storage ──
let store = {}

const recordCorrect = (tbl, mul, ms) => {
  const k = tbl + "x" + mul
  if (!store[k]) store[k] = { times: [], streak: 0 }
  store[k].times.push(ms)
  if (store[k].times.length > 10) store[k].times = store[k].times.slice(-10)
  store[k].streak = (store[k].streak || 0) + 1
}
const recordWrong = (tbl, mul) => {
  const k = tbl + "x" + mul
  if (!store[k]) store[k] = { times: [], streak: 0 }
  store[k].streak = 0
}

const stTrimmedMean = (times) => {
  if (!times || times.length === 0) return 0
  if (times.length <= 2) return times.reduce((a, b) => a + b, 0) / times.length
  const sorted = [...times].sort((a, b) => a - b)
  const trim = Math.max(1, Math.round(sorted.length * 0.1))
  const trimmed = sorted.slice(trim, sorted.length - trim)
  if (trimmed.length === 0) return sorted[Math.floor(sorted.length / 2)]
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length
}

const getAvg = (tbl, mul) => {
  const k = tbl + "x" + mul
  const info = store[k]
  if (!info || info.times.length === 0) return null
  return stTrimmedMean(info.times)
}
const getStreak = (tbl, mul) => {
  const k = tbl + "x" + mul
  return store[k] ? (store[k].streak || 0) : 0
}

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const getSlowest3 = (tbl) => {
  const scored = []
  for (const m of ELIGIBLE) {
    const avg = getAvg(tbl, m)
    scored.push({ m, avg: avg !== null ? avg : 99999 })
  }
  const hasData = scored.some(s => s.avg !== 99999)
  if (!hasData) return shuffle(scored.map(s => s.m)).slice(0, 3)
  scored.sort((a, b) => b.avg - a.avg)
  return scored.slice(0, 3).map(s => s.m)
}

// ── Simulated refs ──
let cycleQueue = []
let currentSlowSet = []
let lastAsked = null
let displayedMul = null

const pickNext = (tbl) => {
  if (cycleQueue.length === 0) {
    if (currentSlowSet.length === 3) {
      const set = [...currentSlowSet]
      let fastestIdx = -1, fastestAvg = Infinity
      for (let i = 0; i < set.length; i++) {
        const k = tbl + "x" + set[i]
        const times = store[k] ? store[k].times : []
        if (times.length >= MIN_CORRECT_TO_JUDGE) {
          const avg = stTrimmedMean(times)
          if (avg < fastestAvg) { fastestAvg = avg; fastestIdx = i }
        }
      }
      if (fastestIdx !== -1 && fastestAvg < FAST_THRESHOLD_MS) {
        const currentS = new Set(set)
        const candidates = ELIGIBLE.filter(m => !currentS.has(m))
        if (candidates.length > 0) {
          set[fastestIdx] = candidates[Math.floor(Math.random() * candidates.length)]
          currentSlowSet = [...set]
        }
      }
    } else {
      currentSlowSet = getSlowest3(tbl)
    }
    let shuffled = shuffle([...currentSlowSet])
    if (shuffled.length > 1 && shuffled[0] === lastAsked) {
      const swapIdx = 1 + Math.floor(Math.random() * (shuffled.length - 1))
      ;[shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]]
    }
    cycleQueue = shuffled
  }
  let next = cycleQueue.shift()
  if (next === lastAsked) {
    if (cycleQueue.length > 0) {
      cycleQueue.push(next)
      next = cycleQueue.shift()
    } else {
      const others = currentSlowSet.filter(m => m !== next)
      if (others.length > 0) {
        const picked = others[Math.floor(Math.random() * others.length)]
        cycleQueue = shuffle(currentSlowSet.filter(m => m !== picked))
        next = picked
      }
    }
  }
  lastAsked = next
  return next
}

// advance() mirrors the React version (NO side effects inside setState)
const advance = (tbl) => {
  let next = pickNext(tbl)
  if (next === displayedMul) next = pickNext(tbl)
  if (next == null || next === displayedMul) {
    const others = currentSlowSet.filter(m => m !== displayedMul)
    if (others.length > 0) next = others[Math.floor(Math.random() * others.length)]
  }
  displayedMul = next
  lastAsked = next
  return next
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

let passed = 0
let failed = 0
const assert = (condition, msg) => {
  if (condition) { passed++; }
  else { failed++; console.log("  ❌ FAIL: " + msg); }
}

// ── TEST 1: 500 questions on a random table — full sequence printout ──
const randomTable = 2 + Math.floor(Math.random() * 49) // random table 2-50
console.log("TEST 1: 500 questions on table of " + randomTable + " — full sequence")
store = {}
cycleQueue = []; currentSlowSet = []; lastAsked = null; displayedMul = null
const seq500 = []
const setLog = [] // log slow set changes
let prevSet = ""
for (let i = 0; i < 500; i++) {
  const mul = advance(randomTable)
  seq500.push(mul)
  const setStr = "[" + currentSlowSet.join(",") + "]"
  if (setStr !== prevSet) {
    setLog.push({ q: i + 1, set: setStr })
    prevSet = setStr
  }
  // simulate: 70% correct fast, 20% correct slow, 10% wrong
  const r = Math.random()
  if (r < 0.1) {
    recordWrong(randomTable, mul)
  } else if (r < 0.3) {
    recordCorrect(randomTable, mul, 4000 + Math.random() * 3000) // slow 4-7s
  } else {
    recordCorrect(randomTable, mul, 1500 + Math.random() * 2000) // fast 1.5-3.5s
  }
}

// Print sequence in rows of 25
console.log("")
console.log("  Full sequence (×multiplier):")
for (let i = 0; i < seq500.length; i += 25) {
  const row = seq500.slice(i, i + 25).map(m => String(m).padStart(2)).join(" ")
  console.log("  Q" + String(i + 1).padStart(3) + "-" + String(Math.min(i + 25, 500)).padStart(3) + ": " + row)
}

// Print set changes
console.log("")
console.log("  Slow set changes over time:")
for (const entry of setLog) {
  console.log("    Q" + String(entry.q).padStart(3) + ": focused on " + entry.set)
}

// Check for consecutive repeats
let repeats500 = 0
let repeatPos500 = []
for (let i = 1; i < seq500.length; i++) {
  if (seq500[i] === seq500[i - 1]) {
    repeats500++
    repeatPos500.push("Q" + (i + 1) + ": ×" + seq500[i] + " (after ×" + seq500[i - 1] + ")")
  }
}
console.log("")
assert(repeats500 === 0,
  repeats500 + " consecutive repeats found!")
if (repeats500 === 0) {
  console.log("  ✅ 0 consecutive repeats in 500 questions")
} else {
  console.log("  Repeat locations:")
  for (const r of repeatPos500) console.log("    " + r)
}

// Check only eligible multipliers
const uniq500 = [...new Set(seq500)]
const invalid500 = uniq500.filter(m => !ELIGIBLE.includes(m))
assert(invalid500.length === 0,
  "Found invalid multipliers: " + invalid500.join(","))
if (invalid500.length === 0) console.log("  ✅ All multipliers in range 2-9")

// Check slow set always 3
console.log("")

// ── TEST 2: No consecutive repeats (another 1000 questions, different table) ──
console.log("TEST 2: Stress — 1000 questions on table of 37")
store = {}
cycleQueue = []; currentSlowSet = []; lastAsked = null; displayedMul = null
const bigSeq = []
for (let i = 0; i < 1000; i++) {
  const mul = advance(37)
  bigSeq.push(mul)
  recordCorrect(37, mul, 1000 + Math.random() * 8000)
}
let bigRepeats = 0
for (let i = 1; i < bigSeq.length; i++) {
  if (bigSeq[i] === bigSeq[i - 1]) bigRepeats++
}
assert(bigRepeats === 0, bigRepeats + " consecutive repeats in 1000 questions")
if (bigRepeats === 0) console.log("  ✅ 0 consecutive repeats in 1000 questions")

// ── TEST 3: Slow set always has 3 ──
console.log("TEST 3: Slow set always has exactly 3 facts")
store = {}
cycleQueue = []; currentSlowSet = []; lastAsked = null; displayedMul = null
let badSizes = 0
for (let i = 0; i < 500; i++) {
  const mul = advance(randomTable)
  if (currentSlowSet.length !== 3) badSizes++
  recordCorrect(randomTable, mul, 2000 + Math.random() * 4000)
}
assert(badSizes === 0, badSizes + " times slow set was not exactly 3")
if (badSizes === 0) console.log("  ✅ Always exactly 3 elements")

// ── TEST 4: Questions always from current slow set ──
console.log("TEST 4: Questions come from the current slow set")
store = {}
cycleQueue = []; currentSlowSet = []; lastAsked = null; displayedMul = null
let violations = 0
for (let i = 0; i < 500; i++) {
  const mul = advance(randomTable)
  if (!currentSlowSet.includes(mul)) violations++
  recordCorrect(randomTable, mul, 2000 + Math.random() * 4000)
}
assert(violations === 0, violations + " questions NOT from slow set")
if (violations === 0) console.log("  ✅ All questions from current slow set")

// ── TEST 5: Fast fact swap ──
console.log("TEST 5: Fast fact gets swapped out")
store = {}
cycleQueue = []; currentSlowSet = []; lastAsked = null; displayedMul = null
for (let i = 0; i < 6; i++) {
  const mul = advance(randomTable)
  recordCorrect(randomTable, mul, 5000)
}
const initSet = [...currentSlowSet]
const ff = initSet[0]
for (let i = 0; i < 5; i++) recordCorrect(randomTable, ff, 1000)
let swapped = false
for (let i = 0; i < 30; i++) {
  const mul = advance(randomTable)
  if (!initSet.includes(mul)) { swapped = true; break }
  recordCorrect(randomTable, mul, mul === ff ? 1000 : 5000)
}
assert(swapped, "Fast fact ×" + ff + " never swapped")
if (swapped) {
  console.log("  ✅ ×" + ff + " swapped out → new set: [" + currentSlowSet.join(",") + "]")
  const kept = initSet.filter(m => currentSlowSet.includes(m))
  assert(kept.length === 2, "Expected 2 kept, got " + kept.length)
  if (kept.length === 2) console.log("  ✅ Exactly 1 replaced, 2 kept")
}

// ── TEST 6: Wrong answers excluded ──
console.log("TEST 6: Wrong answers excluded from timing")
store = {}
for (let i = 0; i < 5; i++) recordWrong(13, 5)
assert(getAvg(13, 5) === null, "Expected null avg after wrongs")
if (getAvg(13, 5) === null) console.log("  ✅ No timing data from wrong answers")

// ── TEST 7: Rolling window ──
console.log("TEST 7: Rolling window = last 10")
store = {}
for (let i = 0; i < 20; i++) recordCorrect(13, 4, 5000)
assert(store["13x4"].times.length === 10, "Expected 10")
if (store["13x4"].times.length === 10) console.log("  ✅ Only 10 times kept")

// ── TEST 8: Trimmed mean ──
console.log("TEST 8: Trimmed mean correctness")
const tm = stTrimmedMean([100, 200, 300, 400, 500, 600, 700, 800, 900, 10000])
assert(Math.abs(tm - 550) < 0.01, "Expected 550, got " + tm)
if (Math.abs(tm - 550) < 0.01) console.log("  ✅ Trimmed mean = " + tm)

// ── TEST 9: No undefined/null in sequence ──
console.log("TEST 9: No undefined or null values in sequence")
const undefs = seq500.filter(m => m == null)
assert(undefs.length === 0, undefs.length + " null/undefined values found")
if (undefs.length === 0) console.log("  ✅ All 500 values are valid numbers")

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
console.log("")
console.log("════════════════════════════════")
console.log("Results: " + passed + " passed, " + failed + " failed")
console.log("════════════════════════════════")
if (failed > 0) process.exit(1)
'

echo ""
echo "✅ All tests complete."
