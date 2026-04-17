import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Utility helpers ────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateTable(n) {
  return Array.from({ length: 10 }, (_, i) => ({
    multiplier: i + 1,
    expression: `${n} × ${i + 1}`,
    answer: n * (i + 1),
  }));
}

function generateDistractors(correct, tableNum) {
  const tableAnswers = Array.from({ length: 10 }, (_, i) => tableNum * (i + 1));
  const distractorSet = new Set();
  // Add some from the table itself
  tableAnswers.forEach((a) => { if (a !== correct) distractorSet.add(a); });
  // Add close values
  [correct - 1, correct + 1, correct - tableNum, correct + tableNum, correct - 10, correct + 10].forEach((v) => {
    if (v > 0 && v !== correct) distractorSet.add(v);
  });
  const pool = shuffle([...distractorSet]).slice(0, 10);
  // pick 3
  const picked = shuffle(pool).slice(0, 3);
  while (picked.length < 3) picked.push(correct + picked.length + 1);
  return shuffle([correct, ...picked]);
}

function maskDigit(answer) {
  const s = String(answer);
  if (s.length === 1) return { masked: "*", pos: 0 };
  const pos = Math.floor(Math.random() * s.length);
  return { masked: s.slice(0, pos) + "*" + s.slice(pos + 1), pos };
}

// ─── Cookie helpers (session-based adaptive tracking) ────────────────
function getAdaptiveData() {
  try {
    const raw = document.cookie.split("; ").find((c) => c.startsWith("st_adaptive="));
    if (raw) return JSON.parse(decodeURIComponent(raw.split("=")[1]));
  } catch {}
  return {};
}
function setAdaptiveData(data) {
  document.cookie = `st_adaptive=${encodeURIComponent(JSON.stringify(data))}; path=/; SameSite=Lax`;
}
function recordAttempt(tableNum, multiplier, correct, timeTaken) {
  const d = getAdaptiveData();
  const key = `${tableNum}x${multiplier}`;
  if (!d[key]) d[key] = { wrong: 0, totalTime: 0, attempts: 0 };
  d[key].attempts++;
  d[key].totalTime += timeTaken;
  if (!correct) d[key].wrong++;
  setAdaptiveData(d);
}
function getWeakQuestions(tableNum) {
  const d = getAdaptiveData();
  const weak = [];
  for (let m = 1; m <= 10; m++) {
    const key = `${tableNum}x${m}`;
    const info = d[key];
    if (info && (info.wrong > 0 || info.totalTime / info.attempts > 5000)) {
      weak.push({ multiplier: m, score: info.wrong * 2 + info.totalTime / info.attempts / 1000 });
    }
  }
  weak.sort((a, b) => b.score - a.score);
  return weak.map((w) => w.multiplier);
}

