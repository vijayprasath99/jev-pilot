import { HIGH_SCORE_KEY, JEV_INTERVAL_KEY, JEV_MODE_KEY } from '../config/constants.js';

export const gameState = {
  running: false,
  paused: false,
  playerLane: 1,
  obstacles: [],
  score: 0,
  speed: 4,
  spawnTimer: 0,
  spawnInterval: 70,
  roadLineOffset: 0,
  frame: 0,
  lastLaneSpawned: -1
};

export const devSettings = {
  showHitboxes: false,
  godMode: false,
  statsVisible: true
};

export const metrics = {
  highScore: 0,
  currentFps: 60,
  currentFrameTime: 16.6,
  minFps: Infinity,
  maxFps: 0,
  fpsHistory: [],
  runStartTime: null,
  runPauseStartTime: null,
  totalPausedDuration: 0,
  obstaclesEvaded: 0,
  lastFrameTime: performance.now(),
  lastDevDomUpdate: 0
};

export const jevState = {
  queryIntervalMs: 500,
  modeActive: true,
  autopilotActive: true,
  isRequestInProgress: false,
  lastAction: '--',
  lastConfidence: null,
  lastLatency: null,
  modelName: 'clef-flash',
  queryCount: 0,
  currentProbabilities: { left: 0, stay: 0, right: 0 },
  currentHazards: { 0: null, 1: null, 2: null },
  latencyHistory: [],
  healthState: 'STABLE',
  chartInstance: null
};

// Initialize persistent values from localStorage
try {
  const savedHigh = localStorage.getItem(HIGH_SCORE_KEY);
  if (savedHigh !== null) {
    metrics.highScore = parseInt(savedHigh, 10) || 0;
  }
} catch (e) {}

try {
  const savedInterval = localStorage.getItem(JEV_INTERVAL_KEY);
  if (savedInterval !== null) {
    const parsed = parseInt(savedInterval, 10);
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 1000) {
      jevState.queryIntervalMs = parsed;
    }
  }
} catch (e) {}

try {
  const savedMode = localStorage.getItem(JEV_MODE_KEY);
  if (savedMode !== null) {
    jevState.modeActive = savedMode === 'true';
    jevState.autopilotActive = jevState.modeActive;
    devSettings.statsVisible = jevState.modeActive;
  }
} catch (e) {}

export function resetGameState() {
  gameState.running = true;
  gameState.paused = false;
  gameState.playerLane = 1;
  gameState.obstacles = [];
  gameState.score = 0;
  gameState.speed = 4;
  gameState.spawnTimer = 0;
  gameState.spawnInterval = 70;
  gameState.roadLineOffset = 0;
  gameState.frame = 0;
  gameState.lastLaneSpawned = -1;

  metrics.obstaclesEvaded = 0;
  metrics.runStartTime = performance.now();
  metrics.runPauseStartTime = null;
  metrics.totalPausedDuration = 0;
  metrics.minFps = Infinity;
  metrics.maxFps = 0;
  metrics.fpsHistory = [];
}

export function getRunDurationMs(now) {
  if (!metrics.runStartTime) return 0;
  const current = (gameState.paused && metrics.runPauseStartTime)
    ? metrics.runPauseStartTime
    : (now || performance.now());
  return Math.max(0, current - metrics.runStartTime - metrics.totalPausedDuration);
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}
