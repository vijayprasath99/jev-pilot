import { OBSTACLE_WIDTH, OBSTACLE_HEIGHT, LANE_COUNT, laneCenterX } from '../config/constants.js';
import { drawCarShape } from './player.js';

const OBSTACLE_COLORS = ['#e63946', '#2a9d8f', '#457b9d', '#e76f51'];

/**
 * Spawn a new oncoming vehicle obstacle
 * @param {Object} state
 */
export function spawnObstacle(state) {
  let lane;
  do {
    lane = Math.floor(Math.random() * LANE_COUNT);
  } while (lane === state.lastLaneSpawned && Math.random() < 0.6);
  state.lastLaneSpawned = lane;

  state.obstacles.push({
    lane: lane,
    y: -OBSTACLE_HEIGHT,
    color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)]
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
 * Render all current road obstacles and hitboxes
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} obstacles
 * @param {boolean} showHitboxes
 */
export function drawObstacles(ctx, obstacles, showHitboxes) {
  obstacles.forEach((obs, i) => {
    const x = laneCenterX(obs.lane) - OBSTACLE_WIDTH / 2;
    drawCarShape(ctx, x, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, obs.color, '#222');

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
