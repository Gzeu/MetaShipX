//! MetaShipX — Tournament Contract
//!
//! Single-elimination bracket tournament.
//!
//! Flow:
//!   1. Owner calls `create_tournament(name, entry_fee, max_players, start_time)`
//!   2. Players call `register` (payable = entry_fee EGLD)
//!   3. At start_time owner calls `start_tournament` → bracket generated on-chain
//!   4. Battleship contract calls `report_match_result(tournament_id, winner)` after each game
//!   5. Contract auto-advances bracket; final winner claims prize pool
//!   6. Winner calls `claim_prize(tournament_id)`

#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(TypeAbi, TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq, Debug)]
pub enum TournamentStatus {
    Registration,  // accepting players
    Active,        // bracket in progress
    Finished,      // winner decided
    Cancelled,     // refunds available
}

#[derive(TypeAbi, TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Tournament<M: ManagedTypeApi> {
    pub id: u64,
    pub name: ManagedBuffer<M>,
    pub entry_fee: BigUint<M>,    // EGLD in denomination
    pub max_players: u32,
    pub start_time: u64,          // unix timestamp
    pub status: TournamentStatus,
    pub player_count: u32,
    pub current_round: u32,
    pub winner: OptionalValue<ManagedAddress<M>>,
    pub prize_pool: BigUint<M>,
    pub prize_claimed: bool,
}

#[derive(TypeAbi, TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Match<M: ManagedTypeApi> {
    pub match_id: u64,
    pub tournament_id: u64,
    pub round: u32,
    pub player_a: ManagedAddress<M>,
    pub player_b: ManagedAddress<M>,
    pub game_id: OptionalValue<u64>,  // battleship game id
    pub winner: OptionalValue<ManagedAddress<M>>,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[multiversx_sc::contract]
pub trait TournamentContract {

    // ── Init ──────────────────────────────────────────────────────────────────

    #[init]
    fn init(&self, battleship_address: ManagedAddress) {
        self.battleship_address().set(&battleship_address);
        self.tournament_counter().set(0u64);
        self.match_counter().set(0u64);
    }

    // ── Owner: create tournament ───────────────────────────────────────────────

    #[only_owner]
    #[endpoint(createTournament)]
    fn create_tournament(
        &self,
        name: ManagedBuffer,
        entry_fee: BigUint,
        max_players: u32,
        start_time: u64,
    ) -> u64 {
        require!(max_players >= 2, "min 2 players");
        require!(max_players <= 128, "max 128 players");
        // max_players must be a power of two for clean single-elim
        require!(
            max_players.count_ones() == 1,
            "max_players must be power of 2 (2,4,8,16,32,64,128)"
        );
        require!(
            start_time > self.blockchain().get_block_timestamp(),
            "start_time must be in the future"
        );

        let id = self.tournament_counter().get() + 1;
        self.tournament_counter().set(id);

        let t = Tournament {
            id,
            name,
            entry_fee,
            max_players,
            start_time,
            status: TournamentStatus::Registration,
            player_count: 0,
            current_round: 0,
            winner: OptionalValue::None,
            prize_pool: BigUint::zero(),
            prize_claimed: false,
        };
        self.tournaments(id).set(&t);

        self.tournament_created_event(id, &t.name, &t.entry_fee, max_players, start_time);
        id
    }

    // ── Register ──────────────────────────────────────────────────────────────

    #[payable("EGLD")]
    #[endpoint(register)]
    fn register(&self, tournament_id: u64) {
        let payment = self.call_value().egld_value().clone_value();
        let caller = self.blockchain().get_caller();
        let now = self.blockchain().get_block_timestamp();

        let mut t = self.tournaments(tournament_id).get();
        require!(t.status == TournamentStatus::Registration, "registration closed");
        require!(now < t.start_time, "tournament already started");
        require!(t.player_count < t.max_players, "tournament full");
        require!(payment == t.entry_fee, "wrong entry fee");
        require!(
            !self.is_registered(tournament_id, &caller).get(),
            "already registered"
        );

        self.is_registered(tournament_id, &caller).set(true);
        self.tournament_players(tournament_id).push(&caller);
        t.player_count += 1;
        t.prize_pool += &payment;
        self.tournaments(tournament_id).set(&t);

        self.player_registered_event(tournament_id, &caller);
    }

    // ── Start → generate bracket ───────────────────────────────────────────────

    #[only_owner]
    #[endpoint(startTournament)]
    fn start_tournament(&self, tournament_id: u64) {
        let mut t = self.tournaments(tournament_id).get();
        require!(t.status == TournamentStatus::Registration, "not in registration");
        require!(t.player_count >= 2, "need at least 2 players");

        t.status = TournamentStatus::Active;
        t.current_round = 1;
        self.tournaments(tournament_id).set(&t);

        // Generate round-1 matches by pairing players in registration order.
        // If player_count < max_players, remaining slots get byes (skip to round 2).
        let players = self.tournament_players(tournament_id);
        let total = players.len();
        let mut i: usize = 1;
        while i + 1 <= total {
            let pa = players.get(i);
            let pb = players.get(i + 1);
            self.create_match(tournament_id, 1, pa, pb);
            i += 2;
        }
        // Odd player out gets a bye → advance directly to round 2
        if total % 2 == 1 {
            let bye_player = players.get(total);
            self.round_advances(tournament_id, 2).push(&bye_player);
        }

        self.tournament_started_event(tournament_id, t.player_count);
    }

