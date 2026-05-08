#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

const MAX_SHIPS: usize = 5;
const BOARD_SIZE: u8 = 10;
const SHIP_LENGTHS: [u8; 5] = [5, 4, 3, 3, 2];
const STAKING_FEE_BPS: u64 = 100;

// ── Supernova: nonce-based timeout ───────────────────────────────────────────
// At 600 ms/block (Supernova), 1 hour ≈ 6 000 blocks.
// We give each player 30 minutes = 3 000 blocks to act before opponent can
// claim the game as abandoned. This is block-time agnostic by design.
const TURN_TIMEOUT_BLOCKS: u64 = 3_000;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, PartialEq, Clone)]
pub enum GamePhase {
    WaitingForOpponent,
    PlacingShips,
    InProgress,
    Finished,
}

/// ✅ Supernova: replaced timestamp fields with block nonces.
/// `last_action_nonce` is updated on every state-changing action.
/// Timeout checks compare `current_nonce - last_action_nonce > TURN_TIMEOUT_BLOCKS`.
#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub struct GameState<M: ManagedTypeApi> {
    pub creator: ManagedAddress<M>,
    pub opponent: Option<ManagedAddress<M>>,
    pub bet: BigUint<M>,
    pub phase: GamePhase,
    pub current_turn: u8,
    pub winner: Option<ManagedAddress<M>>,
    pub winner_ship_nonce: u64,
    pub tournament_id: u64,
    pub tournament_match_id: u64,
    /// ✅ Block nonce of the last state-changing action (place, attack, join).
    /// Used for abandonment detection. Monotonically increasing — safe on Supernova.
    pub last_action_nonce: u64,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub struct ShipData {
    pub cells: ArrayVec<u8, 5>,
    pub hits: u8,
    pub length: u8,
    pub sunk: bool,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi)]
pub struct ShipPosition {
    pub x: u8,
    pub y: u8,
    pub length: u8,
    pub is_vertical: bool,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, PartialEq, Clone)]
pub enum AttackResult {
    Hit,
    Miss,
    Sunk,
    GameOver,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[multiversx_sc::contract]
pub trait Battleship {

    // ── Init ────────────────────────────────────────────────────────────────

    #[init]
    fn init(&self) {
        self.game_counter().set(0u64);
    }

    // ── Storage ─────────────────────────────────────────────────────────────

    #[storage_mapper("game_counter")]
    fn game_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("game_state")]
    fn game_state(&self, game_id: u64) -> SingleValueMapper<GameState<Self::Api>>;

    #[storage_mapper("player_games")]
    fn player_games(&self, player: &ManagedAddress) -> UnorderedSetMapper<u64>;

    #[storage_mapper("ships")]
    fn ships(&self, game_id: u64, player_idx: u8) -> VecMapper<ShipData>;

    #[storage_mapper("attacked")]
    fn attacked(&self, game_id: u64, player_idx: u8) -> UnorderedSetMapper<u8>;

    #[storage_mapper("ships_placed")]
    fn ships_placed(&self, game_id: u64, player_idx: u8) -> SingleValueMapper<bool>;

    #[storage_mapper("tournament_contract")]
    fn tournament_contract(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("nft_contract")]
    fn nft_contract(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("staking_contract")]
    fn staking_contract(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("player_ship_nonce")]
    fn player_ship_nonce(&self, game_id: u64, player_idx: u8) -> SingleValueMapper<u64>;

    // ── Events ──────────────────────────────────────────────────────────────

