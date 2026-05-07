#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

// ── Types ──────────────────────────────────────────────────────────────────

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone, PartialEq)]
pub enum TournamentStatus {
    Registration,
    Active,
    Completed,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone, PartialEq)]
pub enum MatchStatus {
    Pending,
    Active,
    Completed,
    Bye,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct Player<M: ManagedTypeApi> {
    pub address: ManagedAddress<M>,
    pub seed: u32,
    pub wins: u32,
    pub eliminated: bool,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct BracketMatch<M: ManagedTypeApi> {
    pub match_id: u64,
    pub round: u32,
    pub match_index: u32,
    pub player1_seed: u32,          // 0 = TBD
    pub player2_seed: u32,          // 0 = TBD / BYE
    pub winner_seed: u32,           // 0 = not decided
    pub game_id: u64,               // 0 = no game yet
    pub status: MatchStatus,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct TournamentInfo<M: ManagedTypeApi> {
    pub id: u64,
    pub name: ManagedBuffer<M>,
    pub entry_fee: BigUint<M>,
    pub prize_pool: BigUint<M>,
    pub max_players: u32,
    pub registered: u32,
    pub rounds: u32,
    pub status: TournamentStatus,
    pub start_time: u64,
    pub winner: ManagedAddress<M>,
}

// ── Contract ───────────────────────────────────────────────────────────────

#[multiversx_sc::contract]
pub trait TournamentContract {

    // ── Init ────────────────────────────────────────────────────────────────

    #[init]
    fn init(&self) {
        self.tournament_count().set(0u64);
    }

    // ── Owner: Create Tournament ────────────────────────────────────────────

    /// Create a new tournament. entry_fee in EGLD (0 = free).
    /// max_players must be a power of 2 (4, 8, 16, 32).
    #[only_owner]
    #[endpoint(createTournament)]
    fn create_tournament(
        &self,
        name: ManagedBuffer,
        entry_fee: BigUint,
        max_players: u32,
        start_time: u64,
    ) -> u64 {
        require!(
            max_players == 4 || max_players == 8 || max_players == 16 || max_players == 32,
            "max_players must be 4/8/16/32"
        );

        let id = self.tournament_count().get() + 1;
        self.tournament_count().set(id);

        let rounds = self.log2(max_players);

        let info = TournamentInfo {
            id,
            name,
            entry_fee,
            prize_pool: BigUint::zero(),
            max_players,
            registered: 0,
            rounds,
            status: TournamentStatus::Registration,
            start_time,
            winner: ManagedAddress::zero(),
        };
        self.tournament_info(id).set(info);
        self.emit_tournament_created(id);
        id
    }

    // ── Register ────────────────────────────────────────────────────────────

    /// Player registers by paying entry_fee in EGLD.
    #[payable("EGLD")]
    #[endpoint(register)]
    fn register(&self, tournament_id: u64) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld_value().clone_value();

        let mut info = self.tournament_info(tournament_id).get();
        require!(info.status == TournamentStatus::Registration, "Registration closed");
        require!(info.registered < info.max_players, "Tournament full");
        require!(payment == info.entry_fee, "Wrong entry fee");
        require!(!self.is_registered(tournament_id, &caller), "Already registered");

        let seed = info.registered + 1;
        let player = Player {
            address: caller.clone(),
            seed,
            wins: 0,
            eliminated: false,
        };

        self.player_info(tournament_id, seed).set(player);
        self.player_seed(tournament_id, &caller).set(seed);
        info.registered += 1;
        info.prize_pool += payment;
        self.tournament_info(tournament_id).set(info.clone());

        // Auto-start if full
        if info.registered == info.max_players {
            self.start_tournament_internal(tournament_id);
        }

        self.emit_player_registered(tournament_id, seed, caller);
    }

    // ── Owner: Force Start ──────────────────────────────────────────────────

    /// Start tournament early (handles byes for non-power-of-2 player count).
    #[only_owner]
    #[endpoint(startTournament)]
    fn start_tournament(&self, tournament_id: u64) {
        let info = self.tournament_info(tournament_id).get();
        require!(info.status == TournamentStatus::Registration, "Already started");
        require!(info.registered >= 2, "Need at least 2 players");
        self.start_tournament_internal(tournament_id);
    }

    // ── Report Match Result ─────────────────────────────────────────────────

    /// Called by battleship contract (or owner) when a match game concludes.
    #[endpoint(reportMatchResult)]
    fn report_match_result(
        &self,
        tournament_id: u64,
        match_id: u64,
        winner_address: ManagedAddress,
    ) {
        // Only owner or battleship contract may report
        let caller = self.blockchain().get_caller();
        let owner = self.blockchain().get_owner_address();
        let battleship_sc = self.battleship_contract().get();
        require!(
            caller == owner || caller == battleship_sc,
            "Unauthorized"
        );

        let mut m = self.match_info(tournament_id, match_id).get();
        require!(m.status == MatchStatus::Active, "Match not active");

        let winner_seed = self.player_seed(tournament_id, &winner_address).get();
        require!(winner_seed > 0, "Winner not in tournament");
        require!(
            winner_seed == m.player1_seed || winner_seed == m.player2_seed,
            "Winner not in this match"
        );

        m.winner_seed = winner_seed;
        m.status = MatchStatus::Completed;
        self.match_info(tournament_id, match_id).set(m.clone());

        // Update player wins
        let mut winner_player = self.player_info(tournament_id, winner_seed).get();
        winner_player.wins += 1;
        self.player_info(tournament_id, winner_seed).set(winner_player);

        // Eliminate loser
        let loser_seed = if winner_seed == m.player1_seed { m.player2_seed } else { m.player1_seed };
        if loser_seed > 0 {
            let mut loser = self.player_info(tournament_id, loser_seed).get();
            loser.eliminated = true;
            self.player_info(tournament_id, loser_seed).set(loser);
        }

        // Advance winner to next round
        self.advance_bracket(tournament_id, &m, winner_seed);

        self.emit_match_result(tournament_id, match_id, winner_seed);
    }

    // ── Internal: bracket generation ────────────────────────────────────────

    fn start_tournament_internal(&self, tournament_id: u64) {
        let mut info = self.tournament_info(tournament_id).get();
        info.status = TournamentStatus::Active;
        self.tournament_info(tournament_id).set(info.clone());

        // Generate round 1 matchups (seed 1 vs seed max, 2 vs max-1 …)
        let n = info.max_players;
        let matches_r1 = n / 2;
        for i in 0..matches_r1 {
            let s1 = i + 1;
            let s2 = n - i;
            let match_id = self.next_match_id().get() + 1;
            self.next_match_id().set(match_id);

            let (p1, p2, status) = if s2 > info.registered {
                // BYE: s1 advances automatically
                (s1, 0, MatchStatus::Bye)
            } else {
                (s1, s2, MatchStatus::Active)
            };

            let m = BracketMatch {
                match_id,
                round: 1,
                match_index: i,
                player1_seed: p1,
                player2_seed: p2,
                winner_seed: if status == MatchStatus::Bye { s1 } else { 0 },
                game_id: 0,
                status: status.clone(),
            };
            self.match_info(tournament_id, match_id).set(m);
            self.round_matches(tournament_id, 1).push(&match_id);

            // If BYE, immediately advance
            if status == MatchStatus::Bye {
                self.pending_advances(tournament_id, 1).push(&s1);
            }
        }

        // Build skeleton for rounds 2..rounds with Pending matches
        for r in 2..=info.rounds {
            let matches_in_round = n / (1u32 << r);
            for i in 0..matches_in_round {
                let match_id = self.next_match_id().get() + 1;
                self.next_match_id().set(match_id);
                let m = BracketMatch {
                    match_id,
                    round: r,
                    match_index: i,
                    player1_seed: 0,
                    player2_seed: 0,
                    winner_seed: 0,
                    game_id: 0,
                    status: MatchStatus::Pending,
                };
                self.match_info(tournament_id, match_id).set(m);
                self.round_matches(tournament_id, r).push(&match_id);
            }
        }

        // Flush BYE advances into round 2
        self.flush_advances(tournament_id, 1);
    }

    fn advance_bracket(&self, tournament_id: u64, finished_match: &BracketMatch<Self::Api>, winner_seed: u32) {
        let next_round = finished_match.round + 1;
        let info = self.tournament_info(tournament_id).get();

        if next_round > info.rounds {
            // Tournament over
            self.finalize_tournament(tournament_id, winner_seed);
            return;
        }

        self.pending_advances(tournament_id, finished_match.round).push(&winner_seed);
        self.flush_advances(tournament_id, finished_match.round);
    }

    fn flush_advances(&self, tournament_id: u64, from_round: u32) {
        let next_round = from_round + 1;
        let info = self.tournament_info(tournament_id).get();
        if next_round > info.rounds { return; }

        let advances = self.pending_advances(tournament_id, from_round);
        let advance_len = advances.len();
        if advance_len < 2 { return; }

        // Take pairs from pending_advances and fill next-round Pending slots
        let next_round_matches = self.round_matches(tournament_id, next_round);
        for match_idx in 0..next_round_matches.len() {
            let match_id = next_round_matches.get(match_idx + 1);
            let mut m = self.match_info(tournament_id, match_id).get();
            if m.status != MatchStatus::Pending { continue; }
            if m.player1_seed == 0 {
                // Need first player for this match
                let adv_idx = match_idx * 2 + 1;
                if adv_idx <= advance_len {
                    m.player1_seed = advances.get(adv_idx);
                    self.match_info(tournament_id, match_id).set(m.clone());
                }
            }
            if m.player2_seed == 0 {
                let adv_idx = match_idx * 2 + 2;
                if adv_idx <= advance_len {
                    m.player2_seed = advances.get(adv_idx);
                    m.status = MatchStatus::Active;
                    self.match_info(tournament_id, match_id).set(m);
                }
            }
        }
    }

    fn finalize_tournament(&self, tournament_id: u64, winner_seed: u32) {
        let mut info = self.tournament_info(tournament_id).get();
        info.status = TournamentStatus::Completed;
        let winner_player = self.player_info(tournament_id, winner_seed).get();
        info.winner = winner_player.address.clone();
        self.tournament_info(tournament_id).set(info.clone());

        // Send prize to winner (90% winner, 10% owner)
        let prize = info.prize_pool.clone();
        let owner_cut = &prize * 10u64 / 100u64;
        let winner_cut = &prize - &owner_cut;

        self.send().direct_egld(&winner_player.address, &winner_cut);
        self.send().direct_egld(&self.blockchain().get_owner_address(), &owner_cut);

        self.emit_tournament_completed(tournament_id, winner_seed, winner_cut);
    }

    // ── Helper ──────────────────────────────────────────────────────────────

    fn is_registered(&self, tournament_id: u64, address: &ManagedAddress) -> bool {
        self.player_seed(tournament_id, address).get() > 0
    }

    fn log2(&self, n: u32) -> u32 {
        let mut v = n;
        let mut r = 0u32;
        while v > 1 { v >>= 1; r += 1; }
        r
    }

    // ── Storage ─────────────────────────────────────────────────────────────

    #[storage_mapper("tournament_count")]
    fn tournament_count(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("next_match_id")]
    fn next_match_id(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("tournament_info")]
    fn tournament_info(&self, id: u64) -> SingleValueMapper<TournamentInfo<Self::Api>>;

    #[storage_mapper("player_info")]
    fn player_info(&self, tournament_id: u64, seed: u32) -> SingleValueMapper<Player<Self::Api>>;

    #[storage_mapper("player_seed")]
    fn player_seed(&self, tournament_id: u64, address: &ManagedAddress) -> SingleValueMapper<u32>;

    #[storage_mapper("match_info")]
    fn match_info(&self, tournament_id: u64, match_id: u64) -> SingleValueMapper<BracketMatch<Self::Api>>;

    #[storage_mapper("round_matches")]
    fn round_matches(&self, tournament_id: u64, round: u32) -> VecMapper<u64>;

    /// Seeds awaiting placement in next round
    #[storage_mapper("pending_advances")]
    fn pending_advances(&self, tournament_id: u64, round: u32) -> VecMapper<u32>;

    #[storage_mapper("battleship_contract")]
    fn battleship_contract(&self) -> SingleValueMapper<ManagedAddress>;

    // ── Views ────────────────────────────────────────────────────────────────

    #[view(getTournamentInfo)]
    fn get_tournament_info(&self, id: u64) -> TournamentInfo<Self::Api> {
        self.tournament_info(id).get()
    }

    #[view(getTournamentCount)]
    fn get_tournament_count(&self) -> u64 {
        self.tournament_count().get()
    }

    #[view(getRoundMatches)]
    fn get_round_matches(&self, tournament_id: u64, round: u32) -> ManagedVec<BracketMatch<Self::Api>> {
        let ids = self.round_matches(tournament_id, round);
        let mut out = ManagedVec::new();
        for i in 1..=ids.len() {
            let id = ids.get(i);
            out.push(self.match_info(tournament_id, id).get());
        }
        out
    }

    #[view(getFullBracket)]
    fn get_full_bracket(&self, tournament_id: u64) -> ManagedVec<BracketMatch<Self::Api>> {
        let info = self.tournament_info(tournament_id).get();
        let mut out = ManagedVec::new();
        for r in 1..=info.rounds {
            let ids = self.round_matches(tournament_id, r);
            for i in 1..=ids.len() {
                let id = ids.get(i);
                out.push(self.match_info(tournament_id, id).get());
            }
        }
        out
    }

    #[view(getPlayers)]
    fn get_players(&self, tournament_id: u64) -> ManagedVec<Player<Self::Api>> {
        let info = self.tournament_info(tournament_id).get();
        let mut out = ManagedVec::new();
        for seed in 1..=info.registered {
            out.push(self.player_info(tournament_id, seed).get());
        }
        out
    }

    // ── Owner config ─────────────────────────────────────────────────────────

    #[only_owner]
    #[endpoint(setBattleshipContract)]
    fn set_battleship_contract(&self, addr: ManagedAddress) {
        self.battleship_contract().set(addr);
    }

    // ── Events ───────────────────────────────────────────────────────────────

    #[event("tournament_created")]
    fn emit_tournament_created(&self, #[indexed] tournament_id: u64);

    #[event("player_registered")]
    fn emit_player_registered(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] seed: u32,
        #[indexed] address: ManagedAddress,
    );

    #[event("match_result")]
    fn emit_match_result(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] match_id: u64,
        #[indexed] winner_seed: u32,
    );

    #[event("tournament_completed")]
    fn emit_tournament_completed(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] winner_seed: u32,
        prize: BigUint,
    );
}
