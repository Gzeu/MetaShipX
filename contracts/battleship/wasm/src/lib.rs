#![no_std]

multiversx_sc_wasm_adapter::wasm_endpoints! {
    battleship
    (
        init
        createGame
        joinGame
        placeShips
        attack
        withdraw
        getGameState
        getPlayerGames
        getActiveGames
        getFeePercent
        setFeePercent
        getStakingContract
        setStakingContract
    )
}

multiversx_sc_wasm_adapter::empty_callback! {}
