/**
 * MetaShipX — EGLD denomination utility tests
 */
import assert from 'assert';

const DENOM = 10n ** 18n;

function weiToEgld(wei: bigint, decimals = 4): string {
  const whole = wei / DENOM;
  const frac = wei % DENOM;
  const fracStr = frac.toString().padStart(18, '0').slice(0, decimals);
  return `${whole}.${fracStr}`;
}

function egldToWei(egldStr: string): bigint {
  const [whole, frac = ''] = egldStr.split('.');
  const fracPadded = frac.slice(0, 18).padEnd(18, '0');
  return BigInt(whole) * DENOM + BigInt(fracPadded);
}

describe('EGLD utilities', () => {
  it('converts 1 EGLD to wei', () => {
    assert.strictEqual(egldToWei('1'), 1_000_000_000_000_000_000n);
  });

  it('converts 0.1 EGLD to wei', () => {
    assert.strictEqual(egldToWei('0.1'), 100_000_000_000_000_000n);
  });

  it('converts wei back to EGLD display', () => {
    assert.strictEqual(weiToEgld(1_000_000_000_000_000_000n), '1.0000');
  });

  it('handles partial EGLD amounts', () => {
    const wei = egldToWei('2.5');
    assert.strictEqual(wei, 2_500_000_000_000_000_000n);
    assert.strictEqual(weiToEgld(wei), '2.5000');
  });

  it('round-trips correctly', () => {
    const amounts = ['0.01', '1', '100', '0.1234'];
    for (const a of amounts) {
      const wei = egldToWei(a);
      assert.ok(wei > 0n, `${a} should be > 0`);
    }
  });
});
