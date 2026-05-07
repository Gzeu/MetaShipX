#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Maximum number of ships per player
const MAX_SHIPS: usize = 5;
/// Board size (10x10)
const BOARD_SIZE: u8 = 10;
/// Ship lengths for the 5 standard ships
const SHIP_LENGTHS: [u8; 5] = [5, 4, 3, 3, 2];

// ── Types ───────────────────────────────────────────────────────────────────

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, PartialEq, Clone)]
pub enum GamePhase {
    WaitingForOpponent,
    PlacingShips,
    InProgress,
    Finished,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub struct GameState<M: ManagedTypeApi> {
    pub creator: ManagedAddress<M>,
    pub opponent: Option<ManagedAddress<M>>,
    pub bet: BigUint<M>,
    pub phase: GamePhase,
    /// 0 = creator's turn, 1 = opponent's turn
    pub current_turn: u8,
    pub winner: Option<ManagedAddress<M>>,
    /// If non-zero, this game is part of a tournament match
    pub tournament_id: u64,
    pub tournament_match_id: u64,
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

// ── Contract ────────────────────────────────────────────────────────────────

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

    /// Address of the deployed tournament contract (optional; 0 = no integration)
    #[storage_mapper("tournament_contract")]
    fn tournament_contract(&self) -> SingleValueMapper<ManagedAddress>;

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

    #[event("tournamentResultReported")]
    fn tournament_result_reported_event(
        &self,
        #[indexed] game_id: u64,
        #[indexed] tournament_id: u64,
        #[indexed] match_id: u64,
        #[indexed] winner: ManagedAddress,
    );

    // ── Owner Config ────────────────────────────────────────────────────────

    /// Set the tournament contract address so battleship can auto-report results.
    #[only_owner]
    #[endpoint(setTournamentContract)]
    fn set_tournament_contract(&self, addr: ManagedAddress) {
        self.tournament_contract().set(addr);
    }

    // ── Endpoints ───────────────────────────────────────────────────────────

    /// Create a regular game (no tournament).
    #[payable("EGLD")]
    #[endpoint(createGame)]
    fn create_game(&self) -> u64 {
        let bet = self.call_value().egld_value().clone_value();
        require!(bet > 0u64, "Bet must be greater than 0");
        let caller = self.blockchain().get_caller();
        let game_id = self.game_counter().get() + 1;
        self.game_counter().set(game_id);

        let state = GameState {
            creator: caller.clone(),
            opponent: None,
            bet,
            phase: GamePhase::WaitingForOpponent,
            current_turn: 0,
            winner: None,
            tournament_id: 0,
            tournament_match_id: 0,
        };
        self.game_state(game_id).set(&state);
        self.player_games(&caller).insert(game_id);
        self.game_created_event(game_id, caller);
        game_id
    }

    /// Create a tournament match game (called by tournament contract or owner).
    /// No bet required — prize is handled by the tournament contract.
    #[endpoint(createTournamentGame)]
    fn create_tournament_game(
        &self,
        player1: ManagedAddress,
        player2: ManagedAddress,
        tournament_id: u64,
        match_id: u64,
    ) -> u64 {
        // Only tournament contract or owner may call this
        let caller = self.blockchain().get_caller();
        let owner = self.blockchain().get_owner_address();
        let t_contract = self.tournament_contract().get();
        require!(
            caller == owner || caller == t_contract,
            "Unauthorized: only owner or tournament contract"
        );

        let game_id = self.game_counter().get() + 1;
        self.game_counter().set(game_id);

        let state = GameState {
            creator: player1.clone(),
            opponent: Some(player2.clone()),
            bet: BigUint::zero(),
            phase: GamePhase::PlacingShips,
            current_turn: 0,
            winner: None,
            tournament_id,
            tournament_match_id: match_id,
        };
        self.game_state(game_id).set(&state);
        self.player_games(&player1).insert(game_id);
        self.player_games(&player2).insert(game_id);
        self.game_created_event(game_id, player1);
        game_id
    }

    /// Join an existing regular game.
    #[payable("EGLD")]
    #[endpoint(joinGame)]
    fn join_game(&self, game_id: u64) {
        let payment = self.call_value().egld_value().clone_value();
        let caller = self.blockchain().get_caller();

        let mut state = self.game_state(game_id).get();
        require!(state.phase == GamePhase::WaitingForOpponent, "Game not waiting");
        require!(caller != state.creator, "Creator cannot join");
        require!(payment == state.bet, "Wrong bet amount");

        state.opponent = Some(caller.clone());
        state.phase = GamePhase::PlacingShips;
        self.game_state(game_id).set(&state);
        self.player_games(&caller).insert(game_id);
        self.game_joined_event(game_id, caller);
    }

    /// Place ships.
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
        self.ships_placed_event(game_id, caller);

        let other_idx = 1 - player_idx;
        if self.ships_placed(game_id, other_idx).get() {
            state.phase = GamePhase::InProgress;
            state.current_turn = 0;
            self.game_state(game_id).set(&state);
        }
    }

    /// Attack a cell.
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
            // Regular game: pay out 2x bet to winner
            if state.tournament_id == 0 {
                let prize = state.bet.clone() * 2u64;
                self.send().direct_egld(&caller, &prize);
            }

            state.phase = GamePhase::Finished;
            state.winner = Some(caller.clone());
            self.game_state(game_id).set(&state);
            self.game_over_event(game_id, caller.clone());

            // ── Tournament integration ──────────────────────────────────────
            // If this game belongs to a tournament, notify the tournament SC
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

    /// Creator withdraws bet when no opponent joined yet.
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

    // ── Internal: cross-contract call to tournament ──────────────────────────

    fn report_tournament_result(
        &self,
        game_id: u64,
        tournament_id: u64,
        match_id: u64,
        winner: ManagedAddress,
    ) {
        let t_addr = self.tournament_contract().get();
        // Skip if tournament contract not configured
        if t_addr == ManagedAddress::zero() { return; }

        // Async cross-contract call — fire and forget
        // Gas: 10M is sufficient for reportMatchResult endpoint
        self.tournament_proxy(t_addr)
            .report_match_result(tournament_id, match_id, winner.clone())
            .with_gas_limit(10_000_000)
            .transfer_execute();

        self.tournament_result_reported_event(game_id, tournament_id, match_id, winner);
    }

    // ── Proxy for tournament contract ────────────────────────────────────────

    #[proxy]
    fn tournament_proxy(&self, sc_address: ManagedAddress) -> tournament_proxy::Proxy<Self::Api>;

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

    #[view(getTournamentContract)]
    fn get_tournament_contract(&self) -> ManagedAddress {
        self.tournament_contract().get()
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    fn get_player_idx(&self, state: &GameState<Self::Api>, player: &ManagedAddress) -> u8 {
        if player == &state.creator { return 0; }
        if let Some(ref opp) = state.opponent {
            if player == opp { return 1; }
        }
        sc_panic!("Player not in this game");
    }
}

// ── Tournament SC proxy (generated types) ───────────────────────────────────

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
