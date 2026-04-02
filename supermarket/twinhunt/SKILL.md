# Twin Hunt — Formal Specification

## 1. Purpose

A visual matching game where two circular panels each display a set of emoji objects, with exactly one object in common. The player must find and tap the common object. Objects are scattered randomly within circular panels (not on grid lines). Supports configurable objects-per-panel, configurable rounds, auto-advance, and a running results table.

## 2. Constants

```javascript
const TWIN_SYMBOLS = [
  '🍎','🍊','🍋','🍇','🍉','🍓','🍒','🥝','🍌','🍑',
  '🌟','🌙','☀️','⚡','🔥','💧','🌈','❄️','🍀','🌸',
  '🐶','🐱','🐸','🐵','🐔','🐙','🦋','🐝','🐢','🐬',
  '⚽','🏀','🎾','🎯','🎲','🎸','🎨','📚','✏️','🔔',
]
```

40 total emoji symbols used as the object pool.

## 3. Configuration

- **Objects per panel**: Text input, range 3–15, default 5. Both panels always have the same count.
- **Rounds**: Text input, default 10. How many rounds to play before finishing.

## 4. Round Generation (Client-Side)

No server API is used. All rounds are generated client-side:

1. Shuffle the full `TWIN_SYMBOLS` array
2. Pick the first symbol as `common` (the answer)
3. Pick the next `n-1` symbols as `leftOthers`
4. Pick the next `n-1` symbols as `rightOthers`
5. Build left panel: shuffle `[common, ...leftOthers]`
6. Build right panel: shuffle `[common, ...rightOthers]`
7. Generate circular scatter positions for each panel

### 4.1 Circular Scatter Positioning

Items are positioned using absolute coordinates within a circular panel:

```javascript
const scatterPositions = (n) => {
  const positions = []
  // One item near center with small jitter
  positions.push({
    x: 50 + (Math.random() - 0.5) * 12,
    y: 50 + (Math.random() - 0.5) * 12,
  })
  // Remaining items distributed in a ring
  const remaining = n - 1
  const baseAngleOffset = Math.random() * Math.PI * 2
  for (let i = 0; i < remaining; i++) {
    const angle = baseAngleOffset + (i / remaining) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const radius = 28 + Math.random() * 10  // 28-38% from center
    const x = 50 + Math.cos(angle) * radius
    const y = 50 + Math.sin(angle) * radius
    positions.push({
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
    })
  }
  // Shuffle positions so center item isn't predictable
  // (Fisher-Yates shuffle)
  return shuffled(positions)
}
```

Each item receives `style={{ left: '${x}%', top: '${y}%' }}` with CSS `position: absolute` and `transform: translate(-50%, -50%)`.

## 5. Frontend Component Specification

### 5.1 Component: TwinHuntApp

**Props:** `onBack` (function)

**State:**

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| count | string | '5' | Objects per panel |
| numRoundsInput | string | '10' | Rounds to play |
| started | boolean | false | Game has begun |
| finished | boolean | false | All rounds done |
| round | number | 0 | Current round number |
| totalRounds | number | 10 | Total rounds |
| score | number | 0 | Correct picks |
| leftItems | array | [] | Emoji symbols in left panel |
| rightItems | array | [] | Emoji symbols in right panel |
| leftPositions | array | [] | {x, y} positions for left panel items |
| rightPositions | array | [] | {x, y} positions for right panel items |
| commonSymbol | string | '' | The matching emoji |
| feedback | string | '' | Feedback message |
| isCorrect | boolean/null | null | Whether last pick was correct |
| revealed | boolean | false | Answer shown |
| results | array | [] | Result objects |

**Timer:** `useTimer()` — starts on round generation, stops on pick.

### 5.2 User Flow

```
[Show "Objects per panel" input (default 5)]
[Show "How many rounds?" input (default 10)]
[Show "Start Game" button]
        ↓ (click Start)
[Clamp count to 3–15, set totalRounds]
[Generate first round]
        ↓
[Display: two circular panels side by side with scattered emojis]
[Timer starts]
        ↓ (tap an emoji in either panel)
[Check if tapped symbol === commonSymbol]
[Show feedback, highlight match (green), dim others]
[Auto-advance after 1.5s if correct; click Next if wrong]
        ↓ (all rounds done)
[Show finish screen with score and ResultsTable]
```

### 5.3 Interaction

- Tapping any emoji in either panel triggers `handlePick(symbol)`
- If correct: score increments, match emoji highlighted green with scale(1.25)
- If wrong: feedback shows what the match was, wrong pick not specially styled
- After reveal: all non-matching items dim to 0.25 opacity
- Emojis are disabled (no further picks) after reveal

### 5.4 CSS Structure

```css
.twin-panels {
  display: flex;
  gap: 0;
  align-items: stretch;
  margin: 16px 0 20px;
}

.twin-panel {
  flex: 1;
  position: relative;
  min-height: 280px;
}

.twin-panel::before {
  content: '';
  display: block;
  padding-top: 100%;  /* Square aspect ratio */
}

.twin-circle {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--clr-border);
  background: rgba(255, 255, 255, 0.5);
  overflow: visible;
}

.twin-divider {
  width: 1px;
  background: var(--clr-border);
  flex-shrink: 0;
  margin: 20px 0;
}

.twin-item {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 1.5rem;
  border: 1.5px solid var(--clr-border);
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transform: translate(-50%, -50%);
  /* Inline style sets left and top percentages */
}

.twin-item:hover:not(:disabled) {
  transform: translate(-50%, -50%) scale(1.2);
  border-color: var(--clr-accent);
  z-index: 10;
}

.twin-item.twin-match {
  border-color: var(--clr-correct);
  background: var(--clr-correct-bg);
  transform: translate(-50%, -50%) scale(1.25);
  z-index: 10;
}

.twin-item.twin-dim {
  opacity: 0.25;
}
```

### 5.5 JSX Structure

```jsx
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
```

### 5.6 Results Record

```javascript
{
  question: `Round ${round}`,
  userAnswer: symbol,        // the emoji the player tapped
  correctAnswer: commonSymbol, // the correct emoji
  correct: boolean,
  time: timeTaken,
}
```

### 5.7 Features

- **Auto-advance**: After a correct answer is revealed, auto-advances in 1.5s via `useAutoAdvance` hook. On wrong answers, the player must click Next manually.
- **Running results table**: Displayed during gameplay below the panels.
- **No server dependency**: Fully client-side game logic.
- **Circular scatter**: Items randomly distributed within circular panels, never on grid lines.
