#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Annual Percentage Rate denominator (10_000 = 100%)
const APR_DENOMINATOR: u64 = 10_000;
/// Default APR: 20% per year (2_000 / 10_000)
const DEFAULT_APR: u64 = 2_000;
/// Seconds in a year
const SECONDS_PER_YEAR: u64 = 31_536_000;

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub struct StakeInfo {
    pub amount: u64,
    pub staked_at: u64,
    pub last_claimed: u64,
    pub total_claimed: u64,
}

#[multiversx_sc::contract]
pub trait BattleshipStaking {
    // ─── Init ────────────────────────────────────────────────────────────

    #[init]
    fn init(&self, apr_numerator: u64) {
        let apr = if apr_numerator == 0 { DEFAULT_APR } else { apr_numerator };
        self.apr().set(apr);
        self.total_staked().set(BigUint::zero());
        self.reward_pool().set(BigUint::zero());
        self.owner().set(self.blockchain().get_caller());
    }

    // ─── Storage ─────────────────────────────────────────────────────────

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

    // ─── Events ──────────────────────────────────────────────────────────

    #[event("staked")]
    fn staked_event(&self, #[indexed] user: ManagedAddress, amount: BigUint);

    #[event("unstaked")]
    fn unstaked_event(&self, #[indexed] user: ManagedAddress, amount: BigUint);

    #[event("rewardClaimed")]
    fn reward_claimed_event(&self, #[indexed] user: ManagedAddress, reward: BigUint);

    #[event("poolFunded")]
    fn pool_funded_event(&self, #[indexed] funder: ManagedAddress, amount: BigUint);

    // ─── Endpoints ───────────────────────────────────────────────────────

    /// Fund the reward pool. Anyone can fund it, typically the game contract after a match.
    #[payable("EGLD")]
    #[endpoint(fundRewardPool)]
    fn fund_reward_pool(&self) {
        let payment = self.call_value().egld_value().clone_value();
        require!(payment > 0u64, "Must send EGLD");
        let current = self.reward_pool().get();
        self.reward_pool().set(current + payment.clone());
        self.pool_funded_event(self.blockchain().get_caller(), payment);
    }

    /// Stake EGLD to earn rewards over time.
    #[payable("EGLD")]
    #[endpoint(stake)]
    fn stake(&self) {
        let payment = self.call_value().egld_value().clone_value();
        require!(payment > 0u64, "Must stake more than 0");

        let caller = self.blockchain().get_caller();
        let now = self.blockchain().get_block_timestamp();

        if self.stake_info(&caller).is_empty() {
            let info = StakeInfo {
                amount: payment.to_u64().unwrap_or(0),
                staked_at: now,
                last_claimed: now,
                total_claimed: 0,
            };
            self.stake_info(&caller).set(&info);
        } else {
            // Claim pending rewards first, then add to stake
            self.do_claim_rewards(&caller);
            let mut info = self.stake_info(&caller).get();
            info.amount += payment.to_u64().unwrap_or(0);
            self.stake_info(&caller).set(&info);
        }

        let total = self.total_staked().get() + payment.clone();
        self.total_staked().set(total);
        self.staked_event(caller, payment);
    }

    /// Unstake EGLD. Pending rewards are claimed automatically.
    #[endpoint(unstake)]
    fn unstake(&self, amount: BigUint) {
        let caller = self.blockchain().get_caller();
        require!(!self.stake_info(&caller).is_empty(), "Nothing staked");

        // Claim pending first
        self.do_claim_rewards(&caller);

        let mut info = self.stake_info(&caller).get();
        let amount_u64 = amount.to_u64().unwrap_or(0);
        require!(info.amount >= amount_u64, "Insufficient staked amount");

        info.amount -= amount_u64;
        if info.amount == 0 {
            self.stake_info(&caller).clear();
        } else {
            self.stake_info(&caller).set(&info);
        }

        let total = self.total_staked().get();
        let new_total = if total >= amount { total - amount.clone() } else { BigUint::zero() };
        self.total_staked().set(new_total);

        self.send().direct_egld(&caller, &amount);
        self.unstaked_event(caller, amount);
    }

    /// Claim accumulated staking rewards.
    #[endpoint(claimRewards)]
    fn claim_rewards(&self) {
        let caller = self.blockchain().get_caller();
        require!(!self.stake_info(&caller).is_empty(), "Nothing staked");
        self.do_claim_rewards(&caller);
    }

    /// Owner can update the APR.
    #[only_owner]
    #[endpoint(setApr)]
    fn set_apr(&self, new_apr: u64) {
        require!(new_apr > 0 && new_apr <= APR_DENOMINATOR, "Invalid APR");
        self.apr().set(new_apr);
    }

    // ─── Internal Helpers ────────────────────────────────────────────────

    fn do_claim_rewards(&self, user: &ManagedAddress) {
        if self.stake_info(user).is_empty() { return; }
        let mut info = self.stake_info(user).get();
        let now = self.blockchain().get_block_timestamp();
        let elapsed = now - info.last_claimed;

        if elapsed == 0 || info.amount == 0 { return; }

        let apr = self.apr().get();
        // reward = amount * APR * elapsed / (SECONDS_PER_YEAR * APR_DENOMINATOR)
        let reward_u64 = info.amount
            .saturating_mul(apr)
            .saturating_mul(elapsed)
            / SECONDS_PER_YEAR
            / APR_DENOMINATOR;

        if reward_u64 == 0 { return; }
        let reward = BigUint::from(reward_u64);

        let pool = self.reward_pool().get();
        let actual_reward = if pool >= reward { reward.clone() } else { pool.clone() };

        if actual_reward == BigUint::zero() { return; }

        info.last_claimed = now;
        info.total_claimed += actual_reward.to_u64().unwrap_or(0);
        self.stake_info(user).set(&info);

        let new_pool = pool - actual_reward.clone();
        self.reward_pool().set(new_pool);

        self.send().direct_egld(user, &actual_reward);
        self.reward_claimed_event(user.clone(), actual_reward);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    #[view(getStakeInfo)]
    fn get_stake_info(&self, user: ManagedAddress) -> MultiValue4<u64, u64, u64, u64> {
        if self.stake_info(&user).is_empty() {
            return MultiValue4::from((0u64, 0u64, 0u64, 0u64));
        }
        let info = self.stake_info(&user).get();
        MultiValue4::from((info.amount, info.staked_at, info.last_claimed, info.total_claimed))
    }

    #[view(getPendingRewards)]
    fn get_pending_rewards(&self, user: ManagedAddress) -> BigUint {
        if self.stake_info(&user).is_empty() { return BigUint::zero(); }
        let info = self.stake_info(&user).get();
        let now = self.blockchain().get_block_timestamp();
        let elapsed = now - info.last_claimed;
        let apr = self.apr().get();
        let reward_u64 = info.amount
            .saturating_mul(apr)
            .saturating_mul(elapsed)
            / SECONDS_PER_YEAR
            / APR_DENOMINATOR;
        BigUint::from(reward_u64)
    }

    #[view(getTotalStaked)]
    fn get_total_staked(&self) -> BigUint {
        self.total_staked().get()
    }

    #[view(getRewardPool)]
    fn get_reward_pool(&self) -> BigUint {
        self.reward_pool().get()
    }

    #[view(getApr)]
    fn get_apr(&self) -> u64 {
        self.apr().get()
    }
}
