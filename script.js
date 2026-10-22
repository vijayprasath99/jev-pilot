(function () {
  "use strict";

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const CANVAS_WIDTH = canvas.width;
  const CANVAS_HEIGHT = canvas.height;
  const LANE_COUNT = 3;
  const ROAD_MARGIN = 20;
  const ROAD_WIDTH = CANVAS_WIDTH - ROAD_MARGIN * 2;
  const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

  const PLAYER_WIDTH = 50;
  const PLAYER_HEIGHT = 80;
  const PLAYER_Y = CANVAS_HEIGHT - PLAYER_HEIGHT - 20;

  const OBSTACLE_WIDTH = 50;
  const OBSTACLE_HEIGHT = 80;

  const HIGH_SCORE_KEY = 'infiniteDriver.highScore';

  const startScreen = document.getElementById('start-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const gameOverScreen = document.getElementById('game-over-screen');
  const startBtn = document.getElementById('start-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('high-score');
  const finalScoreEl = document.getElementById('final-score');
  const finalHighScoreEl = document.getElementById('final-high-score');

  // Single Unified JEV Mode Toggle Button
  const jevModeBtn = document.getElementById('jev-mode-btn');

  // Dashboard DOM Elements
  const devPanel = document.getElementById('dev-panel');
  const devPanelBody = document.getElementById('dev-panel-body');
  const devPanelCloseBtn = document.getElementById('dev-panel-close-btn');
  const devStatusBadge = document.getElementById('dev-status-badge');
  const tabSplitView = document.getElementById('tab-split-view');
  const tabJevView = document.getElementById('tab-jev-view');
  const tabGameView = document.getElementById('tab-game-view');

  // Game Engine & Performance DOM Elements
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
  const devToggleHitboxes = document.getElementById('dev-toggle-hitboxes');
  const devToggleGodmode = document.getElementById('dev-toggle-godmode');
  const devResetHighscoreBtn = document.getElementById('dev-reset-highscore-btn');

  // JEV Autopilot AI DOM Elements
  const devToggleJev = document.getElementById('dev-toggle-jev');
  const devJevStatusEl = document.getElementById('dev-jev-status');
  const devJevActionBanner = document.getElementById('dev-jev-action-banner');
  const devJevConfidenceEl = document.getElementById('dev-jev-confidence');
  const devJevLatencyEl = document.getElementById('dev-jev-latency');
  const devJevModelEl = document.getElementById('dev-jev-model');

  // JEV API Timing & Latency Degradation Elements
  const jevHealthTag = document.getElementById('jev-health-tag');
  const jevTimingCur = document.getElementById('jev-timing-cur');
  const jevTimingAvg = document.getElementById('jev-timing-avg');
  const jevTimingMin = document.getElementById('jev-timing-min');
  const jevTimingMax = document.getElementById('jev-timing-max');
  const jevLatencyTrend = document.getElementById('jev-latency-trend');
  const jevLatencyCanvas = document.getElementById('jev-latency-chart');
  const jevLatencyCtx = jevLatencyCanvas ? jevLatencyCanvas.getContext('2d') : null;

  // Probabilities DOM Elements
  const probValLeft = document.getElementById('prob-val-left');
  const probValStay = document.getElementById('prob-val-stay');
  const probValRight = document.getElementById('prob-val-right');
  const probBarLeft = document.getElementById('prob-bar-left');
  const probBarStay = document.getElementById('prob-bar-stay');
  const probBarRight = document.getElementById('prob-bar-right');
  const probRowLeft = document.getElementById('prob-row-left');
  const probRowStay = document.getElementById('prob-row-stay');
  const probRowRight = document.getElementById('prob-row-right');

  // Hazard Perception DOM Elements
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

  // JEV Tuning & Metrics DOM Elements
  const jevQueryCountEl = document.getElementById('jev-query-count');
  const devObsEvadedEl = document.getElementById('dev-obs-evaded');
  const intervalButtons = document.querySelectorAll('.interval-btn');

  function laneCenterX(laneIndex) {
    return ROAD_MARGIN + LANE_WIDTH * laneIndex + LANE_WIDTH / 2;
  }

  let highScore = 0;
  try {
    highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10) || 0;
  } catch (e) {
    highScore = 0;
  }
  highScoreEl.textContent = highScore;

  let state = {
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

  // Developer Settings and Performance Tracking
  let devStatsVisible = false;
  const devSettings = {
    showHitboxes: false,
    godMode: false
  };

  let lastFrameTime = performance.now();
  let fpsHistory = [];
  let currentFps = 60;
  let currentFrameTime = 16.6;
  let minFps = Infinity;
  let maxFps = 0;
  let runStartTime = null;
  let runPauseStartTime = null;
  let totalPausedDuration = 0;
  let obstaclesEvaded = 0;
  let lastDevDomUpdate = 0;
  let devIdleInterval = null;

  // Unified JEV Mode State (Autopilot + Telemetry Dashboard)
  let jevModeActive = false;
  let jevAutopilotActive = false;
  let jevQueryIntervalMs = 1000; // default 1 second
  let jevTimer = null;
  let jevIsRequestInProgress = false;
  let jevLastAction = '--';
  let jevLastConfidence = null;
  let jevLastLatency = null;
  let jevModelName = 'clef-flash';
  let jevQueryCount = 0;
  let jevCurrentProbabilities = { left: 0, stay: 0, right: 0 };
  let jevCurrentHazards = { 0: null, 1: null, 2: null };
  let jevLatencyHistory = []; // stores recent API query latency in ms (max 30 items)
  let jevHealthState = 'STABLE';

  // Fetch initial config from server
  fetch('/api/jev/config')
    .then(res => res.json())
    .then(cfg => {
      if (cfg && cfg.model) {
        jevModelName = cfg.model;
        if (devJevModelEl) devJevModelEl.textContent = jevModelName;
      }
    })
    .catch(() => {});

  function getRunDurationMs() {
    if (!runStartTime) return 0;
    const now = (state.paused && runPauseStartTime) ? runPauseStartTime : performance.now();
    return Math.max(0, now - runStartTime - totalPausedDuration);
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  // Draw JEV API Latency & Degradation Trend Chart
  function drawLatencyChart() {
    if (!jevLatencyCanvas || !jevLatencyCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = jevLatencyCanvas.getBoundingClientRect();
    const displayW = Math.round(rect.width) || 440;
    const displayH = Math.round(rect.height) || 46;

    if (jevLatencyCanvas.width !== displayW * dpr || jevLatencyCanvas.height !== displayH * dpr) {
      jevLatencyCanvas.width = displayW * dpr;
      jevLatencyCanvas.height = displayH * dpr;
    }

    jevLatencyCtx.save();
    jevLatencyCtx.scale(dpr, dpr);
    jevLatencyCtx.clearRect(0, 0, displayW, displayH);

    const SLA_THRESHOLD = 500; // 500ms SLA degradation line
    const padTop = 6;
    const padBottom = 12;
    const padLeft = 8;
    const padRight = 8;
    const plotH = displayH - padTop - padBottom;
    const plotW = displayW - padLeft - padRight;

    if (jevLatencyHistory.length === 0) {
      jevLatencyCtx.fillStyle = '#64748b';
      jevLatencyCtx.font = '9.5px "Chakra Petch", monospace';
      jevLatencyCtx.textAlign = 'center';
      jevLatencyCtx.textBaseline = 'middle';
      jevLatencyCtx.fillText('Awaiting JEV API queries...', displayW / 2, displayH / 2);
      jevLatencyCtx.restore();
      return;
    }

    const maxVal = Math.max(SLA_THRESHOLD + 40, ...jevLatencyHistory);
    const maxY = Math.ceil(maxVal / 50) * 50;

    const getY = (val) => displayH - padBottom - (Math.min(val, maxY) / maxY) * plotH;
    const getX = (index, total) => padLeft + (index / Math.max(total - 1, 1)) * plotW;

    // 1. Subtle 250ms reference guideline
    if (maxY > 250) {
      const y250 = getY(250);
      jevLatencyCtx.beginPath();
      jevLatencyCtx.setLineDash([2, 4]);
      jevLatencyCtx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      jevLatencyCtx.lineWidth = 1;
      jevLatencyCtx.moveTo(padLeft, y250);
      jevLatencyCtx.lineTo(displayW - padRight, y250);
      jevLatencyCtx.stroke();
      jevLatencyCtx.setLineDash([]);
    }

    // 2. Dashed 500ms SLA threshold line
    const y500 = getY(SLA_THRESHOLD);
    jevLatencyCtx.beginPath();
    jevLatencyCtx.setLineDash([3, 3]);
    jevLatencyCtx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    jevLatencyCtx.lineWidth = 1;
    jevLatencyCtx.moveTo(padLeft, y500);
    jevLatencyCtx.lineTo(displayW - padRight, y500);
    jevLatencyCtx.stroke();
    jevLatencyCtx.setLineDash([]);

    const count = jevLatencyHistory.length;

    // 3. Smooth Area Gradient Fill under line
    jevLatencyCtx.beginPath();
    jevLatencyCtx.moveTo(getX(0, count), getY(jevLatencyHistory[0]));
    for (let i = 1; i < count; i++) {
      jevLatencyCtx.lineTo(getX(i, count), getY(jevLatencyHistory[i]));
    }
    jevLatencyCtx.lineTo(getX(count - 1, count), displayH - padBottom);
    jevLatencyCtx.lineTo(getX(0, count), displayH - padBottom);
    jevLatencyCtx.closePath();

    const areaGrad = jevLatencyCtx.createLinearGradient(0, padTop, 0, displayH - padBottom);
    if (jevHealthState === 'DEGRADING') {
      areaGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
      areaGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    } else if (jevHealthState === 'ELEVATED') {
      areaGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
      areaGrad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');
    } else {
      areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    }
    jevLatencyCtx.fillStyle = areaGrad;
    jevLatencyCtx.fill();

    // 4. Stroke line with neon glow
    jevLatencyCtx.save();
    jevLatencyCtx.beginPath();
    jevLatencyCtx.moveTo(getX(0, count), getY(jevLatencyHistory[0]));
    for (let i = 1; i < count; i++) {
      jevLatencyCtx.lineTo(getX(i, count), getY(jevLatencyHistory[i]));
    }

    if (jevHealthState === 'DEGRADING') {
      jevLatencyCtx.strokeStyle = '#f87171';
      jevLatencyCtx.shadowColor = '#ef4444';
    } else if (jevHealthState === 'ELEVATED') {
      jevLatencyCtx.strokeStyle = '#fbbf24';
      jevLatencyCtx.shadowColor = '#f59e0b';
    } else {
      jevLatencyCtx.strokeStyle = '#38bdf8';
      jevLatencyCtx.shadowColor = '#0284c7';
    }
    jevLatencyCtx.shadowBlur = 6;
    jevLatencyCtx.lineWidth = 2;
    jevLatencyCtx.stroke();
    jevLatencyCtx.restore();

    // 5. Data Points
    for (let i = 0; i < count; i++) {
      const px = getX(i, count);
      const py = getY(jevLatencyHistory[i]);
      const val = jevLatencyHistory[i];
      const isLatest = (i === count - 1);

      jevLatencyCtx.beginPath();
      const r = isLatest ? 3.5 : 2;
      jevLatencyCtx.arc(px, py, r, 0, Math.PI * 2);

      if (val >= SLA_THRESHOLD) {
        jevLatencyCtx.fillStyle = '#ef4444';
      } else if (val >= 350) {
        jevLatencyCtx.fillStyle = '#fbbf24';
      } else {
        jevLatencyCtx.fillStyle = '#38bdf8';
      }
      jevLatencyCtx.fill();

      if (isLatest) {
        // Inner white dot
        jevLatencyCtx.beginPath();
        jevLatencyCtx.arc(px, py, 1.5, 0, Math.PI * 2);
        jevLatencyCtx.fillStyle = '#ffffff';
        jevLatencyCtx.fill();

        // Outer glow ring
        jevLatencyCtx.beginPath();
        jevLatencyCtx.arc(px, py, 6, 0, Math.PI * 2);
        jevLatencyCtx.strokeStyle = val >= SLA_THRESHOLD ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.7)';
        jevLatencyCtx.lineWidth = 1.2;
        jevLatencyCtx.stroke();
      }
    }

    jevLatencyCtx.restore();
  }

  function updateDevPanel(now) {
    if (!devStatsVisible) return;
    if (!now) now = performance.now();

    // 1. Performance & Game State Badge
    if (devFpsEl) {
      if (state.running && !state.paused) {
        devFpsEl.textContent = currentFps;
        devFpsEl.className = 'dev-fps-value ' + (currentFps >= 50 ? 'good' : currentFps >= 30 ? 'warn' : 'bad');
        if (devFrameTimeEl) devFrameTimeEl.textContent = currentFrameTime.toFixed(1) + ' ms/f';
        const avg = fpsHistory.length ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length) : currentFps;
        if (devAvgFpsEl) devAvgFpsEl.textContent = avg + ' avg';
      } else if (state.paused) {
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
      if (state.running && !state.paused) {
        devStatusBadge.textContent = 'RUNNING';
        devStatusBadge.className = 'dev-badge badge-running';
      } else if (state.paused) {
        devStatusBadge.textContent = 'PAUSED';
        devStatusBadge.className = 'dev-badge badge-paused';
      } else if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
        devStatusBadge.textContent = 'GAME OVER';
        devStatusBadge.className = 'dev-badge badge-gameover';
      } else {
        devStatusBadge.textContent = 'READY';
        devStatusBadge.className = 'dev-badge badge-idle';
      }
    }

    // 2. Game Engine Section
    if (devSpeedEl) devSpeedEl.textContent = state.speed.toFixed(2) + ' px/f';
    if (devDurationEl) devDurationEl.textContent = formatTime(getRunDurationMs());
    if (devFrameEl) devFrameEl.textContent = state.frame;
    if (devScoreEl) devScoreEl.textContent = state.score;
    if (devHighscoreEl) devHighscoreEl.textContent = highScore;

    // 3. Player Vehicle Section
    if (devLaneEl) devLaneEl.textContent = `Lane ${state.playerLane}`;
    if (devPosEl) devPosEl.textContent = `${Math.round(laneCenterX(state.playerLane))}, ${PLAYER_Y}`;

    laneCells.forEach((cell, idx) => {
      if (cell) cell.classList.toggle('active', idx === state.playerLane);
    });

    // 4. JEV Autopilot AI Hero & Telemetry
    if (devJevStatusEl) {
      if (jevModeActive) {
        devJevStatusEl.textContent = jevIsRequestInProgress ? 'THINKING...' : 'ACTIVE';
        devJevStatusEl.className = 'dev-badge badge-running';
      } else {
        devJevStatusEl.textContent = 'INACTIVE';
        devJevStatusEl.className = 'dev-badge badge-idle';
      }
    }

    if (devJevActionBanner) {
      if (jevLastAction === 'left') {
        devJevActionBanner.textContent = '← STEER LEFT';
        devJevActionBanner.className = 'jev-decision-value action-left';
      } else if (jevLastAction === 'right') {
        devJevActionBanner.textContent = 'STEER RIGHT →';
        devJevActionBanner.className = 'jev-decision-value action-right';
      } else if (jevLastAction === 'stay') {
        devJevActionBanner.textContent = '• MAINTAIN LANE';
        devJevActionBanner.className = 'jev-decision-value action-stay';
      } else {
        devJevActionBanner.textContent = '--';
        devJevActionBanner.className = 'jev-decision-value';
      }
    }

    if (devJevConfidenceEl) {
      devJevConfidenceEl.textContent = typeof jevLastConfidence === 'number'
        ? Math.round(jevLastConfidence * 100) + '%'
        : '--';
    }
    if (devJevLatencyEl) {
      devJevLatencyEl.textContent = jevLastLatency != null ? `${jevLastLatency} ms` : '-- ms';
    }
    if (devJevModelEl) {
      devJevModelEl.textContent = jevModelName;
    }

    // 4b. JEV API Latency History, Health & Degradation Analysis
    if (jevLatencyHistory.length > 0) {
      const cur = jevLatencyHistory[jevLatencyHistory.length - 1];
      const min = Math.min(...jevLatencyHistory);
      const max = Math.max(...jevLatencyHistory);
      const avg = Math.round(jevLatencyHistory.reduce((a, b) => a + b, 0) / jevLatencyHistory.length);

      if (jevTimingCur) jevTimingCur.textContent = cur + 'ms';
      if (jevTimingAvg) jevTimingAvg.textContent = avg + 'ms';
      if (jevTimingMin) jevTimingMin.textContent = min + 'ms';
      if (jevTimingMax) jevTimingMax.textContent = max + 'ms';

      // Trend and Degradation Detection
      let trendText = 'Steady';
      if (jevLatencyHistory.length >= 4) {
        const recentSlice = jevLatencyHistory.slice(-3);
        const olderSlice = jevLatencyHistory.slice(0, -3);
        const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
        const olderAvg = olderSlice.reduce((a, b) => a + b, 0) / olderSlice.length;
        const diff = Math.round(recentAvg - olderAvg);

        if (diff > 35) {
          trendText = `▲ +${diff}ms (Slowing)`;
        } else if (diff < -35) {
          trendText = `▼ ${diff}ms (Faster)`;
        } else {
          trendText = '→ Steady';
        }

        // Degradation criteria:
        // 1. Recent latency average exceeds 500ms SLA
        // 2. Or single latency spike > 650ms
        // 3. Or recent queries are > 1.4x higher than older baseline and > 350ms
        if (recentAvg > 500 || cur > 650 || (recentAvg > 350 && recentAvg > 1.4 * olderAvg)) {
          jevHealthState = 'DEGRADING';
        } else if (recentAvg > 320 || cur > 400) {
          jevHealthState = 'ELEVATED';
        } else {
          jevHealthState = 'STABLE';
        }
      } else {
        if (cur > 500) {
          jevHealthState = 'DEGRADING';
        } else if (cur > 320) {
          jevHealthState = 'ELEVATED';
        } else {
          jevHealthState = 'STABLE';
        }
      }

      if (jevLatencyTrend) jevLatencyTrend.textContent = 'Trend: ' + trendText;
      if (jevHealthTag) {
        jevHealthTag.textContent = jevHealthState;
        jevHealthTag.className = 'health-tag ' + (
          jevHealthState === 'DEGRADING' ? 'tag-degrade' :
          jevHealthState === 'ELEVATED' ? 'tag-elevated' : 'tag-stable'
        );
      }
    } else {
      if (jevTimingCur) jevTimingCur.textContent = '--';
      if (jevTimingAvg) jevTimingAvg.textContent = '--';
      if (jevTimingMin) jevTimingMin.textContent = '--';
      if (jevTimingMax) jevTimingMax.textContent = '--';
      if (jevLatencyTrend) jevLatencyTrend.textContent = 'Trend: --';
      if (jevHealthTag) {
        jevHealthTag.textContent = 'STABLE';
        jevHealthTag.className = 'health-tag tag-stable';
      }
    }

    drawLatencyChart();

    // 5. JEV Probabilities Breakdown
    const pLeft = Math.round((jevCurrentProbabilities.left || 0) * 100);
    const pStay = Math.round((jevCurrentProbabilities.stay || 0) * 100);
    const pRight = Math.round((jevCurrentProbabilities.right || 0) * 100);

    if (probValLeft) probValLeft.textContent = pLeft + '%';
    if (probBarLeft) probBarLeft.style.width = pLeft + '%';
    if (probRowLeft) probRowLeft.classList.toggle('active-choice', jevLastAction === 'left');

    if (probValStay) probValStay.textContent = pStay + '%';
    if (probBarStay) probBarStay.style.width = pStay + '%';
    if (probRowStay) probRowStay.classList.toggle('active-choice', jevLastAction === 'stay');

    if (probValRight) probValRight.textContent = pRight + '%';
    if (probBarRight) probBarRight.style.width = pRight + '%';
    if (probRowRight) probRowRight.classList.toggle('active-choice', jevLastAction === 'right');

    // 6. Road Hazard Perception Map
    [0, 1, 2].forEach(lane => {
      const cell = hazardCells[lane];
      const valEl = hazardVals[lane];
      const dist = jevCurrentHazards[lane];

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

    // 7. JEV Counters
    if (jevQueryCountEl) jevQueryCountEl.textContent = jevQueryCount;
    if (devObsEvadedEl) devObsEvadedEl.textContent = obstaclesEvaded;
  }

  function setDashboardView(viewMode) {
    if (!devPanelBody) return;
    devPanelBody.classList.remove('view-split', 'view-jev', 'view-game');
    devPanelBody.classList.add('view-' + viewMode);

    if (tabSplitView) tabSplitView.classList.toggle('active', viewMode === 'split');
    if (tabJevView) tabJevView.classList.toggle('active', viewMode === 'jev');
    if (tabGameView) tabGameView.classList.toggle('active', viewMode === 'game');
  }

  // Unified JEV Mode: Activates Autopilot AND opens the telemetry dashboard side-by-side
  function setJevMode(enabled) {
    jevModeActive = enabled;
    jevAutopilotActive = enabled;
    devStatsVisible = enabled;

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
    const gameWrapper = document.getElementById('game-wrapper');
    if (gameWrapper) {
      gameWrapper.classList.toggle('dev-open', enabled);
    }

    if (enabled) {
      startJevLoop();
      updateDevPanel(performance.now());
      if (!state.running || state.paused) {
        if (!devIdleInterval) {
          devIdleInterval = setInterval(() => {
            if (!state.running || state.paused) {
              updateDevPanel(performance.now());
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

  // JEV Autopilot Loop and Querying
  async function queryJevAi() {
    if (jevIsRequestInProgress) return;
    if (!state.running || state.paused) return;

    jevIsRequestInProgress = true;
    if (devJevStatusEl) {
      devJevStatusEl.textContent = 'THINKING...';
      devJevStatusEl.className = 'dev-badge badge-paused';
    }

    // Gather oncoming obstacles ahead of car
    const obstaclesAhead = state.obstacles
      .filter(obs => obs.y < PLAYER_Y + PLAYER_HEIGHT)
      .map(obs => ({
        lane: obs.lane,
        y: Math.round(obs.y),
        distance: Math.round(PLAYER_Y - obs.y)
      }));

    const payload = {
      playerLane: state.playerLane,
      speed: state.speed,
      score: state.score,
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
        jevQueryCount++;
        jevLastAction = data.action || 'stay';
        jevLastConfidence = data.confidence;
        jevLastLatency = data.latencyMs;

        if (typeof data.latencyMs === 'number') {
          jevLatencyHistory.push(data.latencyMs);
          if (jevLatencyHistory.length > 30) jevLatencyHistory.shift();
        }

        if (data.model) jevModelName = data.model;
        if (data.probabilities) jevCurrentProbabilities = data.probabilities;
        if (data.laneDistance) jevCurrentHazards = data.laneDistance;

        // Apply chosen control action to the vehicle
        if (state.running && !state.paused && jevAutopilotActive) {
          if (data.action === 'left') {
            movePlayer(-1);
          } else if (data.action === 'right') {
            movePlayer(1);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const latency = typeof errData.latencyMs === 'number'
          ? errData.latencyMs
          : Math.round(performance.now() - fetchStart);
        jevLastLatency = latency;
        jevLatencyHistory.push(latency);
        if (jevLatencyHistory.length > 30) jevLatencyHistory.shift();
      }
    } catch (err) {
      console.warn('JEV AI query error:', err);
      const elapsed = Math.round(performance.now() - fetchStart);
      jevLastLatency = elapsed;
      jevLatencyHistory.push(elapsed);
      if (jevLatencyHistory.length > 30) jevLatencyHistory.shift();
    } finally {
      jevIsRequestInProgress = false;
      updateDevPanel(performance.now());
    }
  }

  function startJevLoop() {
    if (jevTimer) return;
    if (state.running && !state.paused) {
      queryJevAi();
    }
    jevTimer = setInterval(() => {
      if (state.running && !state.paused && jevAutopilotActive) {
        queryJevAi();
      }
    }, jevQueryIntervalMs);
  }

  function stopJevLoop() {
    if (jevTimer) {
      clearInterval(jevTimer);
      jevTimer = null;
    }
  }

  function resetState() {
    state.running = true;
    state.paused = false;
    state.playerLane = 1;
    state.obstacles = [];
    state.score = 0;
    state.speed = 4;
    state.spawnTimer = 0;
    state.spawnInterval = 70;
    state.roadLineOffset = 0;
    state.frame = 0;
    state.lastLaneSpawned = -1;
    scoreEl.textContent = '0';

    // Reset tracking counters
    obstaclesEvaded = 0;
    runStartTime = performance.now();
    runPauseStartTime = null;
    totalPausedDuration = 0;
    minFps = Infinity;
    maxFps = 0;
    fpsHistory = [];
  }

  function movePlayer(direction) {
    if (!state.running) return;
    const newLane = state.playerLane + direction;
    if (newLane >= 0 && newLane < LANE_COUNT) {
      state.playerLane = newLane;
      if (devStatsVisible) {
        updateDevPanel(performance.now());
      }
    }
  }

  function spawnObstacle() {
    let lane;
    do {
      lane = Math.floor(Math.random() * LANE_COUNT);
    } while (lane === state.lastLaneSpawned && Math.random() < 0.6);
    state.lastLaneSpawned = lane;

    state.obstacles.push({
      lane: lane,
      y: -OBSTACLE_HEIGHT,
      color: ['#e63946', '#2a9d8f', '#457b9d', '#e76f51'][Math.floor(Math.random() * 4)]
    });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function checkCollisions() {
    const playerX = laneCenterX(state.playerLane) - PLAYER_WIDTH / 2;
    for (let i = 0; i < state.obstacles.length; i++) {
      const obs = state.obstacles[i];
      const obsX = laneCenterX(obs.lane) - OBSTACLE_WIDTH / 2;
      if (rectsOverlap(playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, obsX, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT)) {
        return true;
      }
    }
    return false;
  }

  function endGame() {
    state.running = false;
    state.paused = false;
    stopJevLoop();

    if (pauseScreen) pauseScreen.classList.add('hidden');

    if (state.score > highScore) {
      highScore = state.score;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
      } catch (e) { /* ignore storage errors */ }
    }

    highScoreEl.textContent = highScore;
    finalScoreEl.textContent = state.score;
    finalHighScoreEl.textContent = highScore;
    gameOverScreen.classList.remove('hidden');

    if (devStatsVisible) {
      updateDevPanel(performance.now());
    }
  }

  function drawRoad() {
    ctx.fillStyle = '#333';
    ctx.fillRect(ROAD_MARGIN, 0, ROAD_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#f4d35e';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);

    for (let i = 1; i < LANE_COUNT; i++) {
      const x = ROAD_MARGIN + LANE_WIDTH * i;
      ctx.beginPath();
      ctx.moveTo(x, state.roadLineOffset - 40);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(ROAD_MARGIN, 0, ROAD_WIDTH, CANVAS_HEIGHT);
  }

  function drawCarShape(x, y, w, h, bodyColor, windowColor) {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = windowColor;
    ctx.fillRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.25);
    ctx.fillRect(x + w * 0.15, y + h * 0.65, w * 0.7, h * 0.25);

    ctx.fillStyle = '#111';
    ctx.fillRect(x - 4, y + h * 0.15, 4, h * 0.2);
    ctx.fillRect(x + w, y + h * 0.15, 4, h * 0.2);
    ctx.fillRect(x - 4, y + h * 0.65, 4, h * 0.2);
    ctx.fillRect(x + w, y + h * 0.65, 4, h * 0.2);
  }

  function drawPlayer() {
    const x = laneCenterX(state.playerLane) - PLAYER_WIDTH / 2;
    drawCarShape(x, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, '#3a86ff', '#cfe8ff');

    // JEV AI Autopilot visual aura (subtle futuristic purple outline)
    if (jevAutopilotActive) {
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x - 3, PLAYER_Y - 3, PLAYER_WIDTH + 6, PLAYER_HEIGHT + 6);
      ctx.fillStyle = '#c084fc';
      ctx.font = '9px "Chakra Petch", monospace';
      ctx.fillText('🤖 JEV', x + PLAYER_WIDTH - 24, PLAYER_Y - 5);
      ctx.restore();
    }

    // God Mode visual shield aura
    if (devSettings.godMode) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x - 6, PLAYER_Y - 6, PLAYER_WIDTH + 12, PLAYER_HEIGHT + 12);
      ctx.restore();
    }

    // Hitbox visualization overlay
    if (devSettings.showHitboxes) {
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT);
      ctx.fillStyle = '#10b981';
      ctx.font = '10px "Chakra Petch", monospace';
      ctx.fillText(`PLAYER (L${state.playerLane})`, x, PLAYER_Y - 14);
      ctx.restore();
    }
  }

  function drawObstacles() {
    state.obstacles.forEach(function (obs, i) {
      const x = laneCenterX(obs.lane) - OBSTACLE_WIDTH / 2;
      drawCarShape(x, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, obs.color, '#222');

      // Hitbox visualization overlay
      if (devSettings.showHitboxes) {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px "Chakra Petch", monospace';
        ctx.fillText(`OBS #${i + 1} (L${obs.lane})`, x, obs.y - 6);
        ctx.restore();
      }
    });
  }

  function update() {
    state.frame++;
    state.roadLineOffset = (state.roadLineOffset + state.speed) % 40;

    state.spawnTimer++;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      spawnObstacle();
    }

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      state.obstacles[i].y += state.speed;
      if (state.obstacles[i].y > CANVAS_HEIGHT) {
        state.obstacles.splice(i, 1);
        obstaclesEvaded++;
      }
    }

    if (checkCollisions()) {
      if (devSettings.godMode) {
        // God Mode active: bypass crash
      } else {
        endGame();
        return;
      }
    }

    state.score += 1;
    scoreEl.textContent = state.score;

    if (state.score % 300 === 0) {
      state.speed += 0.5;
      if (state.spawnInterval > 30) {
        state.spawnInterval -= 3;
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawRoad();
    drawObstacles();
    drawPlayer();
  }

  function gameLoop(timestamp) {
    if (!timestamp) timestamp = performance.now();
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (delta > 0 && delta < 1000) {
      currentFrameTime = delta;
      const instantFps = 1000 / delta;
      fpsHistory.push(instantFps);
      if (fpsHistory.length > 30) fpsHistory.shift();

      const avg = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
      currentFps = Math.round(avg);

      if (state.running && !state.paused && state.frame > 20) {
        if (currentFps < minFps) minFps = currentFps;
        if (currentFps > maxFps) maxFps = currentFps;
      }
    }

    if (state.running && !state.paused) {
      update();
      render();

      if (devStatsVisible && (timestamp - lastDevDomUpdate > 100)) {
        updateDevPanel(timestamp);
        lastDevDomUpdate = timestamp;
      }

      requestAnimationFrame(gameLoop);
    } else {
      render();
      if (devStatsVisible) {
        updateDevPanel(timestamp);
      }
    }
  }

  function togglePause() {
    if (!state.running) return;

    state.paused = !state.paused;
    if (state.paused) {
      runPauseStartTime = performance.now();
      stopJevLoop();
      if (pauseScreen) pauseScreen.classList.remove('hidden');
      if (devStatsVisible) updateDevPanel(performance.now());
    } else {
      if (runPauseStartTime) {
        totalPausedDuration += performance.now() - runPauseStartTime;
        runPauseStartTime = null;
      }
      lastFrameTime = performance.now();
      if (pauseScreen) pauseScreen.classList.add('hidden');
      if (devStatsVisible) updateDevPanel(performance.now());
      if (jevModeActive) startJevLoop();
      requestAnimationFrame(gameLoop);
    }
  }

  function startGame() {
    if (startScreen) startScreen.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    resetState();
    render();
    lastFrameTime = performance.now();
    if (devStatsVisible) updateDevPanel(performance.now());
    if (jevModeActive) startJevLoop();
    requestAnimationFrame(gameLoop);
  }

  // Unified JEV Mode Control Listeners
  if (jevModeBtn) {
    jevModeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setJevMode(!jevModeActive);
      jevModeBtn.blur();
    });
  }

  if (devToggleJev) {
    devToggleJev.addEventListener('change', function () {
      setJevMode(devToggleJev.checked);
      devToggleJev.blur();
    });
  }

  if (devPanelCloseBtn) {
    devPanelCloseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setJevMode(false);
      devPanelCloseBtn.blur();
    });
  }

  // Dashboard View Tab Switchers
  if (tabSplitView) tabSplitView.addEventListener('click', () => setDashboardView('split'));
  if (tabJevView) tabJevView.addEventListener('click', () => setDashboardView('jev'));
  if (tabGameView) tabGameView.addEventListener('click', () => setDashboardView('game'));

  // Interval Picker Buttons
  intervalButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const ms = parseInt(this.dataset.ms, 10);
      if (ms) {
        jevQueryIntervalMs = ms;
        intervalButtons.forEach(b => b.classList.toggle('active', b === this));
        if (jevModeActive) {
          stopJevLoop();
          startJevLoop();
        }
      }
    });
  });

  // Tools Control Listeners
  if (devToggleHitboxes) {
    devToggleHitboxes.addEventListener('change', function () {
      devSettings.showHitboxes = devToggleHitboxes.checked;
      render();
      devToggleHitboxes.blur();
    });
  }

  if (devToggleGodmode) {
    devToggleGodmode.addEventListener('change', function () {
      devSettings.godMode = devToggleGodmode.checked;
      render();
      devToggleGodmode.blur();
    });
  }

  if (devResetHighscoreBtn) {
    devResetHighscoreBtn.addEventListener('click', function () {
      highScore = 0;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, '0');
      } catch (e) {}
      highScoreEl.textContent = '0';
      finalHighScoreEl.textContent = '0';
      if (devHighscoreEl) devHighscoreEl.textContent = '0';
      devResetHighscoreBtn.blur();
    });
  }

  document.addEventListener('keydown', function (e) {
    // Single Unified JEV Mode hotkey toggle (J key or Backtick/~)
    if (e.key === 'j' || e.key === 'J' || e.key === '`' || e.key === '~') {
      e.preventDefault();
      setJevMode(!jevModeActive);
      return;
    }

    // Ignore game keys if the focus is on an input or button inside dev panel
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') && e.target.closest('#dev-panel')) {
      return;
    }

    if (startScreen && !startScreen.classList.contains('hidden')) {
      startGame();
      return;
    }

    if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space' || e.key === 'p' || e.key === 'P' || e.key === 'Pause') {
      if (state.running) {
        e.preventDefault();
        togglePause();
        return;
      }
    }

    if (!state.running || state.paused) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        movePlayer(-1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        movePlayer(1);
        break;
    }
  });

  if (startBtn) startBtn.addEventListener('click', startGame);
  if (restartBtn) restartBtn.addEventListener('click', startGame);
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

  render();
  updateDevPanel(performance.now());

  // Auto-activate JEV if specified in URL query params
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('start') === 'true') {
      startGame();
    }
    if (params.get('autojev') === 'true' || params.get('jev') === 'true') {
      setJevMode(true);
    }
  } catch (e) {}
})();
