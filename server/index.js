/**
 * TENALI - Educational Quiz Platform Server
 *
 * A comprehensive Node.js/Express server that powers an educational quiz and math problem-solving platform.
 *
 * ARCHITECTURE:
 * - Framework: Express.js (RESTful API server)
 * - Static Hosting: Serves React/Vue client built to ../client/dist
 * - Port: Configurable via PORT env var, defaults to 4000
 * - Server Address: 0.0.0.0 (accessible from any interface)
 *
 * FEATURES:
 * 1. General Knowledge Quizzes: Multiple choice GK questions with difficulty levels and genres
 * 2. Math Learning Modules:
 *    - Basic Arithmetic: Addition, subtraction, multiplication with difficulty scaling
 *    - Multiplication Tables: 1-10 multiplication drills
 *    - Quadratic Evaluation: Evaluate quadratic functions (y = ax² + bx + c) at given x values
 *    - Square Root Approximation: Estimate square roots by bands/difficulty levels
 *    - Polynomial Multiplication: Expand polynomial expressions (easy to hard)
 *    - Polynomial Factorization: Factor quadratic expressions into linear factors
 *    - Prime Factorization: Decompose numbers into prime factors
 *    - Quadratic Formula: Solve quadratic equations using the quadratic formula
 *    - Simultaneous Equations: Solve 2×2 or 3×3 linear systems
 *    - Function Evaluation: Evaluate linear/multilinear functions
 *    - Line Equations: Derive line equation (y = mx + c) from two points
 * 3. Vocabulary Builder: Word definitions with difficulty levels (easy/medium/hard)
 *
 * API ENDPOINTS:
 * - /api/health: Server health check
 * - /gk-api/*: General knowledge quiz endpoints
 * - /vocab-api/*: Vocabulary builder endpoints
 * - /addition-api/*: Basic addition problems
 * - /multiply-api/*: Multiplication table drills
 * - /quadratic-api/*: Quadratic function evaluation
 * - /sqrt-api/*: Square root approximation
 * - /polymul-api/*: Polynomial multiplication
 * - /polyfactor-api/*: Polynomial factorization
 * - /primefactor-api/*: Prime factorization
 * - /qformula-api/*: Quadratic formula solver
 * - /simul-api/*: Simultaneous linear equations
 * - /funceval-api/*: General function evaluation
 * - /lineq-api/*: Line equation derivation
 * - /basicarith-api/*: Basic arithmetic (+, −, ×)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Initialize Express app and configure middleware
const app = express();
const PORT = process.env.PORT || 4000;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const questionsDir = path.join(__dirname, '..', 'chitragupta', 'questions');

// CORS: Enable cross-origin requests for client communication
app.use(cors());
// JSON parsing: Handle application/json request bodies
app.use(express.json());
// Static file serving: Serve built React/Vue client
app.use(express.static(clientDistPath));

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer in range [min, max]
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Map number of digits to a numeric range for problem generation
 * Used for creating addition problems with appropriate difficulty
 * @param {number} digits - Number of digits (1, 2, or 3)
 * @returns {object} {min, max} range object
 */
function digitRange(digits) {
  if (digits === 1) return { min: 0, max: 9 };
  if (digits === 2) return { min: 10, max: 99 };
  return { min: 100, max: 999 };
}

/**
 * Map square root approximation step level to a numeric band
 * Higher steps = larger numbers to approximate square roots for
 * Used for progressive difficulty in sqrt-api
 * @param {number} step - Step number (1 to 100+)
 * @returns {object} {min, max} range of numbers for sqrt estimation
 */
function bandForStep(step) {
  if (step <= 10) return { min: 2, max: 50 };
  if (step <= 20) return { min: 51, max: 150 };
  if (step <= 35) return { min: 151, max: 350 };
  if (step <= 60) return { min: 351, max: 700 };
  return { min: 701, max: 999 };
}

/**
 * Load all GK questions from JSON files in the questions directory
 * Each file should contain a question object with id, question, options, answerOption, answerText
 * @returns {Array<object>} Array of question objects
 */
function loadQuestions() {
  const files = fs.readdirSync(questionsDir).filter((file) => file.endsWith('.json'));
  return files.map((file) => {
    const fullPath = path.join(questionsDir, file);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  });
}

// Load all GK questions at server startup
const questions = loadQuestions();

/**
 * HEALTH CHECK ENDPOINT
 * GET /api/health
 *
 * Returns server status and total question count
 * Used by clients to verify server is running and questions are loaded
 *
 * Response: { ok: boolean, questions: number }
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, questions: questions.length });
});

/**
 * GENERAL KNOWLEDGE API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /gk-api/question
 * Fetch a random general knowledge multiple-choice question
 *
 * Query Parameters:
 *   - exclude (optional): Comma-separated question IDs to skip (e.g., "1,3,5")
 *                         Allows quiz clients to avoid repeating questions
 *
 * Response:
 * {
 *   id: string,              // Unique question identifier
 *   question: string,        // Question text
 *   options: string[],       // Array of answer options
 *   genre: string            // Category (e.g., 'history', 'science', 'mixed')
 * }
 */
app.get('/gk-api/question', (req, res) => {
  const exclude = req.query.exclude ? req.query.exclude.split(',').map(Number) : [];
  if (!questions.length) {
    return res.status(500).json({ error: 'No questions found' });
  }
  // Pool: Start with all questions, then filter to unseen ones if available
  // This prevents repeating the same question until all are exhausted
  let pool = questions;
  const unseen = pool.filter((q) => !exclude.includes(q.id));
  if (unseen.length > 0) pool = unseen;
  const q = pool[Math.floor(Math.random() * pool.length)];
  res.json({
    id: q.id,
    question: q.question,
    options: q.options,
    genre: q.genre || 'mixed',
  });
});

/**
 * POST /gk-api/check
 * Verify if the user's answer to a GK question is correct
 *
 * Request Body:
 * {
 *   id: number,             // Question ID to check
 *   answerOption: string    // User's selected answer (A, B, C, or D)
 * }
 *
 * Response:
 * {
 *   correct: boolean,       // Whether the answer matches the correct option
 *   correctAnswer: string,  // Correct answer option (A, B, C, or D)
 *   correctAnswerText: string, // Full text of the correct answer
 *   message: string         // Feedback emoji message
 * }
 */
app.post('/gk-api/check', (req, res) => {
  const { id, answerOption } = req.body || {};
  const q = questions.find((item) => Number(item.id) === Number(id));
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }
  // Compare user's answer with correct answer (case-insensitive)
  const correct = String(answerOption || '').toUpperCase() === String(q.answerOption || '').toUpperCase();
  res.json({
    correct,
    correctAnswer: q.answerOption,
    correctAnswerText: q.answerText,
    message: correct ? 'Correct! 🎉' : 'Wrong ❌',
  });
});

/**
 * BASIC ARITHMETIC API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /addition-api/question
 * Generate a random addition problem with configurable digit count
 *
 * Query Parameters:
 *   - digits (optional): Number of digits per operand (1, 2, or 3; default: 1)
 *                        1 = single digit (0-9), 2 = two digits (10-99), etc.
 *
 * Response:
 * {
 *   id: string,             // Unique problem ID (timestamp-based)
 *   digits: number,         // Actual digit count used (sanitized)
 *   a: number,              // First operand
 *   b: number,              // Second operand
 *   prompt: string,         // Display text (e.g., "42 + 37")
 *   answer: number          // Correct sum
 * }
 */
app.get('/addition-api/question', (req, res) => {
  const digits = Number(req.query.digits || 1);
  // Sanitize digits to valid options; default to 1 if invalid
  const safeDigits = [1, 2, 3].includes(digits) ? digits : 1;
  const range = digitRange(safeDigits);
  const a = randomInt(range.min, range.max);
  const b = randomInt(range.min, range.max);
  res.json({ id: `${safeDigits}-${Date.now()}-${Math.random()}`, digits: safeDigits, a, b, prompt: `${a} + ${b}`, answer: a + b });
});

/**
 * POST /addition-api/check
 * Verify if the user's answer to an addition problem is correct
 *
 * Request Body:
 * {
 *   a: number,              // First operand
 *   b: number,              // Second operand
 *   answer: number          // User's submitted answer
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctAnswer: number,  // The correct sum
 *   message: string         // Feedback message
 * }
 */