    #[event("gameCreated")]
    fn game_created_event(&self, #[indexed] game_id: u64, #[indexed] creator: ManagedAddress);

    #[event("gameJoined")]
    fn game_joined_event(&self, #[indexed] game_id: u64, #[indexed] opponent: ManagedAddress);

    #[event("shipsPlaced")]
    fn ships_placed_event(&self, #[indexed] game_id: u64, #[indexed] player: ManagedAddress);

    #[event("attackMade")]
    fn attack_made_event(
        &self,
        #[indexed] game_id: u64,
        #[indexed] attacker: ManagedAddress,
        x: u8,
        y: u8,
        result: AttackResult,
    );

    #[event("gameOver")]
    fn game_over_event(&self, #[indexed] game_id: u64, #[indexed] winner: ManagedAddress);

    #[event("gameAbandoned")]
    fn game_abandoned_event(
        &self,
        #[indexed] game_id: u64,
        #[indexed] winner: ManagedAddress,
        blocks_elapsed: u64,
    );

    #[event("tournamentResultReported")]
    fn tournament_result_reported_event(
        &self,
        #[indexed] game_id: u64,
        #[indexed] tournament_id: u64,
        #[indexed] match_id: u64,
        #[indexed] winner: ManagedAddress,
    );

    #[event("nftWinRecorded")]
    fn nft_win_recorded_event(
        &self,
        #[indexed] game_id: u64,
        #[indexed] winner: ManagedAddress,
        #[indexed] ship_nonce: u64,
    );

    #[event("stakingFeeSent")]
    fn staking_fee_sent_event(&self, #[indexed] game_id: u64, fee_amount: BigUint);

    // ── Owner config ─────────────────────────────────────────────────────────

    #[only_owner]
    #[endpoint(setTournamentContract)]
    fn set_tournament_contract(&self, addr: ManagedAddress) {
        self.tournament_contract().set(addr);
    }

    #[only_owner]
    #[endpoint(setNftContract)]
    fn set_nft_contract(&self, addr: ManagedAddress) {
        self.nft_contract().set(addr);
    }

    #[only_owner]
    #[endpoint(setStakingContract)]
    fn set_staking_contract(&self, addr: ManagedAddress) {
        self.staking_contract().set(addr);
    }

    // ── Endpoints ───────────────────────────────────────────────────────────

    #[payable("EGLD")]
    #[endpoint(createGame)]
    fn create_game(&self, ship_nonce: u64) -> u64 {
        let bet = self.call_value().egld_value().clone_value();
        require!(bet > 0u64, "Bet must be greater than 0");
        let caller = self.blockchain().get_caller();
        let game_id = self.game_counter().get() + 1;
        self.game_counter().set(game_id);
        // ✅ Supernova: record creation block nonce
        let current_nonce = self.blockchain().get_block_nonce();

        let state = GameState {
            creator: caller.clone(),
            opponent: None,
            bet,
            phase: GamePhase::WaitingForOpponent,
            current_turn: 0,
            winner: None,
            winner_ship_nonce: 0,
            tournament_id: 0,
            tournament_match_id: 0,
            last_action_nonce: current_nonce,
        };
        self.game_state(game_id).set(&state);
        self.player_games(&caller).insert(game_id);
        self.player_ship_nonce(game_id, 0).set(ship_nonce);
        self.game_created_event(game_id, caller);
        game_id
    }

    #[endpoint(createTournamentGame)]
    fn create_tournament_game(
        &self,
        player1: ManagedAddress,
        player2: ManagedAddress,
        tournament_id: u64,
        match_id: u64,
        p1_ship_nonce: u64,
        p2_ship_nonce: u64,
    ) -> u64 {
        let caller = self.blockchain().get_caller();
        let owner = self.blockchain().get_owner_address();
        let t_contract = self.tournament_contract().get();
        require!(
            caller == owner || caller == t_contract,
            "Unauthorized: only owner or tournament contract"
        );

        let game_id = self.game_counter().get() + 1;
        self.game_counter().set(game_id);
        let current_nonce = self.blockchain().get_block_nonce();

        let state = GameState {
            creator: player1.clone(),
            opponent: Some(player2.clone()),
            bet: BigUint::zero(),
            phase: GamePhase::PlacingShips,
            current_turn: 0,
            winner: None,
            winner_ship_nonce: 0,
            tournament_id,
            tournament_match_id: match_id,
            last_action_nonce: current_nonce,
        };
        self.game_state(game_id).set(&state);
        self.player_games(&player1).insert(game_id);
        self.player_games(&player2).insert(game_id);
        self.player_ship_nonce(game_id, 0).set(p1_ship_nonce);
        self.player_ship_nonce(game_id, 1).set(p2_ship_nonce);
        self.game_created_event(game_id, player1);
        game_id
    }

    #[payable("EGLD")]
    #[endpoint(joinGame)]
    fn join_game(&self, game_id: u64, ship_nonce: u64) {
        let payment = self.call_value().egld_value().clone_value();
        let caller = self.blockchain().get_caller();

        let mut state = self.game_state(game_id).get();
        require!(state.phase == GamePhase::WaitingForOpponent, "Game not waiting");
        require!(caller != state.creator, "Creator cannot join");
        require!(payment == state.bet, "Wrong bet amount");

        // ✅ Update last_action_nonce on join
        state.last_action_nonce = self.blockchain().get_block_nonce();
        state.opponent = Some(caller.clone());
        state.phase = GamePhase::PlacingShips;
        self.game_state(game_id).set(&state);
        self.player_games(&caller).insert(game_id);
        self.player_ship_nonce(game_id, 1).set(ship_nonce);
        self.game_joined_event(game_id, caller);
    }

    #[endpoint(placeShips)]
    fn place_ships(
        &self,
        game_id: u64,
        positions: MultiValueEncoded<MultiValue4<u8, u8, u8, bool>>,
    ) {
        let caller = self.blockchain().get_caller();
        let mut state = self.game_state(game_id).get();
        require!(state.phase == GamePhase::PlacingShips, "Not in placement phase");

        let player_idx = self.get_player_idx(&state, &caller);
        require!(!self.ships_placed(game_id, player_idx).get(), "Ships already placed");

        let pos_vec: ManagedVec<MultiValue4<u8, u8, u8, bool>> = positions.to_vec();
        require!(pos_vec.len() == MAX_SHIPS, "Must place exactly 5 ships");

        let mut occupied: ArrayVec<u8, 25> = ArrayVec::new();
        for i in 0..MAX_SHIPS {
            let (x, y, length, is_vertical) = pos_vec.get(i).into_tuple();
            let expected_len = SHIP_LENGTHS[i];
            require!(length == expected_len, "Invalid ship length");
            require!(x < BOARD_SIZE && y < BOARD_SIZE, "Ship out of bounds");

            let mut ship = ShipData { cells: ArrayVec::new(), hits: 0, length, sunk: false };
            for step in 0..length {
                let (cx, cy) = if is_vertical { (x + step, y) } else { (x, y + step) };
                require!(cx < BOARD_SIZE && cy < BOARD_SIZE, "Ship extends OOB");
                let cell = cx * BOARD_SIZE + cy;
                require!(!occupied.contains(&cell), "Ships overlap");
                occupied.push(cell);
                ship.cells.push(cell);
            }
            self.ships(game_id, player_idx).push(&ship);
        }

        self.ships_placed(game_id, player_idx).set(true);
        // ✅ Update last_action_nonce on ship placement
        state.last_action_nonce = self.blockchain().get_block_nonce();
        self.ships_placed_event(game_id, caller);

        let other_idx = 1 - player_idx;
        if self.ships_placed(game_id, other_idx).get() {
            state.phase = GamePhase::InProgress;
            state.current_turn = 0;
        }
        self.game_state(game_id).set(&state);
    }

    #[endpoint(attack)]
    fn attack(&self, game_id: u64, x: u8, y: u8) -> AttackResult {
        require!(x < BOARD_SIZE && y < BOARD_SIZE, "OOB");
        let cell = x * BOARD_SIZE + y;

        let caller = self.blockchain().get_caller();
        let mut state = self.game_state(game_id).get();
        require!(state.phase == GamePhase::InProgress, "Not in progress");

        let player_idx = self.get_player_idx(&state, &caller);
        require!(state.current_turn == player_idx, "Not your turn");

        let opponent_idx = 1 - player_idx;
        require!(!self.attacked(game_id, opponent_idx).contains(&cell), "Already attacked");
        self.attacked(game_id, opponent_idx).insert(cell);

        // ✅ Update last_action_nonce on every attack
        state.last_action_nonce = self.blockchain().get_block_nonce();

        let ship_count = self.ships(game_id, opponent_idx).len();
        let mut hit = false;
        let mut sunk = false;

        for idx in 1..=ship_count {
            let mut ship = self.ships(game_id, opponent_idx).get(idx);
            if ship.cells.contains(&cell) && !ship.sunk {
                ship.hits += 1;
                hit = true;
                if ship.hits >= ship.length { ship.sunk = true; sunk = true; }
                self.ships(game_id, opponent_idx).set(idx, &ship);
                break;
            }
        }

        let all_sunk = if sunk {
            (1..=ship_count).all(|idx| self.ships(game_id, opponent_idx).get(idx).sunk)
        } else { false };

        let result = if all_sunk { AttackResult::GameOver }
            else if sunk { AttackResult::Sunk }
            else if hit  { AttackResult::Hit }
            else         { AttackResult::Miss };

        self.attack_made_event(game_id, caller.clone(), x, y, result.clone());

        if result == AttackResult::GameOver {
            let winner_ship_nonce = self.player_ship_nonce(game_id, player_idx).get();

            if state.tournament_id == 0 {
                let total_pot = state.bet.clone() * 2u64;
                let fee = total_pot.clone() * STAKING_FEE_BPS / 10_000u64;
                let prize = total_pot - fee.clone();
                self.send().direct_egld(&caller, &prize);
                self.notify_staking_reward(game_id, fee);
            }

            self.notify_nft_win(game_id, caller.clone(), winner_ship_nonce);

            state.phase = GamePhase::Finished;
            state.winner = Some(caller.clone());
            state.winner_ship_nonce = winner_ship_nonce;
            self.game_state(game_id).set(&state);
            self.game_over_event(game_id, caller.clone());

            if state.tournament_id != 0 {
                self.report_tournament_result(
                    game_id,
                    state.tournament_id,
                    state.tournament_match_id,
                    caller,
                );
            }
        } else {
            state.current_turn = opponent_idx;
            self.game_state(game_id).set(&state);
        }

        result
    }

    /// ✅ Supernova: claim an abandoned game by block nonce timeout.
    /// If the active player has not moved for > TURN_TIMEOUT_BLOCKS blocks,
    /// their opponent can call this to claim the pot as winner.
    #[endpoint(claimAbandonedGame)]
    fn claim_abandoned_game(&self, game_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut state = self.game_state(game_id).get();
        require!(state.phase == GamePhase::InProgress, "Game not in progress");

        let current_nonce = self.blockchain().get_block_nonce();
        // ✅ Safe: nonces are monotonically increasing — no same-block ambiguity
        let blocks_elapsed = current_nonce - state.last_action_nonce;
        require!(blocks_elapsed > TURN_TIMEOUT_BLOCKS, "Timeout not reached yet");

        // The caller must be the waiting player (not the one whose turn it is)
        let caller_idx = self.get_player_idx(&state, &caller);
        require!(
            caller_idx != state.current_turn,
            "Only the waiting player can claim abandonment"
        );

        // Caller wins — award pot minus fee
        let total_pot = state.bet.clone() * 2u64;
        let fee = total_pot.clone() * STAKING_FEE_BPS / 10_000u64;
        let prize = total_pot - fee.clone();
        self.send().direct_egld(&caller, &prize);
        self.notify_staking_reward(game_id, fee);

        state.phase = GamePhase::Finished;
        state.winner = Some(caller.clone());
        self.game_state(game_id).set(&state);

        self.game_abandoned_event(game_id, caller, blocks_elapsed);
    }

    #[endpoint(withdraw)]
    fn withdraw(&self, game_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut state = self.game_state(game_id).get();
        require!(caller == state.creator, "Only creator");
        require!(state.phase == GamePhase::WaitingForOpponent, "Cannot withdraw now");
        let bet = state.bet.clone();
        state.phase = GamePhase::Finished;
        self.game_state(game_id).set(&state);
        self.send().direct_egld(&caller, &bet);
    }

    // ── Internal: cross-contract ─────────────────────────────────────────────

    fn notify_nft_win(&self, game_id: u64, winner: ManagedAddress, ship_nonce: u64) {
        if ship_nonce == 0 { return; }
        let nft_addr = self.nft_contract().get();
        if nft_addr == ManagedAddress::zero() { return; }
        self.nft_proxy(nft_addr)
            .record_win(ship_nonce)
            .with_gas_limit(8_000_000)
            .transfer_execute();
        self.nft_win_recorded_event(game_id, winner, ship_nonce);
    }

    fn notify_staking_reward(&self, game_id: u64, fee: BigUint) {
        if fee == BigUint::zero() { return; }
        let staking_addr = self.staking_contract().get();
        if staking_addr == ManagedAddress::zero() { return; }
        self.staking_proxy(staking_addr)
            .fund_reward_pool()
            .with_egld_transfer(fee.clone())
            .with_gas_limit(8_000_000)
            .transfer_execute();
        self.staking_fee_sent_event(game_id, fee);
    }

    fn report_tournament_result(
        &self,
        game_id: u64,
        tournament_id: u64,
        match_id: u64,
        winner: ManagedAddress,
    ) {
        let t_addr = self.tournament_contract().get();
        if t_addr == ManagedAddress::zero() { return; }
        self.tournament_proxy(t_addr)
            .report_match_result(tournament_id, match_id, winner.clone())
            .with_gas_limit(10_000_000)
            .transfer_execute();
        self.tournament_result_reported_event(game_id, tournament_id, match_id, winner);
    }

    // ── Proxies ──────────────────────────────────────────────────────────────

    #[proxy]
    fn tournament_proxy(&self, sc_address: ManagedAddress) -> tournament_proxy::Proxy<Self::Api>;

    #[proxy]
    fn nft_proxy(&self, sc_address: ManagedAddress) -> nft_proxy::Proxy<Self::Api>;

    #[proxy]
    fn staking_proxy(&self, sc_address: ManagedAddress) -> staking_proxy::Proxy<Self::Api>;

    // ── Views ────────────────────────────────────────────────────────────────

    #[view(getGameState)]
    fn get_game_state(&self, game_id: u64) -> GameState<Self::Api> {
        self.game_state(game_id).get()
    }

    #[view(getPlayerGames)]
    fn get_player_games(&self, player: ManagedAddress) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for gid in self.player_games(&player).iter() { result.push(gid); }
        result
    }

    /// ✅ Supernova diagnostic: blocks remaining before turn timeout fires.
    #[view(getTurnBlocksRemaining)]
    fn get_turn_blocks_remaining(&self, game_id: u64) -> u64 {
        let state = self.game_state(game_id).get();
        if state.phase != GamePhase::InProgress { return 0u64; }
        let current_nonce = self.blockchain().get_block_nonce();
        let elapsed = current_nonce - state.last_action_nonce;
        if elapsed >= TURN_TIMEOUT_BLOCKS { 0u64 } else { TURN_TIMEOUT_BLOCKS - elapsed }
    }

    #[view(getTournamentContract)]
    fn get_tournament_contract(&self) -> ManagedAddress { self.tournament_contract().get() }

    #[view(getNftContract)]
    fn get_nft_contract(&self) -> ManagedAddress { self.nft_contract().get() }

    #[view(getStakingContract)]
    fn get_staking_contract(&self) -> ManagedAddress { self.staking_contract().get() }

    // ── Helpers ──────────────────────────────────────────────────────────────

    fn get_player_idx(&self, state: &GameState<Self::Api>, player: &ManagedAddress) -> u8 {
        if player == &state.creator { return 0; }
        if let Some(ref opp) = state.opponent {
            if player == opp { return 1; }
        }
        sc_panic!("Player not in this game");
    }
}

// ── Proxy modules ────────────────────────────────────────────────────────────

mod tournament_proxy {
    multiversx_sc::imports!();
    #[multiversx_sc::proxy]
    pub trait TournamentContract {
        #[endpoint(reportMatchResult)]
        fn report_match_result(
            &self,
            tournament_id: u64,
            match_id: u64,
            winner_address: ManagedAddress,
        );
    }
}

mod nft_proxy {
    multiversx_sc::imports!();
    #[multiversx_sc::proxy]
    pub trait NftContract {
        #[endpoint(recordWin)]
        fn record_win(&self, nonce: u64);
    }
}

mod staking_proxy {
    multiversx_sc::imports!();
    #[multiversx_sc::proxy]
    pub trait StakingContract {
        #[payable("EGLD")]
        #[endpoint(fundRewardPool)]
        fn fund_reward_pool(&self);
    }
}
