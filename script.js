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
  }

  function movePlayer(direction) {
    if (!state.running) return;
    const newLane = state.playerLane + direction;
    if (newLane >= 0 && newLane < LANE_COUNT) {
      state.playerLane = newLane;
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
  }

  function drawObstacles() {
    state.obstacles.forEach(function (obs) {
      const x = laneCenterX(obs.lane) - OBSTACLE_WIDTH / 2;
      drawCarShape(x, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, obs.color, '#222');
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
      }
    }

    if (checkCollisions()) {
      endGame();
      return;
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

  function gameLoop() {
    if (state.running && !state.paused) {
      update();
      render();
      requestAnimationFrame(gameLoop);
    } else {
      render();
    }
  }

  function togglePause() {
    if (!state.running) return;

    state.paused = !state.paused;
    if (state.paused) {
      if (pauseScreen) pauseScreen.classList.remove('hidden');
    } else {
      if (pauseScreen) pauseScreen.classList.add('hidden');
      requestAnimationFrame(gameLoop);
    }
  }

  function startGame() {
    if (startScreen) startScreen.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    resetState();
    render();
    requestAnimationFrame(gameLoop);
  }

  document.addEventListener('keydown', function (e) {
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
})();
