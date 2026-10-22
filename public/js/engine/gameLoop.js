import { CANVAS_WIDTH, CANVAS_HEIGHT, HIGH_SCORE_KEY } from '../config/constants.js';
import { gameState, devSettings, metrics, jevState, resetGameState } from '../state/gameState.js';
import { drawRoad } from '../entities/road.js';
import { drawPlayer, movePlayer } from '../entities/player.js';
import { spawnObstacle, updateObstacles, drawObstacles } from '../entities/obstacle.js';
import { checkCollisions } from './physics.js';
import { updateHud, showGameOver, showPauseScreen, hideAllOverlays } from '../ui/hud.js';
import { updateDevPanel } from '../ui/devPanel.js';
import { startJevLoop, stopJevLoop, queryJevAi } from '../jev/jevClient.js';

let canvas = null;
let ctx = null;

export function initGameLoop(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
}

export function handlePlayerMove(direction) {
  const moved = movePlayer(direction, gameState);
  if (moved) {
    render();
    if (devSettings.statsVisible) {
      updateDevPanel();
    }
  }
}

export function render() {
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawRoad(ctx, gameState.roadLineOffset);
  drawObstacles(ctx, gameState.obstacles, devSettings.showHitboxes);
  drawPlayer(ctx, gameState.playerLane, jevState.autopilotActive, devSettings);
}

function update() {
  gameState.frame++;
  gameState.roadLineOffset = (gameState.roadLineOffset + gameState.speed) % 40;

  gameState.spawnTimer++;
  if (gameState.spawnTimer >= gameState.spawnInterval) {
    gameState.spawnTimer = 0;
    spawnObstacle(gameState);
  }

  updateObstacles(gameState, CANVAS_HEIGHT, () => {
    metrics.obstaclesEvaded++;
  });

  if (checkCollisions(gameState.playerLane, gameState.obstacles)) {
    if (!devSettings.godMode) {
      endGame();
      return;
    }
  }

  gameState.score += 1;
  updateHud(gameState.score, metrics.highScore);

  if (gameState.score % 300 === 0) {
    gameState.speed += 0.5;
    if (gameState.spawnInterval > 30) {
      gameState.spawnInterval -= 3;
    }
  }
}

export function gameLoop(timestamp = performance.now()) {
  const delta = timestamp - metrics.lastFrameTime;
  metrics.lastFrameTime = timestamp;

  if (delta > 0 && delta < 1000) {
    metrics.currentFrameTime = delta;
    const instantFps = 1000 / delta;
    metrics.fpsHistory.push(instantFps);
    if (metrics.fpsHistory.length > 30) metrics.fpsHistory.shift();

    const avg = metrics.fpsHistory.reduce((a, b) => a + b, 0) / metrics.fpsHistory.length;
    metrics.currentFps = Math.round(avg);

    if (gameState.running && !gameState.paused && gameState.frame > 20) {
      if (metrics.currentFps < metrics.minFps) metrics.minFps = metrics.currentFps;
      if (metrics.currentFps > metrics.maxFps) metrics.maxFps = metrics.currentFps;
    }
  }

  if (gameState.running && !gameState.paused) {
    update();
    render();

    if (devSettings.statsVisible && (timestamp - metrics.lastDevDomUpdate > 100)) {
      updateDevPanel(timestamp);
      metrics.lastDevDomUpdate = timestamp;
    }

    requestAnimationFrame(gameLoop);
  } else {
    render();
    if (devSettings.statsVisible) {
      updateDevPanel(timestamp);
    }
  }
}

export function startGame() {
  hideAllOverlays();
  resetGameState();
  render();
  metrics.lastFrameTime = performance.now();
  if (devSettings.statsVisible) updateDevPanel();

  if (jevState.modeActive && jevState.autopilotActive) {
    startJevLoop(handlePlayerMove);
  }
  requestAnimationFrame(gameLoop);
}

export function togglePause() {
  if (!gameState.running) return;

  gameState.paused = !gameState.paused;
  if (gameState.paused) {
    metrics.runPauseStartTime = performance.now();
    stopJevLoop();
    showPauseScreen(true);
    if (devSettings.statsVisible) updateDevPanel();
  } else {
    if (metrics.runPauseStartTime) {
      metrics.totalPausedDuration += performance.now() - metrics.runPauseStartTime;
      metrics.runPauseStartTime = null;
    }
    metrics.lastFrameTime = performance.now();
    showPauseScreen(false);
    if (devSettings.statsVisible) updateDevPanel();
    if (jevState.modeActive && jevState.autopilotActive) {
      startJevLoop(handlePlayerMove);
    }
    requestAnimationFrame(gameLoop);
  }
}

export function endGame() {
  gameState.running = false;
  gameState.paused = false;
  stopJevLoop();

  if (gameState.score > metrics.highScore) {
    metrics.highScore = gameState.score;
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(metrics.highScore));
    } catch (e) {}
  }

  showGameOver(gameState.score, metrics.highScore);
  updateHud(gameState.score, metrics.highScore);

  if (devSettings.statsVisible) {
    updateDevPanel();
  }
}
