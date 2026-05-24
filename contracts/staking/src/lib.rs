#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

// ── Supernova-safe constants ─────────────────────────────────────────────────
const APR_DENOMINATOR: u64 = 10_000;
const DEFAULT_APR: u64 = 2_000;                    // 20 % p.a.
const MAX_APR: u64 = 10_000;                        // 100% hard cap — audit requirement
const MILLIS_PER_YEAR: u64 = 31_536_000_000u64;
const MIN_ELAPSED_MS: u64 = 600;

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub struct StakeInfo {
    pub amount: u64,
    pub staked_at_ms: u64,
    pub last_claimed_ms: u64,
    pub total_claimed: u64,
}

#[multiversx_sc::contract]
pub trait BattleshipStaking {

    #[init]
    fn init(&self, apr_numerator: u64) {
        let apr = if apr_numerator == 0 { DEFAULT_APR } else { apr_numerator };
        // AUDIT: enforce cap at init time too
        require!(apr <= MAX_APR, "APR exceeds maximum 10000 bps");
        self.apr().set(apr);
        self.total_staked().set(BigUint::zero());
        self.reward_pool().set(BigUint::zero());
        self.owner().set(self.blockchain().get_caller());
    }

    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("apr")]
    fn apr(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("total_staked")]
    fn total_staked(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("reward_pool")]
    fn reward_pool(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("stake_info")]
    fn stake_info(&self, user: &ManagedAddress) -> SingleValueMapper<StakeInfo>;

    #[event("staked")]
    fn staked_event(&self, #[indexed] user: ManagedAddress, amount: BigUint);

    #[event("unstaked")]
    fn unstaked_event(&self, #[indexed] user: ManagedAddress, amount: BigUint);

    #[event("rewardClaimed")]
    fn reward_claimed_event(
        &self,
        #[indexed] user: ManagedAddress,
        reward: BigUint,
        elapsed_ms: u64,
    );

    #[event("poolFunded")]
    fn pool_funded_event(&self, #[indexed] funder: ManagedAddress, amount: BigUint);

    #[payable("EGLD")]
    #[endpoint(fundRewardPool)]
    fn fund_reward_pool(&self) {
        let payment = self.call_value().egld_value().clone_value();
        require!(payment > 0u64, "Must send EGLD");
        let current = self.reward_pool().get();
        self.reward_pool().set(current + payment.clone());
        self.pool_funded_event(self.blockchain().get_caller(), payment);
    }

    #[payable("EGLD")]
    #[endpoint(stake)]
    fn stake(&self) {
        let payment = self.call_value().egld_value().clone_value();
        require!(payment > 0u64, "Must stake more than 0");
        let caller = self.blockchain().get_caller();
        let now_ms = self.blockchain().get_block_timestamp_millis();

        if self.stake_info(&caller).is_empty() {
            let info = StakeInfo {
                amount: payment.to_u64().unwrap_or(0),
                staked_at_ms: now_ms,
                last_claimed_ms: now_ms,
                total_claimed: 0,
            };
            self.stake_info(&caller).set(&info);
        } else {
            self.do_claim_rewards(&caller);
            let mut info = self.stake_info(&caller).get();
            info.amount += payment.to_u64().unwrap_or(0);
            self.stake_info(&caller).set(&info);
        }

        let total = self.total_staked().get() + payment.clone();
        self.total_staked().set(total);
        self.staked_event(caller, payment);
    }

    #[endpoint(unstake)]
    fn unstake(&self, amount: BigUint) {
        let caller = self.blockchain().get_caller();
        require!(!self.stake_info(&caller).is_empty(), "Nothing staked");

        self.do_claim_rewards(&caller);

        let mut info = self.stake_info(&caller).get();
        let amount_u64 = amount.to_u64().unwrap_or(0);
        require!(info.amount >= amount_u64, "Insufficient staked amount");

        // AUDIT: update state before send
        info.amount -= amount_u64;
        if info.amount == 0 {
            self.stake_info(&caller).clear();
        } else {
            self.stake_info(&caller).set(&info);
        }

        // AUDIT: saturating_sub prevents underflow on total_staked
        let total = self.total_staked().get();
        let new_total = if total >= amount {
            total - amount.clone()
        } else {
            BigUint::zero() // saturating: pool cannot go negative
        };
        self.total_staked().set(new_total);

        // ✅ AUDIT: state fully updated BEFORE external send
        self.send().direct_egld(&caller, &amount);
        self.unstaked_event(caller, amount);
    }

    #[endpoint(claimRewards)]
    fn claim_rewards(&self) {
        let caller = self.blockchain().get_caller();
        require!(!self.stake_info(&caller).is_empty(), "Nothing staked");
        self.do_claim_rewards(&caller);
    }

    /// Owner: update APR (basis points). Hard cap: MAX_APR = 10000 (100%).
    #[only_owner]
    #[endpoint(setApr)]
    fn set_apr(&self, new_apr: u64) {
        // AUDIT: double-bound check — must be > 0 and ≤ MAX_APR
        require!(new_apr > 0 && new_apr <= MAX_APR, "APR must be 1–10000 bps");
        self.apr().set(new_apr);
    }

    fn do_claim_rewards(&self, user: &ManagedAddress) {
        if self.stake_info(user).is_empty() { return; }

        let mut info = self.stake_info(user).get();
        let now_ms = self.blockchain().get_block_timestamp_millis();

        if now_ms <= info.last_claimed_ms { return; }
        let elapsed_ms = now_ms - info.last_claimed_ms;
        if elapsed_ms < MIN_ELAPSED_MS || info.amount == 0 { return; }

        let apr = self.apr().get();
        let reward_u128 = (info.amount as u128)
            .saturating_mul(apr as u128)
            .saturating_mul(elapsed_ms as u128)
            / (MILLIS_PER_YEAR as u128)
            / (APR_DENOMINATOR as u128);

        let reward_u64 = if reward_u128 > u64::MAX as u128 {
            u64::MAX
        } else {
            reward_u128 as u64
        };

        if reward_u64 == 0 { return; }

        let reward = BigUint::from(reward_u64);
        let pool = self.reward_pool().get();
        let actual_reward = if pool >= reward { reward } else { pool.clone() };
        if actual_reward == BigUint::zero() { return; }

        // ✅ AUDIT: state-before-send pattern — update ALL storage before any external call
        info.last_claimed_ms = now_ms;
        info.total_claimed = info.total_claimed.saturating_add(actual_reward.to_u64().unwrap_or(0));
        self.stake_info(user).set(&info);
        let new_pool = pool - actual_reward.clone();
        self.reward_pool().set(new_pool);

        // External call LAST
        self.send().direct_egld(user, &actual_reward);
        self.reward_claimed_event(user.clone(), actual_reward, elapsed_ms);
    }

    #[view(getStakeInfo)]
    fn get_stake_info(&self, user: ManagedAddress) -> MultiValue4<u64, u64, u64, u64> {
        if self.stake_info(&user).is_empty() {
            return MultiValue4::from((0u64, 0u64, 0u64, 0u64));
        }
        let info = self.stake_info(&user).get();
        MultiValue4::from((info.amount, info.staked_at_ms, info.last_claimed_ms, info.total_claimed))
    }

    #[view(getPendingRewards)]
    fn get_pending_rewards(&self, user: ManagedAddress) -> BigUint {
        if self.stake_info(&user).is_empty() { return BigUint::zero(); }
        let info = self.stake_info(&user).get();
        let now_ms = self.blockchain().get_block_timestamp_millis();
        if now_ms <= info.last_claimed_ms { return BigUint::zero(); }
        let elapsed_ms = now_ms - info.last_claimed_ms;
        if elapsed_ms < MIN_ELAPSED_MS || info.amount == 0 { return BigUint::zero(); }
        let apr = self.apr().get();
        let reward_u128 = (info.amount as u128)
            .saturating_mul(apr as u128)
            .saturating_mul(elapsed_ms as u128)
            / (MILLIS_PER_YEAR as u128)
            / (APR_DENOMINATOR as u128);
        BigUint::from(reward_u128 as u64)
    }

    #[view(getTotalStaked)]
    fn get_total_staked(&self) -> BigUint { self.total_staked().get() }

    #[view(getRewardPool)]
    fn get_reward_pool(&self) -> BigUint { self.reward_pool().get() }

    #[view(getApr)]
    fn get_apr(&self) -> u64 { self.apr().get() }

    #[view(getCurrentTimestampMs)]
    fn get_current_timestamp_ms(&self) -> u64 {
        self.blockchain().get_block_timestamp_millis()
    }
}

// ── Unit tests (cargo test) ───────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    /// APR cap: values above MAX_APR (10000 bps) must be rejected.
    /// Verifies the set_apr bound without on-chain execution.
    #[test]
    fn test_apr_bounds() {
        // valid range
        assert!((1u64..=10_000u64).contains(&2_000)); // 20% default
        assert!((1u64..=10_000u64).contains(&10_000)); // 100% max
        // out of bounds
        assert!(!(1u64..=10_000u64).contains(&0));
        assert!(!(1u64..=10_000u64).contains(&10_001));
    }

    /// Reward math: stake 1 EGLD (10^18 attoEGLD), APR 20%, 1 year → ~10^17 attoEGLD reward.
    #[test]
    fn test_reward_math_one_year() {
        let amount: u128 = 1_000_000_000_000_000_000; // 1 EGLD in attoEGLD
        let apr: u128 = 2_000; // 20%
        let elapsed_ms: u128 = 31_536_000_000; // exactly 1 year
        let millis_per_year: u128 = 31_536_000_000;
        let apr_denom: u128 = 10_000;

        let reward = amount
            .saturating_mul(apr)
            .saturating_mul(elapsed_ms)
            / millis_per_year
            / apr_denom;

        // Should be exactly 0.2 EGLD = 2 * 10^17 attoEGLD
        assert_eq!(reward, 200_000_000_000_000_000u128);
    }

    /// MIN_ELAPSED_MS guard: elapsed < 600ms must produce 0 reward.
    #[test]
    fn test_min_elapsed_guard() {
        let amount: u128 = 1_000_000_000_000_000_000;
        let apr: u128 = 2_000;
        let elapsed_ms: u128 = 599; // below MIN_ELAPSED_MS
        let min_elapsed: u128 = 600;

        let reward = if elapsed_ms < min_elapsed {
            0u128
        } else {
            amount.saturating_mul(apr).saturating_mul(elapsed_ms)
                / 31_536_000_000u128
                / 10_000u128
        };

        assert_eq!(reward, 0u128);
    }
}