// ─── Shared components ──────────────────────────────────────────────
function TableDisplay({ tableNum, entries, horizontal = true, hideMultiplier = null }) {
  const filtered = hideMultiplier != null ? entries.filter((e) => e.multiplier !== hideMultiplier) : entries;
  if (horizontal) {
    return (
      <div className="overflow-x-auto mb-6">
        <table className="mx-auto border-collapse">
          <thead>
            <tr>{filtered.map((e, i) => <th key={i} className="px-3 py-2 text-sm font-semibold text-indigo-700 border border-indigo-200 bg-indigo-50">{tableNum} × {e.multiplier}</th>)}</tr>
          </thead>
          <tbody>
            <tr>{filtered.map((e, i) => <td key={i} className="px-3 py-2 text-center font-bold text-lg border border-indigo-200 bg-white">{e.answer}</td>)}</tr>
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="mb-6 flex justify-center">
      <table className="border-collapse">
        <tbody>
          {filtered.map((e, i) => (
            <tr key={i}>
              <td className="px-4 py-1 text-right font-semibold text-indigo-700 border border-indigo-200 bg-indigo-50">{e.expression}</td>
              <td className="px-4 py-1 text-center text-lg font-bold border border-indigo-200 bg-white">=</td>
              <td className="px-4 py-1 text-left text-lg font-bold border border-indigo-200 bg-white">{e.answer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuestionCard({ question, children, current, total }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-400 font-medium">Question {current} of {total}</span>
        <ProgressDots current={current} total={total} />
      </div>
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">{question}</h2>
      {children}
    </div>
  );
}

function ProgressDots({ current, total }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < current ? "bg-indigo-500" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

function InputAnswer({ onSubmit, autoFocus = true }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  const handle = (e) => {
    e.preventDefault();
    if (val.trim()) { onSubmit(parseInt(val, 10)); setVal(""); }
  };
  return (
    <form onSubmit={handle} className="flex justify-center gap-3">
      <input ref={ref} type="number" value={val} onChange={(e) => setVal(e.target.value)}
        className="w-32 text-center text-2xl font-bold border-2 border-indigo-300 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        placeholder="?" />
      <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-6 py-2 rounded-xl transition-colors">Submit</button>
    </form>
  );
}

function Feedback({ correct, correctAnswer, onNext }) {
  return (
    <div className={`mt-4 p-4 rounded-xl text-center ${correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
      <p className={`text-lg font-bold ${correct ? "text-green-600" : "text-red-600"}`}>
        {correct ? "Correct!" : `Not quite — the answer is ${correctAnswer}`}
      </p>
      <button onClick={onNext} className="mt-3 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">Next →</button>
    </div>
  );
}

function ScoreScreen({ score, total, onRestart, onMenu }) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 80 ? "🌟" : pct >= 50 ? "👍" : "💪";
  return (
    <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4">{emoji}</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Level Complete!</h2>
      <p className="text-5xl font-black text-indigo-600 mb-1">{score}/{total}</p>
      <p className="text-gray-400 mb-6">{pct}% correct</p>
      <div className="flex justify-center gap-3">
        <button onClick={onRestart} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl transition-colors">Try Again</button>
        <button onClick={onMenu} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-5 py-2 rounded-xl transition-colors">Menu</button>
      </div>
    </div>
  );
}

// ─── Level components ───────────────────────────────────────────────

// LEVEL 1 — Sequential Table Recall (horizontal, 5+5 split)
function Level1({ tableNum, onFinish }) {
  const table = useMemo(() => generateTable(tableNum), [tableNum]);
  const firstHalf = table.slice(0, 5);
  const secondHalf = table.slice(5);
  // 10 questions per half: each entry asked twice sequentially (forward then forward again)
  const questions = useMemo(() => [
    ...firstHalf, ...firstHalf,
    ...secondHalf, ...secondHalf,
  ], [firstHalf, secondHalf]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const done = idx >= 20 && fb === null;
  const half = idx < 10 ? 0 : 1;
  const displayEntries = half === 0 ? firstHalf : secondHalf;
  const current = questions[Math.min(idx, questions.length - 1)];

  const handleSubmit = (ans) => {
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={20} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;
  return (
    <div>
      <TableDisplay tableNum={tableNum} entries={displayEntries} horizontal />
      <QuestionCard question={`${current.expression} = ?`} current={idx + 1} total={20}>
        {fb ? <Feedback {...fb} onNext={next} /> : <InputAnswer onSubmit={handleSubmit} />}
      </QuestionCard>
    </div>
  );
}

// LEVEL 2 — Random Recall (horizontal, 5+5 split)
function Level2({ tableNum, onFinish }) {
  const table = useMemo(() => generateTable(tableNum), [tableNum]);
  const firstHalf = table.slice(0, 5);
  const secondHalf = table.slice(5);
  // 10 random questions per half (each entry asked twice, shuffled)
  const questions = useMemo(() => [
    ...shuffle([...firstHalf, ...firstHalf]),
    ...shuffle([...secondHalf, ...secondHalf]),
  ], [firstHalf, secondHalf]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const done = idx >= 20 && fb === null;
  const half = idx < 10 ? 0 : 1;
  const displayEntries = half === 0 ? firstHalf : secondHalf;
  const current = questions[Math.min(idx, questions.length - 1)];

  const handleSubmit = (ans) => {
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={20} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;
  return (
    <div>
      <TableDisplay tableNum={tableNum} entries={displayEntries} horizontal />
      <QuestionCard question={`${current.expression} = ?`} current={idx + 1} total={20}>
        {fb ? <Feedback {...fb} onNext={next} /> : <InputAnswer onSubmit={handleSubmit} />}
      </QuestionCard>
    </div>
  );
}

// LEVEL 3 — Timed Answer Visibility
function Level3({ tableNum, onFinish }) {
  const questions = useMemo(() => shuffle(generateTable(tableNum)), [tableNum]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("show"); // show | fading | ask
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const current = questions[Math.min(idx, questions.length - 1)];
  const done = idx >= 10 && fb === null;

  useEffect(() => {
    if (phase === "show") {
      const t = setTimeout(() => setPhase("fading"), 2000);
      return () => clearTimeout(t);
    }
    if (phase === "fading") {
      const t = setTimeout(() => setPhase("ask"), 800);
      return () => clearTimeout(t);
    }
  }, [phase, idx]);

  const handleSubmit = (ans) => {
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setPhase("show"); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={10} onRestart={() => { setIdx(0); setScore(0); setFb(null); setPhase("show"); }} onMenu={onFinish} />;

  return (
    <QuestionCard question={`${current.expression} = ?`} current={idx + 1} total={10}>
      {phase !== "ask" && (
        <div className="text-center mb-4">
          <span className={`text-5xl font-black text-indigo-600 transition-opacity duration-700 ${phase === "fading" ? "opacity-0" : "opacity-100"}`}>
            {current.answer}
          </span>
        </div>
      )}
      {phase === "ask" && !fb && <InputAnswer onSubmit={handleSubmit} />}
      {fb && <Feedback {...fb} onNext={next} />}
    </QuestionCard>
  );
}

// LEVEL 4 — Partial Shuffled Table (5 visible, questions from visible)
function Level4({ tableNum, onFinish }) {
  const table = useMemo(() => generateTable(tableNum), [tableNum]);
  const visible = useMemo(() => shuffle(table).slice(0, 5), [table]);
  const questions = useMemo(() => shuffle(visible), [visible]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const current = questions[Math.min(idx, questions.length - 1)];
  const done = idx >= 5 && fb === null;

  const handleSubmit = (ans) => {
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={5} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;
  return (
    <div>
      <TableDisplay tableNum={tableNum} entries={visible} horizontal />
      <QuestionCard question={`${current.expression} = ?`} current={idx + 1} total={5}>
        {fb ? <Feedback {...fb} onNext={next} /> : <InputAnswer onSubmit={handleSubmit} />}
      </QuestionCard>
    </div>
  );
}

// LEVEL 5 — Missing Digit Identification
function Level5({ tableNum, onFinish }) {
  const table = useMemo(() => generateTable(tableNum), [tableNum]);
  const questions = useMemo(() => shuffle(table).map((e) => {
    const { masked } = maskDigit(e.answer);
    return { ...e, masked };
  }), [table]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const current = questions[Math.min(idx, questions.length - 1)];
  const done = idx >= 10 && fb === null;

  const handleSubmit = (ans) => {
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={10} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;
  return (
    <QuestionCard question={`${current.expression} = ${current.masked}`} current={idx + 1} total={10}>
      <p className="text-center text-gray-500 text-sm mb-4">Type the complete answer</p>
      {fb ? <Feedback {...fb} onNext={next} /> : <InputAnswer onSubmit={handleSubmit} />}
    </QuestionCard>
  );
}

// LEVEL 6 — Multiple Choice Questions
function Level6({ tableNum, onFinish }) {
  const questions = useMemo(() => shuffle(generateTable(tableNum)), [tableNum]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const current = questions[Math.min(idx, questions.length - 1)];
  const options = useMemo(() => generateDistractors(current.answer, tableNum), [current, tableNum]);
  const done = idx >= 10 && fb === null;

  const handlePick = (ans) => {
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={10} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;
  return (
    <QuestionCard question={`${current.expression} = ?`} current={idx + 1} total={10}>
      {!fb ? (
        <div className="grid grid-cols-2 gap-3">
          {options.map((o, i) => (
            <button key={i} onClick={() => handlePick(o)}
              className="bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 text-indigo-800 font-bold text-xl py-3 rounded-xl transition-colors">
              {o}
            </button>
          ))}
        </div>
      ) : <Feedback {...fb} onNext={next} />}
    </QuestionCard>
  );
}

// LEVEL 7 — Match the Following (3 pairs, drag-or-click matching)
function Level7({ tableNum, onFinish }) {
  const table = useMemo(() => generateTable(tableNum), [tableNum]);
  const rounds = useMemo(() => {
    const shuffled = shuffle(table);
    const r = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      const group = shuffled.slice(i, i + 3);
      if (group.length === 3) r.push(group);
    }
    return r.length > 0 ? r : [shuffled.slice(0, 3)];
  }, [table]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState(null); // index in questions
  const [matched, setMatched] = useState([]); // indices of matched pairs
  const [wrong, setWrong] = useState(false);
  const [score, setScore] = useState(0);
  const done = roundIdx >= rounds.length;

  const currentRound = rounds[Math.min(roundIdx, rounds.length - 1)];
  const shuffledAnswers = useMemo(() => shuffle(currentRound.map((e) => e.answer)), [currentRound, roundIdx]);

  const handleSelect = (qIdx) => { setSelected(qIdx); setWrong(false); };
  const handleAnswer = (ans) => {
    if (selected === null) return;
    if (currentRound[selected].answer === ans) {
      setMatched((m) => [...m, selected]);
      setScore((s) => s + 1);
      setSelected(null);
    } else {
      setWrong(true);
    }
  };

  useEffect(() => {
    if (matched.length === 3) {
      const t = setTimeout(() => { setRoundIdx((r) => r + 1); setMatched([]); setSelected(null); setWrong(false); }, 800);
      return () => clearTimeout(t);
    }
  }, [matched]);

  if (done) return <ScoreScreen score={score} total={rounds.length * 3} onRestart={() => { setRoundIdx(0); setScore(0); setMatched([]); setSelected(null); }} onMenu={onFinish} />;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-400 font-medium">Round {roundIdx + 1} of {rounds.length}</span>
      </div>
      <h2 className="text-xl font-bold text-center text-gray-800 mb-6">Match each question to its answer</h2>
      {wrong && <p className="text-center text-red-500 text-sm mb-2 font-medium">Not a match — try again!</p>}
      <div className="flex justify-between gap-6">
        {/* Questions column */}
        <div className="flex-1 flex flex-col gap-3">
          {currentRound.map((e, i) => (
            <button key={i} disabled={matched.includes(i)}
              onClick={() => handleSelect(i)}
              className={`py-3 px-4 rounded-xl font-bold text-lg border-2 transition-all
                ${matched.includes(i) ? "bg-green-100 border-green-300 text-green-700 opacity-60"
                  : selected === i ? "bg-indigo-100 border-indigo-500 text-indigo-800 ring-2 ring-indigo-300"
                  : "bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-300"}`}>
              {e.expression}
            </button>
          ))}
        </div>
        {/* Answers column */}
        <div className="flex-1 flex flex-col gap-3">
          {shuffledAnswers.map((ans, i) => {
            const isMatched = matched.some((mi) => currentRound[mi].answer === ans);
            return (
              <button key={i} disabled={isMatched || selected === null}
                onClick={() => handleAnswer(ans)}
                className={`py-3 px-4 rounded-xl font-bold text-lg border-2 transition-all
                  ${isMatched ? "bg-green-100 border-green-300 text-green-700 opacity-60"
                    : selected !== null ? "bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400 hover:bg-amber-100 cursor-pointer"
                    : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"}`}>
                {ans}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// LEVEL 8 — Adaptive MCQ
function Level8({ tableNum, onFinish }) {
  const table = useMemo(() => generateTable(tableNum), [tableNum]);
  const questions = useMemo(() => {
    const weak = getWeakQuestions(tableNum);
    const weakEntries = weak.slice(0, 5).map((m) => table.find((e) => e.multiplier === m)).filter(Boolean);
    const others = shuffle(table.filter((e) => !weak.includes(e.multiplier)));
    const mixed = [...weakEntries];
    // fill to 10 with others
    for (const o of others) { if (mixed.length >= 10) break; if (!mixed.find((m) => m.multiplier === o.multiplier)) mixed.push(o); }
    while (mixed.length < 10) mixed.push(table[mixed.length % 10]);
    return shuffle(mixed);
  }, [tableNum, table]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  const current = questions[Math.min(idx, questions.length - 1)];

  const options = useMemo(() => {
    const tableAnswers = Array.from({ length: 10 }, (_, i) => tableNum * (i + 1)).filter((a) => a !== current.answer);
    const fromTable = shuffle(tableAnswers).slice(0, 2);
    const close = [current.answer + Math.ceil(Math.random() * 3) * (Math.random() > 0.5 ? 1 : -1)].filter((v) => v > 0 && v !== current.answer && !fromTable.includes(v));
    const distractors = [...fromTable, ...close];
    while (distractors.length < 3) distractors.push(current.answer + distractors.length + 1);
    return shuffle([current.answer, ...distractors.slice(0, 3)]);
  }, [current, tableNum]);

  const done = idx >= 10 && fb === null;

  useEffect(() => { setStartTime(Date.now()); }, [idx]);

  const handlePick = (ans) => {
    const timeTaken = Date.now() - startTime;
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    recordAttempt(tableNum, current.multiplier, correct, timeTaken);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={10} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;

  return (
    <QuestionCard question={`${current.expression} = ?`} current={idx + 1} total={10}>
      <p className="text-center text-xs text-gray-400 mb-3">Adaptive — focuses on your weak spots</p>
      {!fb ? (
        <div className="grid grid-cols-2 gap-3">
          {options.map((o, i) => (
            <button key={i} onClick={() => handlePick(o)}
              className="bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 text-indigo-800 font-bold text-xl py-3 rounded-xl transition-colors">
              {o}
            </button>
          ))}
        </div>
      ) : <Feedback {...fb} onNext={next} />}
    </QuestionCard>
  );
}

// LEVEL 9 — Direct Input (No Assistance)
function Level9({ tableNum, onFinish }) {
  const questions = useMemo(() => shuffle(generateTable(tableNum)), [tableNum]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const current = questions[Math.min(idx, questions.length - 1)];
  const done = idx >= 10 && fb === null;

  const handleSubmit = (ans) => {
    const correct = ans === current.answer;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: current.answer });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={10} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;
  return (
    <QuestionCard question={`${current.expression} = ?`} current={idx + 1} total={10}>
      {fb ? <Feedback {...fb} onNext={next} /> : <InputAnswer onSubmit={handleSubmit} />}
    </QuestionCard>
  );
}

// LEVEL 10 — Fill in the Blank
function Level10({ tableNum, onFinish }) {
  const table = useMemo(() => generateTable(tableNum), [tableNum]);
  const questions = useMemo(() => shuffle(table).map((e) => {
    const type = Math.random() > 0.5 ? "multiplier" : "answer";
    return { ...e, blankType: type };
  }), [table]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [fb, setFb] = useState(null);
  const current = questions[Math.min(idx, questions.length - 1)];
  const done = idx >= 10 && fb === null;

  const questionText = current.blankType === "multiplier"
    ? `${tableNum} × ___ = ${current.answer}`
    : `${tableNum} × ${current.multiplier} = ___`;
  const correctAns = current.blankType === "multiplier" ? current.multiplier : current.answer;

  const handleSubmit = (ans) => {
    const correct = ans === correctAns;
    if (correct) setScore((s) => s + 1);
    setFb({ correct, correctAnswer: correctAns });
  };
  const next = () => { setFb(null); setIdx((i) => i + 1); };

  if (done) return <ScoreScreen score={score} total={10} onRestart={() => { setIdx(0); setScore(0); setFb(null); }} onMenu={onFinish} />;
  return (
    <QuestionCard question={questionText} current={idx + 1} total={10}>
      {fb ? <Feedback {...fb} onNext={next} /> : <InputAnswer onSubmit={handleSubmit} />}
    </QuestionCard>
  );
}

// ─── Level metadata ─────────────────────────────────────────────────
const LEVELS = [
  { id: 1, name: "Sequential Recall", desc: "Answer questions in order with the table visible", icon: "📋", component: Level1 },
  { id: 2, name: "Random Recall", desc: "Random questions with the table visible", icon: "🔀", component: Level2 },
  { id: 3, name: "Timed Visibility", desc: "See the answer briefly, then recall it", icon: "⏱️", component: Level3 },
  { id: 4, name: "Partial Table", desc: "Only 5 entries visible, answer from those", icon: "🧩", component: Level4 },
  { id: 5, name: "Missing Digit", desc: "One digit is hidden — type the full answer", icon: "🔍", component: Level5 },
  { id: 6, name: "Multiple Choice", desc: "Pick the correct answer from 4 options", icon: "🅰️", component: Level6 },
  { id: 7, name: "Match Pairs", desc: "Match 3 questions to their answers", icon: "🔗", component: Level7 },
  { id: 8, name: "Adaptive MCQ", desc: "Focuses on your weak spots", icon: "🧠", component: Level8 },
  { id: 9, name: "Direct Input", desc: "No help — type the answer from memory", icon: "✍️", component: Level9 },
  { id: 10, name: "Fill in the Blank", desc: "Find the missing multiplier or answer", icon: "📝", component: Level10 },
];

// ─── Main App ───────────────────────────────────────────────────────
export default function SuperTables() {
  const [screen, setScreen] = useState("home"); // home | pickTable | play
  const [tableNum, setTableNum] = useState(null);
  const [level, setLevel] = useState(null);

  const startLevel = (lvl) => { setLevel(lvl); setScreen("pickTable"); };
  const startPlay = (num) => { setTableNum(num); setScreen("play"); };
  const goHome = () => { setScreen("home"); setLevel(null); setTableNum(null); };

  // Home — level picker
  if (screen === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">SuperTables</h1>
            <p className="text-gray-500 text-lg">Master multiplication through 10 progressive levels</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => startLevel(l)}
                className="flex items-start gap-4 bg-white hover:bg-indigo-50 border-2 border-gray-100 hover:border-indigo-300 rounded-2xl p-5 text-left transition-all group shadow-sm hover:shadow-md">
                <span className="text-3xl mt-0.5">{l.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">Level {l.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mt-1 group-hover:text-indigo-700 transition-colors">{l.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{l.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Table number picker
  if (screen === "pickTable") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={goHome} className="text-indigo-500 hover:text-indigo-700 font-medium mb-6 flex items-center gap-1 transition-colors">← Back to levels</button>
          <div className="text-center mb-8">
            <span className="text-4xl mb-2 block">{level.icon}</span>
            <h2 className="text-2xl font-bold text-gray-800">Level {level.id}: {level.name}</h2>
            <p className="text-gray-500 mt-1">Choose a multiplication table to practice</p>
          </div>
          <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => startPlay(n)}
                className="aspect-square flex items-center justify-center bg-white hover:bg-indigo-500 hover:text-white border-2 border-gray-200 hover:border-indigo-500 rounded-xl text-xl font-bold text-gray-700 transition-all shadow-sm hover:shadow-md">
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Playing a level
  const LevelComponent = level.component;
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={goHome} className="text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors">← Menu</button>
          <div className="text-center">
            <span className="text-xs font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">Level {level.id}</span>
            <span className="ml-2 text-sm font-medium text-gray-600">Table of {tableNum}</span>
          </div>
          <div className="w-16" />
        </div>
        <LevelComponent tableNum={tableNum} onFinish={goHome} />
      </div>
    </div>
  );
}
