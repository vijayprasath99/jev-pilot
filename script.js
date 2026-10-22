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

  // Dev Stats DOM Elements
  const devStatsBtn = document.getElementById('dev-stats-btn');
  const devPanel = document.getElementById('dev-panel');
  const devPanelCloseBtn = document.getElementById('dev-panel-close-btn');
  const devStatusBadge = document.getElementById('dev-status-badge');
  const devFpsEl = document.getElementById('dev-fps');
  const devFrameTimeEl = document.getElementById('dev-frame-time');
  const devAvgFpsEl = document.getElementById('dev-avg-fps');
  const devFpsMinMaxEl = document.getElementById('dev-fps-min-max');
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
  const devObsActiveEl = document.getElementById('dev-obs-active');
  const devObsEvadedEl = document.getElementById('dev-obs-evaded');
  const devSpawnTimerEl = document.getElementById('dev-spawn-timer');
  const devSpawnIntervalEl = document.getElementById('dev-spawn-interval');
  const devLastLaneEl = document.getElementById('dev-last-lane');
  const devToggleHitboxes = document.getElementById('dev-toggle-hitboxes');
  const devToggleGodmode = document.getElementById('dev-toggle-godmode');
  const devResetHighscoreBtn = document.getElementById('dev-reset-highscore-btn');

  // JEV Autopilot AI DOM Elements
  const jevAiBtn = document.getElementById('jev-ai-btn');
  const devToggleJev = document.getElementById('dev-toggle-jev');
  const devJevStatusEl = document.getElementById('dev-jev-status');
  const devJevActionEl = document.getElementById('dev-jev-action');
  const devJevConfidenceEl = document.getElementById('dev-jev-confidence');
  const devJevIntervalEl = document.getElementById('dev-jev-interval');
  const devJevLatencyEl = document.getElementById('dev-jev-latency');
  const devJevModelEl = document.getElementById('dev-jev-model');

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

  // JEV AI Autopilot State
  let jevAutopilotActive = false;
  const jevQueryIntervalMs = 1000; // query every 1 second
  let jevTimer = null;
  let jevIsRequestInProgress = false;
  let jevLastAction = '--';
  let jevLastConfidence = null;
  let jevLastLatency = null;
  let jevModelName = 'clef-flash';

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

  function updateDevPanel(now) {
    if (!devStatsVisible) return;
    if (!now) now = performance.now();

    // 1. Performance Section
    if (devFpsEl) {
      if (state.running && !state.paused) {
        devFpsEl.textContent = currentFps;
        devFpsEl.className = 'dev-fps-value ' + (currentFps >= 50 ? 'good' : currentFps >= 30 ? 'warn' : 'bad');
        if (devFrameTimeEl) devFrameTimeEl.textContent = currentFrameTime.toFixed(1) + ' ms/f';
        const avg = fpsHistory.length ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length) : currentFps;
        if (devAvgFpsEl) devAvgFpsEl.textContent = avg + ' avg';
        if (devFpsMinMaxEl) {
          const minText = minFps === Infinity ? '--' : minFps;
          const maxText = maxFps === 0 ? '--' : maxFps;
          devFpsMinMaxEl.textContent = `Min: ${minText} | Max: ${maxText}`;
        }
      } else if (state.paused) {
        devFpsEl.textContent = 'PAUSED';
        devFpsEl.className = 'dev-fps-value warn';
        if (devFrameTimeEl) devFrameTimeEl.textContent = '0.0 ms/f';
      } else {
        devFpsEl.textContent = '--';
        devFpsEl.className = 'dev-fps-value';
        if (devFrameTimeEl) devFrameTimeEl.textContent = '-- ms/f';
        if (devAvgFpsEl) devAvgFpsEl.textContent = '-- avg';
        if (devFpsMinMaxEl) devFpsMinMaxEl.textContent = 'Min: -- | Max: --';
      }
    }

    // 2. Status Badge
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

    // 3. Game Stats Section
    if (devSpeedEl) devSpeedEl.textContent = state.speed.toFixed(2) + ' px/f';
    if (devDurationEl) devDurationEl.textContent = formatTime(getRunDurationMs());
    if (devFrameEl) devFrameEl.textContent = state.frame;
    if (devScoreEl) devScoreEl.textContent = state.score;
    if (devHighscoreEl) devHighscoreEl.textContent = highScore;

    // 4. Player Vehicle Section
    const laneLabels = ['Lane 0 (Left)', 'Lane 1 (Center)', 'Lane 2 (Right)'];
    if (devLaneEl) devLaneEl.textContent = laneLabels[state.playerLane] || `Lane ${state.playerLane}`;
    if (devPosEl) devPosEl.textContent = `${Math.round(laneCenterX(state.playerLane))}, ${PLAYER_Y}`;

    laneCells.forEach((cell, idx) => {
      if (cell) cell.classList.toggle('active', idx === state.playerLane);
    });

    // 5. Traffic & Spawning Section
    if (devObsActiveEl) devObsActiveEl.textContent = state.obstacles.length;
    if (devObsEvadedEl) devObsEvadedEl.textContent = obstaclesEvaded;
    const remainingSpawn = Math.max(0, state.spawnInterval - state.spawnTimer);
    if (devSpawnTimerEl) devSpawnTimerEl.textContent = `${remainingSpawn} / ${state.spawnInterval}f`;
    if (devSpawnIntervalEl) devSpawnIntervalEl.textContent = `${state.spawnInterval} frames`;
    if (devLastLaneEl) devLastLaneEl.textContent = state.lastLaneSpawned >= 0 ? `Lane ${state.lastLaneSpawned}` : 'None';

    // 6. JEV Autopilot AI Section
    if (devJevStatusEl) {
      if (jevAutopilotActive) {
        devJevStatusEl.textContent = jevIsRequestInProgress ? 'THINKING...' : 'ACTIVE';
        devJevStatusEl.className = 'dev-row-value dev-highlight-purple';
      } else {
        devJevStatusEl.textContent = 'INACTIVE';
        devJevStatusEl.className = 'dev-row-value';
      }
    }
    if (devJevActionEl) {
      devJevActionEl.textContent = jevLastAction.toUpperCase();
    }
    if (devJevConfidenceEl) {
      devJevConfidenceEl.textContent = typeof jevLastConfidence === 'number'
        ? Math.round(jevLastConfidence * 100) + '%'
        : '--';
    }
    if (devJevIntervalEl) {
      devJevIntervalEl.textContent = `${jevQueryIntervalMs} ms (1s)`;
    }
    if (devJevLatencyEl) {
      devJevLatencyEl.textContent = jevLastLatency != null ? `${jevLastLatency} ms` : '-- ms';
    }
    if (devJevModelEl) {
      devJevModelEl.textContent = jevModelName;
    }
  }

  function setDevStatsVisible(show) {
    devStatsVisible = show;
    if (devStatsBtn) {
      devStatsBtn.classList.toggle('active', show);
      devStatsBtn.setAttribute('aria-expanded', String(show));
    }
    if (devPanel) {
      devPanel.classList.toggle('hidden', !show);
    }

    if (show) {
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
    if (devJevStatusEl) devJevStatusEl.textContent = 'THINKING...';

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

    try {
      const res = await fetch('/api/jev/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        jevLastAction = data.action || 'stay';
        jevLastConfidence = data.confidence;
        jevLastLatency = data.latencyMs;
        if (data.model) jevModelName = data.model;

        // Apply chosen control action to the vehicle
        if (state.running && !state.paused && jevAutopilotActive) {
          if (data.action === 'left') {
            movePlayer(-1);
          } else if (data.action === 'right') {
            movePlayer(1);
          }
        }
      }
    } catch (err) {
      console.warn('JEV AI query error:', err);
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

  function setJevAutopilot(enabled) {
    jevAutopilotActive = enabled;
    if (jevAiBtn) {
      jevAiBtn.classList.toggle('active', enabled);
      jevAiBtn.setAttribute('aria-pressed', String(enabled));
    }
    if (devToggleJev) {
      devToggleJev.checked = enabled;
    }

    if (enabled) {
      startJevLoop();
    } else {
      stopJevLoop();
    }
    updateDevPanel(performance.now());
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
      if (jevAutopilotActive) startJevLoop();
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
    if (jevAutopilotActive) startJevLoop();
    requestAnimationFrame(gameLoop);
  }

  // JEV Autopilot Control Listeners
  if (jevAiBtn) {
    jevAiBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setJevAutopilot(!jevAutopilotActive);
      jevAiBtn.blur();
    });
  }

  if (devToggleJev) {
    devToggleJev.addEventListener('change', function () {
      setJevAutopilot(devToggleJev.checked);
      devToggleJev.blur();
    });
  }

  // Dev Stats Control Listeners
  if (devStatsBtn) {
    devStatsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setDevStatsVisible(!devStatsVisible);
      devStatsBtn.blur();
    });
  }

  if (devPanelCloseBtn) {
    devPanelCloseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setDevStatsVisible(false);
      devPanelCloseBtn.blur();
    });
  }

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
    // JEV Autopilot hotkey toggle (J key)
    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      setJevAutopilot(!jevAutopilotActive);
      return;
    }

    // Dev Stats hotkey toggle (` or ~ or F2)
    if (e.key === '`' || e.key === '~' || e.key === 'F2') {
      e.preventDefault();
      setDevStatsVisible(!devStatsVisible);
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
})();