app.post('/addition-api/check', (req, res) => {
  const { a, b, answer } = req.body || {};
  const correctAnswer = Number(a) + Number(b);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * QUADRATIC EVALUATION API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Generate a random integer from -9 to 9 (excluding 0)
 * Used internally for quadratic coefficient generation
 * @returns {number} Signed integer in range [-9, 9]
 */
function randomSignedDigit() {
  return randomInt(-9, 9);
}

/**
 * Map quadratic difficulty level to coefficient range
 * Higher difficulty = larger coefficients in the polynomial
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {object} {min, max} coefficient range
 */
function quadraticRange(difficulty) {
  if (difficulty === 'easy') return { min: -3, max: 3 };
  if (difficulty === 'medium') return { min: -6, max: 6 };
  return { min: -9, max: 9 };
}

/**
 * Generate a random integer within a given range
 * (Wrapper for consistency in quadratic module)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInRange(min, max) {
  return randomInt(min, max);
}

/**
 * Format a polynomial term with proper mathematical notation
 * Handles signs, coefficients, and variable exponents
 *
 * Examples:
 *   formatSignedTerm(-5, 'x²', true) → "-5x²"
 *   formatSignedTerm(3, 'x') → "+ 3x"
 *   formatSignedTerm(0, '') → "+ 0" or "0" if first
 *
 * @param {number} value - Coefficient value
 * @param {string} variablePart - Variable part (e.g., 'x', 'x²', '')
 * @param {boolean} isFirst - True if this is the first term (affects sign)
 * @returns {string} Formatted term
 */
function formatSignedTerm(value, variablePart, isFirst = false) {
  if (value === 0) {
    return isFirst ? `0${variablePart}` : `+ 0${variablePart}`;
  }

  const sign = value < 0 ? '-' : '+';
  const absValue = Math.abs(value);
  if (isFirst) {
    return `${value}${variablePart}`;
  }
  return `${sign} ${absValue}${variablePart}`;
}

/**
 * Build a human-readable prompt for quadratic evaluation
 * Formats the equation y = ax² + bx + c with proper mathematical notation
 *
 * @param {number} a - Coefficient of x²
 * @param {number} b - Coefficient of x
 * @param {number} c - Constant term
 * @param {number} x - The x value to evaluate at
 * @returns {string} Prompt text (e.g., "If x = 2, find y for y = 2x² - 3x + 5")
 */
function buildQuadraticPrompt(a, b, c, x) {
  const expression = `${formatSignedTerm(a, 'x²', true)} ${formatSignedTerm(b, 'x')} ${formatSignedTerm(c, '')}`;
  return `If x = ${x}, find y for y = ${expression}`;
}

/**
 * GET /quadratic-api/question
 * Generate a quadratic function evaluation problem
 * Task: Evaluate y = ax² + bx + c at a given x value
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'hard')
 *                            Controls coefficient ranges
 *
 * Response:
 * {
 *   id: string,             // Unique problem ID
 *   a: number,              // x² coefficient
 *   b: number,              // x coefficient
 *   c: number,              // Constant term
 *   x: number,              // Value of x to evaluate at
 *   prompt: string,         // Display text (formatted equation)
 *   answer: number          // Correct y value (a*x² + b*x + c)
 * }
 */
app.get('/quadratic-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'hard';
  const range = quadraticRange(difficulty);
  // Ensure a ≠ 0 (otherwise it's not truly quadratic)
  let a = 0;
  while (a === 0) a = randomInRange(range.min, range.max);
  const b = randomInRange(range.min, range.max);
  const c = randomInRange(range.min, range.max);
  const x = randomInRange(range.min, range.max);
  const answer = a * x * x + b * x + c;

  res.json({
    id: `quadratic-${Date.now()}-${Math.random()}`,
    a,
    b,
    c,
    x,
    prompt: buildQuadraticPrompt(a, b, c, x),
    answer,
  });
});

/**
 * POST /quadratic-api/check
 * Verify if user correctly evaluated the quadratic function
 *
 * Request Body:
 * {
 *   a: number,              // x² coefficient
 *   b: number,              // x coefficient
 *   c: number,              // Constant term
 *   x: number,              // x value to evaluate at
 *   answer: number          // User's calculated y value
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctAnswer: number,
 *   message: string
 * }
 */
app.post('/quadratic-api/check', (req, res) => {
  const { a, b, c, x, answer } = req.body || {};
  const correctAnswer = Number(a) * Number(x) * Number(x) + Number(b) * Number(x) + Number(c);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * SQUARE ROOT APPROXIMATION API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /sqrt-api/question
 * Generate a square root approximation problem
 * Task: Estimate the integer square root (floor or ceiling) of a number
 *
 * Difficulty progression: Higher step numbers = larger radicands
 * Steps 1-10: √2 to √50
 * Steps 11-20: √51 to √150
 * Steps 21-35: √151 to √350
 * Steps 36-60: √351 to √700
 * Steps 61+: √701 to √999
 *
 * Query Parameters:
 *   - step (optional): Difficulty level (1-100+; default: 1)
 *
 * Response:
 * {
 *   id: string,             // Unique problem ID
 *   q: number,              // The number under the radical
 *   step: number,           // Difficulty level
 *   prompt: string,         // Display text (e.g., "√42")
 *   floorAnswer: number,    // Floor of the square root
 *   ceilAnswer: number,     // Ceiling of the square root
 *   sqrtRounded: string     // Exact sqrt rounded to 2 decimals (for reference)
 * }
 */
app.get('/sqrt-api/question', (req, res) => {
  const step = Math.max(1, Number(req.query.step || 1));
  const band = bandForStep(step);
  const q = randomInt(band.min, band.max);
  const sqrt = Math.sqrt(q);
  const floorAnswer = Math.floor(sqrt);
  const ceilAnswer = Math.ceil(sqrt);

  res.json({
    id: `${step}-${Date.now()}-${Math.random()}`,
    q,
    step,
    prompt: `√${q}`,
    floorAnswer,
    ceilAnswer,
    sqrtRounded: sqrt.toFixed(2),
  });
});

/**
 * POST /sqrt-api/check
 * Verify if user's square root approximation is correct
 * Accepts either floor or ceiling as valid (since exact sqrt is non-integer)
 *
 * Request Body:
 * {
 *   q: number,              // The number that was under the radical
 *   answer: number          // User's estimated integer square root
 * }
 *
 * Response:
 * {
 *   correct: boolean,       // True if answer ∈ {floor(√q), ceil(√q)}
 *   floorAnswer: number,
 *   ceilAnswer: number,
 *   sqrtRounded: string,    // Exact value for learning
 *   message: string
 * }
 */
app.post('/sqrt-api/check', (req, res) => {
  const { q, answer } = req.body || {};
  const sqrt = Math.sqrt(Number(q));
  const floorAnswer = Math.floor(sqrt);
  const ceilAnswer = Math.ceil(sqrt);
  const numericAnswer = Number(answer);
  // Accept either floor or ceiling as correct
  const correct = numericAnswer === floorAnswer || numericAnswer === ceilAnswer;

  res.json({
    correct,
    floorAnswer,
    ceilAnswer,
    sqrtRounded: sqrt.toFixed(2),
    message: correct ? 'Correct' : 'Incorrect',
  });
});

/**
 * VOCABULARY BUILDER API
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Directory containing vocabulary question JSON files
const vocabDir = path.join(__dirname, '..', 'vocab', 'questions');

/**
 * Load all vocabulary questions from JSON files
 * Each file should contain question objects with id, difficulty, question, options, answerOption, answerText
 * Returns empty array if directory doesn't exist (graceful fallback)
 *
 * @returns {Array<object>} Array of vocabulary question objects
 */
function loadVocab() {
  try {
    const files = fs.readdirSync(vocabDir).filter((f) => f.endsWith('.json'));
    return files.map((f) => JSON.parse(fs.readFileSync(path.join(vocabDir, f), 'utf8')));
  } catch (e) {
    return [];
  }
}

// Load all vocabulary questions at server startup
const vocabQuestions = loadVocab();

/**
 * GET /vocab-api/question
 * Fetch a random vocabulary question at a specified difficulty level
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'easy')
 *   - exclude (optional): Comma-separated question IDs to skip (prevents repeats)
 *
 * Response:
 * {
 *   id: number,             // Unique question identifier
 *   question: string,       // Word definition or context question
 *   options: string[],      // Array of answer choices
 *   difficulty: string      // Difficulty level ('easy', 'medium', or 'hard')
 * }
 */
app.get('/vocab-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const exclude = req.query.exclude ? req.query.exclude.split(',').map(Number) : [];
  let pool = vocabQuestions.filter((q) => q.difficulty === difficulty);
  if (!pool.length) {
    return res.status(404).json({ error: `No vocab questions for difficulty: ${difficulty}` });
  }
  // Filter to unseen questions first, allowing repeats only when exhausted
  const unseen = pool.filter((q) => !exclude.includes(q.id));
  if (unseen.length > 0) pool = unseen;
  const q = pool[Math.floor(Math.random() * pool.length)];
  res.json({
    id: q.id,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty,
  });
});

/**
 * POST /vocab-api/check
 * Verify if user's vocabulary answer is correct
 *
 * Request Body:
 * {
 *   id: number,             // Question ID
 *   answerOption: string    // User's selected answer (A, B, C, or D)
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctAnswer: string,  // Correct option letter
 *   correctAnswerText: string, // Full text of the correct answer
 *   message: string         // Feedback
 * }
 */
app.post('/vocab-api/check', (req, res) => {
  const { id, answerOption } = req.body || {};
  const q = vocabQuestions.find((item) => Number(item.id) === Number(id));
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }
  // Case-insensitive comparison
  const correct = String(answerOption || '').toUpperCase() === String(q.answerOption || '').toUpperCase();
  res.json({
    correct,
    correctAnswer: q.answerOption,
    correctAnswerText: q.answerText,
    message: correct ? 'Correct!' : 'Incorrect',
  });
});

/**
 * MULTIPLICATION TABLES API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /multiply-api/question
 * Generate a multiplication table problem (table × random multiplier)
 *
 * Query Parameters:
 *   - table (optional): Which multiplication table (1-10+; default: 1)
 *
 * Response:
 * {
 *   id: string,             // Unique problem ID
 *   table: number,          // Multiplication table number
 *   multiplier: number,     // Random number from 1-10
 *   prompt: string,         // Display text (e.g., "7 × 8")
 *   answer: number          // Correct product
 * }
 */
app.get('/multiply-api/question', (req, res) => {
  const table = Math.max(1, Number(req.query.table || 1));
  const multiplier = randomInt(1, 10);
  const answer = table * multiplier;

  res.json({
    id: `multiply-${Date.now()}-${Math.random()}`,
    table,
    multiplier,
    prompt: `${table} × ${multiplier}`,
    answer,
  });
});

/**
 * POST /multiply-api/check
 * Verify if user's multiplication answer is correct
 *
 * Request Body:
 * {
 *   table: number,          // Multiplication table
 *   multiplier: number,     // Multiplier
 *   answer: number          // User's product
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctAnswer: number,
 *   message: string
 * }
 */
app.post('/multiply-api/check', (req, res) => {
  const { table, multiplier, answer } = req.body || {};
  const correctAnswer = Number(table) * Number(multiplier);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * POLYNOMIAL MULTIPLICATION API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Map polynomial multiplication difficulty to coefficient range
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {object} {min, max} coefficient range
 */
function polyCoeffRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 9 };
  if (difficulty === 'medium') return { min: 1, max: 10 };
  return { min: 1, max: 20 };
}

/**
 * Generate random polynomial coefficients
 * Returns coefficients array where index = power of x
 * Example: [5, -3, 2] represents 2x² - 3x + 5
 *
 * @param {number} degree - Highest power of x in the polynomial
 * @param {object} range - {min, max} for coefficient values
 * @returns {Array<number>} Coefficients array, index = power
 */
function randomPoly(degree, range) {
  const coeffs = [];
  for (let i = 0; i <= degree; i++) {
    let c = randomInt(range.min, range.max);
    // 30% chance to make it negative (except for constant term)
    if (Math.random() < 0.3 && i > 0) c = -c;
    coeffs.push(c);
  }
  // Ensure leading coefficient is non-zero (true polynomial of given degree)
  if (coeffs[degree] === 0) coeffs[degree] = 1;
  return coeffs; // index = power: [constant, x, x², ...]
}

/**
 * Multiply two polynomials using distribution
 * Implements the standard algorithm: (a₀ + a₁x + a₂x²) × (b₀ + b₁x + ...)
 *
 * Time complexity: O(n*m) where n, m are the degrees
 * Example: [1, 2] × [3, 4] = [3, 10, 8] representing (1 + 2x) × (3 + 4x) = 3 + 10x + 8x²
 *
 * @param {Array<number>} a - First polynomial coefficients (index = power)
 * @param {Array<number>} b - Second polynomial coefficients (index = power)
 * @returns {Array<number>} Product polynomial coefficients
 */
function multiplyPolys(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}

/**
 * Format polynomial coefficients as human-readable mathematical notation
 * Handles signs, implicit coefficients (1 and -1), and superscript powers
 *
 * Examples:
 *   [3, -2, 1] → "x² − 2x + 3"
 *   [0, 5] → "5x"
 *   [1, 1, 1] → "x² + x + 1"
 *
 * @param {Array<number>} coeffs - Coefficients array (index = power)
 * @returns {string} Formatted polynomial expression
 */
function formatPoly(coeffs) {
  const parts = [];
  // Process coefficients from highest to lowest power
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    // Skip zero coefficients (except in special cases where polynomial is just 0)
    if (c === 0 && coeffs.length > 1) continue;
    // Convert power index to superscript (e.g., 2 → ²)
    const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
    const varPart = i === 0 ? '' : i === 1 ? 'x' : `x${sup(i)}`;
    if (parts.length === 0) {
      // First term: include explicit coefficient, or omit if coefficient is 1 for non-constant
      parts.push(c === 1 && i > 0 ? varPart : c === -1 && i > 0 ? `-${varPart}` : `${c}${varPart}`);
    } else {
      // Subsequent terms: include sign
      const sign = c > 0 ? '+' : '-';
      const abs = Math.abs(c);
      parts.push(`${sign} ${abs === 1 && i > 0 ? varPart : `${abs}${varPart}`}`);
    }
  }
  return parts.join(' ') || '0';
}

