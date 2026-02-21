import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    appEnv: env.APP_ENV,
    nodeEnv: env.NODE_ENV,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptimeSec: process.uptime(),
    now: new Date().toISOString(),
  });
});

export { healthRouter };