    // ── Report match result (called by battleship contract) ────────────────────

    #[endpoint(reportMatchResult)]
    fn report_match_result(&self, tournament_id: u64, match_id: u64, winner: ManagedAddress) {
        let caller = self.blockchain().get_caller();
        require!(
            caller == self.battleship_address().get(),
            "only battleship contract can report results"
        );

        let mut m = self.matches(match_id).get();
        require!(m.tournament_id == tournament_id, "match/tournament mismatch");
        require!(m.winner.is_none(), "match already decided");
        require!(
            winner == m.player_a || winner == m.player_b,
            "winner is not a match participant"
        );

        m.winner = OptionalValue::Some(winner.clone());
        self.matches(match_id).set(&m);

        // Advance winner to next round
        let t = self.tournaments(tournament_id).get();
        self.round_advances(tournament_id, m.round + 1).push(&winner);

        self.match_result_event(tournament_id, match_id, &winner);

        // Check if current round is complete
        self.try_advance_round(tournament_id, m.round, &t);
    }

    // ── Internal: try to start next round ─────────────────────────────────────

    fn try_advance_round(&self, tournament_id: u64, finished_round: u32, t: &Tournament<Self::Api>) {
        // Count matches in this round
        let round_matches = self.round_matches(tournament_id, finished_round).len();
        // Count decided matches
        let mut decided: usize = 0;
        for i in 1..=round_matches {
            let mid = self.round_matches(tournament_id, finished_round).get(i);
            let m = self.matches(mid).get();
            if m.winner.is_some() { decided += 1; }
        }

        if decided < round_matches { return; } // round not over yet

        // Collect all winners/bye-advances for next round
        let next_round = finished_round + 1;
        let advances = self.round_advances(tournament_id, next_round);
        let adv_count = advances.len();

        if adv_count == 1 {
            // Tournament over — single winner
            let champion = advances.get(1);
            let mut t_mut = self.tournaments(tournament_id).get();
            t_mut.status = TournamentStatus::Finished;
            t_mut.winner = OptionalValue::Some(champion.clone());
            self.tournaments(tournament_id).set(&t_mut);
            self.tournament_finished_event(tournament_id, &champion, &t_mut.prize_pool);
            return;
        }

        // Pair winners for next round
        let mut i: usize = 1;
        while i + 1 <= adv_count {
            let pa = advances.get(i);
            let pb = advances.get(i + 1);
            self.create_match(tournament_id, next_round, pa, pb);
            i += 2;
        }
        if adv_count % 2 == 1 {
            // Odd one → bye again
            let bye = advances.get(adv_count);
            self.round_advances(tournament_id, next_round + 1).push(&bye);
        }

        let mut t_mut = self.tournaments(tournament_id).get();
        t_mut.current_round = next_round;
        self.tournaments(tournament_id).set(&t_mut);
        self.round_started_event(tournament_id, next_round);
    }

    fn create_match(
        &self,
        tournament_id: u64,
        round: u32,
        player_a: ManagedAddress,
        player_b: ManagedAddress,
    ) -> u64 {
        let mid = self.match_counter().get() + 1;
        self.match_counter().set(mid);

        let m = Match {
            match_id: mid,
            tournament_id,
            round,
            player_a,
            player_b,
            game_id: OptionalValue::None,
            winner: OptionalValue::None,
        };
        self.matches(mid).set(&m);
        self.round_matches(tournament_id, round).push(&mid);
        self.match_created_event(tournament_id, mid, round, &m.player_a, &m.player_b);
        mid
    }

    // ── Link battleship game to match ──────────────────────────────────────────

    #[endpoint(linkGame)]
    fn link_game(&self, match_id: u64, game_id: u64) {
        let caller = self.blockchain().get_caller();
        require!(
            caller == self.battleship_address().get(),
            "only battleship contract"
        );
        let mut m = self.matches(match_id).get();
        m.game_id = OptionalValue::Some(game_id);
        self.matches(match_id).set(&m);
    }

    // ── Claim prize ───────────────────────────────────────────────────────────

    #[endpoint(claimPrize)]
    fn claim_prize(&self, tournament_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut t = self.tournaments(tournament_id).get();

        require!(t.status == TournamentStatus::Finished, "tournament not finished");
        require!(!t.prize_claimed, "prize already claimed");

        let winner = match t.winner.clone() {
            OptionalValue::Some(w) => w,
            OptionalValue::None => sc_panic!("no winner recorded"),
        };
        require!(caller == winner, "only winner can claim");

        // 5% fee to owner, 95% to winner
        let fee = &t.prize_pool * 5u64 / 100u64;
        let payout = &t.prize_pool - &fee;

        t.prize_claimed = true;
        self.tournaments(tournament_id).set(&t);

        self.send().direct_egld(&winner, &payout);
        self.send().direct_egld(&self.blockchain().get_owner_address(), &fee);

        self.prize_claimed_event(tournament_id, &winner, &payout);
    }

