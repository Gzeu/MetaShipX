import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService, GameEvent } from '../services/analytics.service';

const router = Router();

/** Simple admin auth — replace with proper JWT in production */
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) { next(); return; } // disabled if no secret set
  const provided = req.headers['x-admin-secret'] || req.query.secret;
  if (provided !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(adminAuth);

/** GET /admin/stats — aggregate stats */
router.get('/stats', (_req: Request, res: Response) => {
  res.json(analyticsService.getStats());
});

/** GET /admin/events — paginated event log */
router.get('/events', (req: Request, res: Response) => {
  const { event, userId, from, limit } = req.query;
  const events = analyticsService.getEvents({
    event:  event  as GameEvent | undefined,
    userId: userId as string | undefined,
    from:   from   ? new Date(from as string) : undefined,
    limit:  limit  ? parseInt(limit as string, 10) : 50,
  });
  res.json({ count: events.length, events });
});

/** GET /admin/errors — recent tx failures */
router.get('/errors', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  res.json(analyticsService.getRecentErrors(limit));
});

/** GET /admin/health — uptime + memory */
router.get('/health', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      heapUsed:  Math.round(mem.heapUsed  / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss:       Math.round(mem.rss       / 1024 / 1024) + 'MB',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
