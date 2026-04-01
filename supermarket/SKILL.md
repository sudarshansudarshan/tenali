# Tenali — The Supermarket of Mathematical Skills

Tenali is an interactive learning platform that presents mathematical and knowledge-building exercises as a "supermarket" of skill games. The home screen displays a 4x4 grid of 16 slots — 4 active apps and 12 reserved for future additions — where each slot is a self-contained learning game that drills a specific skill.

The name "Tenali" is inspired by Tenali Ramakrishna, the legendary Indian mathematician and poet known for his wit and problem-solving abilities.

## Architecture

Tenali is a full-stack monorepo with a React frontend and an Express.js backend.

### Frontend (client/)

- **Framework**: React 19 with Vite 8 as the build tool
- **Styling**: Single App.css file using CSS custom properties for theming
- **Font**: Inter (Google Fonts) — clean, professional sans-serif throughout
- **Design**: Warm cream background (#f5f0eb), white cards (#fffdf9), amber accent (#e07a3a), green for correct (#3a8a5c), red for incorrect (#c24b3a)
- **Layout**: Centered card (max-width 900px) containing all app views
- **Routing**: State-based (no React Router) — a `mode` state variable switches between Home and individual apps
- **Entry point**: `client/src/App.jsx` — contains all components (App, Home, GKApp, AdditionApp, QuadraticApp, SqrtApp, QuizLayout)
- **Environment variables**: `VITE_API_BASE_URL` — set to empty string for production (relative URLs), or `http://localhost:4000` for development

### Backend (server/)

- **Framework**: Express 5 with CORS middleware
- **Port**: 4000 (default), configurable via `PORT` environment variable
- **Static serving**: Serves the built React app from `client/dist/`
- **SPA fallback**: Catch-all route serves `index.html` for client-side routing
- **Data**: GK questions loaded from JSON files in `chitragupta/questions/` at startup (~991 questions)
- **Entry point**: `server/index.js` — contains all API route handlers and helper functions

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check — returns `{ ok: true, questions: N }` |
| GET | `/gk-api/question` | Random GK question with id, text, options, genre |
| POST | `/gk-api/check` | Verify GK answer — accepts `{ id, answerOption }` |
| GET | `/addition-api/question?digits=N` | Addition problem (N = 1, 2, or 3) |
| POST | `/addition-api/check` | Verify addition — accepts `{ a, b, answer }` |
| GET | `/quadratic-api/question?difficulty=D` | Quadratic problem (D = easy, medium, or hard) |
| POST | `/quadratic-api/check` | Verify quadratic — accepts `{ a, b, c, x, answer }` |
| GET | `/sqrt-api/question?step=N` | Square root problem (difficulty scales with step) |
| POST | `/sqrt-api/check` | Verify sqrt — accepts `{ q, answer }` |

### Home Screen

The home screen renders a 4x4 CSS grid. The first 4 cells are active app cards (clickable buttons with hover effects and a colored dot indicator). The remaining 12 cells are placeholder cards with dashed borders and "Coming soon" text. Responsive breakpoints collapse to 2 columns below 860px and 1 column below 500px.

### Shared UI Patterns

Every quiz app follows the same interaction pattern:

1. **QuizLayout wrapper** — provides a back button, title, and subtitle
2. **Score pill** — top-right corner, tracks cumulative score
3. **Difficulty selector** (where applicable) — radio pill buttons locked once started
4. **Welcome screen** — brief description + "Start Quiz" button
5. **Question display** — styled question box with the problem
6. **Answer input** — centered text input with focus styling
7. **Submit/Next flow** — single button toggles between "Submit" and "Next Question"
8. **Step-by-step feedback** — after every answer, a reasoning panel shows the full worked-out solution (green background for correct, red for incorrect)
9. **Finish screen** — final score + "Play Again" button (for fixed-length quizzes)
10. **Keyboard support** — Enter key submits or advances throughout

### Deployment

**Render.com** (primary):
- Configuration: `render.yaml` at repo root
- Build: `npm install && cd client && npm install && npm run build`
- Start: `node server/index.js`
- Health check: `/api/health`
- URL: https://tenali.onrender.com

**GitHub Pages** (static fallback):
- CI/CD workflow: `.github/workflows/deploy.yml`
- Builds client only, uploads to GitHub Pages
- Vite base path: `./` (relative assets)

### Development

**Running locally:**

1. Start the server: `cd server && node index.js` (runs on port 4000)
2. Option A — production build: visit `http://localhost:4000` (Express serves built client)
3. Option B — dev mode: `cd client && npm run dev` (Vite on port 5173 with hot reload, proxies API calls to port 4000)

**Vite proxy config** (client/vite.config.js): forwards `/api`, `/gk-api`, `/addition-api`, `/quadratic-api`, and `/sqrt-api` to `http://127.0.0.1:4000`.

### Repository Structure

```
Tenali/
├── supermarket/              Documentation hub
│   ├── SKILL.md              This file — project overview
│   ├── gk/SKILL.md           General Knowledge app docs
│   ├── addition/SKILL.md     Addition app docs
│   ├── quadratic/SKILL.md    Quadratic app docs
│   └── sqrt/SKILL.md         Square Root app docs
├── client/                   React frontend
│   ├── src/
│   │   ├── App.jsx           All components
│   │   ├── App.css           All styling
│   │   └── index.css         Minimal reset
│   ├── index.html            HTML entry point
│   ├── vite.config.js        Vite configuration
│   ├── .env                  Dev environment (VITE_API_BASE)
│   └── .env.production       Production environment (VITE_API_BASE_URL)
├── server/
│   ├── index.js              Express server + all API routes
│   └── package.json          Server dependencies
├── chitragupta/
│   └── questions/            ~991 GK question JSON files
├── render.yaml               Render.com deployment config
└── .github/workflows/        GitHub Pages CI/CD
```

### Current Apps (4 of 16 slots filled)

1. **General Knowledge** — Multiple-choice quiz from 991 curated questions
2. **Addition** — 20-question drill with 1/2/3-digit difficulty levels
3. **Quadratic** — 20-question substitution quiz with Easy/Medium/Hard difficulty
4. **Square Root** — Continuous estimation drill with progressive difficulty

See individual SKILL.md files in the subfolders for exhaustive details on each app.
