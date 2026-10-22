import { gameState, devSettings, metrics, jevState, getRunDurationMs, formatDuration } from '../state/gameState.js';
import { laneCenterX, PLAYER_Y } from '../config/constants.js';
import { recordLatency } from '../jev/healthMonitor.js';
import { updateLatencyChart } from './latencyChart.js';

// DOM Elements
const devPanel = document.getElementById('dev-panel');
const devPanelBody = document.getElementById('dev-panel-body');
const devStatusBadge = document.getElementById('dev-status-badge');
const tabSplitView = document.getElementById('tab-split-view');
const tabJevView = document.getElementById('tab-jev-view');
const tabGameView = document.getElementById('tab-game-view');

const devFpsEl = document.getElementById('dev-fps');
const devFrameTimeEl = document.getElementById('dev-frame-time');
const devAvgFpsEl = document.getElementById('dev-avg-fps');
const devSpeedEl = document.getElementById('dev-speed');
const devDurationEl = document.getElementById('dev-duration');
const devFrameEl = document.getElementById('dev-frame');
const devScoreEl = document.getElementById('dev-score');
const devHighscoreEl = document.getElementById('dev-highscore');
const devLaneEl = document.getElementById('dev-lane');
const devPosEl = document.getElementById('dev-pos');
const laneCells = [
  document.getElementById('lane-box-0'),
  document.getElementById('lane-box-1'),
  document.getElementById('lane-box-2')
];

const devJevStatusEl = document.getElementById('dev-jev-status');
const devJevActionBanner = document.getElementById('dev-jev-action-banner');
const devJevConfidenceEl = document.getElementById('dev-jev-confidence');
const devJevLatencyEl = document.getElementById('dev-jev-latency');
const devJevModelEl = document.getElementById('dev-jev-model');

const jevHealthTag = document.getElementById('jev-health-tag');
const jevTimingCur = document.getElementById('jev-timing-cur');
const jevTimingAvg = document.getElementById('jev-timing-avg');
const jevTimingMin = document.getElementById('jev-timing-min');
const jevTimingMax = document.getElementById('jev-timing-max');
const jevLatencyTrend = document.getElementById('jev-latency-trend');

const probValLeft = document.getElementById('prob-val-left');
const probValStay = document.getElementById('prob-val-stay');
const probValRight = document.getElementById('prob-val-right');
const probBarLeft = document.getElementById('prob-bar-left');
const probBarStay = document.getElementById('prob-bar-stay');
const probBarRight = document.getElementById('prob-bar-right');
const probRowLeft = document.getElementById('prob-row-left');
const probRowStay = document.getElementById('prob-row-stay');
const probRowRight = document.getElementById('prob-row-right');

const hazardCells = [
  document.getElementById('hazard-lane-0'),
  document.getElementById('hazard-lane-1'),
  document.getElementById('hazard-lane-2')
];
const hazardVals = [
  document.getElementById('hazard-val-0'),
  document.getElementById('hazard-val-1'),
  document.getElementById('hazard-val-2')
];

const jevQueryCountEl = document.getElementById('jev-query-count');
const devObsEvadedEl = document.getElementById('dev-obs-evaded');
const jevModeBtn = document.getElementById('jev-mode-btn');
const devToggleJev = document.getElementById('dev-toggle-jev');
const gameWrapper = document.getElementById('game-wrapper');

export function setDashboardView(viewMode) {
  if (!devPanelBody) return;
  devPanelBody.classList.remove('view-split', 'view-jev', 'view-game');
  devPanelBody.classList.add('view-' + viewMode);

  if (tabSplitView) tabSplitView.classList.toggle('active', viewMode === 'split');
  if (tabJevView) tabJevView.classList.toggle('active', viewMode === 'jev');
  if (tabGameView) tabGameView.classList.toggle('active', viewMode === 'game');
}

export function setJevModeUI(enabled) {
  if (jevModeBtn) {
    jevModeBtn.classList.toggle('active', enabled);
    jevModeBtn.setAttribute('aria-pressed', String(enabled));
  }
  if (devToggleJev) {
    devToggleJev.checked = enabled;
  }
  if (devPanel) {
    devPanel.classList.toggle('hidden', !enabled);
  }
  if (gameWrapper) {
    gameWrapper.classList.toggle('dev-open', enabled);
  }
}

