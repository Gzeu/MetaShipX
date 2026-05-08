/**
 * MetaShipX — Tournament contract logic unit tests
 */
import assert from 'assert';

// Prize distribution logic (mirrors the Rust contract)
function calculatePrize(prizePool: bigint, platformFeeBps: bigint): { winner: bigint; platform: bigint } {
  const fee = (prizePool * platformFeeBps) / 100n;
  return { winner: prizePool - fee, platform: fee };
}

// APR reward calc
function pendingRewards(amount: bigint, aprBps: bigint, elapsed: bigint): bigint {
  const YEAR = 365n * 24n * 3600n;
  return (amount * aprBps * elapsed) / (10_000n * YEAR);
}

describe('Tournament prize distribution', () => {
  it('distributes 95% to winner with 5% fee', () => {
    const pool = 1_000_000_000_000_000_000n; // 1 EGLD
    const { winner, platform } = calculatePrize(pool, 5n);
    assert.strictEqual(winner, 950_000_000_000_000_000n);
    assert.strictEqual(platform, 50_000_000_000_000_000n);
  });

  it('winner + platform = total pool', () => {
    const pool = 7_500_000_000_000_000_000n; // 7.5 EGLD
    const { winner, platform } = calculatePrize(pool, 5n);
    assert.strictEqual(winner + platform, pool);
  });

  it('handles 0 fee correctly', () => {
    const pool = 2_000_000_000_000_000_000n;
    const { winner, platform } = calculatePrize(pool, 0n);
    assert.strictEqual(winner, pool);
    assert.strictEqual(platform, 0n);
  });

  it('handles max fee (20%)', () => {
    const pool = 1_000_000_000_000_000_000n;
    const { winner } = calculatePrize(pool, 20n);
    assert.strictEqual(winner, 800_000_000_000_000_000n);
  });
});

describe('Leaderboard address validation', () => {
  const isValidErD1 = (addr: string) => /^erd1[a-z0-9]{58}$/.test(addr);

  it('accepts valid erd1 address', () => {
    assert.ok(isValidErD1('erd1' + 'a'.repeat(58)));
  });

  it('rejects address with wrong prefix', () => {
    assert.ok(!isValidErD1('0x' + 'a'.repeat(40)));
  });

  it('rejects address that is too short', () => {
    assert.ok(!isValidErD1('erd1abc'));
  });

  it('rejects address with uppercase', () => {
    assert.ok(!isValidErD1('erd1' + 'A'.repeat(58)));
  });
});
