import { CANVAS_HEIGHT, ROAD_MARGIN, ROAD_WIDTH, LANE_COUNT, LANE_WIDTH } from '../config/constants.js';

/**
 * Render the 3-lane road surface and animated yellow dividers
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} roadLineOffset
 */
export function drawRoad(ctx, roadLineOffset) {
  // Road asphalt surface
  ctx.fillStyle = '#333';
  ctx.fillRect(ROAD_MARGIN, 0, ROAD_WIDTH, CANVAS_HEIGHT);

  // Yellow dashed lane dividers
  ctx.strokeStyle = '#f4d35e';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 20]);

  for (let i = 1; i < LANE_COUNT; i++) {
    const x = ROAD_MARGIN + LANE_WIDTH * i;
    ctx.beginPath();
    ctx.moveTo(x, roadLineOffset - 40);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // White road boundary borders
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(ROAD_MARGIN, 0, ROAD_WIDTH, CANVAS_HEIGHT);
}
