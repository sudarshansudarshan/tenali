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

// ═══════════════════════════════════════════════════════════════════════════
// SEQUENCES & SERIES API
// ═══════════════════════════════════════════════════════════════════════════

function seqRand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function seqPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * GET /sequences-api/question?difficulty=easy|medium|hard|extrahard
 *
 * Easy:      Arithmetic sequences — find the nth term
 * Medium:    Arithmetic series — find the sum of first n terms
 * Hard:      Geometric sequences — find the nth term
 * ExtraHard: Geometric series — find the sum of first n terms
 */
app.get('/sequences-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Arithmetic: a, a+d, a+2d, ... Find the nth term
    const a = seqRand(-10, 20);
    const d = seqRand(-8, 8);
    if (d === 0) d = seqPick([1, -1, 2, -2, 3, 5]);
    const n = seqRand(5, 20);
    const terms = [a, a + d, a + 2 * d, a + 3 * d];
    const answer = a + (n - 1) * d;
    const prompt = `${terms.join(', ')}, ... Find the ${n}th term`;
    res.json({ id, difficulty, type: 'arith_nth', a, d, n, terms, answer, prompt });
  }
  else if (difficulty === 'medium') {
    // Arithmetic: sum of first n terms S_n = n/2 × (2a + (n-1)d)
    const a = seqRand(1, 15);
    const d = seqRand(1, 8);
    const n = seqRand(5, 20);
    const terms = [a, a + d, a + 2 * d, a + 3 * d];
    const answer = Math.round(n / 2 * (2 * a + (n - 1) * d));  // always integer since n*(2a+(n-1)d) is always even
    const prompt = `${terms.join(', ')}, ... Find the sum of first ${n} terms`;
    res.json({ id, difficulty, type: 'arith_sum', a, d, n, terms, answer, prompt });
  }
  else if (difficulty === 'hard') {
    // Geometric: a, ar, ar², ... Find the nth term
    const a = seqPick([1, 2, 3, 4, 5, -1, -2, -3]);
    const r = seqPick([2, 3, -2, -3, 1/2, 1/3, -1/2]);
    const n = seqRand(3, 8);
    const terms = [a, a * r, a * r * r, a * r * r * r];
    const answer = a * Math.pow(r, n - 1);
    // Format terms nicely (handle fractions)
    const fmtNum = (x) => Number.isInteger(x) ? String(x) : x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    const prompt = `${terms.map(fmtNum).join(', ')}, ... Find the ${n}th term`;
    // Store answer as fraction if needed
    let ansNum, ansDen;
    if (Number.isInteger(answer)) {
      ansNum = answer; ansDen = 1;
    } else {
      // Convert to fraction: a * r^(n-1) where r might be 1/2 or 1/3
      // Use rational arithmetic
      const rFrac = r === 1/2 ? { n: 1, d: 2 } : r === 1/3 ? { n: 1, d: 3 } : r === -1/2 ? { n: -1, d: 2 } : { n: r, d: 1 };
      let num = a * Math.pow(rFrac.n, n - 1);
      let den = Math.pow(rFrac.d, n - 1);
      const g = gcd(Math.abs(num), Math.abs(den));
      ansNum = num / g; ansDen = den / g;
      if (ansDen < 0) { ansNum = -ansNum; ansDen = -ansDen; }
    }
    res.json({ id, difficulty, type: 'geom_nth', a, r, n, terms: terms.map(fmtNum), ansNum, ansDen, prompt });
  }
  else {
    // Geometric sum: S_n = a(r^n - 1)/(r - 1) for r ≠ 1
    const a = seqPick([1, 2, 3, 4, 5]);
    const r = seqPick([2, 3, -2, 1/2]);
    const n = seqRand(3, 7);
    const terms = [a, a * r, a * r * r];
    const fmtNum = (x) => Number.isInteger(x) ? String(x) : x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');

    // Compute sum using rational arithmetic
    let ansNum, ansDen;
    if (Number.isInteger(r)) {
      const sn = a * (Math.pow(r, n) - 1) / (r - 1);
      ansNum = Math.round(sn); ansDen = 1;
    } else {
      // r = 1/2: S_n = a(1 - (1/2)^n) / (1 - 1/2) = a * 2 * (1 - 1/2^n) = 2a * (2^n - 1)/2^n
      const rFrac = r === 1/2 ? { n: 1, d: 2 } : { n: r, d: 1 };
      const rn_num = Math.pow(rFrac.n, n);
      const rn_den = Math.pow(rFrac.d, n);
      // S = a * (1 - rn_num/rn_den) / (1 - rFrac.n/rFrac.d)
      // = a * (rn_den - rn_num) / rn_den  /  (rFrac.d - rFrac.n) / rFrac.d
      // = a * (rn_den - rn_num) * rFrac.d / (rn_den * (rFrac.d - rFrac.n))
      let num = a * (rn_den - rn_num) * rFrac.d;
      let den = rn_den * (rFrac.d - rFrac.n);
      const g = gcd(Math.abs(num), Math.abs(den));
      ansNum = num / g; ansDen = den / g;
      if (ansDen < 0) { ansNum = -ansNum; ansDen = -ansDen; }
    }

    const prompt = `${terms.map(fmtNum).join(', ')}, ... Find the sum of first ${n} terms`;
    res.json({ id, difficulty, type: 'geom_sum', a, r, n, terms: terms.map(fmtNum), ansNum, ansDen, prompt });
  }
});

/**
 * POST /sequences-api/check
 */
app.post('/sequences-api/check', express.json(), (req, res) => {
  const { type, answer: rawAns } = req.body;
  const userStr = (rawAns || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;
  let display = '';

  if (type === 'arith_nth' || type === 'arith_sum') {
    const expected = req.body.answer;
    const userNum = parseFloat(userStr);
    correct = !isNaN(userNum) && Math.abs(userNum - expected) < 0.001;
    display = String(expected);
  }
  else {
    // Geometric: answer may be fraction
    const { ansNum, ansDen } = req.body;
    const s = simplifyFraction(ansNum, ansDen);

    // Parse user answer as fraction or integer
    let uNum, uDen;
    const fracMatch = userStr.match(/^(-?\d+)\/(-?\d+)$/);
    if (fracMatch) {
      uNum = parseInt(fracMatch[1]); uDen = parseInt(fracMatch[2]);
    } else {
      const num = parseFloat(userStr);
      if (!isNaN(num) && Number.isInteger(num)) { uNum = num; uDen = 1; }
      else if (!isNaN(num)) {
        // Allow decimal: compare values
        const expected = s.num / s.den;
        correct = Math.abs(num - expected) < 0.01;
        display = s.den === 1 ? `${s.num}` : `${s.num}/${s.den}`;
        return res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
      }
    }

    if (uNum !== undefined && uDen !== undefined && uDen !== 0) {
      const us = simplifyFraction(uNum, uDen);
      correct = us.num === s.num && us.den === s.den;
    }
    display = s.den === 1 ? `${s.num}` : `${s.num}/${s.den}`;
  }

  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// RATIO & PROPORTION API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /ratio-api/question?difficulty=easy|medium|hard|extrahard
 *
 * Easy:      Simplify a ratio (e.g. 12:8 = 3:2)
 * Medium:    Divide an amount in a ratio (e.g. divide 120 in ratio 3:2)
 * Hard:      Direct proportion (e.g. if 5 items cost 20, how much do 8 cost?)
 * ExtraHard: Inverse proportion (e.g. 4 workers take 6 days, how long for 3 workers?)
 */
app.get('/ratio-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Simplify a:b
    const g = seqRand(2, 8);
    const a = seqRand(1, 10) * g;
    const b = seqRand(1, 10) * g;
    // Ensure they're not already simplified
    const gc = gcd(a, b);
    const prompt = `Simplify the ratio ${a} : ${b}`;
    res.json({ id, difficulty, type: 'simplify', a, b, ansA: a / gc, ansB: b / gc, prompt });
  }
  else if (difficulty === 'medium') {
    // Divide amount in ratio a:b (two parts) or a:b:c (three parts)
    const parts = seqPick([2, 2, 2, 3]); // mostly 2-part
    if (parts === 2) {
      const ra = seqRand(1, 7);
      const rb = seqRand(1, 7);
      const total = (ra + rb) * seqRand(2, 15);
      const prompt = `Divide ${total} in the ratio ${ra} : ${rb}`;
      const unit = total / (ra + rb);
      res.json({ id, difficulty, type: 'divide2', ra, rb, total, ans1: ra * unit, ans2: rb * unit, prompt });
    } else {
      const ra = seqRand(1, 5);
      const rb = seqRand(1, 5);
      const rc = seqRand(1, 5);
      const total = (ra + rb + rc) * seqRand(2, 10);
      const prompt = `Divide ${total} in the ratio ${ra} : ${rb} : ${rc}`;
      const unit = total / (ra + rb + rc);
      res.json({ id, difficulty, type: 'divide3', ra, rb, rc, total, ans1: ra * unit, ans2: rb * unit, ans3: rc * unit, prompt });
    }
  }
  else if (difficulty === 'hard') {
    // Direct proportion: if a costs/weighs x, find cost/weight for b
    const unitVal = seqRand(2, 15);
    const qtyA = seqRand(2, 10);
    const valA = unitVal * qtyA;
    const qtyB = seqRand(2, 15);
    const valB = unitVal * qtyB;
    const contexts = [
      { q: `If ${qtyA} items cost $${valA}, how much do ${qtyB} items cost?`, unit: '$' },
      { q: `If ${qtyA} kg weighs ${valA} lbs, how much do ${qtyB} kg weigh?`, unit: ' lbs' },
      { q: `A car uses ${valA} litres for ${qtyA} km. How many litres for ${qtyB} km?`, unit: ' litres' },
    ];
    const ctx = seqPick(contexts);
    res.json({ id, difficulty, type: 'direct', qtyA, valA, qtyB, answer: valB, prompt: ctx.q });
  }
  else {
    // Inverse proportion: if a workers take x days, how long for b workers?
    const workersA = seqRand(2, 10);
    const daysA = seqRand(2, 15);
    const totalWork = workersA * daysA;
    // Pick workersB that divides totalWork evenly
    const divisors = [];
    for (let i = 2; i <= 20; i++) { if (totalWork % i === 0 && i !== workersA) divisors.push(i); }
    if (divisors.length === 0) divisors.push(workersA + 1);
    const workersB = seqPick(divisors);
    const daysB = totalWork / workersB;
    const prompt = `${workersA} workers take ${daysA} days to finish a job. How many days for ${workersB} workers?`;
    // ansNum/ansDen to handle non-integer results
    const g2 = gcd(totalWork, workersB);
    res.json({ id, difficulty, type: 'inverse', workersA, daysA, workersB, ansNum: totalWork / g2, ansDen: workersB / g2, prompt });
  }
});

/**
 * POST /ratio-api/check
 */
app.post('/ratio-api/check', express.json(), (req, res) => {
  const { type } = req.body;
  const userStr = (req.body.answer || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;
  let display = '';

  if (type === 'simplify') {
    // Expect "a:b"
    const { ansA, ansB } = req.body;
    const m = userStr.match(/^(\d+):(\d+)$/);
    if (m) {
      correct = parseInt(m[1]) === ansA && parseInt(m[2]) === ansB;
    }
    display = `${ansA}:${ansB}`;
  }
  else if (type === 'divide2') {
    // Expect "a, b" or "a and b"
    const { ans1, ans2 } = req.body;
    const m = userStr.match(/^(-?\d+)[,\s&]+(-?\d+)$/);
    if (m) { correct = parseInt(m[1]) === ans1 && parseInt(m[2]) === ans2; }
    // Also accept just the larger part
    display = `${ans1}, ${ans2}`;
  }
  else if (type === 'divide3') {
    const { ans1, ans2, ans3 } = req.body;
    const m = userStr.match(/^(-?\d+)[,\s&]+(-?\d+)[,\s&]+(-?\d+)$/);
    if (m) { correct = parseInt(m[1]) === ans1 && parseInt(m[2]) === ans2 && parseInt(m[3]) === ans3; }
    display = `${ans1}, ${ans2}, ${ans3}`;
  }
  else if (type === 'direct') {
    const expected = req.body.answer;
    const userNum = parseFloat(userStr);
    correct = !isNaN(userNum) && Math.abs(userNum - expected) < 0.01;
    display = String(expected);
  }
  else if (type === 'inverse') {
    const { ansNum, ansDen } = req.body;
    const s = simplifyFraction(ansNum, ansDen);
    // Parse fraction or integer
    let uNum, uDen;
    const fracMatch = userStr.match(/^(-?\d+)\/(-?\d+)$/);
    if (fracMatch) { uNum = parseInt(fracMatch[1]); uDen = parseInt(fracMatch[2]); }
    else { const n = parseFloat(userStr); if (!isNaN(n) && Number.isInteger(n)) { uNum = n; uDen = 1; } }
    if (uNum !== undefined && uDen !== undefined && uDen !== 0) {
      const us = simplifyFraction(uNum, uDen);
      correct = us.num === s.num && us.den === s.den;
    }
    display = s.den === 1 ? `${s.num}` : `${s.num}/${s.den}`;
  }

  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// PERCENTAGES API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /percent-api/question?difficulty=easy|medium|hard|extrahard
 *
 * Easy:      Find X% of a number (e.g. 20% of 150)
 * Medium:    Percentage increase/decrease (e.g. increase 80 by 15%)
 * Hard:      Reverse percentage (e.g. after 20% increase, price is 60. What was original?)
 * ExtraHard: Compound interest / repeated percentage change
 */
app.get('/percent-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Find X% of N
    const pct = seqPick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90]);
    const base = seqPick([50, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000]);
    const answer = pct * base / 100;
    const prompt = `What is ${pct}% of ${base}?`;
    res.json({ id, difficulty, type: 'find_pct', pct, base, answer, prompt });
  }
  else if (difficulty === 'medium') {
    // Increase or decrease by X%
    const op = seqPick(['increase', 'decrease']);
    const pct = seqPick([5, 10, 15, 20, 25, 30, 40, 50]);
    const base = seqPick([40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500]);
    const change = pct * base / 100;
    const answer = op === 'increase' ? base + change : base - change;
    const prompt = `${op === 'increase' ? 'Increase' : 'Decrease'} ${base} by ${pct}%`;
    res.json({ id, difficulty, type: 'inc_dec', op, pct, base, answer, prompt });
  }
  else if (difficulty === 'hard') {
    // Reverse percentage: "After a P% increase, the value is V. What was the original?"
    const op = seqPick(['increase', 'decrease']);
    const pct = seqPick([10, 15, 20, 25, 30, 40, 50]);
    const original = seqPick([40, 50, 60, 80, 100, 120, 150, 200, 250, 300]);
    const finalVal = op === 'increase'
      ? original * (1 + pct / 100)
      : original * (1 - pct / 100);
    const prompt = `After a ${pct}% ${op}, the price is $${finalVal}. What was the original price?`;
    res.json({ id, difficulty, type: 'reverse', op, pct, finalVal, answer: original, prompt });
  }
  else {
    // Compound: A = P(1 ± r/100)^n — find the final amount
    const P = seqPick([100, 200, 500, 1000, 2000, 5000]);
    const rate = seqPick([5, 10, 15, 20]);
    const years = seqPick([2, 3, 4]);
    const op = seqPick(['increase', 'decrease']);
    const multiplier = op === 'increase' ? (1 + rate / 100) : (1 - rate / 100);
    const answer = Math.round(P * Math.pow(multiplier, years) * 100) / 100;
    const prompt = op === 'increase'
      ? `$${P} invested at ${rate}% compound interest per year for ${years} years. Find the final amount.`
      : `A population of ${P} decreases by ${rate}% per year for ${years} years. What is the final population?`;
    res.json({ id, difficulty, type: 'compound', P, rate, years, op, answer, prompt });
  }
});

