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
import { config } from './config';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/stats', statsRouter);
app.use('/tournaments', tournamentsRouter);
app.use('/webhook', webhookRouter);

const server = createServer(app);
setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`[server] MetaShipX backend running on port ${config.port}`);
});

export default app;
