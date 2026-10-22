import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_Y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, laneCenterX } from '../config/constants.js';

/**
 * Axis-Aligned Bounding Box (AABB) intersection check
 */
export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Check if player vehicle collides with any oncoming obstacle
 * @param {number} playerLane
 * @param {Array} obstacles
 * @returns {boolean}
 */
export function checkCollisions(playerLane, obstacles = []) {
  const playerX = laneCenterX(playerLane) - PLAYER_WIDTH / 2;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const obsX = laneCenterX(obs.lane) - OBSTACLE_WIDTH / 2;
    if (rectsOverlap(playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, obsX, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT)) {
      return true;
    }
  }
  return false;
}