/**
 * POST /percent-api/check
 */
app.post('/percent-api/check', express.json(), (req, res) => {
  const { type, answer: expected } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/[$,]/g, '').replace(/−/g, '-');
  const userNum = parseFloat(userStr);
  let correct = false;

  if (!isNaN(userNum)) {
    if (type === 'compound') {
      // Allow rounding to 2 decimal places
      correct = Math.abs(userNum - expected) < 0.5;
    } else {
      correct = Math.abs(userNum - expected) < 0.01;
    }
  }

  let display = Number.isInteger(expected) ? String(expected) : expected.toFixed(2);
  if (type === 'reverse' || type === 'find_pct' || type === 'inc_dec') {
    display = String(expected);
  }

  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// SETS API — Union, intersection, complement, Venn diagrams
// ═══════════════════════════════════════════════════════════════════════════

function setPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function setRand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

/** Generate a random subset of size k from universe */
function randomSubset(universe, k) {
  const copy = [...universe];
  const result = [];
  for (let i = 0; i < Math.min(k, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

/** Set operations */
function setUnion(a, b) { return [...new Set([...a, ...b])].sort((x, y) => x - y); }
function setIntersect(a, b) { const s = new Set(b); return a.filter(x => s.has(x)).sort((x, y) => x - y); }
function setDiff(a, b) { const s = new Set(b); return a.filter(x => !s.has(x)).sort((x, y) => x - y); }

/**
 * GET /sets-api/question?difficulty=easy|medium|hard|extrahard
 *
 * Easy:      List elements — union, intersection, complement, difference
 * Medium:    Cardinality — n(A∪B) = n(A) + n(B) − n(A∩B)
 * Hard:      2-set Venn — given some region counts, find a missing region
 * ExtraHard: 3-set Venn — given totals, find specific region
 */
app.get('/sets-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Generate universe and two sets, ask for a set operation result
    const universe = [];
    for (let i = 1; i <= setRand(10, 15); i++) universe.push(i);
    const A = randomSubset(universe, setRand(3, 6));
    const B = randomSubset(universe, setRand(3, 6));

    const ops = [
      { op: 'A ∪ B', answer: setUnion(A, B) },
      { op: 'A ∩ B', answer: setIntersect(A, B) },
      { op: 'A − B', answer: setDiff(A, B) },
      { op: 'B − A', answer: setDiff(B, A) },
      { op: "A'", answer: setDiff(universe, A) },
    ];
    const chosen = setPick(ops);
    const prompt = `U = {${universe.join(', ')}}, A = {${A.join(', ')}}, B = {${B.join(', ')}}. Find ${chosen.op}`;
    res.json({ id, difficulty, type: 'list', prompt, answer: chosen.answer });
  }
  else if (difficulty === 'medium') {
    // Cardinality problems using inclusion-exclusion
    const nA = setRand(10, 30);
    const nB = setRand(10, 30);
    const nAB = setRand(2, Math.min(nA, nB) - 1); // intersection
    const nAuB = nA + nB - nAB;

    const subtype = setPick(['find_union', 'find_intersect', 'find_only_a']);
    let prompt, answer;
    if (subtype === 'find_union') {
      prompt = `n(A) = ${nA}, n(B) = ${nB}, n(A ∩ B) = ${nAB}. Find n(A ∪ B)`;
      answer = nAuB;
    } else if (subtype === 'find_intersect') {
      prompt = `n(A) = ${nA}, n(B) = ${nB}, n(A ∪ B) = ${nAuB}. Find n(A ∩ B)`;
      answer = nAB;
    } else {
      prompt = `n(A) = ${nA}, n(A ∩ B) = ${nAB}. How many elements are in A only?`;
      answer = nA - nAB;
    }
    res.json({ id, difficulty, type: 'cardinality', subtype, prompt, answer });
  }
  else if (difficulty === 'hard') {
    // 2-set Venn diagram: given total and some regions, find missing
    const onlyA = setRand(5, 20);
    const both = setRand(3, 15);
    const onlyB = setRand(5, 20);
    const neither = setRand(2, 10);
    const total = onlyA + both + onlyB + neither;

    const subtype = setPick(['find_neither', 'find_both', 'find_onlyA', 'find_total']);
    let prompt, answer;
    if (subtype === 'find_neither') {
      prompt = `In a group of ${total}: n(A only) = ${onlyA}, n(A ∩ B) = ${both}, n(B only) = ${onlyB}. How many are in neither A nor B?`;
      answer = neither;
    } else if (subtype === 'find_both') {
      prompt = `In a group of ${total}: n(A) = ${onlyA + both}, n(B) = ${onlyB + both}, n(neither) = ${neither}. Find n(A ∩ B).`;
      answer = both;
    } else if (subtype === 'find_onlyA') {
      prompt = `In a group of ${total}: n(A ∩ B) = ${both}, n(B only) = ${onlyB}, n(neither) = ${neither}. How many are in A only?`;
      answer = onlyA;
    } else {
      prompt = `n(A only) = ${onlyA}, n(A ∩ B) = ${both}, n(B only) = ${onlyB}, n(neither) = ${neither}. Find the total.`;
      answer = total;
    }
    res.json({ id, difficulty, type: 'venn2', subtype, prompt, answer });
  }
  else {
    // 3-set Venn diagram
    // Generate all 7 regions + neither
    const abc = setRand(1, 5);        // all three
    const abOnly = setRand(1, 8);     // A∩B only (not C)
    const acOnly = setRand(1, 8);     // A∩C only (not B)
    const bcOnly = setRand(1, 8);     // B∩C only (not A)
    const aOnly = setRand(3, 12);     // A only
    const bOnly = setRand(3, 12);     // B only
    const cOnly = setRand(3, 12);     // C only
    const neither = setRand(2, 8);

    const nA = aOnly + abOnly + acOnly + abc;
    const nB = bOnly + abOnly + bcOnly + abc;
    const nC = cOnly + acOnly + bcOnly + abc;
    const nAB = abOnly + abc;
    const nAC = acOnly + abc;
    const nBC = bcOnly + abc;
    const total = aOnly + bOnly + cOnly + abOnly + acOnly + bcOnly + abc + neither;

    const subtype = setPick(['find_abc', 'find_neither', 'find_aonly', 'find_total']);
    let prompt, answer;
    if (subtype === 'find_abc') {
      prompt = `n(A) = ${nA}, n(B) = ${nB}, n(C) = ${nC}, n(A∩B) = ${nAB}, n(A∩C) = ${nAC}, n(B∩C) = ${nBC}, total in at least one set = ${total - neither}. Find n(A ∩ B ∩ C).`;
      // Using inclusion-exclusion: n(A∪B∪C) = nA+nB+nC - nAB-nAC-nBC + nABC
      answer = abc;
    } else if (subtype === 'find_neither') {
      prompt = `In a group of ${total}: n(A) = ${nA}, n(B) = ${nB}, n(C) = ${nC}, n(A∩B) = ${nAB}, n(A∩C) = ${nAC}, n(B∩C) = ${nBC}, n(A∩B∩C) = ${abc}. How many in neither?`;
      const inAtLeastOne = nA + nB + nC - nAB - nAC - nBC + abc;
      answer = total - inAtLeastOne;
    } else if (subtype === 'find_aonly') {
      prompt = `n(A) = ${nA}, n(A∩B) = ${nAB}, n(A∩C) = ${nAC}, n(A∩B∩C) = ${abc}. How many are in A only?`;
      answer = aOnly;
    } else {
      prompt = `n(A only) = ${aOnly}, n(B only) = ${bOnly}, n(C only) = ${cOnly}, n(A∩B only) = ${abOnly}, n(A∩C only) = ${acOnly}, n(B∩C only) = ${bcOnly}, n(A∩B∩C) = ${abc}, neither = ${neither}. Find total.`;
      answer = total;
    }
    res.json({ id, difficulty, type: 'venn3', subtype, prompt, answer });
  }
});

/**
 * POST /sets-api/check
 */
app.post('/sets-api/check', express.json(), (req, res) => {
  const { type, answer: expected } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;
  let display = '';

  if (type === 'list') {
    // Expected is an array of numbers. User types e.g. "{1,3,5}" or "1,3,5" or "{}" or "empty"
    const cleaned = userStr.replace(/[{}]/g, '');
    let userSet;
    if (cleaned === '' || cleaned.toLowerCase() === 'empty') {
      userSet = [];
    } else {
      userSet = cleaned.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
    }
    const expectedSorted = [...expected].sort((a, b) => a - b);
    correct = userSet.length === expectedSorted.length && userSet.every((v, i) => v === expectedSorted[i]);
    display = expectedSorted.length === 0 ? '{ } (empty set)' : `{${expectedSorted.join(', ')}}`;
  }
  else {
    // Cardinality / Venn — expect a number
    const userNum = parseInt(userStr);
    correct = !isNaN(userNum) && userNum === expected;
    display = String(expected);
  }

  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// TRIGONOMETRY API
// ═══════════════════════════════════════════════════════════════════════════

function triRand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function triPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

app.get('/trig-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // SOH-CAH-TOA: find missing side in right triangle
    // Use Pythagorean triples for clean answers
    const triples = [[3,4,5],[5,12,13],[8,15,17],[7,24,25],[6,8,10],[9,12,15],[10,24,26],[20,21,29]];
    const [a, b, c] = triPick(triples);
    const subtype = triPick(['find_hyp', 'find_leg']);
    let prompt, answer;
    if (subtype === 'find_hyp') {
      prompt = `Right triangle: legs = ${a} and ${b}. Find the hypotenuse.`;
      answer = c;
    } else {
      prompt = `Right triangle: hypotenuse = ${c}, one leg = ${a}. Find the other leg.`;
      answer = b;
    }
    res.json({ id, difficulty, type: 'pythagoras', prompt, answer, answerDen: 1 });
  }
  else if (difficulty === 'medium') {
    // Find angle using trig ratios (answer in degrees, rounded to 1dp)
    const angle = triRand(15, 75);
    const rad = angle * Math.PI / 180;
    const side = triRand(5, 20);
    const fn = triPick(['sin', 'cos', 'tan']);
    let opp, adj, hyp, prompt;
    if (fn === 'sin') {
      hyp = side;
      opp = Math.round(hyp * Math.sin(rad) * 10) / 10;
      prompt = `Right triangle: opposite = ${opp}, hypotenuse = ${hyp}. Find the angle (degrees).`;
    } else if (fn === 'cos') {
      hyp = side;
      adj = Math.round(hyp * Math.cos(rad) * 10) / 10;
      prompt = `Right triangle: adjacent = ${adj}, hypotenuse = ${hyp}. Find the angle (degrees).`;
    } else {
      adj = side;
      opp = Math.round(adj * Math.tan(rad) * 10) / 10;
      prompt = `Right triangle: opposite = ${opp}, adjacent = ${adj}. Find the angle (degrees).`;
    }
    res.json({ id, difficulty, type: 'find_angle', prompt, answer: angle, answerDen: 1 });
  }
  else if (difficulty === 'hard') {
    // Sine rule: a/sinA = b/sinB — find missing side or angle
    const A = triRand(30, 80);
    const B = triRand(30, 150 - A);
    const C = 180 - A - B;
    const radA = A * Math.PI / 180;
    const radB = B * Math.PI / 180;
    const a = triRand(5, 20);
    const b = Math.round(a * Math.sin(radB) / Math.sin(radA) * 10) / 10;
    const subtype = triPick(['find_side', 'find_angle']);
    let prompt, answer;
    if (subtype === 'find_side') {
      prompt = `Triangle: a = ${a}, angle A = ${A}°, angle B = ${B}°. Find side b (1 d.p.).`;
      answer = b;
    } else {
      prompt = `Triangle: a = ${a}, b = ${b}, angle A = ${A}°. Find angle B (degrees).`;
      answer = B;
    }
    res.json({ id, difficulty, type: 'sine_rule', prompt, answer, answerDen: 1 });
  }
  else {
    // Cosine rule or area = ½ab·sinC
    const subtype = triPick(['cosine', 'area']);
    if (subtype === 'cosine') {
      const a = triRand(5, 15);
      const b = triRand(5, 15);
      const C = triRand(30, 120);
      const radC = C * Math.PI / 180;
      const c2 = a*a + b*b - 2*a*b*Math.cos(radC);
      const c = Math.round(Math.sqrt(c2) * 10) / 10;
      const prompt = `Triangle: a = ${a}, b = ${b}, angle C = ${C}°. Find side c (1 d.p.).`;
      res.json({ id, difficulty, type: 'cosine_rule', prompt, answer: c, answerDen: 1 });
    } else {
      const a = triRand(5, 15);
      const b = triRand(5, 15);
      const C = triRand(30, 120);
      const radC = C * Math.PI / 180;
      const area = Math.round(0.5 * a * b * Math.sin(radC) * 10) / 10;
      const prompt = `Triangle: a = ${a}, b = ${b}, angle C = ${C}°. Find the area (1 d.p.).`;
      res.json({ id, difficulty, type: 'area', prompt, answer: area, answerDen: 1 });
    }
  }
});

app.post('/trig-api/check', express.json(), (req, res) => {
  const { answer: expected } = req.body;
  const userNum = parseFloat((req.body.userAnswer || '').replace(/[°\s]/g, ''));
  const correct = !isNaN(userNum) && Math.abs(userNum - expected) < 0.5;
  res.json({ correct, display: String(expected), message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// INEQUALITIES API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/ineq-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Linear: ax + b > c → x > (c-b)/a
    const a = triPick([1, 2, 3, 4, 5, -1, -2, -3]);
    const b = triRand(-10, 10);
    const c = triRand(-10, 10);
    const op = triPick(['>', '<', '>=', '<=']);
    const opDisplay = op.replace('>=', '≥').replace('<=', '≤');
    const prompt = `Solve: ${a}x ${b >= 0 ? '+ ' + b : '− ' + Math.abs(b)} ${opDisplay} ${c}`;
    const val = (c - b) / a;
    // Flip inequality if dividing by negative
    let resultOp = op;
    if (a < 0) resultOp = op === '>' ? '<' : op === '<' ? '>' : op === '>=' ? '<=' : '>=';
    const resultOpDisplay = resultOp.replace('>=', '≥').replace('<=', '≤');
    // Simplify fraction
    const g = gcd(Math.abs(c - b), Math.abs(a));
    const ansNum = (c - b) / g * (a < 0 ? -1 : 1);
    const ansDen = Math.abs(a) / g;
    const valStr = ansDen === 1 ? String(ansNum) : `${ansNum}/${ansDen}`;
    const display = `x ${resultOpDisplay} ${valStr}`;
    res.json({ id, difficulty, type: 'linear', prompt, display, ansNum, ansDen, resultOp });
  }
  else if (difficulty === 'medium') {
    // Double inequality: a < 2x + 1 < b, list integers
    const m = triRand(1, 3);
    const c = triRand(-5, 5);
    const lo = triRand(-8, 2);
    const hi = lo + triRand(4, 10);
    // lo < mx + c < hi → (lo-c)/m < x < (hi-c)/m
    const xLo = (lo - c) / m;
    const xHi = (hi - c) / m;
    const integers = [];
    for (let i = Math.ceil(xLo + 0.001); i < xHi; i++) integers.push(i);
    const prompt = `List the integers satisfying: ${lo} < ${m}x ${c >= 0 ? '+ ' + c : '− ' + Math.abs(c)} < ${hi}`;
    res.json({ id, difficulty, type: 'list_integers', prompt, answer: integers, display: integers.join(', ') || 'none' });
  }
  else if (difficulty === 'hard') {
    // Quadratic: x² − bx + c ≤ 0 or ≥ 0
    const r1 = triRand(-5, 5);
    const r2 = triRand(r1 + 1, r1 + 8);
    // (x-r1)(x-r2) = x² - (r1+r2)x + r1*r2
    const B = -(r1 + r2);
    const C = r1 * r2;
    const op = triPick(['<=', '>=']);
    const opDisplay = op === '<=' ? '≤' : '≥';
    const prompt = `Solve: x² ${B >= 0 ? '+ ' + B : '− ' + Math.abs(B)}x ${C >= 0 ? '+ ' + C : '− ' + Math.abs(C)} ${opDisplay} 0`;
    let display;
    if (op === '<=') {
      display = `${r1} ≤ x ≤ ${r2}`;
    } else {
      display = `x ≤ ${r1} or x ≥ ${r2}`;
    }
    res.json({ id, difficulty, type: 'quadratic', prompt, display, r1, r2, op });
  }
  else {
    // Represent on number line: find integer solutions to compound inequality
    const a = triRand(-3, 3); if (a === 0) a = 1;
    const b = triRand(-5, 5);
    const lo = triRand(-10, 0);
    const hi = triRand(1, 10);
    const prompt = `How many integers satisfy: ${lo} ≤ ${a === 1 ? '' : a === -1 ? '-' : a}x ${b >= 0 ? '+ ' + b : '− ' + Math.abs(b)} ≤ ${hi}?`;
    const xLo = (lo - b) / a;
    const xHi = (hi - b) / a;
    const realLo = Math.min(xLo, xHi);
    const realHi = Math.max(xLo, xHi);
    let count = 0;
    for (let i = Math.ceil(realLo - 0.001); i <= Math.floor(realHi + 0.001); i++) {
      const val = a * i + b;
      if (val >= lo && val <= hi) count++;
    }
    res.json({ id, difficulty, type: 'count_integers', prompt, answer: count, display: String(count) });
  }
});

app.post('/ineq-api/check', express.json(), (req, res) => {
  const { type, display } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-').replace(/>=/g, '≥').replace(/<=/g, '≤');
  let correct = false;

  if (type === 'linear') {
    // Check if user answer matches the display (normalized)
    const normDisplay = display.replace(/\s+/g, '');
    correct = userStr === normDisplay;
    // Also accept >= for ≥ etc
    if (!correct) {
      const altUser = userStr.replace(/≥/g, '>=').replace(/≤/g, '<=');
      const altDisplay = normDisplay.replace(/≥/g, '>=').replace(/≤/g, '<=');
      correct = altUser === altDisplay;
    }
  }
  else if (type === 'list_integers') {
    const expected = req.body.answer;
    const userNums = userStr === 'none' || userStr === '' ? [] :
      userStr.split(',').map(s => parseInt(s)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const expSorted = [...expected].sort((a, b) => a - b);
    correct = userNums.length === expSorted.length && userNums.every((v, i) => v === expSorted[i]);
  }
  else if (type === 'quadratic') {
    // Accept various formats: "1<=x<=5", "x<=1 or x>=5", etc
    const normDisplay = display.replace(/\s+/g, '').replace(/>=/g, '≥').replace(/<=/g, '≤');
    const normUser = userStr.replace(/or/gi, 'or');
    correct = normUser === normDisplay;
    // Relaxed check
    if (!correct) {
      const altD = normDisplay.replace(/≥/g, '>=').replace(/≤/g, '<=');
      const altU = normUser.replace(/≥/g, '>=').replace(/≤/g, '<=');
      correct = altU === altD;
    }
  }
  else if (type === 'count_integers') {
    const userNum = parseInt(userStr);
    correct = !isNaN(userNum) && userNum === req.body.answer;
  }

  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// COORDINATE GEOMETRY API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/coordgeom-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Midpoint of two points
    // Use even sums for clean midpoints
    const x1 = triRand(-10, 10); const y1 = triRand(-10, 10);
    const x2 = x1 + 2 * triRand(-5, 5); const y2 = y1 + 2 * triRand(-5, 5);
    const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
    const prompt = `Find the midpoint of (${x1}, ${y1}) and (${x2}, ${y2})`;
    res.json({ id, difficulty, type: 'midpoint', prompt, ansX: mx, ansY: my, display: `(${mx}, ${my})` });
  }
  else if (difficulty === 'medium') {
    // Distance between two points (use Pythagorean triples for clean answers)
    const triples = [[3,4,5],[5,12,13],[8,15,17],[6,8,10],[9,12,15]];
    const [dx, dy, dist] = triPick(triples);
    const x1 = triRand(-5, 5); const y1 = triRand(-5, 5);
    const sx = triPick([1, -1]); const sy = triPick([1, -1]);
    const x2 = x1 + sx * dx; const y2 = y1 + sy * dy;
    const prompt = `Find the distance between (${x1}, ${y1}) and (${x2}, ${y2})`;
    res.json({ id, difficulty, type: 'distance', prompt, answer: dist, display: String(dist) });
  }
  else if (difficulty === 'hard') {
    // Gradient of line through two points
    const x1 = triRand(-8, 8); const y1 = triRand(-8, 8);
    const dx = triRand(1, 6) * triPick([1, -1]);
    const dy = triRand(-8, 8);
    const x2 = x1 + dx; const y2 = y1 + dy;
    const g = gcd(Math.abs(dy), Math.abs(dx));
    const ansNum = dy / g * (dx < 0 ? -1 : 1);
    const ansDen = Math.abs(dx) / g;
    const display = ansDen === 1 ? String(ansNum) : `${ansNum}/${ansDen}`;
    const prompt = `Find the gradient of the line through (${x1}, ${y1}) and (${x2}, ${y2})`;
    res.json({ id, difficulty, type: 'gradient', prompt, ansNum, ansDen, display });
  }
  else {
    // Equation of perpendicular bisector
    const x1 = triRand(-6, 6); const y1 = triRand(-6, 6);
    const dx = triRand(1, 4) * triPick([1, -1]);
    const dy = triRand(1, 4) * triPick([1, -1]);
    const x2 = x1 + 2 * dx; const y2 = y1 + 2 * dy;
    const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
    // Original gradient: dy/dx, perpendicular: -dx/dy
    const perpNum = -dx;
    const perpDen = dy;
    const g = gcd(Math.abs(perpNum), Math.abs(perpDen));
    const mNum = perpNum / g * (perpDen < 0 ? -1 : 1);
    const mDen = Math.abs(perpDen) / g;
    // y - my = m(x - mx) → y = mx/mDen - m*mx/mDen + my
    const prompt = `Find the gradient of the perpendicular bisector of (${x1}, ${y1}) and (${x2}, ${y2})`;
    const display = mDen === 1 ? String(mNum) : `${mNum}/${mDen}`;
    res.json({ id, difficulty, type: 'perp_bisector', prompt, ansNum: mNum, ansDen: mDen, display });
  }
});

app.post('/coordgeom-api/check', express.json(), (req, res) => {
  const { type } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;

  if (type === 'midpoint') {
    const m = userStr.replace(/[()]/g, '').split(',');
    if (m.length === 2) {
      correct = parseFloat(m[0]) === req.body.ansX && parseFloat(m[1]) === req.body.ansY;
    }
  }
  else if (type === 'distance') {
    const userNum = parseFloat(userStr);
    correct = !isNaN(userNum) && Math.abs(userNum - req.body.answer) < 0.5;
  }
  else if (type === 'gradient' || type === 'perp_bisector') {
    const { ansNum, ansDen } = req.body;
    const fracMatch = userStr.match(/^(-?\d+)\/(-?\d+)$/);
    let uNum, uDen;
    if (fracMatch) { uNum = parseInt(fracMatch[1]); uDen = parseInt(fracMatch[2]); }
    else { const n = parseFloat(userStr); if (!isNaN(n) && Number.isInteger(n)) { uNum = n; uDen = 1; } }
    if (uNum !== undefined && uDen !== undefined && uDen !== 0) {
      const us = simplifyFraction(uNum, uDen);
      const es = simplifyFraction(ansNum, ansDen);
      correct = us.num === es.num && us.den === es.den;
    }
  }

  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROBABILITY API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/prob-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Simple probability: P(event) from a bag/deck
    const items = triPick([
      { desc: 'bag', contents: { red: triRand(2,6), blue: triRand(2,6), green: triRand(1,4) }, ask: 'red' },
      { desc: 'bag', contents: { red: triRand(1,5), blue: triRand(2,7), yellow: triRand(1,3) }, ask: 'blue' },
      { desc: 'box', contents: { apple: triRand(2,5), orange: triRand(3,6), banana: triRand(1,4) }, ask: 'orange' },
    ]);
    const total = Object.values(items.contents).reduce((s, v) => s + v, 0);
    const favorable = items.contents[items.ask];
    const g = gcd(favorable, total);
    const prompt = `A ${items.desc} has ${Object.entries(items.contents).map(([k,v]) => `${v} ${k}`).join(', ')}. P(${items.ask})?`;
    res.json({ id, difficulty, type: 'simple', prompt, ansNum: favorable / g, ansDen: total / g });
  }
  else if (difficulty === 'medium') {
    // Two independent events: P(A and B) = P(A) × P(B)
    const n1 = triRand(2, 6); const d1 = triRand(n1 + 1, 10);
    const n2 = triRand(2, 6); const d2 = triRand(n2 + 1, 10);
    const prodN = n1 * n2; const prodD = d1 * d2;
    const g = gcd(prodN, prodD);
    const prompt = `P(A) = ${n1}/${d1}, P(B) = ${n2}/${d2}. A and B are independent. Find P(A and B).`;
    res.json({ id, difficulty, type: 'independent', prompt, ansNum: prodN / g, ansDen: prodD / g });
  }
  else if (difficulty === 'hard') {
    // P(A or B) = P(A) + P(B) - P(A and B) for mutually exclusive or not
    const exclusive = triPick([true, false]);
    if (exclusive) {
      const n1 = triRand(1, 4); const n2 = triRand(1, 4); const d = triRand(n1 + n2 + 1, 12);
      const g = gcd(n1 + n2, d);
      const prompt = `P(A) = ${n1}/${d}, P(B) = ${n2}/${d}. A and B are mutually exclusive. Find P(A or B).`;
      res.json({ id, difficulty, type: 'or_event', prompt, ansNum: (n1 + n2) / g, ansDen: d / g });
    } else {
      const d = triRand(8, 20);
      const nA = triRand(3, d - 3);
      const nB = triRand(3, d - 3);
      const nAB = triRand(1, Math.min(nA, nB) - 1);
      const nAuB = nA + nB - nAB;
      const g = gcd(nAuB, d);
      const prompt = `P(A) = ${nA}/${d}, P(B) = ${nB}/${d}, P(A and B) = ${nAB}/${d}. Find P(A or B).`;
      res.json({ id, difficulty, type: 'or_event', prompt, ansNum: nAuB / g, ansDen: d / g });
    }
  }
  else {
    // Conditional / without replacement
    const total = triRand(8, 15);
    const typeA = triRand(3, total - 3);
    const typeB = total - typeA;
    // P(both same type) without replacement
    const pNum = typeA * (typeA - 1) + typeB * (typeB - 1);
    const pDen = total * (total - 1);
    const g = gcd(pNum, pDen);
    const prompt = `A bag has ${typeA} red and ${typeB} blue balls. Two drawn without replacement. P(same colour)?`;
    res.json({ id, difficulty, type: 'without_replacement', prompt, ansNum: pNum / g, ansDen: pDen / g });
  }
});

app.post('/prob-api/check', express.json(), (req, res) => {
  const { ansNum, ansDen } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;
  const fracMatch = userStr.match(/^(-?\d+)\/(-?\d+)$/);
  let uNum, uDen;
  if (fracMatch) { uNum = parseInt(fracMatch[1]); uDen = parseInt(fracMatch[2]); }
  else { const n = parseFloat(userStr); if (!isNaN(n)) { uNum = Math.round(n * 1000); uDen = 1000; } }
  if (uNum !== undefined && uDen !== undefined && uDen !== 0) {
    const us = simplifyFraction(uNum, uDen);
    const es = simplifyFraction(ansNum, ansDen);
    correct = us.num === es.num && us.den === es.den;
  }
  const es = simplifyFraction(ansNum, ansDen);
  const display = es.den === 1 ? String(es.num) : `${es.num}/${es.den}`;
  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/stats-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Mean of a list
    const n = triRand(5, 8);
    const data = Array.from({ length: n }, () => triRand(1, 20));
    const sum = data.reduce((s, v) => s + v, 0);
    const mean = sum / n;
    const g = gcd(Math.abs(sum), n);
    const prompt = `Find the mean of: ${data.join(', ')}`;
    res.json({ id, difficulty, type: 'mean', prompt, data, ansNum: sum / g, ansDen: n / g });
  }
  else if (difficulty === 'medium') {
    // Median of a list
    const n = triPick([5, 7, 9, 6, 8, 10]);
    const data = Array.from({ length: n }, () => triRand(1, 30));
    const sorted = [...data].sort((a, b) => a - b);
    let median, ansNum, ansDen;
    if (n % 2 === 1) {
      median = sorted[Math.floor(n / 2)];
      ansNum = median; ansDen = 1;
    } else {
      const a = sorted[n / 2 - 1]; const b = sorted[n / 2];
      const g = gcd(Math.abs(a + b), 2);
      ansNum = (a + b) / g; ansDen = 2 / g;
    }
    const prompt = `Find the median of: ${data.join(', ')}`;
    res.json({ id, difficulty, type: 'median', prompt, data, ansNum, ansDen });
  }
  else if (difficulty === 'hard') {
    // Mode and range
    const subtype = triPick(['mode', 'range']);
    const n = triRand(7, 12);
    let data;
    if (subtype === 'mode') {
      const modeVal = triRand(1, 20);
      data = [modeVal, modeVal, modeVal];
      while (data.length < n) {
        const v = triRand(1, 25);
        if (v !== modeVal || data.filter(x => x === v).length < 2) data.push(v);
      }
      // Shuffle
      for (let i = data.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [data[i], data[j]] = [data[j], data[i]]; }
      const prompt = `Find the mode of: ${data.join(', ')}`;
      res.json({ id, difficulty, type: 'mode', subtype: 'mode', prompt, data, answer: modeVal, display: String(modeVal) });
    } else {
      data = Array.from({ length: n }, () => triRand(1, 50));
      const range = Math.max(...data) - Math.min(...data);
      const prompt = `Find the range of: ${data.join(', ')}`;
      res.json({ id, difficulty, type: 'range', subtype: 'range', prompt, data, answer: range, display: String(range) });
    }
  }
  else {
    // Mean from frequency table
    const values = [1, 2, 3, 4, 5];
    const freqs = values.map(() => triRand(1, 10));
    const totalF = freqs.reduce((s, v) => s + v, 0);
    const totalFx = values.reduce((s, v, i) => s + v * freqs[i], 0);
    const g = gcd(Math.abs(totalFx), totalF);
    const table = values.map((v, i) => `${v}(×${freqs[i]})`).join(', ');
    const prompt = `Frequency table: ${table}. Find the mean.`;
    res.json({ id, difficulty, type: 'freq_mean', prompt, ansNum: totalFx / g, ansDen: totalF / g });
  }
});

app.post('/stats-api/check', express.json(), (req, res) => {
  const { type } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;
  let display;

  if (type === 'mode' || type === 'range') {
    const userNum = parseFloat(userStr);
    correct = !isNaN(userNum) && userNum === req.body.answer;
    display = req.body.display;
  } else {
    const { ansNum, ansDen } = req.body;
    const es = simplifyFraction(ansNum, ansDen);
    const fracMatch = userStr.match(/^(-?\d+)\/(-?\d+)$/);
    let uNum, uDen;
    if (fracMatch) { uNum = parseInt(fracMatch[1]); uDen = parseInt(fracMatch[2]); }
    else { const n = parseFloat(userStr);
      if (!isNaN(n)) {
        // Convert decimal to fraction for comparison
        if (Number.isInteger(n)) { uNum = n; uDen = 1; }
        else { uNum = Math.round(n * 100); uDen = 100; }
      }
    }
    if (uNum !== undefined && uDen !== undefined && uDen !== 0) {
      const us = simplifyFraction(uNum, uDen);
      correct = us.num === es.num && us.den === es.den;
    }
    // Also accept decimal approximation
    if (!correct && !isNaN(parseFloat(userStr))) {
      correct = Math.abs(parseFloat(userStr) - es.num / es.den) < 0.01;
    }
    display = es.den === 1 ? String(es.num) : `${es.num}/${es.den}`;
  }

  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// MATRICES API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/matrix-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Add two 2×2 matrices
    const A = [[triRand(-5,9), triRand(-5,9)], [triRand(-5,9), triRand(-5,9)]];
    const B = [[triRand(-5,9), triRand(-5,9)], [triRand(-5,9), triRand(-5,9)]];
    const R = [[A[0][0]+B[0][0], A[0][1]+B[0][1]], [A[1][0]+B[1][0], A[1][1]+B[1][1]]];
    const fmtM = (m) => `[${m[0][0]},${m[0][1]};${m[1][0]},${m[1][1]}]`;
    const prompt = `A = ${fmtM(A)}, B = ${fmtM(B)}. Find A + B.`;
    res.json({ id, difficulty, type: 'add', prompt, answer: R, display: fmtM(R) });
  }
  else if (difficulty === 'medium') {
    // Scalar multiplication
    const k = triRand(-3, 5); if (k === 0) k = 2;
    const A = [[triRand(-5,9), triRand(-5,9)], [triRand(-5,9), triRand(-5,9)]];
    const R = [[k*A[0][0], k*A[0][1]], [k*A[1][0], k*A[1][1]]];
    const fmtM = (m) => `[${m[0][0]},${m[0][1]};${m[1][0]},${m[1][1]}]`;
    const prompt = `A = ${fmtM(A)}. Find ${k}A.`;
    res.json({ id, difficulty, type: 'scalar', prompt, answer: R, display: fmtM(R) });
  }
  else if (difficulty === 'hard') {
    // Determinant of 2×2
    const a = triRand(-5,8); const b = triRand(-5,8);
    const c = triRand(-5,8); const d = triRand(-5,8);
    const det = a * d - b * c;
    const prompt = `Find the determinant of [${a},${b};${c},${d}]`;
    res.json({ id, difficulty, type: 'determinant', prompt, answer: det, display: String(det) });
  }
  else {
    // Multiply two 2×2 matrices
    const A = [[triRand(-3,5), triRand(-3,5)], [triRand(-3,5), triRand(-3,5)]];
    const B = [[triRand(-3,5), triRand(-3,5)], [triRand(-3,5), triRand(-3,5)]];
    const R = [
      [A[0][0]*B[0][0]+A[0][1]*B[1][0], A[0][0]*B[0][1]+A[0][1]*B[1][1]],
      [A[1][0]*B[0][0]+A[1][1]*B[1][0], A[1][0]*B[0][1]+A[1][1]*B[1][1]]
    ];
    const fmtM = (m) => `[${m[0][0]},${m[0][1]};${m[1][0]},${m[1][1]}]`;
    const prompt = `A = ${fmtM(A)}, B = ${fmtM(B)}. Find AB.`;
    res.json({ id, difficulty, type: 'multiply', prompt, answer: R, display: fmtM(R) });
  }
});

