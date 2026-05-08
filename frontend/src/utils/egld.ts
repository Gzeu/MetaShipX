import BigNumber from 'bignumber.js';

const DENOM = new BigNumber('1e18');
const DISPLAY_DECIMALS = 4;

/** wei string → human-readable EGLD string, e.g. "1.2345" */
export function weiToEgld(wei: string | bigint | number): string {
  return new BigNumber(wei.toString()).dividedBy(DENOM).toFixed(DISPLAY_DECIMALS);
}

/** EGLD number/string → wei BigNumber */
export function egldToWei(egld: string | number): BigNumber {
  return new BigNumber(egld).multipliedBy(DENOM);
}

/** EGLD to wei as string (for smart contract calls) */
export function egldToWeiStr(egld: string | number): string {
  return egldToWei(egld).toFixed(0);
}

/** Format wei with suffix, e.g. "1.23 EGLD" */
export function fmtEgld(wei: string | bigint | number, symbol = 'EGLD'): string {
  return `${weiToEgld(wei)} ${symbol}`;
}

/** Format wei in compact form for large numbers, e.g. "1.2K EGLD" */
export function fmtEgldCompact(wei: string | bigint | number): string {
  const egld = parseFloat(weiToEgld(wei));
  if (egld >= 1_000_000) return `${(egld / 1_000_000).toFixed(2)}M EGLD`;
  if (egld >= 1_000) return `${(egld / 1_000).toFixed(2)}K EGLD`;
  return `${egld.toFixed(4)} EGLD`;
}

/** Returns true if wei amount is zero or empty */
export function isZeroWei(wei: string | bigint | number): boolean {
  return new BigNumber(wei.toString()).isZero();
}
