import { config } from '../config.js';

/**
 * Build dynamic criteria and text state for JEV System One model
 * @param {Object} gameState
 * @returns {{ stateSummary: string, criteria: Object, laneDistance: Object }}
 */
export function buildJevPrompt(gameState = {}) {
  const playerLane = (gameState.playerLane !== undefined && !isNaN(Number(gameState.playerLane)))
    ? Math.max(0, Math.min(2, Math.floor(Number(gameState.playerLane))))
    : 1;
  const speed = Number(gameState.speed) || 4;
  const obstacles = Array.isArray(gameState.obstacles) ? gameState.obstacles : [];

  // Categorize nearest obstacle ahead for each lane
  const laneDistance = { 0: Infinity, 1: Infinity, 2: Infinity };
  obstacles.forEach(obs => {
    const lane = obs.lane;
    const dist = typeof obs.distance === 'number' ? obs.distance : (500 - (obs.y || 0));
    if (dist > 0 && dist < (laneDistance[lane] ?? Infinity)) {
      laneDistance[lane] = dist;
    }
  });

  const laneStatus = [0, 1, 2].map(l => {
    const d = laneDistance[l];
    if (d === Infinity) return `Lane ${l}: CLEAR (no obstacles ahead)`;
    if (d < 180) return `Lane ${l}: CRITICAL DANGER! Obstacle is ${Math.round(d)}px away!`;
    if (d < 300) return `Lane ${l}: Obstacle approaching at ${Math.round(d)}px`;
    return `Lane ${l}: Obstacle far ahead at ${Math.round(d)}px`;
  }).join('\n');

  const laneLabels = ['Lane 0 (Left)', 'Lane 1 (Center)', 'Lane 2 (Right)'];
  const playerStatus = `Current Car Position: ${laneLabels[playerLane] || `Lane ${playerLane}`}. Speed: ${speed} px/frame.`;

  const stateSummary = `Game: 3-lane infinite runner (Lane 0=Left, Lane 1=Center, Lane 2=Right).\n${playerStatus}\nTraffic Conditions Ahead:\n${laneStatus}\nGoal: Choose the safest steering action to dodge oncoming cars and survive.`;

  // Build possible choice options based on current lane boundaries
  const criteria = {};
  if (playerLane === 0) {
    criteria.stay = `Stay in Lane 0 (Left lane, nearest obstacle at ${laneDistance[0] === Infinity ? 'clear' : Math.round(laneDistance[0]) + 'px'})`;
    criteria.right = `Steer right into Lane 1 (Center lane, nearest obstacle at ${laneDistance[1] === Infinity ? 'clear' : Math.round(laneDistance[1]) + 'px'})`;
  } else if (playerLane === 2) {
    criteria.left = `Steer left into Lane 1 (Center lane, nearest obstacle at ${laneDistance[1] === Infinity ? 'clear' : Math.round(laneDistance[1]) + 'px'})`;
    criteria.stay = `Stay in Lane 2 (Right lane, nearest obstacle at ${laneDistance[2] === Infinity ? 'clear' : Math.round(laneDistance[2]) + 'px'})`;
  } else {
    criteria.left = `Steer left into Lane 0 (Left lane, nearest obstacle at ${laneDistance[0] === Infinity ? 'clear' : Math.round(laneDistance[0]) + 'px'})`;
    criteria.stay = `Stay in Lane 1 (Center lane, nearest obstacle at ${laneDistance[1] === Infinity ? 'clear' : Math.round(laneDistance[1]) + 'px'})`;
    criteria.right = `Steer right into Lane 2 (Right lane, nearest obstacle at ${laneDistance[2] === Infinity ? 'clear' : Math.round(laneDistance[2]) + 'px'})`;
  }

  return { stateSummary, criteria, laneDistance };
}

/**
 * Send current game state to JEV System One model endpoint
 * @param {Object} gameState
 * @returns {Promise<Object>}
 */
export async function requestJevDecision(gameState = {}) {
  const { stateSummary, criteria, laneDistance } = buildJevPrompt(gameState);

  const jevPayload = {
    model: config.jevModel,
    state: stateSummary,
    questions: {
      action: {
        type: 'choice',
        instructions: 'Which steering direction should the car take to safely avoid incoming obstacles?',
        criteria: criteria
      }
    }
  };

  const startTime = Date.now();
  try {
    const response = await fetch(config.jevEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.jevApiKey}`
      },
      body: JSON.stringify(jevPayload)
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JEV API error:', response.status, errorText);
      return {
        status: response.status,
        body: {
          success: false,
          error: `JEV API responded with ${response.status}: ${errorText}`,
          action: 'stay',
          latencyMs
        }
      };
    }

    const data = await response.json();
    const actionAnswer = data.answers && data.answers.action;
    const chosenAction = (actionAnswer && actionAnswer.choice) || 'stay';
    const confidence = (actionAnswer && typeof actionAnswer.confidence === 'number') ? actionAnswer.confidence : 1.0;
    const probabilities = (actionAnswer && actionAnswer.probabilities) || {};

    return {
      status: 200,
      body: {
        success: true,
        action: chosenAction,
        confidence,
        probabilities,
        model: data.model || config.jevModel,
        latencyMs,
        stateSummary,
        laneDistance: {
          0: laneDistance[0] === Infinity ? null : Math.round(laneDistance[0]),
          1: laneDistance[1] === Infinity ? null : Math.round(laneDistance[1]),
          2: laneDistance[2] === Infinity ? null : Math.round(laneDistance[2])
        }
      }
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error('Error contacting JEV endpoint:', err.message);
    return {
      status: 502,
      body: {
        success: false,
        error: `Failed to connect to JEV endpoint: ${err.message}`,
        action: 'stay',
        latencyMs
      }
    };
  }
}
