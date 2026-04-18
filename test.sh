#!/bin/bash
# test.sh — Tests the SuperTables1 cycling logic with live simulation
# Usage: ./test.sh [table_number]  (default: random 2-50)

set -e
cd "$(dirname "$0")"

TABLE=${1:-0}

node --eval "
const TABLE_ARG = ${TABLE}
const ELIGIBLE = [2, 3, 4, 5, 6, 7, 8, 9]
const FAST_THRESHOLD_MS = 3000
const MIN_CORRECT_TO_JUDGE = 3

let store = {}
const recordCorrect = (tbl, mul, ms) => {
  const k = tbl + 'x' + mul
  if (!store[k]) store[k] = { times: [], streak: 0 }
  store[k].times.push(ms)
  if (store[k].times.length > 10) store[k].times = store[k].times.slice(-10)
  store[k].streak = (store[k].streak || 0) + 1
}
const recordWrong = (tbl, mul) => {
  const k = tbl + 'x' + mul
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
  const k = tbl + 'x' + mul
  const info = store[k]
  if (!info || info.times.length === 0) return null
  return stTrimmedMean(info.times)
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
        const k = tbl + 'x' + set[i]
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

// ── Run simulation ──
const tbl = TABLE_ARG > 0 ? TABLE_ARG : 2 + Math.floor(Math.random() * 49)
const lines = []
let prevSet = ''
let repeats = 0

lines.push('Table of ' + tbl + ' — 500 questions')
lines.push('═'.repeat(50))
lines.push('')

for (let i = 0; i < 500; i++) {
  const mul = advance(tbl)
  const answer = tbl * mul
  const setStr = currentSlowSet.join(', ')

  // Check consecutive repeat
  let flag = ''
  if (i > 0 && lines.length > 3) {
    const prevMul = lines[lines.length - 1].match(/× (\\d+)/);
    // we track via displayedMul instead
  }

  // Detect set change
  if (setStr !== prevSet) {
    if (prevSet !== '') lines.push('  ┌─ SET CHANGED → focusing on [' + setStr + ']')
    else lines.push('  ┌─ Starting set: [' + setStr + ']')
    prevSet = setStr
  }

  const qNum = String(i + 1).padStart(3)

  // Simulate answer: 70% fast correct, 20% slow correct, 10% wrong
  const r = Math.random()
  let status, ms
  if (r < 0.1) {
    recordWrong(tbl, mul)
    status = '  ✗ WRONG'
    ms = 0
  } else if (r < 0.3) {
    ms = 4000 + Math.floor(Math.random() * 3000)
    recordCorrect(tbl, mul, ms)
    status = '  ' + (ms / 1000).toFixed(1) + 's (slow)'
  } else {
    ms = 1500 + Math.floor(Math.random() * 2000)
    recordCorrect(tbl, mul, ms)
    status = '  ' + (ms / 1000).toFixed(1) + 's'
  }

  lines.push('  Q' + qNum + ':  ' + tbl + ' × ' + mul + ' = ' + answer + status)
}

// Check for repeats
let repeatCount = 0
const muls = []
for (const line of lines) {
  const match = line.match(/× (\\d+) =/)
  if (match) muls.push(parseInt(match[1]))
}
for (let i = 1; i < muls.length; i++) {
  if (muls[i] === muls[i - 1]) repeatCount++
}

lines.push('')
lines.push('═'.repeat(50))
lines.push(repeatCount === 0
  ? '✅ 0 consecutive repeats in 500 questions'
  : '❌ ' + repeatCount + ' consecutive repeats found!')
lines.push('')

// Output all lines as JSON array for bash to print with delay
console.log(JSON.stringify(lines))
" | node --eval "
const readline = require('readline');
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const lines = JSON.parse(data);
  let i = 0;
  const printNext = () => {
    if (i >= lines.length) return process.exit(0);
    console.log(lines[i++]);
    setTimeout(printNext, 100);
  };
  printNext();
});
"
