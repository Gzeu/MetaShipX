/// Unit tests for the Supernova-safe APR formula.
/// Run with: cargo test --package battleship-staking
///
/// These tests verify the core arithmetic used in do_claim_rewards().
/// They do NOT require a blockchain environment — pure math validation.

const APR_DENOMINATOR: u64 = 10_000;
const MILLIS_PER_YEAR: u64 = 31_536_000_000;
const MIN_ELAPSED_MS: u64 = 600;

/// Mirror of the on-chain formula using u128 intermediate.
fn calc_reward(amount: u64, apr_bps: u64, elapsed_ms: u64) -> u64 {
    if elapsed_ms < MIN_ELAPSED_MS || amount == 0 {
        return 0;
    }
    let reward_u128 = (amount as u128)
        .saturating_mul(apr_bps as u128)
        .saturating_mul(elapsed_ms as u128)
        / (MILLIS_PER_YEAR as u128)
        / (APR_DENOMINATOR as u128);
    if reward_u128 > u64::MAX as u128 { u64::MAX } else { reward_u128 as u64 }
}

#[test]
fn test_zero_elapsed_returns_zero() {
    // If not enough time has elapsed, reward must be 0.
    // Prevents division-by-zero edge case on back-to-back blocks.
    assert_eq!(calc_reward(1_000_000_000_000_000_000, 2_000, 0), 0);
    assert_eq!(calc_reward(1_000_000_000_000_000_000, 2_000, 599), 0); // < MIN_ELAPSED_MS
}

#[test]
fn test_min_elapsed_boundary() {
    // At exactly MIN_ELAPSED_MS (600 ms = 1 Supernova block), reward > 0 for large stake.
    // 1 EGLD staked at 20% APR for 600 ms:
    // = 1e18 * 2000 * 600 / 31_536_000_000 / 10_000 ≈ 3_802 attoEGLD
    let reward = calc_reward(1_000_000_000_000_000_000, 2_000, 600);
    assert!(reward > 0, "Should earn some reward at MIN_ELAPSED_MS");
    assert!(reward < 10_000, "Should be a tiny amount for 1 block");
}

#[test]
fn test_one_year_reward_20pct_apr() {
    // 1 EGLD at 20% APR for exactly 1 year = 0.2 EGLD reward.
    // 1 EGLD = 1_000_000_000_000_000_000 (18 decimals)
    // Expected: 200_000_000_000_000_000 attoEGLD (0.2 EGLD)
    let one_egld = 1_000_000_000_000_000_000u64;
    let reward = calc_reward(one_egld, 2_000, MILLIS_PER_YEAR);
    // Allow 0.01% rounding error due to integer division
    let expected = 200_000_000_000_000_000u64;
    let diff = if reward > expected { reward - expected } else { expected - reward };
    assert!(
        diff < expected / 10_000,
        "1yr 20% APR: expected ~{} got {} (diff {})",
        expected, reward, diff
    );
}

#[test]
fn test_one_year_reward_100pct_apr() {
    // 1 EGLD at 100% APR for 1 year = 1 EGLD reward.
    let one_egld = 1_000_000_000_000_000_000u64;
    let reward = calc_reward(one_egld, 10_000, MILLIS_PER_YEAR);
    let expected = one_egld;
    let diff = if reward > expected { reward - expected } else { expected - reward };
    assert!(
        diff < expected / 10_000,
        "1yr 100% APR: expected ~{} got {}",
        expected, reward
    );
}

#[test]
fn test_6_hours_reward() {
    // 1 EGLD at 20% APR for 6 hours.
    // 6h = 21_600_000 ms
    // reward ≈ 1e18 * 2000 * 21_600_000 / 31_536_000_000 / 10_000
    //        ≈ 136_986_301_369 attoEGLD ≈ 0.000137 EGLD
    let one_egld = 1_000_000_000_000_000_000u64;
    let six_hours_ms = 6 * 3_600 * 1_000;
    let reward = calc_reward(one_egld, 2_000, six_hours_ms);
    assert!(reward > 100_000_000_000, "6h reward should be > 0.0001 EGLD");
    assert!(reward < 200_000_000_000, "6h reward should be < 0.0002 EGLD");
}

#[test]
fn test_supernova_block_cadence_accumulation() {
    // Simulate 1 day worth of per-block claims at 600 ms/block (Supernova).
    // Total elapsed = 86_400_000 ms. Sum of per-block rewards should equal
    // a single 1-day claim (within integer rounding).
    let one_egld = 1_000_000_000_000_000_000u64;
    let one_day_ms: u64 = 86_400_000;
    let block_ms: u64 = 600;
    let blocks_per_day = one_day_ms / block_ms; // 144_000

    // Single-shot claim for 1 day
    let single_claim = calc_reward(one_egld, 2_000, one_day_ms);

    // Sum of per-block claims
    let mut cumulative: u64 = 0;
    for _ in 0..blocks_per_day {
        cumulative = cumulative.saturating_add(calc_reward(one_egld, 2_000, block_ms));
    }

    // Allow 0.1% drift from integer division accumulation over 144k blocks
    let diff = if single_claim > cumulative { single_claim - cumulative } else { cumulative - single_claim };
    let tolerance = single_claim / 1_000;
    assert!(
        diff <= tolerance,
        "Supernova block accumulation drift too high: single={} cumulative={} diff={}",
        single_claim, cumulative, diff
    );
}

#[test]
fn test_zero_stake_returns_zero() {
    assert_eq!(calc_reward(0, 2_000, MILLIS_PER_YEAR), 0);
}

#[test]
fn test_no_overflow_on_max_values() {
    // u64::MAX stake at 100% APR for 1 year should not panic.
    // Result is capped at u64::MAX.
    let result = calc_reward(u64::MAX, 10_000, MILLIS_PER_YEAR);
    // Just verify it doesn't panic and returns something sensible
    assert!(result > 0);
}
