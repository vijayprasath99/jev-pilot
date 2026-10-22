export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;
export const LANE_COUNT = 3;
export const ROAD_MARGIN = 20;
export const ROAD_WIDTH = CANVAS_WIDTH - ROAD_MARGIN * 2;
export const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 80;
export const PLAYER_Y = CANVAS_HEIGHT - PLAYER_HEIGHT - 20;

export const OBSTACLE_WIDTH = 50;
export const OBSTACLE_HEIGHT = 80;

export const HIGH_SCORE_KEY = 'infiniteDriver.highScore';
export const JEV_INTERVAL_KEY = 'infiniteDriver.jevIntervalMs';
export const JEV_MODE_KEY = 'infiniteDriver.jevMode';

export const SLA_THRESHOLD_MS = 500;
export const MAX_LATENCY_HISTORY = 30;

export function laneCenterX(laneIndex) {
  return ROAD_MARGIN + LANE_WIDTH * laneIndex + LANE_WIDTH / 2;
}
