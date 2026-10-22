import { OBSTACLE_WIDTH, OBSTACLE_HEIGHT, LANE_COUNT, laneCenterX } from '../config/constants.js';
import { drawRoundRect } from './player.js';

const OBSTACLE_PALETTE = [
  { color: '#ef4444', type: 'sports' },
  { color: '#f59e0b', type: 'truck' },
  { color: '#10b981', type: 'sedan' },
  { color: '#8b5cf6', type: 'sports' },
  { color: '#06b6d4', type: 'sedan' },
  { color: '#f43f5e', type: 'truck' }
];

/**
 * Spawn a new oncoming vehicle obstacle with randomized type and style
 * @param {Object} state
 */
export function spawnObstacle(state) {
  let lane;
  do {
    lane = Math.floor(Math.random() * LANE_COUNT);
  } while (lane === state.lastLaneSpawned && Math.random() < 0.6);
  state.lastLaneSpawned = lane;

  const style = OBSTACLE_PALETTE[Math.floor(Math.random() * OBSTACLE_PALETTE.length)];

  state.obstacles.push({
    lane,
    y: -OBSTACLE_HEIGHT,
    color: style.color,
    type: style.type
  });
}

/**
 * Move obstacles forward and prune vehicles that scrolled off the bottom
 * @param {Object} state
 * @param {number} canvasHeight
 * @param {Function} onEvade
 */
export function updateObstacles(state, canvasHeight, onEvade) {
  for (let i = state.obstacles.length - 1; i >= 0; i--) {
    state.obstacles[i].y += state.speed;
    if (state.obstacles[i].y > canvasHeight) {
      state.obstacles.splice(i, 1);
      if (typeof onEvade === 'function') {
        onEvade();
      }
    }
  }
}

/**
 * Render individual oncoming vehicle with downward headlights and chassis details
 */
