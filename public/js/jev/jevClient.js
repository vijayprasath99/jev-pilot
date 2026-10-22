import { JEV_INTERVAL_KEY, JEV_MODE_KEY, PLAYER_Y, PLAYER_HEIGHT } from '../config/constants.js';
import { gameState, devSettings, jevState } from '../state/gameState.js';
import { updateDevPanel, setJevModeUI } from '../ui/devPanel.js';

let jevTimer = null;
let devIdleInterval = null;

/**
 * Fetch JEV configuration from backend
 */
export async function fetchJevConfig() {
  try {
    const res = await fetch('/api/jev/config');
    if (res.ok) {
      const cfg = await res.json();
      if (cfg && cfg.model) {
        jevState.modelName = cfg.model;
        updateDevPanel();
      }
    }
  } catch (e) {
    // Graceful fallback to default model
  }
}

/**
 * Send current game state to /api/jev/action and dispatch steering decision
 * @param {Function} onMove
 */
export async function queryJevAi(onMove) {
  if (jevState.isRequestInProgress) return;
  if (!gameState.running || gameState.paused) return;

  jevState.isRequestInProgress = true;
  updateDevPanel();

  // Gather oncoming obstacles ahead of car
  const obstaclesAhead = gameState.obstacles
    .filter(obs => obs.y < PLAYER_Y + PLAYER_HEIGHT)
    .map(obs => ({
      lane: obs.lane,
      y: Math.round(obs.y),
      distance: Math.round(PLAYER_Y - obs.y)
    }));

  const payload = {
    playerLane: gameState.playerLane,
    speed: gameState.speed,
    score: gameState.score,
    obstacles: obstaclesAhead
  };

  const fetchStart = performance.now();
  try {
    const res = await fetch('/api/jev/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      jevState.queryCount++;
      jevState.lastAction = data.action || 'stay';
      jevState.lastConfidence = data.confidence;
      jevState.lastLatency = data.latencyMs;

      if (typeof data.latencyMs === 'number') {
        jevState.latencyHistory.push(data.latencyMs);
        if (jevState.latencyHistory.length > 30) jevState.latencyHistory.shift();
      }

      if (data.model) jevState.modelName = data.model;
      if (data.probabilities) jevState.currentProbabilities = data.probabilities;
      if (data.laneDistance) jevState.currentHazards = data.laneDistance;

      // Apply chosen steering control action
      if (gameState.running && !gameState.paused && jevState.autopilotActive) {
        if (typeof onMove === 'function') {
          if (data.action === 'left') {
            onMove(-1);
          } else if (data.action === 'right') {
            onMove(1);
          }
        }
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      const latency = typeof errData.latencyMs === 'number'
        ? errData.latencyMs
        : Math.round(performance.now() - fetchStart);
      jevState.lastLatency = latency;
      jevState.latencyHistory.push(latency);
      if (jevState.latencyHistory.length > 30) jevState.latencyHistory.shift();
    }
  } catch (err) {
    console.warn('JEV AI query error:', err);
    const elapsed = Math.round(performance.now() - fetchStart);
    jevState.lastLatency = elapsed;
    jevState.latencyHistory.push(elapsed);
    if (jevState.latencyHistory.length > 30) jevState.latencyHistory.shift();
  } finally {
    jevState.isRequestInProgress = false;
    updateDevPanel();
  }
}

/**
 * Start periodic JEV polling loop
 * @param {Function} onMove
 */
export function startJevLoop(onMove) {
  if (jevTimer) return;
  if (gameState.running && !gameState.paused) {
    queryJevAi(onMove);
  }
  jevTimer = setInterval(() => {
    if (gameState.running && !gameState.paused && jevState.autopilotActive) {
      queryJevAi(onMove);
    }
  }, jevState.queryIntervalMs);
}

/**
 * Stop JEV polling loop
 */
export function stopJevLoop() {
  if (jevTimer) {
    clearInterval(jevTimer);
    jevTimer = null;
  }
}

/**
 * Enable or disable JEV mode (autopilot + dev telemetry sidebar)
 * @param {boolean} enabled
 * @param {boolean} persist
 * @param {Function} onMove
 */
export function setJevMode(enabled, persist = true, onMove) {
  jevState.modeActive = enabled;
  jevState.autopilotActive = enabled;
  devSettings.statsVisible = enabled;

  if (persist) {
    try {
      localStorage.setItem(JEV_MODE_KEY, String(enabled));
    } catch (e) {}
  }

  setJevModeUI(enabled);

  if (enabled) {
    startJevLoop(onMove);
    updateDevPanel();
    if (!gameState.running || gameState.paused) {
      if (!devIdleInterval) {
        devIdleInterval = setInterval(() => {
          if (!gameState.running || gameState.paused) {
            updateDevPanel();
          }
        }, 150);
      }
    }
  } else {
    stopJevLoop();
    if (devIdleInterval) {
      clearInterval(devIdleInterval);
      devIdleInterval = null;
    }
  }
}

/**
 * Adjust query interval in milliseconds (100ms - 1000ms)
 * @param {number} ms
 * @param {boolean} updateSlider
 * @param {Function} onMove
 */
export function setIntervalMs(ms, updateSlider = true, onMove) {
  ms = Math.max(100, Math.min(1000, Math.round(ms)));
  jevState.queryIntervalMs = ms;
  try {
    localStorage.setItem(JEV_INTERVAL_KEY, String(ms));
  } catch (e) {}

  const displaySec = (ms / 1000).toFixed(ms % 100 === 0 ? 1 : 2) + 's';
  const jevIntervalValEl = document.getElementById('jev-interval-val');
  const jevIntervalSlider = document.getElementById('jev-interval-slider');
  const intervalButtons = document.querySelectorAll('.interval-btn');

  if (jevIntervalValEl) {
    jevIntervalValEl.textContent = displaySec;
  }
  if (updateSlider && jevIntervalSlider) {
    jevIntervalSlider.value = (ms / 1000).toFixed(2);
  }

  intervalButtons.forEach(btn => {
    const btnMs = parseInt(btn.dataset.ms, 10);
    btn.classList.toggle('active', btnMs === ms);
  });

  if (jevState.modeActive && jevTimer) {
    clearInterval(jevTimer);
    jevTimer = setInterval(() => {
      if (gameState.running && !gameState.paused && jevState.autopilotActive) {
        queryJevAi(onMove);
      }
    }, jevState.queryIntervalMs);
  }
}
