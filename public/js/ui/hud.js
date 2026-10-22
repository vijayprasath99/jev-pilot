const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score');
const finalHighScoreEl = document.getElementById('final-high-score');

const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');

export function updateHud(score, highScore) {
  if (scoreEl) scoreEl.textContent = score;
  if (highScoreEl) highScoreEl.textContent = highScore;
}

export function showGameOver(score, highScore) {
  if (finalScoreEl) finalScoreEl.textContent = score;
  if (finalHighScoreEl) finalHighScoreEl.textContent = highScore;
  if (gameOverScreen) gameOverScreen.classList.remove('hidden');
  if (pauseScreen) pauseScreen.classList.add('hidden');
}

export function showPauseScreen(show) {
  if (pauseScreen) {
    pauseScreen.classList.toggle('hidden', !show);
  }
}

export function hideAllOverlays() {
  if (startScreen) startScreen.classList.add('hidden');
  if (pauseScreen) pauseScreen.classList.add('hidden');
  if (gameOverScreen) gameOverScreen.classList.add('hidden');
}

export function isStartScreenVisible() {
  return startScreen && !startScreen.classList.contains('hidden');
}
