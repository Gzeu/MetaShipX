import { Request, Response, NextFunction } from 'express';

const METHOD_COLORS: Record<string, string> = {
  GET: '\x1b[32m',
  POST: '\x1b[34m',
  PUT: '\x1b[33m',
  DELETE: '\x1b[31m',
  PATCH: '\x1b[35m',
};
const RESET = '\x1b[0m';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = METHOD_COLORS[method] ?? '';
    const status = res.statusCode;
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    // eslint-disable-next-line no-console
    console.log(
      `${color}${method}${RESET} ${url} ${statusColor}${status}${RESET} ${ms}ms`,
    );
  });

  next();
}
