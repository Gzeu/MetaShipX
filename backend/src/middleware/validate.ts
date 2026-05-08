import { Request, Response, NextFunction } from 'express';

/** Validate that :address param is a valid bech32 MultiversX address */
export function validateAddress(req: Request, res: Response, next: NextFunction): void {
  const address = req.params.address;
  if (address && !/^erd1[a-z0-9]{58}$/.test(address)) {
    res.status(400).json({ success: false, error: 'Invalid MultiversX address format' });
    return;
  }
  next();
}

/** Validate pagination query params */
export function validatePagination(req: Request, res: Response, next: NextFunction): void {
  const { page, size } = req.query;
  if (page !== undefined) {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1 || p > 1000) {
      res.status(400).json({ success: false, error: 'page must be integer 1-1000' });
      return;
    }
  }
  if (size !== undefined) {
    const s = Number(size);
    if (!Number.isInteger(s) || s < 1 || s > 100) {
      res.status(400).json({ success: false, error: 'size must be integer 1-100' });
      return;
    }
  }
  next();
}
