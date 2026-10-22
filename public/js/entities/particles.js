import { CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_MARGIN, ROAD_WIDTH } from '../config/constants.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.speedStreaks = [];
    this.initSpeedStreaks();
  }

  initSpeedStreaks() {
    this.speedStreaks = [];
    for (let i = 0; i < 20; i++) {
      this.speedStreaks.push({
        x: ROAD_MARGIN + Math.random() * ROAD_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        length: 15 + Math.random() * 30,
        speedMultiplier: 1.2 + Math.random() * 0.8,
        opacity: 0.15 + Math.random() * 0.25
      });
    }
  }

  /**
   * Emit exhaust smoke or neon energy particles from player rear
   */
  emitExhaust(x, y, isJevActive, currentSpeed) {
    // Twin exhaust pipes (left & right offset)
    const offsets = [-14, 14];
    for (const offsetX of offsets) {
      if (Math.random() < 0.65) {
        this.particles.push({
          x: x + offsetX + (Math.random() * 4 - 2),
          y: y + (Math.random() * 2),
          vx: (Math.random() - 0.5) * 0.6,
          vy: 2 + Math.random() * 3 + (currentSpeed * 0.3),
          size: 2.5 + Math.random() * 2.5,
          maxLife: 20 + Math.random() * 10,
          life: 0,
          color: isJevActive ? 'rgba(168, 85, 247,' : 'rgba(56, 189, 248,'
        });
      }
    }
  }

  /**
   * Emit a spark burst (e.g. God Mode shield deflection or near-miss dodge)
   */
  emitSparks(x, y, count = 16, color = 'rgba(251, 191, 36,') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        maxLife: 20 + Math.random() * 15,
        life: 0,
        color
      });
    }
  }

  /**
   * Update particle positions and lifespans
   */
  update(currentSpeed = 4) {
    // Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update speed streaks
    for (const streak of this.speedStreaks) {
      streak.y += currentSpeed * streak.speedMultiplier;
      if (streak.y > CANVAS_HEIGHT) {
        streak.y = -streak.length;
        streak.x = ROAD_MARGIN + Math.random() * ROAD_WIDTH;
      }
    }
  }

  /**
   * Draw speed streaks (wind / velocity lines)
   */
  drawSpeedStreaks(ctx) {
    ctx.save();
    ctx.lineWidth = 1.5;
    for (const streak of this.speedStreaks) {
      ctx.strokeStyle = `rgba(148, 163, 184, ${streak.opacity})`;
      ctx.beginPath();
      ctx.moveTo(streak.x, streak.y);
      ctx.lineTo(streak.x, streak.y + streak.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draw exhaust and impact particles
   */
  drawParticles(ctx) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress);
      ctx.fillStyle = `${p.color} ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

export const particleSystem = new ParticleSystem();
