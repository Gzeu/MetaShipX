const EGLD_DECIMALS = 18;
const DENOM = BigInt(10 ** EGLD_DECIMALS);

export function fmtEgld(wei: string, decimals = 4): string {
  try {
    const n = BigInt(wei);
    const whole = n / DENOM;
    const frac  = n % DENOM;
    const fracStr = frac.toString().padStart(EGLD_DECIMALS, '0').slice(0, decimals);
    return `${whole}.${fracStr} EGLD`;
  } catch {
    return '0.0000 EGLD';
  }
}

export function egldToWei(egld: string): string {
  try {
    const [whole, frac = ''] = egld.split('.');
    const fracPadded = frac.padEnd(EGLD_DECIMALS, '0').slice(0, EGLD_DECIMALS);
    return (BigInt(whole) * DENOM + BigInt(fracPadded)).toString();
  } catch {
    return '0';
  }
}

export function fmtAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function fmtWinRate(wins: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((wins / total) * 100)}%`;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDuration(ms: number): string {
  if (ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function fmtCountdown(targetMs: number): string {
  return fmtDuration(targetMs - Date.now());
}