app.post('/matrix-api/check', express.json(), (req, res) => {
  const { type, answer, display } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;

  if (type === 'determinant') {
    const userNum = parseInt(userStr);
    correct = !isNaN(userNum) && userNum === answer;
  } else {
    // Parse matrix: [a,b;c,d]
    const m = userStr.replace(/[\[\]]/g, '').split(';');
    if (m.length === 2) {
      const r0 = m[0].split(',').map(Number);
      const r1 = m[1].split(',').map(Number);
      if (r0.length === 2 && r1.length === 2) {
        correct = r0[0] === answer[0][0] && r0[1] === answer[0][1] &&
                  r1[0] === answer[1][0] && r1[1] === answer[1][1];
      }
    }
  }

  res.json({ correct, display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// VECTORS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/vectors-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Add two column vectors
    const a = [triRand(-8,8), triRand(-8,8)];
    const b = [triRand(-8,8), triRand(-8,8)];
    const ans = [a[0]+b[0], a[1]+b[1]];
    const prompt = `a = (${a[0]}, ${a[1]}), b = (${b[0]}, ${b[1]}). Find a + b.`;
    res.json({ id, difficulty, type: 'add', prompt, ansX: ans[0], ansY: ans[1], display: `(${ans[0]}, ${ans[1]})` });
  }
  else if (difficulty === 'medium') {
    // Scalar multiplication
    const k = triRand(-3, 5); if (k === 0) k = 2;
    const a = [triRand(-6,6), triRand(-6,6)];
    const ans = [k*a[0], k*a[1]];
    const prompt = `a = (${a[0]}, ${a[1]}). Find ${k}a.`;
    res.json({ id, difficulty, type: 'scalar', prompt, ansX: ans[0], ansY: ans[1], display: `(${ans[0]}, ${ans[1]})` });
  }
  else if (difficulty === 'hard') {
    // Magnitude (use Pythagorean triples for clean answers)
    const triples = [[3,4,5],[5,12,13],[8,15,17],[6,8,10]];
    const [x, y, mag] = triPick(triples);
    const sx = triPick([1,-1]); const sy = triPick([1,-1]);
    const prompt = `Find |v| where v = (${sx*x}, ${sy*y})`;
    res.json({ id, difficulty, type: 'magnitude', prompt, answer: mag, display: String(mag) });
  }
  else {
    // Vector between two points
    const x1 = triRand(-8,8); const y1 = triRand(-8,8);
    const x2 = triRand(-8,8); const y2 = triRand(-8,8);
    const prompt = `A = (${x1}, ${y1}), B = (${x2}, ${y2}). Find vector AB.`;
    res.json({ id, difficulty, type: 'position', prompt, ansX: x2-x1, ansY: y2-y1, display: `(${x2-x1}, ${y2-y1})` });
  }
});

app.post('/vectors-api/check', express.json(), (req, res) => {
  const { type } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
  let correct = false;

  if (type === 'magnitude') {
    const userNum = parseFloat(userStr);
    correct = !isNaN(userNum) && Math.abs(userNum - req.body.answer) < 0.5;
  } else {
    const m = userStr.replace(/[()]/g, '').split(',');
    if (m.length === 2) {
      correct = parseInt(m[0]) === req.body.ansX && parseInt(m[1]) === req.body.ansY;
    }
  }

  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORMATIONS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/transform-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();
  const x = triRand(-8, 8); const y = triRand(-8, 8);

  if (difficulty === 'easy') {
    // Reflection in x-axis or y-axis
    const axis = triPick(['x-axis', 'y-axis']);
    const ansX = axis === 'y-axis' ? -x : x;
    const ansY = axis === 'x-axis' ? -y : y;
    const prompt = `Reflect (${x}, ${y}) in the ${axis}`;
    res.json({ id, difficulty, type: 'reflect', prompt, ansX, ansY, display: `(${ansX}, ${ansY})` });
  }
  else if (difficulty === 'medium') {
    // Translation by vector
    const dx = triRand(-6, 6); const dy = triRand(-6, 6);
    const prompt = `Translate (${x}, ${y}) by vector (${dx}, ${dy})`;
    res.json({ id, difficulty, type: 'translate', prompt, ansX: x + dx, ansY: y + dy, display: `(${x+dx}, ${y+dy})` });
  }
  else if (difficulty === 'hard') {
    // Rotation 90° or 180° about origin
    const angle = triPick([90, 180, 270]);
    let ansX, ansY;
    if (angle === 90) { ansX = -y; ansY = x; }        // 90° anticlockwise
    else if (angle === 180) { ansX = -x; ansY = -y; }
    else { ansX = y; ansY = -x; }                       // 270° anticlockwise = 90° clockwise
    const prompt = `Rotate (${x}, ${y}) by ${angle}° anticlockwise about the origin`;
    res.json({ id, difficulty, type: 'rotate', prompt, ansX, ansY, display: `(${ansX}, ${ansY})` });
  }
  else {
    // Enlargement from origin with scale factor
    const sf = triPick([2, 3, -1, -2, 0.5]);
    const ansX = x * sf; const ansY = y * sf;
    const sfStr = sf === 0.5 ? '1/2' : String(sf);
    const prompt = `Enlarge (${x}, ${y}) by scale factor ${sfStr} from the origin`;
    res.json({ id, difficulty, type: 'enlarge', prompt, ansX, ansY, display: `(${ansX}, ${ansY})` });
  }
});

app.post('/transform-api/check', express.json(), (req, res) => {
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-');
  const m = userStr.replace(/[()]/g, '').split(',');
  let correct = false;
  if (m.length === 2) {
    correct = parseFloat(m[0]) === req.body.ansX && parseFloat(m[1]) === req.body.ansY;
  }
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// MENSURATION API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/mensur-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Area of rectangle, triangle, or parallelogram
    const shape = triPick(['rectangle', 'triangle', 'parallelogram']);
    const a = triRand(3, 15); const b = triRand(3, 15);
    let answer, prompt;
    if (shape === 'rectangle') { answer = a * b; prompt = `Area of rectangle: length = ${a}, width = ${b}`; }
    else if (shape === 'triangle') { answer = a * b / 2; prompt = `Area of triangle: base = ${a}, height = ${b}`; }
    else { answer = a * b; prompt = `Area of parallelogram: base = ${a}, height = ${b}`; }
    res.json({ id, difficulty, type: 'area_2d', prompt, answer, display: String(answer) });
  }
  else if (difficulty === 'medium') {
    // Area & circumference of circle
    const r = triRand(2, 12);
    const subtype = triPick(['area', 'circumference']);
    let answer, prompt;
    if (subtype === 'area') {
      answer = Math.round(Math.PI * r * r * 100) / 100;
      prompt = `Area of circle with radius ${r} (to 2 d.p., use π = 3.14159...)`;
    } else {
      answer = Math.round(2 * Math.PI * r * 100) / 100;
      prompt = `Circumference of circle with radius ${r} (to 2 d.p.)`;
    }
    res.json({ id, difficulty, type: 'circle', prompt, answer, display: String(answer) });
  }
  else if (difficulty === 'hard') {
    // Volume of cylinder, cone, or sphere
    const shape = triPick(['cylinder', 'cone', 'sphere']);
    const r = triRand(2, 8);
    let answer, prompt;
    if (shape === 'cylinder') {
      const h = triRand(3, 12);
      answer = Math.round(Math.PI * r * r * h * 100) / 100;
      prompt = `Volume of cylinder: radius = ${r}, height = ${h} (2 d.p.)`;
    } else if (shape === 'cone') {
      const h = triRand(3, 12);
      answer = Math.round(Math.PI * r * r * h / 3 * 100) / 100;
      prompt = `Volume of cone: radius = ${r}, height = ${h} (2 d.p.)`;
    } else {
      answer = Math.round(4/3 * Math.PI * r * r * r * 100) / 100;
      prompt = `Volume of sphere with radius ${r} (2 d.p.)`;
    }
    res.json({ id, difficulty, type: 'volume', prompt, answer, display: String(answer) });
  }
  else {
    // Surface area of cylinder, cone, or sphere
    const shape = triPick(['cylinder', 'sphere']);
    const r = triRand(2, 8);
    let answer, prompt;
    if (shape === 'cylinder') {
      const h = triRand(3, 12);
      answer = Math.round(2 * Math.PI * r * (r + h) * 100) / 100;
      prompt = `Total surface area of cylinder: radius = ${r}, height = ${h} (2 d.p.)`;
    } else {
      answer = Math.round(4 * Math.PI * r * r * 100) / 100;
      prompt = `Surface area of sphere with radius ${r} (2 d.p.)`;
    }
    res.json({ id, difficulty, type: 'surface_area', prompt, answer, display: String(answer) });
  }
});

