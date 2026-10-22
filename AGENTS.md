# AGENTS.md — Developer & AI Agent Guide

Welcome to the **Infinite Driver & JEV AI Autopilot** codebase. This guide provides AI agents and human developers with an architectural roadmap, conventions, key mechanics, and instructions for safely contributing to this project.

---

## 1. Project Overview

**Infinite Driver** is a browser-based 2D infinite runner game where the player dodges oncoming traffic across 3 lanes.
It integrates a real-time **JEV Autopilot AI** (powered by the JEV System One / LLM API) that analyzes road hazards ahead and autonomously steers the vehicle, paired with a live developer telemetry dashboard that visualizes model decisions, confidence, lane hazards, and latency degradation SLA tracking.

---

## 2. Directory Structure

The repository is cleanly partitioned into backend (`server/`) and frontend (`public/`) concerns:

```text
unlimited_runner/
├── AGENTS.md                  # This file
├── .env                       # Local environment variables (PORT, JEV_*)
├── .env.example               # Example template for environment config
├── package.json               # ESM module package definition & scripts
├── server/                    # Node.js + Express backend
│   ├── index.js               # Application entry point, vendor routing, static hosting
│   ├── config.js              # Environment variable parsing (dotenv)
│   ├── routes/
│   │   └── jevRoutes.js       # Express router for /api/jev endpoints
│   └── services/
│       └── jevService.js      # Prompt engineering & proxy calls to JEV System One API
├── public/                    # Frontend client (served directly to browser)
│   ├── index.html             # Single Page HTML entry point
│   ├── css/                   # Modular stylesheets (aggregated in main.css)
│   │   ├── main.css           # Imports base, game, dev-panel, and jev-telemetry
│   │   ├── base.css           # Typography, CSS tokens, resets, body background
│   │   ├── game.css           # Canvas viewport, HUD, start/pause/game-over modals
│   │   ├── dev-panel.css      # Developer telemetry sidebar frame and tab layouts
│   │   └── jev-telemetry.css  # JEV Hero banner, sparkline styling, hazard grid, sliders
│   └── js/                    # Native ES Modules (ES6 import/export)
│       ├── main.js            # App bootstrap, lifecycle & config hydration
│       ├── config/
│       │   └── constants.js   # Canvas, lane, player/obstacle dimensions & keys
│       ├── state/
│       │   └── gameState.js   # Game state, developer flags, and JEV telemetry state
│       ├── entities/
│       │   ├── road.js        # Asphalt surface & animated dashed lane markers
│       │   ├── player.js      # Player car rendering, JEV aura, godmode shield
│       │   └── obstacle.js    # Obstacle generation, movement, culling, and rendering
│       ├── engine/
│       │   ├── physics.js     # AABB collision math and hitbox checks
│       │   └── gameLoop.js    # RequestAnimationFrame loop, tick, update, render
│       ├── jev/
│       │   ├── jevClient.js   # Polling loop, /api/jev/action caller, vehicle steering
│       │   └── healthMonitor.js # Latency history, SLA trend & health state analysis
│       └── ui/
│           ├── controls.js    # Keyboard bindings, button clicks, interval sliders
│           ├── hud.js         # Score display and overlay visibility transitions
│           ├── latencyChart.js# Chart.js sparkline integration & dynamic health colors
│           └── devPanel.js    # Telemetry DOM updates, lane cells, active badges
└── test/                      # Unit test suites (Node.js test runner)
    ├── physics.test.js        # Collision math verification
    └── jevPrompt.test.js      # JEV prompt building & distance calculation tests
```

---

## 3. Technology Stack & Key Dependencies

- **Node.js**: Standard ESM (`"type": "module"` in `package.json`).
- **Express** (`express`): Handles JSON body parsing, API routing, and static asset delivery.
- **Dotenv** (`dotenv`): Reads `.env` for configuration.
- **Chart.js** (`chart.js`): Renders the real-time API latency sparkline in the developer telemetry panel. Exposed to the browser via `/vendor/chart.js`.
- **Vanilla ES6 Modules**: Frontend runs natively in all modern browsers without requiring any bundler, transpile, or build step.

---

## 4. Development & Testing Commands

```bash
# Install dependencies
npm install

# Start the server (runs on http://localhost:3000)
npm start

# Run server with live file watching (Node 18+)
npm run dev

# Run automated unit tests
npm test
```

---

## 5. Architectural Conventions & Guidelines

### Backend Architecture
- **Do not mix business logic with routes**: Route handlers in `server/routes/jevRoutes.js` should only validate request inputs, invoke service methods from `server/services/jevService.js`, and respond with standardized JSON.
- **Configuration**: Always access environment variables via `server/config.js` to ensure default fallbacks.
- **Error Handling**: JEV API errors must return structured JSON (`{ success: false, error: "...", action: "stay", latencyMs }`) with appropriate HTTP status codes (400 for bad input, 502 for upstream API unreachable) so the client never crashes.

### Frontend Architecture
- **Zero-Build ES Modules**: Keep frontend scripts as standard ES Modules. Use `.js` extension in all relative imports:
  ```javascript
  import { LANE_COUNT } from './config/constants.js';
  ```
- **State Management**: Keep mutable state organized in `public/js/state/gameState.js`. Avoid global window pollution.
- **Telemetry & Health Monitoring**: JEV latency history is capped at 30 items. Latency exceeding 500ms SLA is tagged as `DEGRADING`, between 320ms and 500ms is `ELEVATED`, and below 320ms is `STABLE`.
- **Chart.js Wrapper**: Use `public/js/ui/latencyChart.js` to encapsulate Chart.js instance creation and dataset updates. Do not access `Chart` directly from game logic.
- **Separation of CSS**: Keep CSS cleanly separated by domain (`base.css`, `game.css`, `dev-panel.css`, `jev-telemetry.css`). Add new styles into the appropriate file and reference them in `main.css`.

---

## 6. Game Engine Rules & Constants

- **Lanes**: 3 lanes (0: Left, 1: Center, 2: Right).
- **Canvas Resolution**: 400px width x 600px height.
- **Collision Detection**: Axis-Aligned Bounding Box (AABB) with exact overlap check in `public/js/engine/physics.js`. Bypassed when `devSettings.godMode` is true.
- **Speed Progression**: Game speed starts at 4.0 px/frame and increases by 0.5 px/frame every 300 points, while obstacle spawn intervals decrease.
- **JEV Autopilot**: Periodic polling queries `/api/jev/action` every `jevQueryIntervalMs` (configurable between 100ms and 1000ms, default 500ms). When action is `'left'` or `'right'`, it safely steers the car into adjacent lanes.
