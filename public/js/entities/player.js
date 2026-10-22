import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_Y, LANE_COUNT, laneCenterX } from '../config/constants.js';

/**
 * Safe round rectangle path helper with cross-browser fallback
 */
export function drawRoundRect(ctx, x, y, w, h, radius = 6) {
  const r = Math.min(radius, w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Draw a stylized vehicle chassis with headlights, cockpit sheen, and alloy wheels
 */
export function drawCarShape(ctx, x, y, w, h, bodyColor, windowColor = '#0f172a', isPlayer = false) {
  ctx.save();

  // 1. Soft Ambient Drop Shadow under chassis
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.52, h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Tires (4 corner rubber wheels with alloy rim hubcaps)
  const wheelW = 5;
  const wheelH = h * 0.22;
  const wheelPositions = [
    { wx: x - 3, wy: y + h * 0.12 },
    { wx: x + w - 2, wy: y + h * 0.12 },
    { wx: x - 3, wy: y + h * 0.66 },
    { wx: x + w - 2, wy: y + h * 0.66 }
  ];

  ctx.fillStyle = '#111827';
  wheelPositions.forEach(({ wx, wy }) => {
    drawRoundRect(ctx, wx, wy, wheelW, wheelH, 2);
    ctx.fill();
    // Inner rim
    ctx.fillStyle = '#64748b';
    ctx.fillRect(wx + 1, wy + wheelH * 0.25, wheelW - 2, wheelH * 0.5);
    ctx.fillStyle = '#111827';
  });

  // 3. Main Chassis Body with metallic gradient
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
  bodyGrad.addColorStop(0, bodyColor);
  bodyGrad.addColorStop(0.35, '#ffffff33');
  bodyGrad.addColorStop(0.5, bodyColor);
  bodyGrad.addColorStop(1, '#00000044');

  ctx.fillStyle = bodyColor;
  drawRoundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  ctx.fillStyle = bodyGrad;
  drawRoundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  // 4. Aerodynamic Hood Vents / Recesses
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  drawRoundRect(ctx, x + w * 0.25, y + h * 0.1, w * 0.5, h * 0.12, 3);
  ctx.fill();

  // 5. Cockpit Cabin & Specular Windshield
  const cabinX = x + w * 0.14;
  const cabinY = y + h * 0.26;
  const cabinW = w * 0.72;
  const cabinH = h * 0.44;

  ctx.fillStyle = windowColor;
  drawRoundRect(ctx, cabinX, cabinY, cabinW, cabinH, 5);
  ctx.fill();

  // Specular sheen sweep on glass
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(cabinX - 5, cabinY + cabinH);
  ctx.lineTo(cabinX + cabinW * 0.5, cabinY);
  ctx.lineTo(cabinX + cabinW * 0.75, cabinY);
  ctx.lineTo(cabinX + 5, cabinY + cabinH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 6. Rear Wing / Spoiler (for sporty finish)
  ctx.fillStyle = '#0f172a';
  drawRoundRect(ctx, x + 2, y + h * 0.88, w - 4, 6, 2);
  ctx.fill();
  // Spoiler struts
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + w * 0.2, y + h * 0.84, 3, 5);
  ctx.fillRect(x + w * 0.8 - 3, y + h * 0.84, 3, 5);

  ctx.restore();
}

/**
 * Render player vehicle with headlights, underglow, JEV perception LiDAR, and shield
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} playerLane
 * @param {boolean} isJevActive
 * @param {{ showHitboxes: boolean, godMode: boolean }} devSettings
 * @param {number} [renderX] Smooth interpolated X coordinate
 * @param {number} [tilt=0] Dynamic roll/tilt angle in radians
 */
export function drawPlayer(ctx, playerLane, isJevActive, devSettings, renderX, tilt = 0) {
  const currentCenterX = typeof renderX === 'number' ? renderX : laneCenterX(playerLane);
  const x = currentCenterX - PLAYER_WIDTH / 2;
  const y = PLAYER_Y;

  ctx.save();

  // 1. Twin Projector Headlights (Forward Illumination Cones onto Asphalt)
  const lampLeft = x + PLAYER_WIDTH * 0.22;
  const lampRight = x + PLAYER_WIDTH * 0.78;
  const beamLength = 150;

  // Left beam
  const beamGradLeft = ctx.createRadialGradient(lampLeft, y, 4, lampLeft, y - beamLength * 0.7, beamLength);
  beamGradLeft.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
  beamGradLeft.addColorStop(0.4, 'rgba(56, 189, 248, 0.2)');
  beamGradLeft.addColorStop(1, 'rgba(56, 189, 248, 0)');

  ctx.fillStyle = beamGradLeft;
  ctx.beginPath();
  ctx.moveTo(lampLeft - 4, y);
  ctx.lineTo(lampLeft - 32, y - beamLength);
  ctx.lineTo(lampLeft + 24, y - beamLength);
  ctx.lineTo(lampLeft + 4, y);
  ctx.closePath();
  ctx.fill();

  // Right beam
  const beamGradRight = ctx.createRadialGradient(lampRight, y, 4, lampRight, y - beamLength * 0.7, beamLength);
  beamGradRight.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
  beamGradRight.addColorStop(0.4, 'rgba(56, 189, 248, 0.2)');
  beamGradRight.addColorStop(1, 'rgba(56, 189, 248, 0)');

  ctx.fillStyle = beamGradRight;
  ctx.beginPath();
  ctx.moveTo(lampRight - 4, y);
  ctx.lineTo(lampRight - 24, y - beamLength);
  ctx.lineTo(lampRight + 32, y - beamLength);
  ctx.lineTo(lampRight + 4, y);
  ctx.closePath();
  ctx.fill();

  // 2. JEV AI Perception Sweep (LiDAR / Autonomous Radar Cone)
  if (isJevActive) {
    ctx.save();
    const time = performance.now() * 0.003;
    const sweepSpread = 50;
    const sweepRange = 220;

    // Holographic radar field
    const radarGrad = ctx.createLinearGradient(currentCenterX, y, currentCenterX, y - sweepRange);
    radarGrad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
    radarGrad.addColorStop(0.7, 'rgba(192, 132, 252, 0.08)');
    radarGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

    ctx.fillStyle = radarGrad;
    ctx.beginPath();
    ctx.moveTo(currentCenterX, y - 5);
    ctx.lineTo(currentCenterX - sweepSpread, y - sweepRange);
    ctx.lineTo(currentCenterX + sweepSpread, y - sweepRange);
    ctx.closePath();
    ctx.fill();

    // Animated LiDAR wave rings
    const ringProgress = (time * 0.8) % 1;
    const ringDist = ringProgress * sweepRange;
    const ringW = (sweepSpread * 2) * (ringDist / sweepRange);

    ctx.strokeStyle = `rgba(216, 180, 254, ${1 - ringProgress})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(currentCenterX, y - ringDist, ringW / 2, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // 3. Neon Chassis Underglow
  ctx.save();
  const underglowGrad = ctx.createRadialGradient(
    currentCenterX, y + PLAYER_HEIGHT * 0.5, 10,
    currentCenterX, y + PLAYER_HEIGHT * 0.5, PLAYER_WIDTH * 0.85
  );
  if (isJevActive) {
    underglowGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
    underglowGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
  } else {
    underglowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    underglowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  }
  ctx.fillStyle = underglowGrad;
  ctx.beginPath();
  ctx.ellipse(currentCenterX, y + PLAYER_HEIGHT * 0.55, PLAYER_WIDTH * 0.75, PLAYER_HEIGHT * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Apply Car Steering Tilt / Roll Transformation
  ctx.translate(currentCenterX, y + PLAYER_HEIGHT / 2);
  if (tilt !== 0) {
    ctx.rotate(tilt);
  }
  ctx.translate(-currentCenterX, -(y + PLAYER_HEIGHT / 2));

  // 5. Draw High-End Cyber Supercar Body
  const playerBodyColor = isJevActive ? '#2563eb' : '#0284c7';
  drawCarShape(ctx, x, y, PLAYER_WIDTH, PLAYER_HEIGHT, playerBodyColor, '#030712', true);

  // Front LED Headlight Bulbs
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 8;
  drawRoundRect(ctx, lampLeft - 3, y + 2, 7, 4, 1.5);
  ctx.fill();
  drawRoundRect(ctx, lampRight - 4, y + 2, 7, 4, 1.5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rear Glowing LED Taillight Bar
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;
  drawRoundRect(ctx, x + 6, y + PLAYER_HEIGHT - 4, PLAYER_WIDTH - 12, 3, 1.5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 6. Holographic JEV Status Badge
  if (isJevActive) {
    ctx.save();
    ctx.fillStyle = '#c084fc';
    ctx.font = '700 9px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 6;
    ctx.fillText('🤖 JEV PILOT', currentCenterX, y - 8);
    ctx.restore();
  }

  // 7. God Mode Protective Energy Shield
  if (devSettings.godMode) {
    ctx.save();
    const shieldTime = performance.now() * 0.004;
    const shieldRadius = Math.max(PLAYER_WIDTH, PLAYER_HEIGHT) * 0.65;

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(currentCenterX, y + PLAYER_HEIGHT / 2, shieldRadius, shieldTime, shieldTime + Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.arc(currentCenterX, y + PLAYER_HEIGHT / 2, shieldRadius - 4, -shieldTime * 1.5, -shieldTime * 1.5 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Hitbox visualization
  if (devSettings.showHitboxes) {
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.fillStyle = '#10b981';
    ctx.font = '10px "Chakra Petch", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PLAYER (L${playerLane})`, x, y - 18);
    ctx.restore();
  }

  ctx.restore();
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