/**
 * GET /polymul-api/question
 * Generate a polynomial multiplication problem
 *
 * Difficulty levels determine the form of polynomials:
 *   - Easy: Monomial × Binomial (e.g., "3(2x+5)" or "4x(7x+8)")
 *   - Medium: Binomial × Binomial (e.g., "(2x+3)(5x-1)")
 *   - Hard: Trinomial × Trinomial (e.g., "(x²+2x+1)(x²-x+2)")
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   p1: Array<number>,      // First polynomial (coefficients, index = power)
 *   p2: Array<number>,      // Second polynomial
 *   product: Array<number>, // Correct product
 *   p1Display: string,      // Formatted p1 for display
 *   p2Display: string,      // Formatted p2 for display
 *   productDisplay: string, // Formatted product
 *   resultDegree: number    // Highest power in the product
 * }
 */
app.get('/polymul-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = polyCoeffRange(difficulty);
  let p1, p2;

  if (difficulty === 'easy') {
    // Easy: a(bx + c) form — monomial × binomial
    // Variants: plain constant like 3(2x+5), or term like 4x(7x+8)
    const usesX = Math.random() < 0.4; // 40% chance of ax(...) form
    if (usesX) {
      // ax × (bx + c) → coeffs: ax = [0, a], (bx+c) = [c, b]
      const a = randomInt(2, range.max);
      const b = randomInt(1, range.max);
      let c = randomInt(1, range.max);
      if (Math.random() < 0.3) c = -c;
      p1 = [0, a];
      p2 = [c, b];
    } else {
      // a × (bx + c) → coeffs: a = [a], (bx+c) = [c, b]
      const a = randomInt(2, range.max);
      const b = randomInt(1, range.max);
      let c = randomInt(1, range.max);
      if (Math.random() < 0.3) c = -c;
      p1 = [a];
      p2 = [c, b];
    }
  } else if (difficulty === 'medium') {
    // Medium: two degree-1 polynomials (ax+b)(cx+d)
    p1 = randomPoly(1, range);
    p2 = randomPoly(1, range);
  } else {
    // Hard: two degree-2 polynomials
    p1 = randomPoly(2, range);
    p2 = randomPoly(2, range);
  }

  const product = multiplyPolys(p1, p2);
  res.json({
    id: `polymul-${Date.now()}-${Math.random()}`,
    p1, p2, product,
    p1Display: formatPoly(p1),
    p2Display: formatPoly(p2),
    productDisplay: formatPoly(product),
    resultDegree: product.length - 1,
  });
});

/**
 * POST /polymul-api/check
 * Verify if user correctly multiplied the polynomials
 *
 * Request Body:
 * {
 *   p1: Array<number>,      // First polynomial coefficients
 *   p2: Array<number>,      // Second polynomial coefficients
 *   userCoeffs: Array<number> // User's answer (product coefficients)
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctCoeffs: Array<number>, // Correct product
 *   correctDisplay: string,  // Formatted correct answer
 *   message: string
 * }
 */
