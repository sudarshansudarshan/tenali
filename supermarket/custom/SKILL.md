# Custom Lesson Puzzle

## Overview
The Custom Lesson lets users build a mixed quiz by selecting puzzle types, choosing difficulty, setting random or sequential order, and specifying question count.

## Component: `CustomApp`

### Three phases
1. **Setup** (`phase === 'setup'`): User picks puzzle types, order mode (random/sequential), difficulty, reorder sequence, and question count.
2. **Quiz** (`phase === 'quiz'`): Mixed quiz engine cycles through selected puzzle types, fetching questions from each puzzle's API and rendering type-specific inputs.
3. **Finished** (`phase === 'finished'`): Shows final score and results table with QuizLayout.

### Available puzzle types (14 total)
All puzzles except Twin Hunt: gk, addition, quadratic, multiply, vocab, sqrt, polymul, polyfactor, primefactor, qformula, simul, funceval, lineq, basicarith.

### Key functions
- `fetchQuestionForType(type, difficulty)` - Maps each puzzle type to its API URL and fetches a question.
- `getPromptForType(type, q)` - Returns the display prompt text for each puzzle type.
- `handleSubmit()` - Giant switch on puzzle type to check answers (some call server `/check`, others validate client-side).
- `renderInputs()` - Switches on puzzle type to render appropriate input: NumPad for arithmetic types, option buttons for GK/vocab, coefficient inputs for polymul, factor inputs for polyfactor, variable inputs for simul/lineq, etc.
- `renderQuestion()` - Special display for polymul (polynomial expressions), polyfactor (expression), simul (equation system); generic for others.

### Setup UI
- Difficulty radio group (easy / medium / hard)
- Puzzle checkboxes in a grid (`.custom-puzzle-grid`)
- Random vs sequential toggle (radio pills)
- If sequential: reorder UI with up/down arrow buttons (`.custom-order-list`)
- Question count input
- Start button

### Hooks used
- `useAutoAdvance(revealed, advanceFnRef, isCorrect)` - 3-arg signature, only auto-advances on correct answers.
- `useTimer()` - Per-question timing.

### CSS classes
- `.custom-section-label` - Section headings in setup
- `.custom-puzzle-grid` - Checkbox grid for puzzle selection
- `.custom-puzzle-check` / `.custom-puzzle-check.checked` - Individual puzzle checkboxes
- `.custom-order-list` / `.custom-order-item` / `.custom-order-num` / `.custom-order-name` / `.custom-order-btn` - Sequential ordering UI
- `.custom-type-badge` - Badge showing current puzzle type during quiz

### No dedicated API
Custom Lesson reuses all existing puzzle APIs. No `/custom-api` endpoint needed. No proxy entry needed in vite.config.js.
