import { CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_MARGIN, ROAD_WIDTH, LANE_COUNT, LANE_WIDTH } from '../config/constants.js';

/**
 * Render an advanced, high-tech highway surface with curb rumble strips,
 * luminous lane markers, and night atmosphere.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} roadLineOffset
 */
export function drawRoad(ctx, roadLineOffset) {
  ctx.save();

  // 1. Roadside Shoulder background (dark tech-terrain)
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Roadside subtle grid markers
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
  ctx.lineWidth = 1;
  const shoulderGridStep = 40;
  for (let y = (roadLineOffset % shoulderGridStep) - shoulderGridStep; y < CANVAS_HEIGHT; y += shoulderGridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ROAD_MARGIN - 8, y);
    ctx.moveTo(ROAD_MARGIN + ROAD_WIDTH + 8, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // 2. Animated Curb Kerbs (Red & White Racing Rumble Strips)
  const kerbWidth = 8;
  const segmentHeight = 24;
  const startY = (roadLineOffset % (segmentHeight * 2)) - (segmentHeight * 2);

  for (let y = startY; y < CANVAS_HEIGHT; y += segmentHeight) {
    const isRed = Math.floor((y - startY) / segmentHeight) % 2 === 0;
    ctx.fillStyle = isRed ? '#ef4444' : '#f8fafc';

    // Left curb
    ctx.fillRect(ROAD_MARGIN - kerbWidth, y, kerbWidth, segmentHeight);
    // Right curb
    ctx.fillRect(ROAD_MARGIN + ROAD_WIDTH, y, kerbWidth, segmentHeight);
  }

  // 3. Asphalt Road Surface with metallic / dark night gradient
  const asphaltGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  asphaltGrad.addColorStop(0, '#131722');
  asphaltGrad.addColorStop(0.5, '#161a29');
  asphaltGrad.addColorStop(1, '#0f121d');
  ctx.fillStyle = asphaltGrad;
  ctx.fillRect(ROAD_MARGIN, 0, ROAD_WIDTH, CANVAS_HEIGHT);

  // Subtle lane grooves / asphalt texture highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let i = 0; i < LANE_COUNT; i++) {
    if (i % 2 === 0) {
      ctx.fillRect(ROAD_MARGIN + LANE_WIDTH * i, 0, LANE_WIDTH, CANVAS_HEIGHT);
    }
  }

  // 4. Yellow Dashed Lane Dividers with subtle neon luminescence
  ctx.save();
  ctx.shadowColor = 'rgba(250, 204, 21, 0.45)';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.setLineDash([24, 20]);

  for (let i = 1; i < LANE_COUNT; i++) {
    const x = ROAD_MARGIN + LANE_WIDTH * i;
    ctx.beginPath();
    ctx.moveTo(x, (roadLineOffset % 44) - 44);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Road Boundary Edge Borders (Cyan / White Neon Glow)
  ctx.save();
  ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(ROAD_MARGIN, 0);
  ctx.lineTo(ROAD_MARGIN, CANVAS_HEIGHT);
  ctx.moveTo(ROAD_MARGIN + ROAD_WIDTH, 0);
  ctx.lineTo(ROAD_MARGIN + ROAD_WIDTH, CANVAS_HEIGHT);
  ctx.stroke();
  ctx.restore();

  // 6. Horizon atmospheric fade at the top of the screen
  const horizonVignette = ctx.createLinearGradient(0, 0, 0, 90);
  horizonVignette.addColorStop(0, 'rgba(10, 13, 20, 0.95)');
  horizonVignette.addColorStop(0.6, 'rgba(10, 13, 20, 0.4)');
  horizonVignette.addColorStop(1, 'rgba(10, 13, 20, 0)');
  ctx.fillStyle = horizonVignette;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 90);

  ctx.restore();
}
