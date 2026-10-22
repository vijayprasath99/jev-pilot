import { HIGH_SCORE_KEY } from '../config/constants.js';
import { gameState, devSettings, metrics, jevState } from '../state/gameState.js';
import { startGame, togglePause, handlePlayerMove, render } from '../engine/gameLoop.js';
import { setDashboardView } from './devPanel.js';
import { setJevMode, setIntervalMs } from '../jev/jevClient.js';
import { updateHud, isStartScreenVisible } from './hud.js';

export function setupControls() {
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const resumeBtn = document.getElementById('resume-btn');

  const jevModeBtn = document.getElementById('jev-mode-btn');
  const devToggleJev = document.getElementById('dev-toggle-jev');
  const devPanelCloseBtn = document.getElementById('dev-panel-close-btn');

  const tabSplitView = document.getElementById('tab-split-view');
  const tabJevView = document.getElementById('tab-jev-view');
  const tabGameView = document.getElementById('tab-game-view');

  const jevIntervalSlider = document.getElementById('jev-interval-slider');
  const intervalButtons = document.querySelectorAll('.interval-btn');

  const devToggleHitboxes = document.getElementById('dev-toggle-hitboxes');
  const devToggleGodmode = document.getElementById('dev-toggle-godmode');
  const devResetHighscoreBtn = document.getElementById('dev-reset-highscore-btn');

  // Game buttons
  if (startBtn) startBtn.addEventListener('click', startGame);
  if (restartBtn) restartBtn.addEventListener('click', startGame);
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

  // Unified JEV Mode buttons
  if (jevModeBtn) {
    jevModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setJevMode(!jevState.modeActive, true, handlePlayerMove);
      jevModeBtn.blur();
    });
  }

  if (devToggleJev) {
    devToggleJev.addEventListener('change', () => {
      setJevMode(devToggleJev.checked, true, handlePlayerMove);
      devToggleJev.blur();
    });
  }

  if (devPanelCloseBtn) {
    devPanelCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setJevMode(false, true, handlePlayerMove);
      devPanelCloseBtn.blur();
    });
  }

  // Dashboard view tabs
  if (tabSplitView) tabSplitView.addEventListener('click', () => setDashboardView('split'));
  if (tabJevView) tabJevView.addEventListener('click', () => setDashboardView('jev'));
  if (tabGameView) tabGameView.addEventListener('click', () => setDashboardView('game'));

  // Interval tuning controls
  if (jevIntervalSlider) {
    jevIntervalSlider.addEventListener('input', function () {
      const valSec = parseFloat(this.value);
      const ms = Math.round(valSec * 1000);
      setIntervalMs(ms, false, handlePlayerMove);
    });
  }

  intervalButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const ms = parseInt(this.dataset.ms, 10);
      if (ms) {
        setIntervalMs(ms, true, handlePlayerMove);
        this.blur();
      }
    });
  });

  // Debug tools toggles
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
      metrics.highScore = 0;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, '0');
      } catch (e) {}
      updateHud(gameState.score, 0);
      const devHighscoreEl = document.getElementById('dev-highscore');
      if (devHighscoreEl) devHighscoreEl.textContent = '0';
      devResetHighscoreBtn.blur();
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    // Single Unified JEV Mode hotkey toggle (J or ` / ~)
    if (e.key === 'j' || e.key === 'J' || e.key === '`' || e.key === '~') {
      e.preventDefault();
      setJevMode(!jevState.modeActive, true, handlePlayerMove);
      return;
    }

    // Ignore controls if user is interacting with an input/button inside the dev panel
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') && e.target.closest('#dev-panel')) {
      return;
    }

    if (isStartScreenVisible()) {
      startGame();
      return;
    }

    if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space' || e.key === 'p' || e.key === 'P' || e.key === 'Pause') {
      if (gameState.running) {
        e.preventDefault();
        togglePause();
        return;
      }
    }

    if (!gameState.running || gameState.paused) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        handlePlayerMove(-1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        handlePlayerMove(1);
        break;
    }
  });
}