app.post('/mensur-api/check', express.json(), (req, res) => {
  const userNum = parseFloat((req.body.userAnswer || '').replace(/\s+/g, ''));
  const correct = !isNaN(userNum) && Math.abs(userNum - req.body.answer) < 0.5;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// BEARINGS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/bearings-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Convert compass direction to bearing
    const dirs = [
      { name: 'North', bearing: '000' }, { name: 'East', bearing: '090' },
      { name: 'South', bearing: '180' }, { name: 'West', bearing: '270' },
      { name: 'North-East', bearing: '045' }, { name: 'South-East', bearing: '135' },
      { name: 'South-West', bearing: '225' }, { name: 'North-West', bearing: '315' },
    ];
    const d = triPick(dirs);
    const prompt = `What is the three-figure bearing of ${d.name}?`;
    res.json({ id, difficulty, type: 'compass', prompt, answer: parseInt(d.bearing), display: d.bearing });
  }
  else if (difficulty === 'medium') {
    // Back bearing: if bearing from A to B is x, what is bearing from B to A?
    const bearing = triRand(0, 359);
    const back = (bearing + 180) % 360;
    const fmtB = (b) => String(b).padStart(3, '0');
    const prompt = `The bearing from A to B is ${fmtB(bearing)}°. Find the bearing from B to A.`;
    res.json({ id, difficulty, type: 'back_bearing', prompt, answer: back, display: fmtB(back) });
  }
  else if (difficulty === 'hard') {
    // Find bearing given coordinates
    const dx = triRand(-10, 10); const dy = triRand(-10, 10);
    if (dx === 0 && dy === 0) dx = 1;
    // Bearing = angle measured clockwise from North
    let angle = Math.atan2(dx, dy) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const bearing = Math.round(angle);
    const fmtB = (b) => String(b).padStart(3, '0');
    const prompt = `A is at origin. B is ${Math.abs(dx)} units ${dx >= 0 ? 'East' : 'West'} and ${Math.abs(dy)} units ${dy >= 0 ? 'North' : 'South'}. Bearing of B from A?`;
    res.json({ id, difficulty, type: 'from_coords', prompt, answer: bearing, display: fmtB(bearing) });
  }
  else {
    // Distance using bearing + trig
    const bearing = triRand(0, 359);
    const distance = triRand(5, 50);
    const rad = bearing * Math.PI / 180;
    const east = Math.round(distance * Math.sin(rad) * 10) / 10;
    const north = Math.round(distance * Math.cos(rad) * 10) / 10;
    const fmtB = (b) => String(b).padStart(3, '0');
    const prompt = `Walking ${distance}m on bearing ${fmtB(bearing)}°. How far East? (1 d.p.)`;
    res.json({ id, difficulty, type: 'distance_component', prompt, answer: east, display: String(east) });
  }
});

