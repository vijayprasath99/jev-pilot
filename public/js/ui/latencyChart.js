import { SLA_THRESHOLD_MS } from '../config/constants.js';

/**
 * Initialize Chart.js latency sparkline
 * @param {HTMLCanvasElement} canvas
 * @returns {Object|null} Chart instance
 */
export function initLatencyChart(canvas) {
  if (!canvas || typeof window.Chart !== 'function') {
    return null;
  }

  const ctx = canvas.getContext('2d');

  // Gradient fill for chart background
  const areaGrad = ctx.createLinearGradient(0, 0, 0, 46);
  areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  const chart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '500ms SLA',
          data: [],
          borderColor: 'rgba(239, 68, 68, 0.45)',
          borderWidth: 1,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Latency (ms)',
          data: [],
          borderColor: '#38bdf8',
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          backgroundColor: areaGrad,
          pointRadius: (ctx) => {
            const index = ctx.dataIndex;
            const count = ctx.dataset.data.length;
            return index === count - 1 ? 3.5 : 2;
          },
          pointBackgroundColor: '#38bdf8'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          callbacks: {
            title: () => '',
            label: (item) => `${item.dataset.label}: ${item.raw}ms`
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          display: false,
          min: 0,
          suggestedMax: SLA_THRESHOLD_MS + 60
        }
      }
    }
  });

  return chart;
}

/**
 * Update Chart.js sparkline with latest latency data and dynamic health coloring
 * @param {Object} chart
 * @param {Array<number>} history
 * @param {string} healthState
 */
export function updateLatencyChart(chart, history = [], healthState = 'STABLE') {
  if (!chart) return;

  const labels = history.map((_, i) => `#${i + 1}`);
  const slaBaseline = history.map(() => SLA_THRESHOLD_MS);

  chart.data.labels = labels;
  chart.data.datasets[0].data = slaBaseline;
  chart.data.datasets[1].data = history;

  // Dynamic cyberpunk color palette based on API health state
  let strokeColor = '#38bdf8';
  let fillColorStart = 'rgba(56, 189, 248, 0.35)';

  if (healthState === 'DEGRADING') {
    strokeColor = '#f87171';
    fillColorStart = 'rgba(239, 68, 68, 0.35)';
  } else if (healthState === 'ELEVATED') {
    strokeColor = '#fbbf24';
    fillColorStart = 'rgba(251, 191, 36, 0.35)';
  }

  const ctx = chart.ctx;
  const areaGrad = ctx.createLinearGradient(0, 0, 0, 46);
  areaGrad.addColorStop(0, fillColorStart);
  areaGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  chart.data.datasets[1].borderColor = strokeColor;
  chart.data.datasets[1].pointBackgroundColor = strokeColor;
  chart.data.datasets[1].backgroundColor = areaGrad;

  // Max scale auto-adjusts to highest latency spike
  const maxVal = Math.max(SLA_THRESHOLD_MS + 50, ...history);
  chart.options.scales.y.suggestedMax = Math.ceil(maxVal / 50) * 50;

  chart.update('none');
}
