import { Router } from 'express';
import { config } from '../config.js';
import { requestJevDecision } from '../services/jevService.js';

const router = Router();

// GET /api/jev/config
router.get('/config', (req, res) => {
  res.json({
    endpoint: config.jevEndpoint,
    model: config.jevModel
  });
});

// POST /api/jev/action
router.post('/action', async (req, res) => {
  const gameState = req.body || {};
  const { status, body } = await requestJevDecision(gameState);
  res.status(status).json(body);
});

export default router;
