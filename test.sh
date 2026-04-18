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

// ── Pre-computed sequence system (matches App.jsx exactly) ──
let currentSlowSet = []
let sequence = []
let seqIndex = -1

const buildSequence = (set, count = 30) => {
  const seq = []
  let last = null
  for (let i = 0; i < count; i++) {
    const candidates = set.filter(m => m !== last)
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    seq.push(pick)
    last = pick
  }
  return seq
}

const checkAndSwap = (tbl) => {
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
}

const pickNext = (tbl) => {
  seqIndex++
  if (seqIndex >= sequence.length) {
    if (currentSlowSet.length === 3) {
      checkAndSwap(tbl)
    } else {
      currentSlowSet = getSlowest3(tbl)
    }
    const lastInOld = sequence.length > 0 ? sequence[sequence.length - 1] : null
    let newSeq = buildSequence(currentSlowSet, 30)
    if (newSeq[0] === lastInOld) {
      const candidates = currentSlowSet.filter(m => m !== lastInOld)
      if (candidates.length > 0) newSeq[0] = candidates[Math.floor(Math.random() * candidates.length)]
    }
    sequence = newSeq
    seqIndex = 0
  }
  return sequence[seqIndex]
}

// advance() — now trivial, just calls pickNext
const advance = (tbl) => {
  return pickNext(tbl)
}

// ── Run simulation ──
const tbl = TABLE_ARG > 0 ? TABLE_ARG : 2 + Math.floor(Math.random() * 49)
const lines = []
let prevSet = ''

lines.push('Table of ' + tbl + ' — 500 questions')
lines.push('='.repeat(50))
lines.push('')

for (let i = 0; i < 500; i++) {
  const mul = advance(tbl)
  const answer = tbl * mul
  const setStr = currentSlowSet.join(', ')

  if (setStr !== prevSet) {
    if (prevSet !== '') lines.push('  SET CHANGED -> focusing on [' + setStr + ']')
    else lines.push('  Starting set: [' + setStr + ']')
    prevSet = setStr
  }

  const qNum = String(i + 1).padStart(3)
  const r = Math.random()
  let status
  if (r < 0.1) {
    recordWrong(tbl, mul)
    status = '  WRONG'
  } else if (r < 0.3) {
    const ms = 4000 + Math.floor(Math.random() * 3000)
    recordCorrect(tbl, mul, ms)
    status = '  ' + (ms / 1000).toFixed(1) + 's (slow)'
  } else {
    const ms = 1500 + Math.floor(Math.random() * 2000)
    recordCorrect(tbl, mul, ms)
    status = '  ' + (ms / 1000).toFixed(1) + 's'
  }

  lines.push('  Q' + qNum + ':  ' + tbl + ' x ' + mul + ' = ' + answer + status)
}

// Check for repeats
const muls = []
for (const line of lines) {
  const match = line.match(/x (\\d+) =/)
  if (match) muls.push(parseInt(match[1]))
}
let repeatCount = 0
let repeatDetails = []
for (let i = 1; i < muls.length; i++) {
  if (muls[i] === muls[i - 1]) {
    repeatCount++
    repeatDetails.push('  Q' + (i + 1) + ': x' + muls[i] + ' repeated')
  }
}

lines.push('')
lines.push('='.repeat(50))
if (repeatCount === 0) {
  lines.push('PASS: 0 consecutive repeats in 500 questions')
} else {
  lines.push('FAIL: ' + repeatCount + ' consecutive repeats found!')
  for (const d of repeatDetails) lines.push(d)
}
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