app.post('/bearings-api/check', express.json(), (req, res) => {
  const userStr = (req.body.userAnswer || '').replace(/[°\s]/g, '').replace(/−/g, '-');
  const userNum = parseFloat(userStr);
  const correct = !isNaN(userNum) && Math.abs(userNum - req.body.answer) < 1;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// LOGARITHMS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/log-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Evaluate log_b(n) where n is a perfect power of b
    const combos = [
      { b: 2, n: 4, ans: 2 }, { b: 2, n: 8, ans: 3 }, { b: 2, n: 16, ans: 4 }, { b: 2, n: 32, ans: 5 },
      { b: 2, n: 64, ans: 6 }, { b: 3, n: 9, ans: 2 }, { b: 3, n: 27, ans: 3 }, { b: 3, n: 81, ans: 4 },
      { b: 5, n: 25, ans: 2 }, { b: 5, n: 125, ans: 3 }, { b: 10, n: 100, ans: 2 }, { b: 10, n: 1000, ans: 3 },
      { b: 4, n: 16, ans: 2 }, { b: 4, n: 64, ans: 3 }, { b: 7, n: 49, ans: 2 }, { b: 6, n: 36, ans: 2 },
      { b: 2, n: 1, ans: 0 }, { b: 3, n: 1, ans: 0 }, { b: 10, n: 1, ans: 0 },
      { b: 10, n: 10, ans: 1 }, { b: 2, n: 2, ans: 1 },
    ];
    const c = triPick(combos);
    const prompt = `Evaluate log${c.b === 10 ? '' : '₊'.replace('₊', String(c.b).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join(''))}(${c.n})`;
    res.json({ id, difficulty, type: 'evaluate', prompt, answer: c.ans, display: String(c.ans) });
  }
  else if (difficulty === 'medium') {
    // Laws of logs: log(a) + log(b) = log(ab), log(a) - log(b) = log(a/b)
    const base = triPick([2, 3, 10]);
    const sub = (n) => String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
    const bStr = base === 10 ? '' : sub(base);
    const subtype = triPick(['add', 'subtract', 'power']);
    if (subtype === 'add') {
      const a = triRand(2, 20); const b = triRand(2, 20);
      const prompt = `Simplify: log${bStr}(${a}) + log${bStr}(${b})`;
      const product = a * b;
      // Check if product is a clean power of base
      let ans = product;
      const display = `log${bStr}(${product})`;
      res.json({ id, difficulty, type: 'simplify_log', prompt, ansProduct: product, base, display });
    } else if (subtype === 'subtract') {
      const b = triRand(2, 8); const a = b * triRand(2, 8);
      const prompt = `Simplify: log${bStr}(${a}) − log${bStr}(${b})`;
      const quotient = a / b;
      const display = `log${bStr}(${quotient})`;
      res.json({ id, difficulty, type: 'simplify_log', prompt, ansProduct: quotient, base, display });
    } else {
      const n = triRand(2, 10); const k = triRand(2, 4);
      const prompt = `Simplify: ${k} × log${bStr}(${n})`;
      const power = Math.pow(n, k);
      const display = `log${bStr}(${power})`;
      res.json({ id, difficulty, type: 'simplify_log', prompt, ansProduct: power, base, display });
    }
  }
  else if (difficulty === 'hard') {
    // Solve: b^x = n → x = log(n)/log(b)
    const combos = [
      { b: 2, n: 4, x: 2 }, { b: 2, n: 8, x: 3 }, { b: 2, n: 16, x: 4 },
      { b: 3, n: 9, x: 2 }, { b: 3, n: 27, x: 3 }, { b: 5, n: 25, x: 2 },
      { b: 5, n: 125, x: 3 }, { b: 4, n: 64, x: 3 }, { b: 10, n: 100, x: 2 },
      { b: 2, n: 32, x: 5 }, { b: 3, n: 81, x: 4 },
    ];
    const c = triPick(combos);
    const prompt = `Solve: ${c.b}ˣ = ${c.n}`;
    res.json({ id, difficulty, type: 'solve_exp', prompt, answer: c.x, display: `x = ${c.x}` });
  }
  else {
    // Solve log equations: log(x+a) = b → x+a = 10^b
    const base = triPick([2, 10]);
    const sub = (n) => String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
    const bStr = base === 10 ? '' : sub(base);
    const exp = triRand(1, 4);
    const a = triRand(-10, 10);
    const val = Math.pow(base, exp);
    const x = val - a;
    const prompt = `Solve: log${bStr}(x ${a >= 0 ? '+ ' + a : '− ' + Math.abs(a)}) = ${exp}`;
    res.json({ id, difficulty, type: 'solve_log', prompt, answer: x, display: `x = ${x}` });
  }
});

