#![no_std]
multiversx_sc_wasm_adapter::endpoints! {
    leaderboard
    (
        init => init
        updatePlayer => update_player
        setBattleshipContract => set_battleship_contract
        getTopPlayers => get_top_players
        getPlayerRank => get_player_rank
        getPlayerStats => get_player_stats
        getListingCounter => listing_counter
    )
}
multiversx_sc_wasm_adapter::empty_callback! {}
