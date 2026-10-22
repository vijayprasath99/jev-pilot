import { SLA_THRESHOLD_MS, MAX_LATENCY_HISTORY } from '../config/constants.js';

/**
 * Record latency entry into history buffer and recalculate health stats
 * @param {number} latencyMs
 * @param {Array<number>} history
 * @returns {{ current: number, min: number, max: number, avg: number, trend: string, healthState: string }}
 */
export function recordLatency(latencyMs, history) {
  if (typeof latencyMs === 'number' && !isNaN(latencyMs)) {
    history.push(Math.round(latencyMs));
    if (history.length > MAX_LATENCY_HISTORY) {
      history.shift();
    }
  }

  if (history.length === 0) {
    return {
      current: null,
      min: null,
      max: null,
      avg: null,
      trend: 'Trend: --',
      healthState: 'STABLE'
    };
  }

  const current = history[history.length - 1];
  const min = Math.min(...history);
  const max = Math.max(...history);
  const avg = Math.round(history.reduce((a, b) => a + b, 0) / history.length);

  let trendText = '→ Steady';
  let healthState = 'STABLE';

  if (history.length >= 4) {
    const recentSlice = history.slice(-3);
    const olderSlice = history.slice(0, -3);
    const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
    const olderAvg = olderSlice.reduce((a, b) => a + b, 0) / olderSlice.length;
    const diff = Math.round(recentAvg - olderAvg);

    if (diff > 35) {
      trendText = `▲ +${diff}ms (Slowing)`;
    } else if (diff < -35) {
      trendText = `▼ ${diff}ms (Faster)`;
    } else {
      trendText = '→ Steady';
    }

    if (recentAvg > SLA_THRESHOLD_MS || current > 650 || (recentAvg > 350 && recentAvg > 1.4 * olderAvg)) {
      healthState = 'DEGRADING';
    } else if (recentAvg > 320 || current > 400) {
      healthState = 'ELEVATED';
    } else {
      healthState = 'STABLE';
    }
  } else {
    if (current > SLA_THRESHOLD_MS) {
      healthState = 'DEGRADING';
    } else if (current > 320) {
      healthState = 'ELEVATED';
    } else {
      healthState = 'STABLE';
    }
    trendText = 'Trend: Steady';
  }

  return {
    current,
    min,
    max,
    avg,
    trend: 'Trend: ' + trendText,
    healthState
  };
}
