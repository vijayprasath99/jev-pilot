import { gameState, jevState, metrics } from './state/gameState.js';
import { initGameLoop, render, handlePlayerMove, startGame } from './engine/gameLoop.js';
import { initLatencyChart } from './ui/latencyChart.js';
import { setupControls } from './ui/controls.js';
import { updateDevPanel } from './ui/devPanel.js';
import { updateHud } from './ui/hud.js';
import { setJevMode, setIntervalMs, fetchJevConfig } from './jev/jevClient.js';

// Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const canvasEl = document.getElementById('game-canvas');
  initGameLoop(canvasEl);

  // Initialize Chart.js latency sparkline
  const latencyCanvas = document.getElementById('jev-latency-chart');
  if (latencyCanvas) {
    jevState.chartInstance = initLatencyChart(latencyCanvas);
  }

  // Bind input controls
  setupControls();

  // Initialize HUD and Dev Panel
  updateHud(gameState.score, metrics.highScore);
  render();
  updateDevPanel();

  // Restore Interval UI
  setIntervalMs(jevState.queryIntervalMs, true, handlePlayerMove);

  // Restore JEV Mode (Autopilot + Telemetry Sidebar)
  setJevMode(jevState.modeActive, false, handlePlayerMove);

  // Hydrate config from server
  fetchJevConfig();

  // Auto-activate or toggle JEV from URL query parameters
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('start') === 'true') {
      startGame();
    }
    if (params.get('autojev') === 'true' || params.get('jev') === 'true') {
      setJevMode(true, true, handlePlayerMove);
    } else if (params.get('autojev') === 'false' || params.get('jev') === 'false') {
      setJevMode(false, true, handlePlayerMove);
    }
  } catch (e) {}
});