function drawSingleObstacle(ctx, x, y, w, h, obs) {
  ctx.save();

  // 1. Soft Ambient Drop Shadow under obstacle
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.5, w * 0.52, h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Downward Oncoming Headlight Beams (Facing toward the player)
  const lampLeft = x + w * 0.22;
  const lampRight = x + w * 0.78;
  const beamLength = 110;
  const frontY = y + h - 2;

  // Left beam downward
  const beamGradLeft = ctx.createRadialGradient(lampLeft, frontY, 2, lampLeft, frontY + beamLength * 0.6, beamLength);
  beamGradLeft.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
  beamGradLeft.addColorStop(0.5, 'rgba(250, 204, 21, 0.15)');
  beamGradLeft.addColorStop(1, 'rgba(250, 204, 21, 0)');

  ctx.fillStyle = beamGradLeft;
  ctx.beginPath();
  ctx.moveTo(lampLeft - 4, frontY);
  ctx.lineTo(lampLeft - 22, frontY + beamLength);
  ctx.lineTo(lampLeft + 20, frontY + beamLength);
  ctx.lineTo(lampLeft + 4, frontY);
  ctx.closePath();
  ctx.fill();

  // Right beam downward
  const beamGradRight = ctx.createRadialGradient(lampRight, frontY, 2, lampRight, frontY + beamLength * 0.6, beamLength);
  beamGradRight.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
  beamGradRight.addColorStop(0.5, 'rgba(250, 204, 21, 0.15)');
  beamGradRight.addColorStop(1, 'rgba(250, 204, 21, 0)');

  ctx.fillStyle = beamGradRight;
  ctx.beginPath();
  ctx.moveTo(lampRight - 4, frontY);
  ctx.lineTo(lampRight - 20, frontY + beamLength);
  ctx.lineTo(lampRight + 22, frontY + beamLength);
  ctx.lineTo(lampRight + 4, frontY);
  ctx.closePath();
  ctx.fill();

  // 3. Wheels
  const wheelW = 4;
  const wheelH = h * 0.22;
  ctx.fillStyle = '#111827';
  drawRoundRect(ctx, x - 3, y + h * 0.15, wheelW, wheelH, 2);
  ctx.fill();
  drawRoundRect(ctx, x + w - 1, y + h * 0.15, wheelW, wheelH, 2);
  ctx.fill();
  drawRoundRect(ctx, x - 3, y + h * 0.63, wheelW, wheelH, 2);
  ctx.fill();
  drawRoundRect(ctx, x + w - 1, y + h * 0.63, wheelW, wheelH, 2);
  ctx.fill();

  // 4. Vehicle Chassis Body
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
  bodyGrad.addColorStop(0, obs.color);
  bodyGrad.addColorStop(0.4, '#ffffff2b');
  bodyGrad.addColorStop(0.6, obs.color);
  bodyGrad.addColorStop(1, '#00000044');

  ctx.fillStyle = obs.color;
  drawRoundRect(ctx, x, y, w, h, 7);
  ctx.fill();

  ctx.fillStyle = bodyGrad;
  drawRoundRect(ctx, x, y, w, h, 7);
  ctx.fill();

  // 5. Vehicle Type Specialties
  if (obs.type === 'truck') {
    // Heavy truck roof racks & amber roof clearance lights
    ctx.fillStyle = '#1e293b';
    drawRoundRect(ctx, x + 4, y + h * 0.2, w - 8, h * 0.45, 4);
    ctx.fill();

    // Dual amber roof lights
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + w * 0.25, y + 4, 4, 3);
    ctx.fillRect(x + w * 0.75 - 4, y + 4, 4, 3);
  } else {
    // Sports / Sedan Windshield (facing down)
    const cabinX = x + w * 0.14;
    const cabinY = y + h * 0.3;
    const cabinW = w * 0.72;
    const cabinH = h * 0.38;

    ctx.fillStyle = '#0f172a';
    drawRoundRect(ctx, cabinX, cabinY, cabinW, cabinH, 4);
    ctx.fill();

    // Subtle glass reflection
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(cabinX, cabinY);
    ctx.lineTo(cabinX + cabinW * 0.6, cabinY + cabinH);
    ctx.lineTo(cabinX + cabinW * 0.85, cabinY + cabinH);
    ctx.lineTo(cabinX + cabinW * 0.3, cabinY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 6. Front Bumper Headlights (Facing Downward toward Player)
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 6;
  drawRoundRect(ctx, lampLeft - 3, frontY - 3, 7, 4, 1.5);
  ctx.fill();
  drawRoundRect(ctx, lampRight - 4, frontY - 3, 7, 4, 1.5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rear Taillights at the top of the oncoming car
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(x + 5, y + 2, 7, 3);
  ctx.fillRect(x + w - 12, y + 2, 7, 3);

  ctx.restore();
}

/**
 * Render all current road obstacles with dynamic lighting, JEV lock-on brackets, and hitboxes
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} obstacles
 * @param {boolean} showHitboxes
 * @param {boolean} [isJevActive=false]
 * @param {number} [playerLane=1]
 */
export function drawObstacles(ctx, obstacles, showHitboxes, isJevActive = false, playerLane = 1) {
  obstacles.forEach((obs, i) => {
    const x = laneCenterX(obs.lane) - OBSTACLE_WIDTH / 2;
    drawSingleObstacle(ctx, x, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, obs);

    // JEV Perception HUD Lock-On Brackets
    if (isJevActive && obs.y > 0 && obs.y < 460) {
      const isDirectThreat = obs.lane === playerLane;
      const dist = Math.round(500 - obs.y);
      const isCritical = dist < 200;

      ctx.save();
      const hudColor = isCritical ? '#ef4444' : (isDirectThreat ? '#f59e0b' : '#38bdf8');
      ctx.strokeStyle = hudColor;
      ctx.lineWidth = 1.5;

      const pad = 4;
      const corner = 7;
      const bx = x - pad;
      const by = obs.y - pad;
      const bw = OBSTACLE_WIDTH + pad * 2;
      const bh = OBSTACLE_HEIGHT + pad * 2;

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(bx, by + corner);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + corner, by);
      // Top-right corner
      ctx.moveTo(bx + bw - corner, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + corner);
      // Bottom-left corner
      ctx.moveTo(bx, by + bh - corner);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + corner, by + bh);
      // Bottom-right corner
      ctx.moveTo(bx + bw - corner, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - corner);
      ctx.stroke();

      // Threat tag
      ctx.fillStyle = hudColor;
      ctx.font = '700 8px "Chakra Petch", monospace';
      ctx.fillText(`${dist}PX`, bx, by - 4);
      ctx.restore();
    }

    // Developer Hitbox Overlay
    if (showHitboxes) {
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