app.post('/log-api/check', express.json(), (req, res) => {
  const { type } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-').replace(/^x=/i, '');
  let correct = false;

  if (type === 'simplify_log') {
    // User should enter e.g. "log(40)" or just "40" (the argument)
    const cleaned = userStr.replace(/log[₀₁₂₃₄₅₆₇₈₉]*/g, '').replace(/[()]/g, '');
    const userNum = parseInt(cleaned);
    correct = !isNaN(userNum) && userNum === req.body.ansProduct;
  } else {
    const expected = req.body.answer;
    const userNum = parseFloat(userStr);
    correct = !isNaN(userNum) && Math.abs(userNum - expected) < 0.01;
  }

  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// DIFFERENTIATION API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/diff-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Differentiate ax^n → anx^(n-1), evaluate at a point
    const a = triRand(1, 6); const n = triRand(2, 5);
    const x = triRand(1, 5);
    const deriv = a * n * Math.pow(x, n - 1);
    const prompt = `f(x) = ${a}x${sup(n)}. Find f'(${x}).`;
    res.json({ id, difficulty, type: 'power_rule', prompt, answer: deriv, display: String(deriv) });
  }
  else if (difficulty === 'medium') {
    // Differentiate polynomial: ax² + bx + c
    const a = triRand(-5, 5); const b = triRand(-8, 8); const c = triRand(-10, 10);
    if (a === 0) a = 2;
    const x = triRand(-3, 3);
    const deriv = 2 * a * x + b;
    const bStr = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
    const cStr = c >= 0 ? `+ ${c}` : `− ${Math.abs(c)}`;
    const prompt = `f(x) = ${a}x² ${bStr}x ${cStr}. Find f'(${x}).`;
    res.json({ id, difficulty, type: 'polynomial', prompt, answer: deriv, display: String(deriv) });
  }
  else if (difficulty === 'hard') {
    // Find gradient at a point, or find x where gradient = 0 (turning point)
    const a = triRand(1, 4); const b = triRand(-10, 10);
    const c = triRand(-10, 10);
    // f(x) = ax² + bx + c, f'(x) = 2ax + b = 0 → x = -b/(2a)
    const g = gcd(Math.abs(b), 2 * a);
    const ansNum = -b / g;
    const ansDen = (2 * a) / g;
    const bStr = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
    const cStr = c >= 0 ? `+ ${c}` : `− ${Math.abs(c)}`;
    const prompt = `f(x) = ${a}x² ${bStr}x ${cStr}. Find x where f'(x) = 0.`;
    const display = ansDen === 1 ? String(ansNum) : `${ansNum}/${ansDen}`;
    res.json({ id, difficulty, type: 'turning_point', prompt, ansNum, ansDen, display });
  }
  else {
    // Find whether turning point is max or min, and its y-value
    const a = triPick([1, -1, 2, -2, 3]);
    const b = triRand(-8, 8);
    const c = triRand(-10, 10);
    // f'(x) = 2ax + b = 0 → x = -b/(2a)
    const xTurn = -b / (2 * a);
    const yTurn = a * xTurn * xTurn + b * xTurn + c;
    const rounded = Math.round(yTurn * 100) / 100;
    const nature = a > 0 ? 'minimum' : 'maximum';
    const bStr = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
    const cStr = c >= 0 ? `+ ${c}` : `− ${Math.abs(c)}`;
    const prompt = `f(x) = ${a}x² ${bStr}x ${cStr}. Find the ${nature} value of f(x).`;
    res.json({ id, difficulty, type: 'min_max', prompt, answer: rounded, display: String(rounded) });
  }
});

app.post('/diff-api/check', express.json(), (req, res) => {
  const { type } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').replace(/−/g, '-').replace(/^x=/i, '');
  let correct = false;

  if (type === 'turning_point') {
    const { ansNum, ansDen } = req.body;
    const fracMatch = userStr.match(/^(-?\d+)\/(-?\d+)$/);
    let uNum, uDen;
    if (fracMatch) { uNum = parseInt(fracMatch[1]); uDen = parseInt(fracMatch[2]); }
    else { const n = parseFloat(userStr); if (!isNaN(n) && Number.isInteger(n)) { uNum = n; uDen = 1; }
      else if (!isNaN(n)) { correct = Math.abs(n - ansNum / ansDen) < 0.01; } }
    if (!correct && uNum !== undefined && uDen !== undefined && uDen !== 0) {
      const us = simplifyFraction(uNum, uDen);
      const es = simplifyFraction(ansNum, ansDen);
      correct = us.num === es.num && us.den === es.den;
    }
  } else {
    const userNum = parseFloat(userStr);
    correct = !isNaN(userNum) && Math.abs(userNum - req.body.answer) < 0.5;
  }

  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// NUMBER BASES API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/bases-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Convert decimal to binary
    const n = triRand(5, 63);
    const prompt = `Convert ${n} (decimal) to binary`;
    res.json({ id, difficulty, type: 'dec_to_bin', prompt, answer: n.toString(2), display: n.toString(2) });
  }
  else if (difficulty === 'medium') {
    // Convert binary to decimal
    const n = triRand(10, 127);
    const bin = n.toString(2);
    const prompt = `Convert ${bin} (binary) to decimal`;
    res.json({ id, difficulty, type: 'bin_to_dec', prompt, answer: n, display: String(n) });
  }
  else if (difficulty === 'hard') {
    // Convert decimal to hexadecimal
    const n = triRand(16, 255);
    const prompt = `Convert ${n} (decimal) to hexadecimal`;
    res.json({ id, difficulty, type: 'dec_to_hex', prompt, answer: n.toString(16).toUpperCase(), display: n.toString(16).toUpperCase() });
  }
  else {
    // Binary addition or hex to binary
    const subtype = triPick(['bin_add', 'hex_to_bin']);
    if (subtype === 'bin_add') {
      const a = triRand(5, 30); const b = triRand(5, 30);
      const sum = a + b;
      const prompt = `Add in binary: ${a.toString(2)} + ${b.toString(2)}`;
      res.json({ id, difficulty, type: 'bin_add', prompt, answer: sum.toString(2), display: sum.toString(2) });
    } else {
      const n = triRand(16, 255);
      const hex = n.toString(16).toUpperCase();
      const prompt = `Convert ${hex} (hexadecimal) to binary`;
      res.json({ id, difficulty, type: 'hex_to_bin', prompt, answer: n.toString(2), display: n.toString(2) });
    }
  }
});

app.post('/bases-api/check', express.json(), (req, res) => {
  const { type, answer } = req.body;
  const userStr = (req.body.userAnswer || '').replace(/\s+/g, '').toUpperCase().replace(/^0+/, '') || '0';
  let correct = false;

  if (type === 'bin_to_dec') {
    correct = parseInt(userStr) === answer;
  } else {
    const expected = String(answer).toUpperCase().replace(/^0+/, '') || '0';
    correct = userStr === expected;
  }

  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

// ═══════════════════════════════════════════════════════════════════════════
// CIRCLE THEOREMS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/circle-api/question', (req, res) => {
  const difficulty = req.query.difficulty || 'easy';
  const id = Date.now();

  if (difficulty === 'easy') {
    // Angle in semicircle = 90°
    const a = triRand(20, 70);
    const b = 90 - a;
    const prompt = `Triangle inscribed in semicircle. One angle at circumference = ${a}°. Find the other angle at circumference.`;
    res.json({ id, difficulty, type: 'semicircle', prompt, answer: b, display: `${b}°` });
  }
  else if (difficulty === 'medium') {
    // Angle at centre = 2 × angle at circumference
    const circumAngle = triRand(20, 80);
    const centreAngle = 2 * circumAngle;
    const subtype = triPick(['find_centre', 'find_circum']);
    if (subtype === 'find_centre') {
      const prompt = `Angle at circumference = ${circumAngle}°. Find the angle at the centre subtended by the same arc.`;
      res.json({ id, difficulty, type: 'centre_circum', prompt, answer: centreAngle, display: `${centreAngle}°` });
    } else {
      const prompt = `Angle at centre = ${centreAngle}°. Find the angle at the circumference subtended by the same arc.`;
      res.json({ id, difficulty, type: 'centre_circum', prompt, answer: circumAngle, display: `${circumAngle}°` });
    }
  }
  else if (difficulty === 'hard') {
    // Cyclic quadrilateral: opposite angles sum to 180°
    const a = triRand(40, 140);
    const c = 180 - a;
    const b = triRand(40, 140);
    const d = 180 - b;
    const subtype = triPick(['find_opp_a', 'find_opp_b']);
    if (subtype === 'find_opp_a') {
      const prompt = `Cyclic quadrilateral ABCD. Angle A = ${a}°. Find angle C.`;
      res.json({ id, difficulty, type: 'cyclic', prompt, answer: c, display: `${c}°` });
    } else {
      const prompt = `Cyclic quadrilateral ABCD. Angle B = ${b}°. Find angle D.`;
      res.json({ id, difficulty, type: 'cyclic', prompt, answer: d, display: `${d}°` });
    }
  }
  else {
    // Tangent perpendicular to radius; alternate segment theorem
    const subtype = triPick(['tangent_radius', 'alternate_segment']);
    if (subtype === 'tangent_radius') {
      const angle = triRand(15, 75);
      const answer = 90 - angle;
      const prompt = `Tangent meets radius at point P. Angle between tangent and chord = ${angle}°. Find the angle between radius and chord.`;
      res.json({ id, difficulty, type: 'tangent', prompt, answer, display: `${answer}°` });
    } else {
      const angle = triRand(20, 80);
      const prompt = `Alternate segment theorem: angle between tangent and chord = ${angle}°. Find the angle in the alternate segment.`;
      res.json({ id, difficulty, type: 'alt_segment', prompt, answer: angle, display: `${angle}°` });
    }
  }
});

