import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { config } from './config';
import { leaderboardRouter } from './routes/leaderboard';
import { tournamentsRouter } from './routes/tournaments';
import { statsRouter } from './routes/stats';
import { healthRouter } from './routes/health';
import { notFound, errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/stats', statsRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`MetaShipX API listening on port ${config.PORT} [${config.NODE_ENV}]`);
});

export default app;