    // ── Cancel & refund ───────────────────────────────────────────────────────

    #[only_owner]
    #[endpoint(cancelTournament)]
    fn cancel_tournament(&self, tournament_id: u64) {
        let mut t = self.tournaments(tournament_id).get();
        require!(
            t.status == TournamentStatus::Registration,
            "can only cancel during registration"
        );
        t.status = TournamentStatus::Cancelled;
        self.tournaments(tournament_id).set(&t);
    }

    #[endpoint(claimRefund)]
    fn claim_refund(&self, tournament_id: u64) {
        let caller = self.blockchain().get_caller();
        let t = self.tournaments(tournament_id).get();
        require!(t.status == TournamentStatus::Cancelled, "tournament not cancelled");
        require!(
            self.is_registered(tournament_id, &caller).get(),
            "not registered"
        );
        require!(
            !self.refund_claimed(tournament_id, &caller).get(),
            "refund already claimed"
        );
        self.refund_claimed(tournament_id, &caller).set(true);
        self.send().direct_egld(&caller, &t.entry_fee);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    #[view(getTournament)]
    fn get_tournament(&self, tournament_id: u64) -> Tournament<Self::Api> {
        self.tournaments(tournament_id).get()
    }

    #[view(getMatch)]
    fn get_match(&self, match_id: u64) -> Match<Self::Api> {
        self.matches(match_id).get()
    }

    #[view(getRoundMatches)]
    fn get_round_matches(&self, tournament_id: u64, round: u32) -> ManagedVec<u64> {
        let vec = self.round_matches(tournament_id, round);
        let mut result = ManagedVec::new();
        for i in 1..=vec.len() { result.push(vec.get(i)); }
        result
    }

    #[view(getPlayerTournaments)]
    fn get_player_tournaments(&self, player: ManagedAddress) -> ManagedVec<u64> {
        self.player_tournaments(&player)
    }

    #[view(isRegistered)]
    fn is_registered_view(&self, tournament_id: u64, player: ManagedAddress) -> bool {
        self.is_registered(tournament_id, &player).get()
    }

    #[view(getTournamentCount)]
    fn get_tournament_count(&self) -> u64 { self.tournament_counter().get() }

    // ── Storage ───────────────────────────────────────────────────────────────

    #[storage_mapper("battleship_address")]
    fn battleship_address(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("tournament_counter")]
    fn tournament_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("match_counter")]
    fn match_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("tournaments")]
    fn tournaments(&self, id: u64) -> SingleValueMapper<Tournament<Self::Api>>;

    #[storage_mapper("matches")]
    fn matches(&self, id: u64) -> SingleValueMapper<Match<Self::Api>>;

    #[storage_mapper("tournament_players")]
    fn tournament_players(&self, tournament_id: u64) -> VecMapper<ManagedAddress>;

    #[storage_mapper("round_matches")]
    fn round_matches(&self, tournament_id: u64, round: u32) -> VecMapper<u64>;

    #[storage_mapper("round_advances")]
    fn round_advances(&self, tournament_id: u64, round: u32) -> VecMapper<ManagedAddress>;

    #[storage_mapper("is_registered")]
    fn is_registered(
        &self,
        tournament_id: u64,
        player: &ManagedAddress,
    ) -> SingleValueMapper<bool>;

    #[storage_mapper("refund_claimed")]
    fn refund_claimed(
        &self,
        tournament_id: u64,
        player: &ManagedAddress,
    ) -> SingleValueMapper<bool>;

    #[storage_mapper("player_tournaments")]
    fn player_tournaments(&self, player: &ManagedAddress) -> ManagedVec<u64>;

    // ── Events ────────────────────────────────────────────────────────────────

    #[event("tournament_created")]
    fn tournament_created_event(
        &self,
        #[indexed] id: u64,
        name: &ManagedBuffer,
        entry_fee: &BigUint,
        max_players: u32,
        start_time: u64,
    );

    #[event("player_registered")]
    fn player_registered_event(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] player: &ManagedAddress,
    );

    #[event("tournament_started")]
    fn tournament_started_event(
        &self,
        #[indexed] tournament_id: u64,
        player_count: u32,
    );

    #[event("match_created")]
    fn match_created_event(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] match_id: u64,
        round: u32,
        player_a: &ManagedAddress,
        player_b: &ManagedAddress,
    );

    #[event("match_result")]
    fn match_result_event(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] match_id: u64,
        #[indexed] winner: &ManagedAddress,
    );

    #[event("round_started")]
    fn round_started_event(
        &self,
        #[indexed] tournament_id: u64,
        round: u32,
    );

    #[event("tournament_finished")]
    fn tournament_finished_event(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] winner: &ManagedAddress,
        prize_pool: &BigUint,
    );

    #[event("prize_claimed")]
    fn prize_claimed_event(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] winner: &ManagedAddress,
        amount: &BigUint,
    );
}
