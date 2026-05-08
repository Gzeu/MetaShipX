/**
 * MetaShipX — Formatting Utilities
 */

const EGLD_DENOMINATION = 18;

/**
 * Convert raw denomination string to EGLD display string.
 * e.g. "1000000000000000000" → "1.00 EGLD"
 */
export function formatEgld(raw: string | bigint, decimals = 4): string {
  const value = typeof raw === 'string' ? BigInt(raw) : raw;
  const divisor = 10n ** BigInt(EGLD_DENOMINATION);
  const whole = value / divisor;
  const remainder = value % divisor;
  const fracStr = remainder.toString().padStart(EGLD_DENOMINATION, '0').slice(0, decimals);
  return `${whole}.${fracStr} EGLD`;
}

/**
 * Convert EGLD float to raw denomination BigInt.
 * e.g. 1.5 → 1500000000000000000n
 */
export function egldToRaw(egld: number): bigint {
  const [whole, frac = ''] = egld.toString().split('.');
  const fracPadded = frac.padEnd(EGLD_DENOMINATION, '0').slice(0, EGLD_DENOMINATION);
  return BigInt(whole) * 10n ** BigInt(EGLD_DENOMINATION) + BigInt(fracPadded);
}

/**
 * Shorten a bech32 MultiversX address for display.
 * e.g. "erd1abc...xyz"
 */
export function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a timestamp (seconds) to relative time string.
 * e.g. "2 minutes ago"
 */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Format APR from basis points to percentage string.
 * e.g. 2000 → "20.00%"
 */
export function formatApr(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Compute pending staking reward.
 */
export function computePendingReward(params: {
  stakedRaw: bigint;
  aprBps: number;
  elapsedSeconds: number;
}): bigint {
  const { stakedRaw, aprBps, elapsedSeconds } = params;
  const SECONDS_PER_YEAR = 31_536_000n;
  const reward =
    (stakedRaw * BigInt(aprBps) * BigInt(elapsedSeconds)) /
    (10_000n * SECONDS_PER_YEAR);
  return reward;
}
