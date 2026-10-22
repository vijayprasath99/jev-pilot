const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env configuration
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(__dirname, '.env'));
  } else {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const k = trimmed.substring(0, idx).trim();
            const v = trimmed.substring(idx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      });
    }
  }
} catch (e) {
  // Ignore missing .env file
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const JEV_ENDPOINT = process.env.JEV_ENDPOINT || 'http://localhost:1234/v1/systemone';
const JEV_MODEL = process.env.JEV_MODEL || 'clef-flash';
const JEV_API_KEY = process.env.JEV_API_KEY || 'lm-studio';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8'
};

/**
 * Build dynamic criteria and text state for JEV System One model
 */
function buildJevPrompt(gameState) {
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
 * Handle POST /api/jev/action
 */
async function handleJevAction(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) {
      req.connection.destroy();
    }
  });

  req.on('end', async () => {
    let parsedState = {};
    try {
      parsedState = JSON.parse(body || '{}');
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    const { stateSummary, criteria, laneDistance } = buildJevPrompt(parsedState);

    const jevPayload = {
      model: JEV_MODEL,
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
      const response = await fetch(JEV_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JEV_API_KEY}`
        },
        body: JSON.stringify(jevPayload)
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('JEV API error:', response.status, errorText);
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `JEV API responded with ${response.status}: ${errorText}`,
          action: 'stay',
          latencyMs
        }));
        return;
      }

      const data = await response.json();
      const actionAnswer = data.answers && data.answers.action;
      const chosenAction = (actionAnswer && actionAnswer.choice) || 'stay';
      const confidence = (actionAnswer && typeof actionAnswer.confidence === 'number') ? actionAnswer.confidence : 1.0;
      const probabilities = (actionAnswer && actionAnswer.probabilities) || {};

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify({
        success: true,
        action: chosenAction,
        confidence,
        probabilities,
        model: data.model || JEV_MODEL,
        latencyMs,
        stateSummary,
        laneDistance: {
          0: laneDistance[0] === Infinity ? null : Math.round(laneDistance[0]),
          1: laneDistance[1] === Infinity ? null : Math.round(laneDistance[1]),
          2: laneDistance[2] === Infinity ? null : Math.round(laneDistance[2])
        }
      }));
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      console.error('Error contacting JEV endpoint:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `Failed to connect to JEV endpoint: ${err.message}`,
        action: 'stay',
        latencyMs
      }));
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // API Route: JEV Autopilot Action
  if (pathname === '/api/jev/action' && req.method === 'POST') {
    handleJevAction(req, res);
    return;
  }

  // API Route: JEV Config Info
  if (pathname === '/api/jev/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      endpoint: JEV_ENDPOINT,
      model: JEV_MODEL
    }));
    return;
  }

  // Static File Serving
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Internal Server Error');
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
  console.log(`JEV Endpoint: ${JEV_ENDPOINT} (Model: ${JEV_MODEL})`);
});
