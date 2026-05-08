/**
 * MetaShipX — Staking APR calculation unit tests
 */
import assert from 'assert';

const SECONDS_PER_YEAR = 365 * 24 * 3600;
const APR_DENOM = 10_000n;

function calculateRewards(
  amount: bigint,
  aprBps: bigint, // basis points (2000 = 20%)
  secondsElapsed: bigint,
): bigint {
  return (amount * aprBps * secondsElapsed) / (APR_DENOM * BigInt(SECONDS_PER_YEAR));
}

describe('Staking APR calculation', () => {
  it('calculates 20% APR over 1 year correctly', () => {
    const amount = 1_000_000_000_000_000_000n; // 1 EGLD
    const apr = 2_000n; // 20%
    const elapsed = BigInt(SECONDS_PER_YEAR);
    const reward = calculateRewards(amount, apr, elapsed);
    // Expected: 0.2 EGLD = 2e17
    assert.strictEqual(reward, 200_000_000_000_000_000n);
  });

  it('calculates 20% APR over 6 months', () => {
    const amount = 1_000_000_000_000_000_000n;
    const apr = 2_000n;
    const elapsed = BigInt(Math.floor(SECONDS_PER_YEAR / 2));
    const reward = calculateRewards(amount, apr, elapsed);
    // Expected: ~0.1 EGLD (rounding down is correct)
    assert.ok(reward >= 99_999_999_999_999_990n && reward <= 100_000_000_000_000_010n);
  });

  it('returns 0 for 0 elapsed seconds', () => {
    const reward = calculateRewards(1_000_000_000_000_000_000n, 2_000n, 0n);
    assert.strictEqual(reward, 0n);
  });

  it('returns 0 for 0 staked amount', () => {
    const reward = calculateRewards(0n, 2_000n, BigInt(SECONDS_PER_YEAR));
    assert.strictEqual(reward, 0n);
  });

  it('handles large staking amounts', () => {
    const amount = 1_000_000n * 1_000_000_000_000_000_000n; // 1M EGLD
    const reward = calculateRewards(amount, 2_000n, BigInt(SECONDS_PER_YEAR));
    // Expected: 200k EGLD
    assert.strictEqual(reward, 200_000n * 1_000_000_000_000_000_000n);
  });
});
