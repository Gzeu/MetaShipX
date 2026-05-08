import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import leaderboardRouter from './routes/leaderboard';
import tournamentsRouter from './routes/tournaments';
import statsRouter from './routes/stats';
import { setupWebSocket } from './routes/websocket';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '256kb' }));

app.use('/api/health', healthRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/stats', statsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = createServer(app);
setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`[server] MetaShipX backend running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
