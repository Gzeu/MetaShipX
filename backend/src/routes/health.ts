import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();
const startTime = Date.now();

router.get('/', async (_req: Request, res: Response) => {
  let mxStatus = 'ok';
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const r = await fetch(`${config.mxApiUrl}/about`, { signal: controller.signal });
    if (!r.ok) mxStatus = 'degraded';
  } catch {
    mxStatus = 'unreachable';
  }

  const healthy = mxStatus === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    services: {
      api: 'ok',
      multiversx: mxStatus,
    },
  });
});

export default router;