app.post('/circle-api/check', express.json(), (req, res) => {
  const userNum = parseFloat((req.body.userAnswer || '').replace(/[°\s]/g, ''));
  const correct = !isNaN(userNum) && Math.abs(userNum - req.body.answer) < 0.5;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * INTEGRATION API  /integ-api
 * Reverse differentiation, definite integrals, area under curve
 * ═══════════════════════════════════════════════════════════════════════════ */

app.get('/integ-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Integrate ax^n → (a/(n+1))x^(n+1) + C, ask for coefficient and power
    const a = randInt(1, 8);
    const n = randInt(1, 4);
    const newCoeffNum = a;
    const newCoeffDen = n + 1;
    const g = gcd(Math.abs(newCoeffNum), newCoeffDen);
    const cNum = newCoeffNum / g;
    const cDen = newCoeffDen / g;
    const newPow = n + 1;
    answer = cDen === 1 ? cNum : cNum + '/' + cDen;
    display = `${answer}x^${newPow} + C`;
    prompt = `Integrate ${a === 1 ? '' : a}x${n === 1 ? '' : '^' + n} dx.\nGive the coefficient of x^${newPow} (as a fraction if needed).`;
  } else if (diff === 'medium') {
    // Integrate polynomial ax^2 + bx + c between 0 and k
    const a = randInt(1, 4);
    const b = randInt(-5, 5);
    const c = randInt(0, 6);
    const k = randInt(1, 4);
    // ∫ = (a/3)k^3 + (b/2)k^2 + ck
    // Multiply through by 6 to keep integer: 2a*k^3 + 3b*k^2 + 6c*k, then /6
    const num = 2 * a * k * k * k + 3 * b * k * k + 6 * c * k;
    const den = 6;
    const g = gcd(Math.abs(num), den);
    const rn = num / g;
    const rd = den / g;
    answer = rd === 1 ? rn : rn + '/' + rd;
    display = String(answer);
    const bStr = b >= 0 ? ` + ${b}x` : ` − ${Math.abs(b)}x`;
    const cStr = c > 0 ? ` + ${c}` : '';
    prompt = `Evaluate ∫₀^${k} (${a}x² ${bStr}${cStr}) dx.`;
  } else if (diff === 'hard') {
    // ∫ (ax+b)^n dx between limits — substitution style, but keep it clean
    const a = randInt(1, 3);
    const b = randInt(-3, 3);
    const n = randInt(2, 4);
    const lo = 0;
    const hi = randInt(1, 3);
    const evalAt = (x) => Math.pow(a * x + b, n + 1) / (a * (n + 1));
    const val = evalAt(hi) - evalAt(lo);
    if (Number.isInteger(val)) {
      answer = val;
    } else {
      // express as fraction
      const top = Math.pow(a * hi + b, n + 1) - Math.pow(a * lo + b, n + 1);
      const bot = a * (n + 1);
      const g2 = gcd(Math.abs(top), Math.abs(bot));
      const rn2 = top / g2;
      const rd2 = bot / g2;
      answer = rd2 === 1 ? rn2 : (rd2 < 0 ? -rn2 + '/' + -rd2 : rn2 + '/' + rd2);
    }
    display = String(answer);
    const bStr = b >= 0 ? `+${b}` : `${b}`;
    prompt = `Evaluate ∫₀^${hi} (${a}x${bStr})^${n} dx.`;
  } else {
    // Area between curve and x-axis: y = x^2 - kx, roots at 0 and k
    const k = randInt(2, 6);
    // Area = |∫₀^k (x²-kx) dx| = |k³/3 - k³/2| = k³/6
    const num = k * k * k;
    const den = 6;
    const g = gcd(num, den);
    answer = (den / g) === 1 ? num / g : (num / g) + '/' + (den / g);
    display = String(answer);
    prompt = `Find the area enclosed between y = x² − ${k}x and the x-axis.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/integ-api/check', express.json(), (req, res) => {
  const ua = (req.body.userAnswer || '').trim().replace(/\s/g, '');
  const ans = String(req.body.answer).replace(/\s/g, '');
  let correct = ua === ans;
  // Also check numeric equivalence for fractions
  if (!correct) {
    const evalFrac = (s) => { const p = String(s).split('/'); return p.length === 2 ? parseFloat(p[0]) / parseFloat(p[1]) : parseFloat(s); };
    const u = evalFrac(ua);
    const a2 = evalFrac(ans);
    if (!isNaN(u) && !isNaN(a2) && Math.abs(u - a2) < 0.001) correct = true;
  }
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * STANDARD FORM API  /stdform-api
 * Scientific notation: convert, multiply, divide, add
 * ═══════════════════════════════════════════════════════════════════════════ */

app.get('/stdform-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Convert number to standard form
    const sig = randInt(11, 99) / 10; // e.g. 3.4
    const exp = randInt(2, 7) * (Math.random() < 0.5 ? 1 : -1);
    const val = sig * Math.pow(10, exp);
    prompt = `Write ${exp > 0 ? val.toLocaleString('en-US', {useGrouping: false}) : val.toFixed(Math.abs(exp) + 1)} in standard form.`;
    answer = `${sig} × 10^${exp}`;
    display = answer;
  } else if (diff === 'medium') {
    // Multiply two numbers in standard form
    const a = randInt(11, 49) / 10;
    const ea = randInt(2, 5);
    const b = randInt(11, 49) / 10;
    const eb = randInt(2, 5);
    let product = a * b;
    let expR = ea + eb;
    // Normalize
    if (product >= 10) { product /= 10; expR += 1; }
    product = Math.round(product * 100) / 100;
    answer = `${product} × 10^${expR}`;
    display = answer;
    prompt = `Calculate (${a} × 10^${ea}) × (${b} × 10^${eb}). Give answer in standard form.`;
  } else if (diff === 'hard') {
    // Divide two numbers in standard form
    const a = randInt(20, 90) / 10;
    const ea = randInt(5, 9);
    const b = randInt(11, 49) / 10;
    const eb = randInt(2, 4);
    let quotient = a / b;
    let expR = ea - eb;
    if (quotient < 1) { quotient *= 10; expR -= 1; }
    if (quotient >= 10) { quotient /= 10; expR += 1; }
    quotient = Math.round(quotient * 100) / 100;
    answer = `${quotient} × 10^${expR}`;
    display = answer;
    prompt = `Calculate (${a} × 10^${ea}) ÷ (${b} × 10^${eb}). Give answer in standard form.`;
  } else {
    // Add/subtract two numbers in standard form (same power)
    const exp = randInt(3, 7);
    const a = randInt(11, 50) / 10;
    const b = randInt(11, 40) / 10;
    const sum = a + b;
    let resCoeff = sum;
    let resExp = exp;
    if (resCoeff >= 10) { resCoeff /= 10; resExp += 1; }
    resCoeff = Math.round(resCoeff * 100) / 100;
    answer = `${resCoeff} × 10^${resExp}`;
    display = answer;
    prompt = `Calculate (${a} × 10^${exp}) + (${b} × 10^${exp}). Give answer in standard form.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/stdform-api/check', express.json(), (req, res) => {
  const normalize = (s) => String(s).replace(/\s/g, '').replace(/×10\^/gi, 'e').replace(/x10\^/gi, 'e').replace(/\*10\^/gi, 'e');
  const ua = normalize(req.body.userAnswer || '');
  const ans = normalize(String(req.body.answer));
  const correct = ua === ans;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * BOUNDS API  /bounds-api
 * Upper/lower bounds, error intervals, significant figures
 * ═══════════════════════════════════════════════════════════════════════════ */

app.get('/bounds-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Round to 1 dp → give lower bound
    const val = randInt(10, 99);
    const dp1 = randInt(1, 9);
    const num = val + dp1 / 10; // e.g. 4.3
    prompt = `${num} is rounded to 1 decimal place. What is the lower bound?`;
    answer = num - 0.05;
    display = String(answer);
  } else if (diff === 'medium') {
    // Nearest 10 → give upper bound
    const base = randInt(3, 15) * 10; // e.g. 80
    prompt = `A length is ${base} cm, rounded to the nearest 10 cm. What is the upper bound?`;
    answer = base + 5;
    display = String(answer);
  } else if (diff === 'hard') {
    // Bounds of a calculation: a+b where both rounded to 1dp
    const a = randInt(20, 50) / 10; // e.g. 3.4
    const b = randInt(20, 50) / 10;
    prompt = `a = ${a} (1 d.p.) and b = ${b} (1 d.p.). Find the upper bound of a + b.`;
    answer = Math.round((a + 0.05 + b + 0.05) * 100) / 100;
    display = String(answer);
  } else {
    // Bounds of division: a/b, max = a_upper/b_lower
    const a = randInt(30, 80) / 10;
    const b = randInt(20, 40) / 10;
    const upperA = a + 0.05;
    const lowerB = b - 0.05;
    const result = Math.round((upperA / lowerB) * 1000) / 1000;
    prompt = `a = ${a} (1 d.p.) and b = ${b} (1 d.p.). Find the upper bound of a ÷ b. Give answer to 3 d.p.`;
    answer = result;
    display = String(answer);
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/bounds-api/check', express.json(), (req, res) => {
  const ua = parseFloat((req.body.userAnswer || '').replace(/\s/g, ''));
  const correct = !isNaN(ua) && Math.abs(ua - req.body.answer) < 0.005;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * SPEED DISTANCE TIME API  /sdt-api
 * Rate problems, average speed, unit conversions
 * ═══════════════════════════════════════════════════════════════════════════ */

app.get('/sdt-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Find distance = speed × time
    const s = randInt(20, 80); // km/h
    const t = randInt(2, 6); // hours
    answer = s * t;
    display = answer + ' km';
    prompt = `A car travels at ${s} km/h for ${t} hours. How far does it travel (in km)?`;
  } else if (diff === 'medium') {
    // Find time = distance / speed
    const s = randInt(30, 70);
    const d = s * randInt(2, 5); // ensure clean answer
    answer = d / s;
    display = answer + ' hours';
    prompt = `A train covers ${d} km at ${s} km/h. How long does the journey take (in hours)?`;
  } else if (diff === 'hard') {
    // Average speed for two-leg journey
    const d1 = randInt(30, 80);
    const s1 = randInt(20, 60);
    const d2 = randInt(30, 80);
    const s2 = randInt(20, 60);
    const totalD = d1 + d2;
    // time = d1/s1 + d2/s2 = (d1*s2 + d2*s1) / (s1*s2)
    const timeNum = d1 * s2 + d2 * s1;
    const timeDen = s1 * s2;
    // avg speed = totalD / time = totalD * timeDen / timeNum
    const ansNum = totalD * timeDen;
    const ansDen = timeNum;
    const g = gcd(Math.abs(ansNum), Math.abs(ansDen));
    const rn = ansNum / g;
    const rd = ansDen / g;
    answer = rd === 1 ? rn : Math.round((rn / rd) * 100) / 100;
    display = answer + ' km/h';
    prompt = `A cyclist rides ${d1} km at ${s1} km/h then ${d2} km at ${s2} km/h. Find the average speed (to 2 d.p. if needed).`;
  } else {
    // Convert units: m/s to km/h or vice versa
    const ms = randInt(5, 30); // m/s
    answer = Math.round(ms * 3.6 * 100) / 100;
    display = answer + ' km/h';
    prompt = `Convert ${ms} m/s to km/h.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/sdt-api/check', express.json(), (req, res) => {
  const ua = parseFloat((req.body.userAnswer || '').replace(/[^\d.\-\/]/g, ''));
  const correct = !isNaN(ua) && Math.abs(ua - req.body.answer) < 0.05;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * VARIATION API  /variation-api
 * Direct, inverse, joint variation — find k, find unknowns
 * ═══════════════════════════════════════════════════════════════════════════ */

app.get('/variation-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // y = kx, given y and x find k, then find y for new x
    const k = randInt(2, 9);
    const x1 = randInt(2, 6);
    const y1 = k * x1;
    const x2 = randInt(3, 8);
    answer = k * x2;
    display = String(answer);
    prompt = `y is directly proportional to x. When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`;
  } else if (diff === 'medium') {
    // y = k/x (inverse), given y and x find y for new x
    const k = randInt(12, 60);
    const x1 = randInt(2, 6);
    // ensure k divisible by x1 and x2
    const x2 = randInt(2, 6);
    const kUse = x1 * x2 * randInt(1, 4);
    const y1 = kUse / x1;
    answer = kUse / x2;
    display = String(answer);
    prompt = `y is inversely proportional to x. When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`;
  } else if (diff === 'hard') {
    // y = kx², given y and x find y for new x
    const k = randInt(1, 5);
    const x1 = randInt(2, 5);
    const y1 = k * x1 * x1;
    const x2 = randInt(2, 6);
    answer = k * x2 * x2;
    display = String(answer);
    prompt = `y is directly proportional to x². When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`;
  } else {
    // y = k/√x (inverse square root)
    const x1 = [4, 9, 16, 25][randInt(0, 3)];
    const sqrtX1 = Math.round(Math.sqrt(x1));
    const k = sqrtX1 * randInt(2, 6);
    const y1 = k / sqrtX1;
    const x2 = [4, 9, 16, 25][randInt(0, 3)];
    const sqrtX2 = Math.round(Math.sqrt(x2));
    answer = k / sqrtX2;
    display = String(answer);
    prompt = `y is inversely proportional to √x. When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/variation-api/check', express.json(), (req, res) => {
  const ua = parseFloat((req.body.userAnswer || '').replace(/\s/g, ''));
  const correct = !isNaN(ua) && Math.abs(ua - req.body.answer) < 0.05;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * HCF & LCM API  /hcflcm-api
 * Find HCF/LCM of 2-3 numbers, word problems
 * ═══════════════════════════════════════════════════════════════════════════ */

function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

app.get('/hcflcm-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // HCF of two numbers
    const g = randInt(2, 12);
    const a = g * randInt(2, 7);
    const b = g * randInt(2, 7);
    answer = gcd(a, b);
    display = String(answer);
    prompt = `Find the HCF of ${a} and ${b}.`;
  } else if (diff === 'medium') {
    // LCM of two numbers
    const a = randInt(4, 20);
    const b = randInt(4, 20);
    answer = lcm(a, b);
    display = String(answer);
    prompt = `Find the LCM of ${a} and ${b}.`;
  } else if (diff === 'hard') {
    // HCF and LCM of three numbers — ask for LCM
    const a = randInt(4, 15);
    const b = randInt(4, 15);
    const c = randInt(4, 15);
    answer = lcm(lcm(a, b), c);
    display = String(answer);
    prompt = `Find the LCM of ${a}, ${b}, and ${c}.`;
  } else {
    // Word problem: Two buses leave at same time, intervals A and B min, when next together?
    const a = randInt(8, 20);
    const b = randInt(10, 25);
    answer = lcm(a, b);
    display = answer + ' minutes';
    prompt = `Bus A departs every ${a} minutes and Bus B every ${b} minutes. They both leave at 9:00. After how many minutes will they next depart together?`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/hcflcm-api/check', express.json(), (req, res) => {
  const ua = parseFloat((req.body.userAnswer || '').replace(/[^\d.\-]/g, ''));
  const correct = !isNaN(ua) && ua === req.body.answer;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * PROFIT & LOSS API  /profitloss-api
 * Cost price, selling price, profit %, discount, markup
 * ═══════════════════════════════════════════════════════════════════════════ */

app.get('/profitloss-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Find profit given CP and SP
    const cp = randInt(20, 200) * 5;
    const profit = randInt(10, 50) * 5;
    const sp = cp + profit;
    answer = profit;
    display = '$' + answer;
    prompt = `An item is bought for $${cp} and sold for $${sp}. Find the profit.`;
  } else if (diff === 'medium') {
    // Find profit %
    const cp = randInt(10, 100) * 10;
    const profitPct = randInt(5, 40);
    const profit = cp * profitPct / 100;
    const sp = cp + profit;
    answer = profitPct;
    display = answer + '%';
    prompt = `Cost price = $${cp}, selling price = $${sp}. Find the profit percentage.`;
  } else if (diff === 'hard') {
    // Discount: marked price, discount %, find SP
    const mp = randInt(20, 100) * 10;
    const discPct = [10, 15, 20, 25, 30][randInt(0, 4)];
    const sp = mp * (100 - discPct) / 100;
    answer = sp;
    display = '$' + answer;
    prompt = `A shirt has a marked price of $${mp}. A ${discPct}% discount is applied. Find the selling price.`;
  } else {
    // Two successive discounts
    const mp = randInt(20, 100) * 10;
    const d1 = [10, 20, 25][randInt(0, 2)];
    const d2 = [10, 15, 20][randInt(0, 2)];
    const after1 = mp * (100 - d1) / 100;
    const after2 = after1 * (100 - d2) / 100;
    answer = after2;
    display = '$' + answer;
    prompt = `Marked price is $${mp}. Successive discounts of ${d1}% and ${d2}% are applied. Find the final price.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/profitloss-api/check', express.json(), (req, res) => {
  const ua = parseFloat((req.body.userAnswer || '').replace(/[$,\s%]/g, ''));
  const correct = !isNaN(ua) && Math.abs(ua - req.body.answer) < 0.05;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * ROUNDING API  /rounding-api
 * Decimal places, significant figures, estimation
 * ═══════════════════════════════════════════════════════════════════════════ */

app.get('/rounding-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Round to given dp
    const dp = randInt(1, 2);
    const num = (randInt(100, 9999) / 1000).toFixed(4);
    answer = parseFloat(parseFloat(num).toFixed(dp));
    display = parseFloat(num).toFixed(dp);
    prompt = `Round ${num} to ${dp} decimal place${dp > 1 ? 's' : ''}.`;
  } else if (diff === 'medium') {
    // Round to N significant figures
    const sf = randInt(1, 3);
    const num = randInt(1000, 99999) / (Math.pow(10, randInt(0, 2)));
    const rounded = parseFloat(num.toPrecision(sf));
    answer = rounded;
    display = String(rounded);
    prompt = `Round ${num} to ${sf} significant figure${sf > 1 ? 's' : ''}.`;
  } else if (diff === 'hard') {
    // Truncate (not round) to N dp
    const dp = randInt(1, 3);
    const num = (randInt(10000, 99999) / 10000).toFixed(5);
    const factor = Math.pow(10, dp);
    answer = Math.trunc(parseFloat(num) * factor) / factor;
    display = answer.toFixed(dp);
    prompt = `Truncate ${num} to ${dp} decimal place${dp > 1 ? 's' : ''}.`;
  } else {
    // Estimation: round each to 1 sf then compute
    const a = randInt(10, 99);
    const b = randInt(10, 99);
    const aRound = parseFloat(a.toPrecision(1));
    const bRound = parseFloat(b.toPrecision(1));
    answer = aRound * bRound;
    display = String(answer);
    prompt = `Estimate ${a} × ${b} by rounding each number to 1 significant figure.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/rounding-api/check', express.json(), (req, res) => {
  const ua = parseFloat((req.body.userAnswer || '').replace(/\s/g, ''));
  const correct = !isNaN(ua) && Math.abs(ua - req.body.answer) < 0.005;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * BINOMIAL THEOREM API  /binomial-api
 * Expand (a+b)^n, find specific terms, coefficient extraction
 * ═══════════════════════════════════════════════════════════════════════════ */

// nCr function
function nCr(n, r) {
  if (r > n || r < 0) return 0;
  if (r === 0 || r === n) return 1;
  let result = 1;
  for (let i = 0; i < r; i++) { result = result * (n - i) / (i + 1); }
  return Math.round(result);
}

app.get('/binomial-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Find nCr
    const n = randInt(4, 10);
    const r = randInt(1, Math.min(n - 1, 5));
    answer = nCr(n, r);
    display = String(answer);
    prompt = `Evaluate ${n}C${r} (${n} choose ${r}).`;
  } else if (diff === 'medium') {
    // Find coefficient of x^r in (1+x)^n
    const n = randInt(4, 10);
    const r = randInt(2, Math.min(n - 1, 5));
    answer = nCr(n, r);
    display = String(answer);
    prompt = `Find the coefficient of x^${r} in the expansion of (1 + x)^${n}.`;
  } else if (diff === 'hard') {
    // Find coefficient of x^r in (a+bx)^n
    const a = randInt(1, 3);
    const b = randInt(1, 3);
    const n = randInt(3, 6);
    const r = randInt(1, Math.min(n, 4));
    // Term: nCr * a^(n-r) * (bx)^r = nCr * a^(n-r) * b^r * x^r
    answer = nCr(n, r) * Math.pow(a, n - r) * Math.pow(b, r);
    display = String(answer);
    prompt = `Find the coefficient of x^${r} in (${a} + ${b}x)^${n}.`;
  } else {
    // Find a specific term in (1+x)^n expansion, e.g. the 4th term
    const n = randInt(5, 10);
    const termNum = randInt(2, Math.min(n, 5)); // the termNum-th term (1-indexed)
    const r = termNum - 1;
    answer = nCr(n, r);
    display = `${answer}x^${r}`;
    prompt = `Find the ${termNum}${termNum === 2 ? 'nd' : termNum === 3 ? 'rd' : 'th'} term in the expansion of (1 + x)^${n}. Give the coefficient only.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/binomial-api/check', express.json(), (req, res) => {
  const ua = parseFloat((req.body.userAnswer || '').replace(/[^\d.\-]/g, ''));
  const correct = !isNaN(ua) && ua === req.body.answer;
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * COMPLEX NUMBERS API  /complex-api
 * Add, multiply, modulus, conjugate
 * ═══════════════════════════════════════════════════════════════════════════ */

function fmtComplex(re, im) {
  if (im === 0) return String(re);
  if (re === 0) return im === 1 ? 'i' : im === -1 ? '-i' : im + 'i';
  const imPart = im === 1 ? 'i' : im === -1 ? '-i' : (im > 0 ? '+' + im + 'i' : im + 'i');
  return re + (im > 0 && im !== 1 ? '+' : '') + (im === 1 ? '+i' : im === -1 ? '-i' : (im > 0 ? '' : '') + im + 'i');
}

app.get('/complex-api/question', (req, res) => {
  const diff = req.query.difficulty || 'easy';
  let prompt, answer, display;

  if (diff === 'easy') {
    // Add two complex numbers
    const a = randInt(-5, 5), b = randInt(-5, 5);
    const c = randInt(-5, 5), d = randInt(-5, 5);
    const re = a + c, im = b + d;
    answer = re + ',' + im;
    display = fmtComplex(re, im);
    const z1 = fmtComplex(a, b), z2 = fmtComplex(c, d);
    prompt = `If z₁ = ${z1} and z₂ = ${z2}, find z₁ + z₂.\nGive answer as a,b for a + bi.`;
  } else if (diff === 'medium') {
    // Multiply two complex numbers
    const a = randInt(-4, 4), b = randInt(-4, 4);
    const c = randInt(-4, 4), d = randInt(-4, 4);
    const re = a * c - b * d;
    const im = a * d + b * c;
    answer = re + ',' + im;
    display = fmtComplex(re, im);
    const z1 = fmtComplex(a, b), z2 = fmtComplex(c, d);
    prompt = `If z₁ = ${z1} and z₂ = ${z2}, find z₁ × z₂.\nGive answer as a,b for a + bi.`;
  } else if (diff === 'hard') {
    // Find modulus |z| using Pythagorean triples for clean answers
    const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]];
    const [a, b, c] = triples[randInt(0, triples.length - 1)];
    const signA = Math.random() < 0.5 ? -1 : 1;
    const signB = Math.random() < 0.5 ? -1 : 1;
    answer = c;
    display = String(c);
    prompt = `Find |z| where z = ${fmtComplex(signA * a, signB * b)}.`;
  } else {
    // Find z² given z = a + bi
    const a = randInt(-4, 4), b = randInt(1, 5) * (Math.random() < 0.5 ? -1 : 1);
    const re = a * a - b * b;
    const im = 2 * a * b;
    answer = re + ',' + im;
    display = fmtComplex(re, im);
    prompt = `If z = ${fmtComplex(a, b)}, find z².\nGive answer as a,b for a + bi.`;
  }

  res.json({ prompt, answer, display, difficulty: diff });
});

app.post('/complex-api/check', express.json(), (req, res) => {
  const ua = (req.body.userAnswer || '').replace(/\s/g, '').replace(/i/g, '');
  const ans = String(req.body.answer).replace(/\s/g, '');
  // For modulus: direct numeric check
  if (!ans.includes(',')) {
    const correct = parseFloat(ua) === parseFloat(ans);
    return res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
  }
  // For complex: compare a,b pairs
  const userParts = ua.split(',').map(Number);
  const ansParts = ans.split(',').map(Number);
  const correct = userParts.length === 2 && userParts[0] === ansParts[0] && userParts[1] === ansParts[1];
  res.json({ correct, display: req.body.display, message: correct ? 'Correct!' : 'Incorrect' });
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
