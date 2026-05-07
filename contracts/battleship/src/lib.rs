#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Maximum number of ships per player
const MAX_SHIPS: usize = 5;
/// Board size (10x10)
const BOARD_SIZE: u8 = 10;
/// Ship lengths for the 5 standard ships
const SHIP_LENGTHS: [u8; 5] = [5, 4, 3, 3, 2];

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
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub struct ShipData {
    /// Encoded as (x * 10 + y) for each cell the ship occupies
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

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, PartialEq)]
pub enum AttackResult {
    Hit,
    Miss,
    Sunk,
    GameOver,
}

#[multiversx_sc::contract]
pub trait Battleship {
    // ─── Init ──────────────────────────────────────────────────────────────────

    #[init]
    fn init(&self) {
        self.game_counter().set(0u64);
    }

    // ─── Storage ───────────────────────────────────────────────────────────────

    #[storage_mapper("game_counter")]
    fn game_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("game_state")]
    fn game_state(&self, game_id: u64) -> SingleValueMapper<GameState<Self::Api>>;

    #[storage_mapper("player_games")]
    fn player_games(&self, player: &ManagedAddress) -> UnorderedSetMapper<u64>;

    /// Stores ships for (game_id, player_index 0|1)
    #[storage_mapper("ships")]
    fn ships(&self, game_id: u64, player_idx: u8) -> VecMapper<ShipData>;

    /// Bitboard of attacked cells for (game_id, player_idx)
    #[storage_mapper("attacked")]
    fn attacked(&self, game_id: u64, player_idx: u8) -> UnorderedSetMapper<u8>;

    /// Whether a player has placed ships: (game_id, player_idx)
    #[storage_mapper("ships_placed")]
    fn ships_placed(&self, game_id: u64, player_idx: u8) -> SingleValueMapper<bool>;

    // ─── Events ────────────────────────────────────────────────────────────────

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

    // ─── Endpoints ─────────────────────────────────────────────────────────────

    /// Create a new game. Caller sends the bet amount in EGLD.
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
        };
        self.game_state(game_id).set(&state);
        self.player_games(&caller).insert(game_id);

        self.game_created_event(game_id, caller);
        game_id
    }

    /// Join an existing game. Caller must send the exact same bet.
    #[payable("EGLD")]
    #[endpoint(joinGame)]
    fn join_game(&self, game_id: u64) {
        let payment = self.call_value().egld_value().clone_value();
        let caller = self.blockchain().get_caller();

        let mut state = self.game_state(game_id).get();
        require!(
            state.phase == GamePhase::WaitingForOpponent,
            "Game is not waiting for an opponent"
        );
        require!(caller != state.creator, "Creator cannot join their own game");
        require!(payment == state.bet, "Payment must match the game bet");

        state.opponent = Some(caller.clone());
        state.phase = GamePhase::PlacingShips;
        self.game_state(game_id).set(&state);
        self.player_games(&caller).insert(game_id);

        self.game_joined_event(game_id, caller);
    }

    /// Place ships for the caller in the given game.
    /// Expects exactly 5 ships with lengths [5,4,3,3,2] in any order.
    #[endpoint(placeShips)]
    fn place_ships(
        &self,
        game_id: u64,
        positions: MultiValueEncoded<MultiValue4<u8, u8, u8, bool>>,
    ) {
        let caller = self.blockchain().get_caller();
        let mut state = self.game_state(game_id).get();
        require!(
            state.phase == GamePhase::PlacingShips,
            "Game is not in placement phase"
        );

        let player_idx = self.get_player_idx(&state, &caller);
        require!(
            !self.ships_placed(game_id, player_idx).get(),
            "Ships already placed"
        );

        let pos_vec: ManagedVec<MultiValue4<u8, u8, u8, bool>> = positions.to_vec();
        require!(pos_vec.len() == MAX_SHIPS, "Must place exactly 5 ships");

        // Validate and store each ship
        let mut occupied: ArrayVec<u8, 25> = ArrayVec::new(); // max 5+4+3+3+2 = 17 cells
        for i in 0..MAX_SHIPS {
            let (x, y, length, is_vertical) = pos_vec.get(i).into_tuple();
            let expected_len = SHIP_LENGTHS[i];
            require!(length == expected_len, "Invalid ship length");
            require!(x < BOARD_SIZE && y < BOARD_SIZE, "Ship out of bounds");

            let mut ship = ShipData {
                cells: ArrayVec::new(),
                hits: 0,
                length,
                sunk: false,
            };

            for step in 0..length {
                let (cx, cy) = if is_vertical {
                    (x + step, y)
                } else {
                    (x, y + step)
                };
                require!(cx < BOARD_SIZE && cy < BOARD_SIZE, "Ship extends out of bounds");
                let cell = cx * BOARD_SIZE + cy;
                require!(!occupied.contains(&cell), "Ships overlap");
                occupied.push(cell);
                ship.cells.push(cell);
            }
            self.ships(game_id, player_idx).push(&ship);
        }

        self.ships_placed(game_id, player_idx).set(true);
        self.ships_placed_event(game_id, caller);

        // If both players placed, start the game
        let other_idx = 1 - player_idx;
        if self.ships_placed(game_id, other_idx).get() {
            state.phase = GamePhase::InProgress;
            state.current_turn = 0; // creator goes first
            self.game_state(game_id).set(&state);
        }
    }

    /// Attack a cell on the opponent's board.
    #[endpoint(attack)]
    fn attack(&self, game_id: u64, x: u8, y: u8) -> AttackResult {
        require!(x < BOARD_SIZE && y < BOARD_SIZE, "Coordinates out of bounds");
        let cell = x * BOARD_SIZE + y;

        let caller = self.blockchain().get_caller();
        let mut state = self.game_state(game_id).get();
        require!(state.phase == GamePhase::InProgress, "Game is not in progress");

        let player_idx = self.get_player_idx(&state, &caller);
        require!(state.current_turn == player_idx, "Not your turn");

        let opponent_idx = 1 - player_idx;
        require!(
            !self.attacked(game_id, opponent_idx).contains(&cell),
            "Cell already attacked"
        );
        self.attacked(game_id, opponent_idx).insert(cell);

        // Check hit against opponent ships
        let ship_count = self.ships(game_id, opponent_idx).len();
        let mut hit = false;
        let mut sunk = false;

        for idx in 1..=ship_count {
            let mut ship = self.ships(game_id, opponent_idx).get(idx);
            if ship.cells.contains(&cell) && !ship.sunk {
                ship.hits += 1;
                hit = true;
                if ship.hits >= ship.length {
                    ship.sunk = true;
                    sunk = true;
                }
                self.ships(game_id, opponent_idx).set(idx, &ship);
                break;
            }
        }

        // Check if all opponent ships are sunk
        let all_sunk = if sunk {
            let mut count = 0usize;
            for idx in 1..=ship_count {
                if self.ships(game_id, opponent_idx).get(idx).sunk {
                    count += 1;
                }
            }
            count == ship_count
        } else {
            false
        };

        let result = if all_sunk {
            AttackResult::GameOver
        } else if sunk {
            AttackResult::Sunk
        } else if hit {
            AttackResult::Hit
        } else {
            AttackResult::Miss
        };

        self.attack_made_event(game_id, caller.clone(), x, y, result.clone());

        if result == AttackResult::GameOver {
            // Pay out total pot to winner
            let prize = state.bet.clone() * 2u64;
            state.phase = GamePhase::Finished;
            state.winner = Some(caller.clone());
            self.game_state(game_id).set(&state);
            self.game_over_event(game_id, caller.clone());
            self.send().direct_egld(&caller, &prize);
        } else {
            // Switch turns
            state.current_turn = opponent_idx;
            self.game_state(game_id).set(&state);
        }

        result
    }

    /// Creator can withdraw their bet if no opponent has joined yet.
    #[endpoint(withdraw)]
    fn withdraw(&self, game_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut state = self.game_state(game_id).get();
        require!(caller == state.creator, "Only the creator can withdraw");
        require!(
            state.phase == GamePhase::WaitingForOpponent,
            "Can only withdraw before an opponent joins"
        );

        let bet = state.bet.clone();
        state.phase = GamePhase::Finished;
        self.game_state(game_id).set(&state);
        self.send().direct_egld(&caller, &bet);
    }

    // ─── Views ─────────────────────────────────────────────────────────────────

    #[view(getGameState)]
    fn get_game_state(&self, game_id: u64) -> GameState<Self::Api> {
        self.game_state(game_id).get()
    }

    #[view(getPlayerGames)]
    fn get_player_games(&self, player: ManagedAddress) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for gid in self.player_games(&player).iter() {
            result.push(gid);
        }
        result
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    fn get_player_idx(&self, state: &GameState<Self::Api>, player: &ManagedAddress) -> u8 {
        if player == &state.creator {
            return 0;
        }
        if let Some(ref opp) = state.opponent {
            if player == opp {
                return 1;
            }
        }
        sc_panic!("Player is not part of this game");
    }
}
