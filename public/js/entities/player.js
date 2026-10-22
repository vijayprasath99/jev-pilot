import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_Y, LANE_COUNT, laneCenterX } from '../config/constants.js';

/**
 * Draw common car body shape
 */
export function drawCarShape(ctx, x, y, w, h, bodyColor, windowColor) {
  // Main chassis
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y, w, h);

  // Windshield & rear window
  ctx.fillStyle = windowColor;
  ctx.fillRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.25);
  ctx.fillRect(x + w * 0.15, y + h * 0.65, w * 0.7, h * 0.25);

  // Wheels / tires
  ctx.fillStyle = '#111';
  ctx.fillRect(x - 4, y + h * 0.15, 4, h * 0.2);
  ctx.fillRect(x + w, y + h * 0.15, 4, h * 0.2);
  ctx.fillRect(x - 4, y + h * 0.65, 4, h * 0.2);
  ctx.fillRect(x + w, y + h * 0.65, 4, h * 0.2);
}

/**
 * Render player vehicle with optional JEV autopilot aura, godmode shield, and hitboxes
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} playerLane
 * @param {boolean} isJevActive
 * @param {{ showHitboxes: boolean, godMode: boolean }} devSettings
 */
export function drawPlayer(ctx, playerLane, isJevActive, devSettings) {
  const x = laneCenterX(playerLane) - PLAYER_WIDTH / 2;
  drawCarShape(ctx, x, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, '#3a86ff', '#cfe8ff');

  // JEV AI Autopilot visual aura (subtle futuristic purple outline)
  if (isJevActive) {
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
    ctx.fillText(`PLAYER (L${playerLane})`, x, PLAYER_Y - 14);
    ctx.restore();
  }
}

/**
 * Move player to adjacent lane if within valid bounds
 * @param {number} direction - -1 for left, 1 for right
 * @param {Object} state
 * @returns {boolean} whether lane changed
 */
export function movePlayer(direction, state) {
  if (!state.running) return false;
  const newLane = state.playerLane + direction;
  if (newLane >= 0 && newLane < LANE_COUNT) {
    state.playerLane = newLane;
    return true;
  }
  return false;
}