export function updateDevPanel(now = performance.now()) {
  if (!devSettings.statsVisible) return;

  // 1. Performance & Game State Badge
  if (devFpsEl) {
    if (gameState.running && !gameState.paused) {
      devFpsEl.textContent = metrics.currentFps;
      devFpsEl.className = 'dev-fps-value ' + (metrics.currentFps >= 50 ? 'good' : metrics.currentFps >= 30 ? 'warn' : 'bad');
      if (devFrameTimeEl) devFrameTimeEl.textContent = metrics.currentFrameTime.toFixed(1) + ' ms/f';
      const avg = metrics.fpsHistory.length
        ? Math.round(metrics.fpsHistory.reduce((a, b) => a + b, 0) / metrics.fpsHistory.length)
        : metrics.currentFps;
      if (devAvgFpsEl) devAvgFpsEl.textContent = avg + ' avg';
    } else if (gameState.paused) {
      devFpsEl.textContent = 'PAUSE';
      devFpsEl.className = 'dev-fps-value warn';
      if (devFrameTimeEl) devFrameTimeEl.textContent = '0.0 ms/f';
    } else {
      devFpsEl.textContent = '--';
      devFpsEl.className = 'dev-fps-value';
      if (devFrameTimeEl) devFrameTimeEl.textContent = '-- ms/f';
      if (devAvgFpsEl) devAvgFpsEl.textContent = '-- avg';
    }
  }

  if (devStatusBadge) {
    if (gameState.running && !gameState.paused) {
      devStatusBadge.textContent = 'RUNNING';
      devStatusBadge.className = 'dev-badge badge-running';
    } else if (gameState.paused) {
      devStatusBadge.textContent = 'PAUSED';
      devStatusBadge.className = 'dev-badge badge-paused';
    } else {
      const gameOverScreen = document.getElementById('game-over-screen');
      if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
        devStatusBadge.textContent = 'GAME OVER';
        devStatusBadge.className = 'dev-badge badge-gameover';
      } else {
        devStatusBadge.textContent = 'READY';
        devStatusBadge.className = 'dev-badge badge-idle';
      }
    }
  }

  // 2. Game Engine Section
  if (devSpeedEl) devSpeedEl.textContent = gameState.speed.toFixed(2) + ' px/f';
  if (devDurationEl) devDurationEl.textContent = formatDuration(getRunDurationMs(now));
  if (devFrameEl) devFrameEl.textContent = gameState.frame;
  if (devScoreEl) devScoreEl.textContent = gameState.score;
  if (devHighscoreEl) devHighscoreEl.textContent = metrics.highScore;

  // 3. Player Vehicle Section
  if (devLaneEl) devLaneEl.textContent = `Lane ${gameState.playerLane}`;
  if (devPosEl) devPosEl.textContent = `${Math.round(laneCenterX(gameState.playerLane))}, ${PLAYER_Y}`;

  laneCells.forEach((cell, idx) => {
    if (cell) cell.classList.toggle('active', idx === gameState.playerLane);
  });

  // 4. JEV Autopilot Hero
  if (devJevStatusEl) {
    if (jevState.modeActive) {
      devJevStatusEl.textContent = jevState.isRequestInProgress ? 'THINKING...' : 'ACTIVE';
      devJevStatusEl.className = 'dev-badge badge-running';
    } else {
      devJevStatusEl.textContent = 'INACTIVE';
      devJevStatusEl.className = 'dev-badge badge-idle';
    }
  }

  if (devJevActionBanner) {
    if (jevState.lastAction === 'left') {
      devJevActionBanner.textContent = '← STEER LEFT';
      devJevActionBanner.className = 'jev-decision-value action-left';
    } else if (jevState.lastAction === 'right') {
      devJevActionBanner.textContent = 'STEER RIGHT →';
      devJevActionBanner.className = 'jev-decision-value action-right';
    } else if (jevState.lastAction === 'stay') {
      devJevActionBanner.textContent = '• MAINTAIN LANE';
      devJevActionBanner.className = 'jev-decision-value action-stay';
    } else {
      devJevActionBanner.textContent = '--';
      devJevActionBanner.className = 'jev-decision-value';
    }
  }

  if (devJevConfidenceEl) {
    devJevConfidenceEl.textContent = typeof jevState.lastConfidence === 'number'
      ? Math.round(jevState.lastConfidence * 100) + '%'
      : '--';
  }
  if (devJevLatencyEl) {
    devJevLatencyEl.textContent = jevState.lastLatency != null ? `${jevState.lastLatency} ms` : '-- ms';
  }
  if (devJevModelEl) {
    devJevModelEl.textContent = jevState.modelName;
  }

  // 5. Latency Stats & Health Calculation
  const healthStats = recordLatency(null, jevState.latencyHistory);
  jevState.healthState = healthStats.healthState;

  if (jevTimingCur) jevTimingCur.textContent = healthStats.current ? `${healthStats.current}ms` : '--';
  if (jevTimingAvg) jevTimingAvg.textContent = healthStats.avg ? `${healthStats.avg}ms` : '--';
  if (jevTimingMin) jevTimingMin.textContent = healthStats.min ? `${healthStats.min}ms` : '--';
  if (jevTimingMax) jevTimingMax.textContent = healthStats.max ? `${healthStats.max}ms` : '--';
  if (jevLatencyTrend) jevLatencyTrend.textContent = healthStats.trend;

  if (jevHealthTag) {
    jevHealthTag.textContent = healthStats.healthState;
    jevHealthTag.className = 'health-tag ' + (
      healthStats.healthState === 'DEGRADING' ? 'tag-degrade' :
      healthStats.healthState === 'ELEVATED' ? 'tag-elevated' : 'tag-stable'
    );
  }

  // Update Chart.js instance
  if (jevState.chartInstance) {
    updateLatencyChart(jevState.chartInstance, jevState.latencyHistory, healthStats.healthState);
  }

  // 6. Probability Bars
  const pLeft = Math.round((jevState.currentProbabilities.left || 0) * 100);
  const pStay = Math.round((jevState.currentProbabilities.stay || 0) * 100);
  const pRight = Math.round((jevState.currentProbabilities.right || 0) * 100);

  if (probValLeft) probValLeft.textContent = pLeft + '%';
  if (probBarLeft) probBarLeft.style.width = pLeft + '%';
  if (probRowLeft) probRowLeft.classList.toggle('active-choice', jevState.lastAction === 'left');

  if (probValStay) probValStay.textContent = pStay + '%';
  if (probBarStay) probBarStay.style.width = pStay + '%';
  if (probRowStay) probRowStay.classList.toggle('active-choice', jevState.lastAction === 'stay');

  if (probValRight) probValRight.textContent = pRight + '%';
  if (probBarRight) probBarRight.style.width = pRight + '%';
  if (probRowRight) probRowRight.classList.toggle('active-choice', jevState.lastAction === 'right');

  // 7. Hazard Perception Map
  [0, 1, 2].forEach(lane => {
    const cell = hazardCells[lane];
    const valEl = hazardVals[lane];
    const dist = jevState.currentHazards[lane];

    if (cell && valEl) {
      cell.classList.remove('hazard-clear', 'hazard-approaching', 'hazard-critical');
      if (dist == null) {
        valEl.textContent = 'CLEAR';
        cell.classList.add('hazard-clear');
      } else if (dist < 180) {
        valEl.textContent = `DANGER (${dist}px)`;
        cell.classList.add('hazard-critical');
      } else {
        valEl.textContent = `AHEAD (${dist}px)`;
        cell.classList.add('hazard-approaching');
      }
    }
  });

  // 8. Metrics Counters
  if (jevQueryCountEl) jevQueryCountEl.textContent = jevState.queryCount;
  if (devObsEvadedEl) devObsEvadedEl.textContent = metrics.obstaclesEvaded;
}
