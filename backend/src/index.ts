import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { setupWebSocket } from './routes/websocket';
import healthRouter from './routes/health';
import leaderboardRouter from './routes/leaderboard';
import statsRouter from './routes/stats';
import tournamentsRouter from './routes/tournaments';
import webhookRouter from './routes/webhook';
import adminRouter from './routes/admin';
import { config } from './config';
import { apiLimiter, attackLimiter, gameCreateLimiter } from './middleware/rateLimiter';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// ── Rate limiting ────────────────────────────────────────────────────────────
// Global limiter on all API routes
app.use('/leaderboard', apiLimiter);
app.use('/stats', apiLimiter);
app.use('/tournaments', apiLimiter);
// Strict limiter on attack webhook (1 per 2s per IP)
app.use('/webhook/tx-confirmed', attackLimiter);
// Game creation limiter
app.use('/tournaments', gameCreateLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/stats', statsRouter);
app.use('/tournaments', tournamentsRouter);
app.use('/webhook', webhookRouter);
app.use('/admin', adminRouter);

const server = createServer(app);
setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`[server] MetaShipX backend running on port ${config.port}`);
});

export default app;
