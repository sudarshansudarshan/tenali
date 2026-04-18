const ELIGIBLE = [2, 3, 4, 5, 6, 7, 8, 9]
const FAST_THRESHOLD_MS = 3000
const MIN_CORRECT_TO_JUDGE = 3
let store = {}

const rc = (t, m, ms) => {
  const k = t + 'x' + m
  if (store[k] === undefined) store[k] = { times: [], streak: 0 }
  store[k].times.push(ms)
  if (store[k].times.length > 10) store[k].times = store[k].times.slice(-10)
  store[k].streak = (store[k].streak || 0) + 1
}
const stTM = (ts) => {
  if (ts.length <= 2) return ts.reduce((a, b) => a + b, 0) / ts.length
  const s = [...ts].sort((a, b) => a - b)
  const t = Math.max(1, Math.round(s.length * 0.1))
  const m = s.slice(t, s.length - t)
  return m.length ? m.reduce((a, b) => a + b, 0) / m.length : s[Math.floor(s.length / 2)]
}
const gA = (t, m) => {
  const k = t + 'x' + m
  const i = store[k]
  if (i === undefined || i.times.length === 0) return null
  return stTM(i.times)
}
const sh = (a) => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = r[i]; r[i] = r[j]; r[j] = tmp
  }
  return r
}
const gS3 = (t) => {
  const s = []
  for (const m of ELIGIBLE) {
    const a = gA(t, m)
    s.push({ m, avg: a !== null ? a : 99999 })
  }
  if (s.every(x => x.avg === 99999)) return sh(s.map(x => x.m)).slice(0, 3)
  s.sort((a, b) => b.avg - a.avg)
  return s.slice(0, 3).map(x => x.m)
}

let cSS = []
let rotCount = 0

const cAS = (t) => {
  const s = [...cSS]
  let fi = -1, fa = Infinity
  for (let i = 0; i < s.length; i++) {
    const k = t + 'x' + s[i]
    const ts = store[k] ? store[k].times : []
    if (ts.length >= MIN_CORRECT_TO_JUDGE) {
      const a = stTM(ts)
      if (a < fa) { fa = a; fi = i }
    }
  }
  if (fi !== -1 && fa < FAST_THRESHOLD_MS) {
    const cs = new Set(s)
    const cd = ELIGIBLE.filter(m => cs.has(m) === false)
    if (cd.length > 0) {
      s[fi] = cd[Math.floor(Math.random() * cd.length)]
      cSS = [...s]
    }
  }
}

// pickNext takes exclude param = what user currently sees
const pN = (t, exclude) => {
  if (cSS.length !== 3) cSS = gS3(t)
  rotCount++
  if (rotCount >= 9) { cAS(t); rotCount = 0 }
  const candidates = cSS.filter(m => m !== exclude)
  return candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : cSS[Math.floor(Math.random() * cSS.length)]
}

// advance with debounce — mirrors React code exactly
let displayed = null
let locked = false

const advance = (t) => {
  if (locked) return null // blocked by debounce
  locked = true
  // In real code: setTimeout(() => locked = false, 300)
  // For double-fire test, we unlock manually after each "round"
  const next = pN(t, displayed)
  displayed = next
  return next
}

// TEST 1: Normal — 1000 questions (with debounce, so single fire)
console.log('=== With debounce (single fire per round) ===')
store = {}; cSS = []; rotCount = 0; displayed = null; locked = false
const muls = []
for (let i = 0; i < 1000; i++) {
  locked = false // unlock for next round
  const m = advance(13)
  muls.push(m)
  rc(13, m, 1000 + Math.random() * 8000)
}
let reps = 0
for (let i = 1; i < muls.length; i++) {
  if (muls[i] === muls[i - 1]) reps++
}
console.log('TEST 1 — Normal 1000 questions, consecutive repeats:', reps)

// TEST 2: DOUBLE-FIRE with debounce — second call is BLOCKED
store = {}; cSS = []; rotCount = 0; displayed = null; locked = false
const muls2 = []
for (let i = 0; i < 1000; i++) {
  locked = false // unlock for next round
  const m1 = advance(13)     // first fire goes through
  const m2 = advance(13)     // second fire — BLOCKED by debounce, returns null
  muls2.push(m1)             // user sees m1 (m2 was blocked)
  rc(13, m1, 2000 + Math.random() * 3000)
}
let reps2 = 0
for (let i = 1; i < muls2.length; i++) {
  if (muls2[i] === muls2[i - 1]) reps2++
}
console.log('TEST 2 — DOUBLE-FIRE with debounce, consecutive repeats:', reps2)

// TEST 3: Without debounce (worst case) — pickNext still uses exclude
store = {}; cSS = []; rotCount = 0; displayed = null
const muls3 = []
for (let i = 0; i < 1000; i++) {
  // No debounce, both fires go through
  const m1 = pN(13, displayed)
  displayed = m1
  const m2 = pN(13, displayed)
  displayed = m2
  muls3.push(m2) // user sees m2
  rc(13, m2, 2000 + Math.random() * 3000)
}
let reps3 = 0
for (let i = 1; i < muls3.length; i++) {
  if (muls3[i] === muls3[i - 1]) reps3++
}
console.log('TEST 3 — NO debounce double-fire (worst case), consecutive repeats:', reps3)

// TEST 4: Only ELIGIBLE
const all = [...muls, ...muls2, ...muls3]
console.log('TEST 4 — Invalid multipliers:', all.filter(m => ELIGIBLE.indexOf(m) === -1).length)