app.post('/polymul-api/check', (req, res) => {
  const { p1, p2, userCoeffs } = req.body || {};
  const product = multiplyPolys(p1, p2);
  // Check both length and values to ensure correct answer
  const correct = product.length === userCoeffs.length && product.every((c, i) => Number(userCoeffs[i]) === c);
  res.json({ correct, correctCoeffs: product, correctDisplay: formatPoly(product), message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * POLYNOMIAL FACTORIZATION API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Map polynomial factorization difficulty to coefficient range
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {object} {min, max} factor coefficient range
 */
function factorCoeffRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 10 };
  if (difficulty === 'medium') return { min: 1, max: 20 };
  return { min: 1, max: 30 };
}

/**
 * GET /polyfactor-api/question
 * Generate a polynomial factorization problem (quadratic only)
 *
 * Strategy: Generate two linear factors (px + q)(rx + s) and expand to ax² + bx + c
 * Then ask user to factor back to the original linear factors
 * This guarantees a factorable quadratic with integer-coefficient factors
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   a: number,              // x² coefficient
 *   b: number,              // x coefficient
 *   c: number,              // Constant term
 *   factors: {
 *     p, q, r, s           // Coefficients of (px + q)(rx + s)
 *   },
 *   display: string         // Formatted quadratic for display
 * }
 */
app.get('/polyfactor-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = factorCoeffRange(difficulty);
  // Generate from factors: (px + q)(rx + s) = prx² + (ps+qr)x + qs
  let p, q, r, s;
  p = randomInt(1, Math.min(range.max, 5));
  r = randomInt(1, Math.min(range.max, 5));
  q = randomInt(-range.max, range.max);
  s = randomInt(-range.max, range.max);
  if (q === 0) q = 1;
  if (s === 0) s = 1;
  // Expand (px + q)(rx + s) to get ax² + bx + c
  const a = p * r;
  const b = p * s + q * r;
  const c = q * s;
  res.json({
    id: `polyfactor-${Date.now()}-${Math.random()}`,
    a, b, c,
    factors: { p, q, r, s },
    display: formatPoly([c, b, a]),
  });
});

/**
 * POST /polyfactor-api/check
 * Verify if user correctly factored the quadratic
 * Checks if (userP*x + userQ)(userR*x + userS) expands to ax² + bx + c
 *
 * Request Body:
 * {
 *   a: number,              // x² coefficient of quadratic
 *   b: number,              // x coefficient
 *   c: number,              // Constant term
 *   userP, userQ, userR, userS // Coefficients user entered for (Px+Q)(Rx+S)
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   message: string
 * }
 */
app.post('/polyfactor-api/check', (req, res) => {
  const { a, b, c, userP, userQ, userR, userS } = req.body || {};
  // Check: (userP*x + userQ)(userR*x + userS) expands to ax² + bx + c
  const ua = Number(userP) * Number(userR);
  const ub = Number(userP) * Number(userS) + Number(userQ) * Number(userR);
  const uc = Number(userQ) * Number(userS);
  const correct = ua === Number(a) && ub === Number(b) && uc === Number(c);
  res.json({ correct, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * PRIME FACTORIZATION API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Map prime factorization difficulty to number range
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {object} {min, max} range for numbers to factor
 */
function primeRange(difficulty) {
  if (difficulty === 'easy') return { min: 2, max: 100 };
  if (difficulty === 'medium') return { min: 2, max: 300 };
  return { min: 2, max: 1000 };
}

/**
 * Find all prime factors of a number using trial division
 * Returns factors in ascending order (with repetition)
 *
 * Algorithm: Divide by 2, 3, 5, ... up to √n
 * Time complexity: O(√n)
 *
 * Examples:
 *   primeFactors(12) = [2, 2, 3]
 *   primeFactors(17) = [17]
 *   primeFactors(100) = [2, 2, 5, 5]
 *
 * @param {number} n - Number to factor (n > 1)
 * @returns {Array<number>} Prime factors in ascending order
 */
function primeFactors(n) {
  const factors = [];
  let d = 2;
  // Trial division: check all potential divisors up to √n
  while (d * d <= n) {
    while (n % d === 0) { factors.push(d); n /= d; }
    d++;
  }
  // If n > 1 at this point, n itself is prime
  if (n > 1) factors.push(n);
  return factors;
}

/**
 * GET /primefactor-api/question
 * Generate a prime factorization problem
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   number: number,         // Number to factor
 *   factors: Array<number>  // Correct prime factors (in ascending order, with repetition)
 * }
 */
app.get('/primefactor-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = primeRange(difficulty);
  let n = randomInt(range.min, range.max);
  // Never give a prime number — ensure at least 2 prime factors (counting multiplicity)
  while (primeFactors(n).length < 2) n = randomInt(range.min, range.max);
  res.json({
    id: `prime-${Date.now()}-${Math.random()}`,
    number: n,
    factors: primeFactors(n),
  });
});

/**
 * POST /primefactor-api/check
 * Verify if user found all prime factors of a number
 * Compares sorted arrays of factors (order-independent)
 *
 * Request Body:
 * {
 *   number: number,         // Number that was factored
 *   userFactors: Array<number> // User's list of prime factors
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctFactors: Array<number>, // The correct prime factors
 *   message: string
 * }
 */
app.post('/primefactor-api/check', (req, res) => {
  const { number, userFactors } = req.body || {};
  const correct = primeFactors(Number(number));
  const userSorted = (userFactors || []).map(Number).sort((a, b) => a - b);
  const isCorrect = correct.length === userSorted.length && correct.every((f, i) => f === userSorted[i]);
  res.json({ correct: isCorrect, correctFactors: correct, message: isCorrect ? 'Correct' : 'Incorrect' });
});

/**
 * QUADRATIC FORMULA API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Map quadratic formula difficulty to coefficient range
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {object} {min, max} coefficient range
 */
function qfRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 10 };
  if (difficulty === 'medium') return { min: 1, max: 20 };
  return { min: 1, max: 30 };
}

/**
 * GET /qformula-api/question
 * Generate a quadratic formula problem: solve ax² + bx + c = 0
 *
 * Strategy by difficulty:
 *   - Easy: Guarantee integer roots (build from roots, then expand)
 *   - Medium: Guarantee real roots (discriminant ≥ 0)
 *   - Hard: Allow any roots (may be complex/irrational)
 *
 * Returns calculated roots using the quadratic formula
 * Discriminant determines root type: real distinct / real equal / complex
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   a, b, c: number,        // Quadratic coefficients
 *   disc: number,           // Discriminant (b² - 4ac)
 *   roots: {
 *     type: string,         // 'real_distinct', 'real_equal', or 'complex'
 *     r1, r2: number,       // For real roots (r2 omitted if equal)
 *     realPart, imagPart: number  // For complex roots
 *   }
 * }
 */
app.get('/qformula-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = qfRange(difficulty);
  let a, b, c, disc;
  if (difficulty === 'easy') {
    // Guarantee integer roots: build from roots r1, r2 -> a(x-r1)(x-r2)
    const r1 = randomInt(-range.max, range.max);
    const r2 = randomInt(-range.max, range.max);
    a = 1;
    b = -(r1 + r2);
    c = r1 * r2;
  } else {
    a = randomInt(1, Math.min(range.max, 5));
    b = randomInt(-range.max, range.max);
    if (difficulty === 'medium') {
      // Guarantee real roots (disc >= 0)
      do {
        b = randomInt(-range.max, range.max);
        c = randomInt(-range.max, range.max);
      } while (b * b - 4 * a * c < 0);
    } else {
      c = randomInt(-range.max, range.max);
    }
  }
  disc = b * b - 4 * a * c;
  const roots = {};
  if (disc > 0) {
    // Two distinct real roots
    roots.type = 'real_distinct';
    roots.r1 = parseFloat(((-b + Math.sqrt(disc)) / (2 * a)).toFixed(2));
    roots.r2 = parseFloat(((-b - Math.sqrt(disc)) / (2 * a)).toFixed(2));
  } else if (disc === 0) {
    // One repeated real root
    roots.type = 'real_equal';
    roots.r1 = parseFloat((-b / (2 * a)).toFixed(2));
  } else {
    // Complex conjugate roots: (-b ± i√|disc|) / (2a)
    roots.type = 'complex';
    roots.realPart = parseFloat((-b / (2 * a)).toFixed(2));
    roots.imagPart = parseFloat((Math.sqrt(-disc) / (2 * a)).toFixed(2));
  }
  res.json({ id: `qf-${Date.now()}-${Math.random()}`, a, b, c, disc, roots });
});

/**
 * POST /qformula-api/check
 * Verify if user correctly solved the quadratic equation
 * Allows small floating-point tolerances (±0.05) for answers
 *
 * Request Body:
 * {
 *   a, b, c: number,        // Quadratic coefficients
 *   userR1, userR2: number, // User's roots (or real/imaginary parts for complex)
 *   userType: string        // Root type (for reference, not always used)
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   roots: object,          // Calculated roots (for learning)
 *   message: string
 * }
 */
app.post('/qformula-api/check', (req, res) => {
  const { a, b, c, userR1, userR2, userType } = req.body || {};
  const A = Number(a), B = Number(b), C = Number(c);
  const disc = B * B - 4 * A * C;
  let correct = false;
  const roots = {};
  if (disc > 0) {
    // Check two distinct real roots (allows either order)
    roots.type = 'real_distinct';
    roots.r1 = parseFloat(((-B + Math.sqrt(disc)) / (2 * A)).toFixed(2));
    roots.r2 = parseFloat(((-B - Math.sqrt(disc)) / (2 * A)).toFixed(2));
    const u1 = parseFloat(Number(userR1).toFixed(2));
    const u2 = parseFloat(Number(userR2).toFixed(2));
    // Accept either order with tolerance of 0.05
    correct = (Math.abs(u1 - roots.r1) < 0.05 && Math.abs(u2 - roots.r2) < 0.05) ||
              (Math.abs(u1 - roots.r2) < 0.05 && Math.abs(u2 - roots.r1) < 0.05);
  } else if (disc === 0) {
    // Check single real root
    roots.type = 'real_equal';
    roots.r1 = parseFloat((-B / (2 * A)).toFixed(2));
    correct = Math.abs(parseFloat(Number(userR1).toFixed(2)) - roots.r1) < 0.05;
  } else {
    // Check complex roots: real part and imaginary part
    roots.type = 'complex';
    roots.realPart = parseFloat((-B / (2 * A)).toFixed(2));
    roots.imagPart = parseFloat((Math.sqrt(-disc) / (2 * A)).toFixed(2));
    correct = Math.abs(Number(userR1) - roots.realPart) < 0.05 && Math.abs(Number(userR2) - roots.imagPart) < 0.05;
  }
  res.json({ correct, roots, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * SIMULTANEOUS EQUATIONS API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Map simultaneous equations difficulty to coefficient range
 * @param {string} difficulty - 'easy' for 2×2, 'hard' for 3×3
 * @returns {object} {min, max} coefficient range
 */
function simulRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 10 };
  return { min: 1, max: 15 };
}

/**
 * GET /simul-api/question
 * Generate a system of linear equations (2×2 or 3×3)
 *
 * Strategy: Generate integer solution, then create equations that have it
 * Ensures a unique solution with non-zero determinant
 *
 * 2×2 System:
 *   a₁x + b₁y = d₁
 *   a₂x + b₂y = d₂
 *
 * 3×3 System:
 *   a₁x + b₁y + c₁z = d₁
 *   a₂x + b₂y + c₂z = d₂
 *   a₃x + b₃y + c₃z = d₃
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy' (2×2) or 'hard' (3×3; default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   size: number,           // 2 or 3 (system size)
 *   eqs: Array<object>,     // Equation coefficients and RHS
 *   solution: object        // The correct solution {x, y} or {x, y, z}
 * }
 */
app.get('/simul-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = simulRange(difficulty);
  const is2x2 = difficulty === 'easy';

  if (is2x2) {
    // 2×2: generate integer solutions, then build equations
    const x = randomInt(-range.max, range.max);
    const y = randomInt(-range.max, range.max);
    let a1 = randomInt(1, range.max), b1 = randomInt(1, range.max);
    let a2 = randomInt(1, range.max), b2 = randomInt(1, range.max);
    // Ensure non-singular matrix (a1*b2 ≠ a2*b1)
    while (a1 * b2 === a2 * b1) { a2 = randomInt(1, range.max); b2 = randomInt(1, range.max); }
    // Randomly make some coefficients negative
    if (Math.random() < 0.3) a1 = -a1;
    if (Math.random() < 0.3) b1 = -b1;
    if (Math.random() < 0.3) a2 = -a2;
    if (Math.random() < 0.3) b2 = -b2;
    const eqs = [
      { a: a1, b: b1, d: a1 * x + b1 * y },
      { a: a2, b: b2, d: a2 * x + b2 * y },
    ];
    res.json({
      id: `simul-${Date.now()}-${Math.random()}`,
      size: 2,
      eqs,
      solution: { x, y },
    });
  } else {
    // 3×3: generate integer solutions, then build equations
    const x = randomInt(-8, 8), y = randomInt(-8, 8), z = randomInt(-8, 8);
    let eqs;
    let attempts = 0;
    // Generate 3×3 system with non-zero determinant (may require multiple attempts)
    do {
      eqs = [];
      for (let i = 0; i < 3; i++) {
        let a = randomInt(1, Math.min(range.max, 10));
        let b = randomInt(1, Math.min(range.max, 10));
        let c = randomInt(1, Math.min(range.max, 10));
        if (Math.random() < 0.3) a = -a;
        if (Math.random() < 0.3) b = -b;
        if (Math.random() < 0.3) c = -c;
        eqs.push({ a, b, c, d: a * x + b * y + c * z });
      }
      // Calculate 3×3 determinant using expansion
      const det = eqs[0].a * (eqs[1].b * eqs[2].c - eqs[1].c * eqs[2].b)
                - eqs[0].b * (eqs[1].a * eqs[2].c - eqs[1].c * eqs[2].a)
                + eqs[0].c * (eqs[1].a * eqs[2].b - eqs[1].b * eqs[2].a);
      if (det !== 0) break;
      attempts++;
    } while (attempts < 50);

    res.json({
      id: `simul-${Date.now()}-${Math.random()}`,
      size: 3,
      eqs,
      solution: { x, y, z },
    });
  }
});

/**
 * POST /simul-api/check
 * Verify if user correctly solved the system of linear equations
 * Allows small floating-point tolerances (±0.1)
 *
 * Request Body:
 * {
 *   eqs: Array<object>,     // Equations with coefficients
 *   size: number,           // System size (2 or 3)
 *   userX, userY, userZ: number, // User's solution values
 *   solution: object        // Correct solution (for comparison)
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   solution: object,       // Correct solution
 *   message: string
 * }
 */
app.post('/simul-api/check', (req, res) => {
  const { eqs, size, userX, userY, userZ } = req.body || {};
  const ux = Number(userX), uy = Number(userY), uz = Number(userZ || 0);
  let correct;
  if (Number(size) === 2) {
    // Check 2×2: verify equations are satisfied with tolerance
    correct = eqs.every(e => Math.abs(e.a * ux + e.b * uy - e.d) < 0.1);
  } else {
    // Check 3×3: verify equations are satisfied with tolerance
    correct = eqs.every(e => Math.abs(e.a * ux + e.b * uy + e.c * uz - e.d) < 0.1);
  }
  const solution = req.body.solution || {};
  res.json({ correct, solution, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * Map function evaluation difficulty to coefficient/value range
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {object} {min, max} coefficient range
 */
function linearRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 5 };
  if (difficulty === 'medium') return { min: 1, max: 10 };
  return { min: 1, max: 15 };
}

/**
 * FUNCTION EVALUATION API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /funceval-api/question
 * Generate a function evaluation problem
 *
 * Difficulty levels:
 *   - Easy: Single-variable linear f(x) = ax + b
 *   - Medium: Two-variable linear f(x,y) = ax + by + c
 *   - Hard: Three-variable linear f(x,y,z) = ax + by + cz + d
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   formula: string,        // Display text of the function
 *   vars: object,           // Variable values to substitute
 *   answer: number          // Correct function output (rounded to 2 decimals)
 * }
 */
app.get('/funceval-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = linearRange(difficulty);
  let formula, vars, answer;
  if (difficulty === 'easy') {
    const a = randomInt(1, range.max), b = randomInt(-range.max, range.max);
    const xVal = randomInt(-range.max, range.max);
    formula = `f(x) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}`;
    vars = { x: xVal };
    answer = parseFloat((a * xVal + b).toFixed(2));
  } else if (difficulty === 'medium') {
    const a = randomInt(1, range.max), b = randomInt(1, range.max), c = randomInt(-range.max, range.max);
    const xVal = randomInt(-10, 10), yVal = randomInt(-10, 10);
    formula = `f(x,y) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}y ${c >= 0 ? '+' : '−'} ${Math.abs(c)}`;
    vars = { x: xVal, y: yVal };
    answer = parseFloat((a * xVal + b * yVal + c).toFixed(2));
  } else {
    const a = randomInt(1, range.max), b = randomInt(1, range.max), cc = randomInt(1, range.max), d = randomInt(-range.max, range.max);
    const xVal = randomInt(-10, 10), yVal = randomInt(-10, 10), zVal = randomInt(-10, 10);
    formula = `f(x,y,z) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}y ${cc >= 0 ? '+' : '−'} ${Math.abs(cc)}z ${d >= 0 ? '+' : '−'} ${Math.abs(d)}`;
    vars = { x: xVal, y: yVal, z: zVal };
    answer = parseFloat((a * xVal + b * yVal + cc * zVal + d).toFixed(2));
  }
  res.json({ id: `func-${Date.now()}-${Math.random()}`, formula, vars, answer });
});

/**
 * POST /funceval-api/check
 * Verify if user correctly evaluated the function
 * Allows floating-point tolerance (±0.05)
 *
 * Request Body:
 * {
 *   answer: number,         // Correct function output
 *   userAnswer: number      // User's calculated output
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctAnswer: number,
 *   message: string
 * }
 */
app.post('/funceval-api/check', (req, res) => {
  const { answer, userAnswer } = req.body || {};
  const correct = Math.abs(Number(userAnswer) - Number(answer)) < 0.05;
  res.json({ correct, correctAnswer: answer, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * LINE EQUATION API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /lineq-api/question
 * Generate a line equation problem: find m and c for y = mx + c given two points
 *
 * Task: Given (x₁, y₁) and (x₂, y₂), find slope m = (y₂-y₁)/(x₂-x₁) and y-intercept c
 *
 * Difficulty:
 *   - Easy: Pre-calculated m and c with small integer values
 *   - Medium: Random points with calculated m and c
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy' or 'medium' (default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   x1, y1, x2, y2: number, // Two points on the line
 *   m: number,              // Correct slope
 *   c: number               // Correct y-intercept
 * }
 */
app.get('/lineq-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = linearRange(difficulty);
  let x1, y1, x2, y2, m, c;
  // Ensure distinct x values and clean slope for easy
  if (difficulty === 'easy') {
    m = randomInt(-range.max, range.max);
    c = randomInt(-range.max, range.max);
    x1 = randomInt(-5, 5);
    x2 = randomInt(-5, 5);
    while (x2 === x1) x2 = randomInt(-5, 5);
    // Calculate y values using the line equation
    y1 = m * x1 + c;
    y2 = m * x2 + c;
  } else {
    // Random points: calculate m and c from them
    x1 = randomInt(-range.max, range.max);
    y1 = randomInt(-range.max, range.max);
    x2 = randomInt(-range.max, range.max);
    while (x2 === x1) x2 = randomInt(-range.max, range.max);
    y2 = randomInt(-range.max, range.max);
    m = parseFloat(((y2 - y1) / (x2 - x1)).toFixed(2));
    c = parseFloat((y1 - m * x1).toFixed(2));
  }
  res.json({
    id: `lineq-${Date.now()}-${Math.random()}`,
    x1, y1, x2, y2, m, c,
  });
});

/**
 * POST /lineq-api/check
 * Verify if user correctly found the line equation parameters
 * Allows floating-point tolerance (±0.05)
 *
 * Request Body:
 * {
 *   x1, y1, x2, y2: number, // Two points
 *   userM, userC: number    // User's slope and y-intercept
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   m: number,              // Correct slope
 *   c: number,              // Correct y-intercept
 *   message: string
 * }
 */
app.post('/lineq-api/check', (req, res) => {
  const { x1, y1, x2, y2, userM, userC } = req.body || {};
  const actualM = parseFloat(((Number(y2) - Number(y1)) / (Number(x2) - Number(x1))).toFixed(2));
  const actualC = parseFloat((Number(y1) - actualM * Number(x1)).toFixed(2));
  const correct = Math.abs(Number(userM) - actualM) < 0.05 && Math.abs(Number(userC) - actualC) < 0.05;
  res.json({ correct, m: actualM, c: actualC, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * BASIC ARITHMETIC API (+, −, ×)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Map basic arithmetic difficulty to operand range
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {object} {min, max} operand range
 */
function arithRange(difficulty) {
  if (difficulty === 'easy') return { min: 1, max: 9 };
  if (difficulty === 'medium') return { min: 10, max: 99 };
  return { min: 100, max: 999 };
}

/**
 * GET /basicarith-api/question
 * Generate a basic arithmetic problem with random operation and operands
 * Operations: Addition (+), Subtraction (−), Multiplication (×)
 *
 * Query Parameters:
 *   - difficulty (optional): 'easy', 'medium', or 'hard' (default: 'easy')
 *
 * Response:
 * {
 *   id: string,
 *   a, b: number,           // Two operands
 *   op: string,             // Operator (+, −, or ×)
 *   prompt: string,         // Display text with proper formatting
 *   answer: number          // Correct result
 * }
 */
app.get('/basicarith-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const range = arithRange(difficulty);
  const ops = ['+', '−', '×'];
  const op = ops[randomInt(0, 2)];
  // Generate two numbers, each randomly positive or negative
  let a = randomInt(range.min, range.max);
  let b = randomInt(range.min, range.max);
  if (Math.random() < 0.4) a = -a;
  if (Math.random() < 0.4) b = -b;
  let answer;
  if (op === '+') answer = a + b;
  else if (op === '−') answer = a - b;
  else answer = a * b;
  // Build a readable prompt with proper sign handling
  const aStr = String(a);
  const bAbs = Math.abs(b);
  let prompt;
  if (op === '×') {
    prompt = `(${a}) × (${b})`;
  } else if (b < 0) {
    prompt = `${a} ${op} (${b})`;
  } else {
    prompt = `${a} ${op} ${b}`;
  }
  res.json({
    id: `arith-${Date.now()}-${Math.random()}`,
    a, b, op, prompt, answer,
  });
});

/**
 * POST /basicarith-api/check
 * Verify if user correctly solved the arithmetic problem
 *
 * Request Body:
 * {
 *   a, b: number,           // Operands
 *   op: string,             // Operator (+, −, or ×)
 *   answer: number          // User's result
 * }
 *
 * Response:
 * {
 *   correct: boolean,
 *   correctAnswer: number,
 *   message: string
 * }
 */
app.post('/basicarith-api/check', (req, res) => {
  const { a, b, op, answer } = req.body || {};
  let correctAnswer;
  if (op === '+') correctAnswer = Number(a) + Number(b);
  else if (op === '−') correctAnswer = Number(a) - Number(b);
  else correctAnswer = Number(a) * Number(b);
  const correct = Number(answer) === correctAnswer;
  res.json({ correct, correctAnswer, message: correct ? 'Correct' : 'Incorrect' });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FRACTION ADDITION QUIZ API
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Generates fraction addition problems at three difficulty levels:
 *   - Easy:   Same denominators (e.g., 2/5 + 1/5), denominators 2-10
 *   - Medium: Different denominators requiring LCD (e.g., 1/3 + 1/4), denominators 2-12
 *   - Hard:   Mixed numbers (e.g., 1⅔ + 2¼), denominators 2-15
 *
 * All answers must be in simplified form. The server computes the correct
 * simplified answer using GCD for reduction.
 *
 * Utility: gcd(a, b) — Euclidean algorithm for Greatest Common Divisor
 * Used to simplify fractions to lowest terms.
 */

/**
 * gcd(a, b): Compute Greatest Common Divisor using the Euclidean algorithm.
 * Works with non-negative integers. Used to reduce fractions to lowest terms.
 *
 * @param {number} a - First non-negative integer
 * @param {number} b - Second non-negative integer
 * @returns {number} GCD of a and b
 */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

/**
 * simplifyFraction(num, den): Reduce a fraction to lowest terms.
 * Ensures the denominator is always positive. Returns {num, den}.
 *
 * @param {number} num - Numerator (can be negative)
 * @param {number} den - Denominator (must be non-zero)
 * @returns {{num: number, den: number}} Simplified fraction
 */
function simplifyFraction(num, den) {
  if (den < 0) { num = -num; den = -den; }
  const g = gcd(Math.abs(num), den);
  return { num: num / g, den: den / g };
}

/**
 * toMixed(num, den): Convert an improper fraction to mixed number form.
 * Returns {whole, num, den} where the fraction part is always non-negative
 * and in simplified form. If fraction is proper, whole=0.
 *
 * @param {number} num - Numerator
 * @param {number} den - Denominator (positive)
 * @returns {{whole: number, num: number, den: number}} Mixed number representation
 */
function toMixed(num, den) {
  const s = simplifyFraction(num, den);
  const whole = Math.trunc(s.num / s.den);
  let remainder = Math.abs(s.num % s.den);
  return { whole, num: remainder, den: s.den };
}

/**
 * GET /fractionadd-api/question
 *
 * Generates a random fraction addition question at the specified difficulty.
 *
 * Query Parameters:
 *   difficulty: 'easy' | 'medium' | 'hard' (default: 'easy')
 *
 * Response (Easy/Medium): {
 *   id: number,
 *   n1: number, d1: number,   // First fraction: n1/d1
 *   n2: number, d2: number,   // Second fraction: n2/d2
 *   difficulty: string,
 *   mixed: false
 * }
 *
 * Response (Hard - mixed numbers): {
 *   id: number,
 *   w1: number, n1: number, d1: number,  // First mixed number: w1 n1/d1
 *   w2: number, n2: number, d2: number,  // Second mixed number: w2 n2/d2
 *   difficulty: 'hard',
 *   mixed: true
 * }
 */
app.get('/fractionadd-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Same denominators, denominators 2-10
    const den = Math.floor(Math.random() * 9) + 2; // 2..10
    const n1 = Math.floor(Math.random() * (den - 1)) + 1; // 1..(den-1)
    const n2 = Math.floor(Math.random() * (den - 1)) + 1;
    res.json({ id, n1, d1: den, n2, d2: den, difficulty, mixed: false });
  } else if (difficulty === 'medium') {
    // Different denominators, denominators 2-12
    // Ensure d1 != d2 for a meaningful LCD problem
    const d1 = Math.floor(Math.random() * 11) + 2; // 2..12
    let d2 = Math.floor(Math.random() * 11) + 2;
    while (d2 === d1) d2 = Math.floor(Math.random() * 11) + 2;
    const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
    const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
    res.json({ id, n1, d1, n2, d2, difficulty, mixed: false });
  } else {
    // Hard: Mixed numbers with different denominators 2-15
    const d1 = Math.floor(Math.random() * 14) + 2; // 2..15
    let d2 = Math.floor(Math.random() * 14) + 2;
    while (d2 === d1) d2 = Math.floor(Math.random() * 14) + 2;
    const w1 = Math.floor(Math.random() * 5) + 1; // whole part 1..5
    const w2 = Math.floor(Math.random() * 5) + 1;
    const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
    const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
    res.json({ id, w1, n1, d1: d1, w2, n2, d2: d2, difficulty: 'hard', mixed: true });
  }
});

/**
 * POST /fractionadd-api/check
 *
 * Validates the user's fraction addition answer. Computes the correct sum
 * and compares it (in simplified form) to the user's answer.
 *
 * Request Body (Easy/Medium): {
 *   n1: number, d1: number, n2: number, d2: number,
 *   ansNum: number, ansDen: number,
 *   mixed: false
 * }
 *
 * Request Body (Hard): {
 *   w1: number, n1: number, d1: number,
 *   w2: number, n2: number, d2: number,
 *   ansWhole: number, ansNum: number, ansDen: number,
 *   mixed: true
 * }
 *
 * Response: {
 *   correct: boolean,
 *   correctNum: number,     // Correct answer numerator (simplified)
 *   correctDen: number,     // Correct answer denominator (simplified)
 *   correctWhole?: number,  // Correct whole part (hard mode only)
 *   display: string,        // Formatted correct answer string
 *   message: string
 * }
 */
app.post('/fractionadd-api/check', (req, res) => {
  const body = req.body || {};
  let totalNum, totalDen;

  if (body.mixed) {
    // Hard mode: convert mixed numbers to improper fractions, then add
    // w1 n1/d1 → (w1*d1 + n1)/d1
    const imp1 = body.w1 * body.d1 + body.n1;
    const imp2 = body.w2 * body.d2 + body.n2;
    // Add fractions: imp1/d1 + imp2/d2 = (imp1*d2 + imp2*d1) / (d1*d2)
    totalNum = imp1 * body.d2 + imp2 * body.d1;
    totalDen = body.d1 * body.d2;
  } else {
    // Easy/Medium: add n1/d1 + n2/d2 = (n1*d2 + n2*d1) / (d1*d2)
    totalNum = body.n1 * body.d2 + body.n2 * body.d1;
    totalDen = body.d1 * body.d2;
  }

  // Simplify the correct answer
  const simplified = simplifyFraction(totalNum, totalDen);

  let correct, display;

  if (body.mixed) {
    // Hard: expect answer as mixed number {ansWhole, ansNum, ansDen}
    const mixed = toMixed(simplified.num, simplified.den);
    // User answer: convert to improper fraction for comparison
    const userTotal = (Number(body.ansWhole) || 0) * (Number(body.ansDen) || 1) + (Number(body.ansNum) || 0);
    const userDen = Number(body.ansDen) || 1;
    const userSimp = simplifyFraction(userTotal, userDen);
    correct = userSimp.num === simplified.num && userSimp.den === simplified.den;
    // Display format: "3 2/5" or "7/3" if no whole part
    if (mixed.num === 0) {
      display = `${mixed.whole}`;
    } else if (mixed.whole === 0) {
      display = `${simplified.num}/${simplified.den}`;
    } else {
      display = `${mixed.whole} ${mixed.num}/${mixed.den}`;
    }
  } else {
    // Easy/Medium: expect answer as fraction {ansNum, ansDen}
    const userSimp = simplifyFraction(Number(body.ansNum) || 0, Number(body.ansDen) || 1);
    correct = userSimp.num === simplified.num && userSimp.den === simplified.den;
    // Display: if denominator is 1, show as whole number
    if (simplified.den === 1) {
      display = `${simplified.num}`;
    } else {
      display = `${simplified.num}/${simplified.den}`;
    }
  }

  res.json({
    correct,
    correctNum: simplified.num,
    correctDen: simplified.den,
    ...(body.mixed ? { correctWhole: toMixed(simplified.num, simplified.den).whole } : {}),
    display,
    message: correct ? 'Correct!' : 'Incorrect'
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SURDS API — Simplify, add/subtract, multiply, rationalise denominators
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Utility: check if n is a perfect square
 */
function isPerfectSquare(n) {
  if (n < 0) return false;
  const s = Math.round(Math.sqrt(n));
  return s * s === n;
}

/**
 * Utility: largest perfect-square factor of n (n>0)
 * Returns { outer, inner } such that √n = outer × √inner, inner is square-free
 */
function simpleSurd(n) {
  let outer = 1;
  let inner = n;
  for (let f = 2; f * f <= inner; f++) {
    while (inner % (f * f) === 0) {
      outer *= f;
      inner /= (f * f);
    }
  }
  return { outer, inner };
}

/**
 * Utility: list of small primes for generating radicands
 */
const SQUARE_FREE = [2,3,5,6,7,10,11,13,14,15,17,19,21,22,23,26,29,30];

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * GET /surds-api/question?difficulty=easy|medium|hard|extrahard
 *
 * Easy:      Simplify √n  (e.g. √72 = 6√2)
 * Medium:    Add/subtract like surds (e.g. 3√5 + 2√5 = 5√5)
 * Hard:      Multiply surds and simplify (e.g. √6 × √10 = 2√15)
 * ExtraHard: Rationalise denominators (e.g. 6/√3, or 5/(2+√3))
 */
app.get('/surds-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Simplify √n where n = a² × b, b is square-free
    const b = pick(SQUARE_FREE);
    const a = randInt(2, 9);
    const n = a * a * b;
    res.json({ id, difficulty, type: 'simplify', n });
  }
  else if (difficulty === 'medium') {
    // a√r ± b√r = ?√r
    const r = pick(SQUARE_FREE);
    const a = randInt(1, 9);
    const b = randInt(1, 9);
    const op = pick(['+', '-']);
    // Ensure result is positive for subtraction
    const realA = op === '-' ? Math.max(a, b) + 1 : a;
    const realB = op === '-' ? Math.min(a, b) : b;
    res.json({ id, difficulty, type: 'addsub', a: realA, b: realB, r, op });
  }
  else if (difficulty === 'hard') {
    // √(a) × √(b) = simplify √(a*b)
    // Make sure a*b has a nice simplification
    const r1 = pick(SQUARE_FREE);
    const c1 = randInt(1, 5);
    const r2 = pick(SQUARE_FREE);
    const c2 = randInt(1, 5);
    // Question: (c1√r1) × (c2√r2) — simplify
    res.json({ id, difficulty, type: 'multiply', c1, r1, c2, r2 });
  }
  else {
    // Rationalise denominator
    const subtype = pick(['simple', 'conjugate']);
    if (subtype === 'simple') {
      // a / (b√r)  →  rationalise
      const r = pick(SQUARE_FREE);
      const b = randInt(1, 4);
      const a = randInt(1, 12);
      res.json({ id, difficulty, type: 'rationalise', subtype: 'simple', a, b, r });
    } else {
      // a / (p + q√r) → multiply by conjugate
      const r = pick(SQUARE_FREE);
      const p = randInt(1, 5);
      const q = pick([1, -1, 2, -2, 1, 1]);  // keep q small
      const a = randInt(1, 10);
      res.json({ id, difficulty, type: 'rationalise', subtype: 'conjugate', a, p, q, r });
    }
  }
});

/**
 * POST /surds-api/check
 * Validates user's surd answer
 *
 * Answers accepted as strings, e.g. "6√2", "5√5", "2√15", "2√3", "10-5√3", "7"
 * Server computes the correct answer and compares.
 */
app.post('/surds-api/check', express.json(), (req, res) => {
  const body = req.body;
  const { type } = body;

  /**
   * Parse a surd string like "6√2", "√3", "5", "-3√7", "10-5√3", "10+5√3"
   * Returns { rational: number, coeff: number, radicand: number }
   * where the value = rational + coeff × √radicand
   */
  function parseSurd(s) {
    if (!s || typeof s !== 'string') return null;
    s = s.replace(/\s+/g, '').replace(/−/g, '-');

    // Pure integer
    if (/^-?\d+$/.test(s)) {
      return { rational: parseInt(s), coeff: 0, radicand: 1 };
    }

    // Single surd: c√r or √r
    const singleMatch = s.match(/^(-?\d*)[√](\d+)$/);
    if (singleMatch) {
      const c = singleMatch[1] === '' || singleMatch[1] === '+' ? 1 : singleMatch[1] === '-' ? -1 : parseInt(singleMatch[1]);
      return { rational: 0, coeff: c, radicand: parseInt(singleMatch[2]) };
    }

    // Rational ± coeff√radicand: e.g. "10-5√3" or "10+5√3"
    const mixedMatch = s.match(/^(-?\d+)([+-]\d*)[√](\d+)$/);
    if (mixedMatch) {
      const rat = parseInt(mixedMatch[1]);
      let cStr = mixedMatch[2];
      const c = cStr === '+' ? 1 : cStr === '-' ? -1 : parseInt(cStr);
      return { rational: rat, coeff: c, radicand: parseInt(mixedMatch[3]) };
    }

    return null;
  }

  /**
   * Normalize a surd: simplify √radicand part so radicand is square-free
   * E.g. 2√12 → 4√3
   */
  function normalizeSurd(rational, coeff, radicand) {
    if (coeff === 0 || radicand <= 1) return { rational, coeff, radicand: radicand <= 0 ? 1 : radicand };
    const s = simpleSurd(radicand);
    return { rational, coeff: coeff * s.outer, radicand: s.inner };
  }

  let correctRational = 0, correctCoeff = 0, correctRadicand = 1;

  if (type === 'simplify') {
    // √n → outer√inner
    const s = simpleSurd(body.n);
    correctCoeff = s.outer;
    correctRadicand = s.inner;
    if (correctRadicand === 1) { correctRational = correctCoeff; correctCoeff = 0; }
  }
  else if (type === 'addsub') {
    const { a, b, r, op } = body;
    correctCoeff = op === '+' ? a + b : a - b;
    correctRadicand = r;
    if (correctCoeff === 0) { correctRational = 0; correctCoeff = 0; correctRadicand = 1; }
  }
  else if (type === 'multiply') {
    // (c1√r1) × (c2√r2) = c1*c2 * √(r1*r2), then simplify
    const { c1, r1, c2, r2 } = body;
    const prodCoeff = c1 * c2;
    const prodRad = r1 * r2;
    const s = simpleSurd(prodRad);
    correctCoeff = prodCoeff * s.outer;
    correctRadicand = s.inner;
    if (correctRadicand === 1) { correctRational = correctCoeff; correctCoeff = 0; }
  }
  else if (type === 'rationalise') {
    const { subtype, a, r } = body;
    if (subtype === 'simple') {
      // a / (b√r) = a/(b√r) × (√r/√r) = a√r / (b*r)
      const b = body.b;
      const numCoeff = a;      // a√r
      const den = b * r;       // b*r
      // Simplify: gcd of numCoeff and den
      const g = gcd(Math.abs(numCoeff), Math.abs(den));
      correctCoeff = numCoeff / g;
      correctRadicand = r;
      const finalDen = den / g;
      if (finalDen !== 1) {
        // Express as fraction: (a/g)√r / (den/g)
        // We need to represent this carefully
        // Actually: a/(b√r) = (a√r)/(b*r) — simplify fraction a/(b*r) then attach √r
        // Result coeff is the simplified numerator, but if den != 1 we have a fraction
        // For simplicity, we'll compute: numerator = a, denominator = b*r, simplify, coeff = num/den * √r
        // But user types e.g. "2√3/3" — let's handle this differently
        // We'll express answer as fraction string and parse accordingly
        correctRational = 0;
        correctCoeff = numCoeff / g;
        correctRadicand = r;
        // Store denominator for comparison
        body._correctDen = finalDen;
      } else {
        correctRational = 0;
        body._correctDen = 1;
      }
    } else {
      // a / (p + q√r) — multiply by conjugate (p - q√r)/(p - q√r)
      const { p, q } = body;
      const den = p * p - q * q * r;  // (p+q√r)(p-q√r) = p² - q²r
      const numRational = a * p;       // a*p from the numerator
      const numCoeff = -a * q;         // -a*q√r from the numerator
      // Result: (numRational + numCoeff√r) / den
      // Simplify by dividing all parts by gcd
      const g = gcd(gcd(Math.abs(numRational), Math.abs(numCoeff)), Math.abs(den));
      const sign = den < 0 ? -1 : 1;  // ensure positive denominator
      correctRational = (numRational / g) * sign;
      correctCoeff = (numCoeff / g) * sign;
      correctRadicand = r;
      body._correctDen = Math.abs(den) / g;
      if (correctCoeff === 0) correctRadicand = 1;
    }
  }

  // Parse user answer
  const userParsed = parseSurd(body.answer);

  // Build display string for correct answer
  let display = '';
  const cDen = body._correctDen || 1;

  if (cDen === 1) {
    if (correctCoeff === 0) {
      display = `${correctRational}`;
    } else if (correctRational === 0) {
      if (correctCoeff === 1) display = `√${correctRadicand}`;
      else if (correctCoeff === -1) display = `-√${correctRadicand}`;
      else display = `${correctCoeff}√${correctRadicand}`;
    } else {
      const sign = correctCoeff > 0 ? '+' : '';
      const cPart = Math.abs(correctCoeff) === 1 ? (correctCoeff > 0 ? '' : '-') : `${correctCoeff}`;
      display = `${correctRational}${sign}${cPart}√${correctRadicand}`;
    }
  } else {
    // Fractional answer
    if (correctCoeff === 0) {
      display = `${correctRational}/${cDen}`;
    } else if (correctRational === 0) {
      const cPart = Math.abs(correctCoeff) === 1 ? (correctCoeff > 0 ? '' : '-') : `${correctCoeff}`;
      display = `${cPart}√${correctRadicand}/${cDen}`;
    } else {
      const sign = correctCoeff > 0 ? '+' : '';
      const cPart = Math.abs(correctCoeff) === 1 ? (correctCoeff > 0 ? '' : '-') : `${correctCoeff}`;
      display = `(${correctRational}${sign}${cPart}√${correctRadicand})/${cDen}`;
    }
  }

  // Check correctness
  let correct = false;
  if (userParsed && cDen === 1) {
    // Normalize user's surd
    const userNorm = normalizeSurd(userParsed.rational, userParsed.coeff, userParsed.radicand);
    correct = userNorm.rational === correctRational
           && userNorm.coeff === correctCoeff
           && (correctCoeff === 0 || userNorm.radicand === correctRadicand);
  } else if (userParsed && cDen !== 1) {
    // User might type e.g. "2√3/3" — parse fraction form
    // Try parsing as "X/Y" where X is a surd expression
    const fracMatch = (body.answer || '').replace(/\s+/g, '').match(/^\(?(.+?)\)?\/?(\d+)$/);
    if (fracMatch) {
      const numParsed = parseSurd(fracMatch[1]);
      const userDen = parseInt(fracMatch[2]);
      if (numParsed) {
        const numNorm = normalizeSurd(numParsed.rational, numParsed.coeff, numParsed.radicand);
        // Compare: user's (numNorm)/userDen vs correct/cDen
        // Cross multiply to avoid floating point
        correct = numNorm.rational * cDen === correctRational * userDen
               && numNorm.coeff * cDen === correctCoeff * userDen
               && (correctCoeff === 0 || numNorm.radicand === correctRadicand);
      }
    }
  }

  res.json({
    correct,
    display,
    message: correct ? 'Correct!' : 'Incorrect'
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INDICES API — Laws of exponents (IGCSE syllabus)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helper: pick random element
 */
function idxPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function idxRand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

/**
 * Helper: format exponent for display — uses Unicode superscripts
 */
function sup(n) {
  const map = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const s = String(Math.abs(n));
  const digits = s.split('').map(d => map[Number(d)]).join('');
  if (n < 0) return '⁻' + digits;
  return digits;
}

/**
 * Helper: format a fractional exponent like 2/3, 1/2, -2/3
 */
function fmtFracExp(num, den) {
  if (den === 1) return String(num);
  return `${num}/${den}`;
}

/**
 * GET /indices-api/question?difficulty=easy|medium|hard|extrahard
 *
 * Easy:      Basic index laws — multiply (add exponents), divide (subtract), power of power
 * Medium:    Zero and negative exponents — evaluate numeric expressions
 * Hard:      Fractional exponents — evaluate e.g. 8^(1/3), 27^(2/3)
 * ExtraHard: Mixed — negative fractional exponents, combined expressions
 */
app.get('/indices-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();
  const bases = ['x', 'y', 'a', 'b', 'm', 'n', 'p'];

  if (difficulty === 'easy') {
    const subtype = idxPick(['multiply', 'divide', 'power']);
    const base = idxPick(bases);
    if (subtype === 'multiply') {
      // a^m × a^n
      const m = idxRand(2, 8);
      const n = idxRand(2, 8);
      const prompt = `${base}${sup(m)} × ${base}${sup(n)}`;
      const answerExp = m + n;
      res.json({ id, difficulty, type: 'simplify', subtype, base, m, n, prompt, answerExp });
    } else if (subtype === 'divide') {
      // a^m ÷ a^n (m > n to keep positive)
      const m = idxRand(5, 12);
      const n = idxRand(1, m - 1);
      const prompt = `${base}${sup(m)} ÷ ${base}${sup(n)}`;
      const answerExp = m - n;
      res.json({ id, difficulty, type: 'simplify', subtype, base, m, n, prompt, answerExp });
    } else {
      // (a^m)^n
      const m = idxRand(2, 5);
      const n = idxRand(2, 5);
      const prompt = `(${base}${sup(m)})${sup(n)}`;
      const answerExp = m * n;
      res.json({ id, difficulty, type: 'simplify', subtype, base, m, n, prompt, answerExp });
    }
  }
  else if (difficulty === 'medium') {
    const subtype = idxPick(['zero', 'negative_eval', 'negative_simplify']);
    if (subtype === 'zero') {
      // a^0 = 1
      const numBase = idxRand(2, 20);
      const prompt = `${numBase}⁰`;
      res.json({ id, difficulty, type: 'evaluate', subtype, prompt, answerNum: 1, answerDen: 1 });
    } else if (subtype === 'negative_eval') {
      // a^(-n) = 1/a^n — evaluate numerically
      const numBase = idxPick([2, 3, 4, 5, 10]);
      const n = idxPick([1, 2, 3]);
      // Keep answer manageable
      if (numBase === 10 && n > 3) n = 2;
      const prompt = `${numBase}${sup(-n)}`;
      const answerNum = 1;
      const answerDen = Math.pow(numBase, n);
      res.json({ id, difficulty, type: 'evaluate', subtype, numBase, n, prompt, answerNum, answerDen });
    } else {
      // Simplify: x^(-a) × x^b
      const base = idxPick(bases);
      const a = idxRand(1, 5);
      const b = idxRand(a + 1, a + 6); // ensure positive result most of the time
      const prompt = `${base}${sup(-a)} × ${base}${sup(b)}`;
      const answerExp = b - a;
      res.json({ id, difficulty, type: 'simplify', subtype, base, m: -a, n: b, prompt, answerExp });
    }
  }
  else if (difficulty === 'hard') {
    // Fractional exponents — evaluate numerically
    // Use bases that have clean roots
    const combos = [
      { base: 4, expNum: 1, expDen: 2 },    // 4^(1/2) = 2
      { base: 9, expNum: 1, expDen: 2 },    // 9^(1/2) = 3
      { base: 16, expNum: 1, expDen: 2 },   // 16^(1/2) = 4
      { base: 25, expNum: 1, expDen: 2 },   // 25^(1/2) = 5
      { base: 36, expNum: 1, expDen: 2 },   // 36^(1/2) = 6
      { base: 49, expNum: 1, expDen: 2 },   // 49^(1/2) = 7
      { base: 64, expNum: 1, expDen: 2 },   // 64^(1/2) = 8
      { base: 100, expNum: 1, expDen: 2 },  // 100^(1/2) = 10
      { base: 8, expNum: 1, expDen: 3 },    // 8^(1/3) = 2
      { base: 27, expNum: 1, expDen: 3 },   // 27^(1/3) = 3
      { base: 64, expNum: 1, expDen: 3 },   // 64^(1/3) = 4
      { base: 125, expNum: 1, expDen: 3 },  // 125^(1/3) = 5
      { base: 16, expNum: 1, expDen: 4 },   // 16^(1/4) = 2
      { base: 81, expNum: 1, expDen: 4 },   // 81^(1/4) = 3
      { base: 32, expNum: 1, expDen: 5 },   // 32^(1/5) = 2
      // m/n fractional exponents
      { base: 4, expNum: 3, expDen: 2 },    // 4^(3/2) = 8
      { base: 9, expNum: 3, expDen: 2 },    // 9^(3/2) = 27
      { base: 8, expNum: 2, expDen: 3 },    // 8^(2/3) = 4
      { base: 27, expNum: 2, expDen: 3 },   // 27^(2/3) = 9
      { base: 27, expNum: 4, expDen: 3 },   // 27^(4/3) = 81
      { base: 16, expNum: 3, expDen: 4 },   // 16^(3/4) = 8
      { base: 16, expNum: 3, expDen: 2 },   // 16^(3/2) = 64
      { base: 25, expNum: 3, expDen: 2 },   // 25^(3/2) = 125
      { base: 32, expNum: 2, expDen: 5 },   // 32^(2/5) = 4
      { base: 32, expNum: 3, expDen: 5 },   // 32^(3/5) = 8
      { base: 64, expNum: 2, expDen: 3 },   // 64^(2/3) = 16
      { base: 100, expNum: 3, expDen: 2 },  // 100^(3/2) = 1000
      { base: 81, expNum: 3, expDen: 4 },   // 81^(3/4) = 27
    ];
    const c = idxPick(combos);
    const root = Math.round(Math.pow(c.base, 1 / c.expDen));
    const answer = Math.pow(root, c.expNum);
    const prompt = `${c.base}^(${fmtFracExp(c.expNum, c.expDen)})`;
    res.json({ id, difficulty, type: 'evaluate', subtype: 'fractional', numBase: c.base, expNum: c.expNum, expDen: c.expDen, prompt, answerNum: answer, answerDen: 1 });
  }
  else {
    // ExtraHard: negative fractional exponents and fraction bases
    const subtype = idxPick(['neg_frac', 'frac_base']);
    if (subtype === 'neg_frac') {
      // a^(-m/n) = 1/a^(m/n)
      const combos = [
        { base: 4, expNum: 1, expDen: 2 },   // 4^(-1/2) = 1/2
        { base: 9, expNum: 1, expDen: 2 },   // 9^(-1/2) = 1/3
        { base: 8, expNum: 1, expDen: 3 },   // 8^(-1/3) = 1/2
        { base: 27, expNum: 1, expDen: 3 },  // 27^(-1/3) = 1/3
        { base: 27, expNum: 2, expDen: 3 },  // 27^(-2/3) = 1/9
        { base: 8, expNum: 2, expDen: 3 },   // 8^(-2/3) = 1/4
        { base: 16, expNum: 3, expDen: 4 },  // 16^(-3/4) = 1/8
        { base: 25, expNum: 3, expDen: 2 },  // 25^(-3/2) = 1/125
        { base: 32, expNum: 2, expDen: 5 },  // 32^(-2/5) = 1/4
        { base: 64, expNum: 2, expDen: 3 },  // 64^(-2/3) = 1/16
        { base: 100, expNum: 1, expDen: 2 }, // 100^(-1/2) = 1/10
        { base: 81, expNum: 3, expDen: 4 },  // 81^(-3/4) = 1/27
      ];
      const c = idxPick(combos);
      const root = Math.round(Math.pow(c.base, 1 / c.expDen));
      const val = Math.pow(root, c.expNum);
      const prompt = `${c.base}^(${fmtFracExp(-c.expNum, c.expDen)})`;
      res.json({ id, difficulty, type: 'evaluate', subtype, numBase: c.base, expNum: -c.expNum, expDen: c.expDen, prompt, answerNum: 1, answerDen: val });
    } else {
      // (a/b)^(-n) = (b/a)^n   or   (a/b)^(m/n)
      const fracBases = [
        { a: 1, b: 2, exp: -2, ansNum: 4, ansDen: 1 },      // (1/2)^(-2) = 4
        { a: 1, b: 3, exp: -2, ansNum: 9, ansDen: 1 },      // (1/3)^(-2) = 9
        { a: 2, b: 3, exp: -1, ansNum: 3, ansDen: 2 },      // (2/3)^(-1) = 3/2
        { a: 2, b: 5, exp: -2, ansNum: 25, ansDen: 4 },     // (2/5)^(-2) = 25/4
        { a: 3, b: 4, exp: -2, ansNum: 16, ansDen: 9 },     // (3/4)^(-2) = 16/9
        { a: 1, b: 5, exp: -3, ansNum: 125, ansDen: 1 },    // (1/5)^(-3) = 125
        { a: 8, b: 27, exp: -100, ansNum: -1, ansDen: -1 },  // placeholder — replaced below
        { a: 4, b: 9, exp: -100, ansNum: -1, ansDen: -1 },   // placeholder — replaced below
      ];
      // Replace placeholders with fractional-exponent fraction bases
      fracBases[6] = { a: 8, b: 27, expNum: -2, expDen: 3, ansNum: 9, ansDen: 4 };  // (8/27)^(-2/3) = 9/4
      fracBases[7] = { a: 4, b: 9, expNum: -1, expDen: 2, ansNum: 3, ansDen: 2 };   // (4/9)^(-1/2) = 3/2

      const c = idxPick(fracBases);
      let prompt, ansNum, ansDen;
      if (c.expNum !== undefined) {
        // Fractional exponent on fraction base
        prompt = `(${c.a}/${c.b})^(${fmtFracExp(c.expNum, c.expDen)})`;
        ansNum = c.ansNum; ansDen = c.ansDen;
      } else {
        prompt = `(${c.a}/${c.b})${sup(c.exp)}`;
        ansNum = c.ansNum; ansDen = c.ansDen;
      }
      res.json({ id, difficulty, type: 'evaluate', subtype, prompt, answerNum: ansNum, answerDen: ansDen });
    }
  }
});

/**
 * POST /indices-api/check
 * Validates user's answer for indices questions.
 *
 * Two modes:
 * - 'simplify': user answers with an exponent (e.g. "7" for x^7, or "-3" for x^(-3))
 * - 'evaluate': user answers with a number or fraction (e.g. "8", "1/4", "9/4")
 */
app.post('/indices-api/check', express.json(), (req, res) => {
  const { type, answerExp, answerNum, answerDen } = req.body;
  const userAnswer = (req.body.answer || '').replace(/\s+/g, '').replace(/−/g, '-');

  let correct = false;
  let display = '';

  if (type === 'simplify') {
    // User should provide the exponent as an integer
    const userExp = parseInt(userAnswer);
    correct = !isNaN(userExp) && userExp === answerExp;
    display = `${req.body.base}${sup(answerExp)}`;
  }
  else if (type === 'evaluate') {
    // Parse user answer as fraction or integer
    let uNum, uDen;
    const fracMatch = userAnswer.match(/^(-?\d+)\/(-?\d+)$/);
    if (fracMatch) {
      uNum = parseInt(fracMatch[1]);
      uDen = parseInt(fracMatch[2]);
    } else {
      const intMatch = userAnswer.match(/^(-?\d+)$/);
      if (intMatch) { uNum = parseInt(intMatch[1]); uDen = 1; }
    }

    if (uNum !== undefined && uDen !== undefined && uDen !== 0) {
      // Simplify both fractions and compare
      const userSimp = simplifyFraction(uNum, uDen);
      const correctSimp = simplifyFraction(answerNum, answerDen);
      correct = userSimp.num === correctSimp.num && userSimp.den === correctSimp.den;
    }

    // Build display
    if (answerDen === 1) {
      display = `${answerNum}`;
    } else {
      const s = simplifyFraction(answerNum, answerDen);
      display = s.den === 1 ? `${s.num}` : `${s.num}/${s.den}`;
    }
  }

  res.json({
    correct,
    display,
    message: correct ? 'Correct!' : 'Incorrect'
  });
});

/**
 * CATCH-ALL ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 * Serves the React/Vue SPA index.html for all unmatched routes
 * Enables client-side routing to work properly
 */
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

/**
 * START SERVER
 * ═══════════════════════════════════════════════════════════════════════════
 * Listen on all interfaces (0.0.0.0) at the configured port
 * 0.0.0.0 makes the server accessible from any network interface/IP address
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tenali app running on http://0.0.0.0:${PORT}`);
});
