#![no_std]

multiversx_sc_wasm_adapter::wasm_endpoints! {
    staking
    (
        init
        fundRewardPool
        stake
        unstake
        claimRewards
        setApr
        getStakeInfo
        getPendingRewards
        getTotalStaked
        getRewardPool
        getApr
    )
}

multiversx_sc_wasm_adapter::empty_callback! {}
