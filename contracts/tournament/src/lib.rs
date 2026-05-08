#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct Tournament<M: ManagedTypeApi> {
    pub id: u64,
    pub name: ManagedBuffer<M>,
    pub entry_fee: BigUint<M>,
    pub prize_pool: BigUint<M>,
    pub max_players: u32,
    pub current_players: u32,
    pub status: TournamentStatus,
    pub winner: Option<ManagedAddress<M>>,
    pub created_at: u64,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone, PartialEq)]
pub enum TournamentStatus {
    Open,
    InProgress,
    Finished,
    Cancelled,
}

#[multiversx_sc::contract]
pub trait TournamentContract {
    #[init]
    fn init(&self, battleship_contract: ManagedAddress) {
        self.battleship_contract().set(battleship_contract);
        self.tournament_counter().set(0u64);
        self.platform_fee_percent().set(5u64); // 5%
    }

    // ============================================================
    // Admin
    // ============================================================

    #[only_owner]
    #[endpoint(setPlatformFee)]
    fn set_platform_fee(&self, fee_percent: u64) {
        require!(fee_percent <= 20, "Max fee is 20%");
        self.platform_fee_percent().set(fee_percent);
    }

    #[only_owner]
    #[endpoint(withdrawFees)]
    fn withdraw_fees(&self) {
        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        let accumulated = self.accumulated_fees().get();
        require!(accumulated > 0u64, "No fees to withdraw");
        self.send().direct_egld(&self.blockchain().get_owner_address(), &accumulated);
        self.accumulated_fees().set(BigUint::zero());
        self.withdraw_fees_event(accumulated);
        let _ = balance;
    }

    // ============================================================
    // Tournament lifecycle
    // ============================================================

    #[payable("EGLD")]
    #[endpoint(createTournament)]
    fn create_tournament(
        &self,
        name: ManagedBuffer,
        entry_fee: BigUint,
        max_players: u32,
    ) {
        require!(max_players >= 2 && max_players <= 64, "Players must be 2-64");
        require!(entry_fee > 0u64, "Entry fee must be > 0");
        require!(!name.is_empty(), "Name required");

        let payment = self.call_value().egld_value().clone_value();
        require!(payment == entry_fee, "Must pay entry fee to create");

        let id = self.tournament_counter().get() + 1;
        self.tournament_counter().set(id);

        let caller = self.blockchain().get_caller();
        let tournament = Tournament {
            id,
            name,
            entry_fee: entry_fee.clone(),
            prize_pool: entry_fee,
            max_players,
            current_players: 1,
            status: TournamentStatus::Open,
            winner: None,
            created_at: self.blockchain().get_block_timestamp(),
        };

        self.tournaments(id).set(tournament);
        self.tournament_players(id).insert(caller.clone());
        self.player_tournaments(&caller).insert(id);

        self.tournament_created_event(id, &caller);
    }

    #[payable("EGLD")]
    #[endpoint(joinTournament)]
    fn join_tournament(&self, tournament_id: u64) {
        require!(self.tournaments(tournament_id).is_empty() == false, "Tournament not found");

        let mut tournament = self.tournaments(tournament_id).get();
        require!(tournament.status == TournamentStatus::Open, "Tournament not open");
        require!(
            tournament.current_players < tournament.max_players,
            "Tournament full"
        );

        let caller = self.blockchain().get_caller();
        require!(
            !self.tournament_players(tournament_id).contains(&caller),
            "Already joined"
        );

        let payment = self.call_value().egld_value().clone_value();
        require!(payment == tournament.entry_fee, "Wrong entry fee");

        tournament.current_players += 1;
        tournament.prize_pool += &payment;

        if tournament.current_players == tournament.max_players {
            tournament.status = TournamentStatus::InProgress;
            self.tournament_started_event(tournament_id);
        }

        self.tournaments(tournament_id).set(tournament);
        self.tournament_players(tournament_id).insert(caller.clone());
        self.player_tournaments(&caller).insert(tournament_id);

        self.player_joined_event(tournament_id, &caller);
    }

    #[only_owner]
    #[endpoint(declareTournamentWinner)]
    fn declare_winner(&self, tournament_id: u64, winner: ManagedAddress) {
        require!(self.tournaments(tournament_id).is_empty() == false, "Not found");

        let mut tournament = self.tournaments(tournament_id).get();
        require!(
            tournament.status == TournamentStatus::InProgress,
            "Tournament not in progress"
        );
        require!(
            self.tournament_players(tournament_id).contains(&winner),
            "Winner not in tournament"
        );

        let fee_percent = self.platform_fee_percent().get();
        let fee = &tournament.prize_pool * fee_percent / 100u64;
        let winner_prize = &tournament.prize_pool - &fee;

        self.accumulated_fees().update(|f| *f += &fee);
        self.send().direct_egld(&winner, &winner_prize);

        tournament.status = TournamentStatus::Finished;
        tournament.winner = Some(winner.clone());
        self.tournaments(tournament_id).set(tournament.clone());

        self.tournament_finished_event(tournament_id, &winner, winner_prize);
    }

    #[only_owner]
    #[endpoint(cancelTournament)]
    fn cancel_tournament(&self, tournament_id: u64) {
        require!(self.tournaments(tournament_id).is_empty() == false, "Not found");

        let mut tournament = self.tournaments(tournament_id).get();
        require!(
            tournament.status == TournamentStatus::Open
                || tournament.status == TournamentStatus::InProgress,
            "Cannot cancel finished tournament"
        );

        // Refund all players
        for player in self.tournament_players(tournament_id).iter() {
            self.send().direct_egld(&player, &tournament.entry_fee);
        }

        tournament.status = TournamentStatus::Cancelled;
        self.tournaments(tournament_id).set(tournament);
        self.tournament_cancelled_event(tournament_id);
    }

    // ============================================================
    // Views
    // ============================================================

    #[view(getTournament)]
    fn get_tournament(&self, tournament_id: u64) -> Tournament<Self::Api> {
        self.tournaments(tournament_id).get()
    }

    #[view(getActiveTournaments)]
    fn get_active_tournaments(&self) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        let count = self.tournament_counter().get();
        for i in 1..=count {
            if !self.tournaments(i).is_empty() {
                let t = self.tournaments(i).get();
                if t.status == TournamentStatus::Open || t.status == TournamentStatus::InProgress {
                    result.push(i);
                }
            }
        }
        result
    }

    #[view(getPlayerTournaments)]
    fn get_player_tournaments(&self, player: ManagedAddress) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for id in self.player_tournaments(&player).iter() {
            result.push(id);
        }
        result
    }

    #[view(getTournamentPlayers)]
    fn get_tournament_players(&self, tournament_id: u64) -> MultiValueEncoded<ManagedAddress> {
        let mut result = MultiValueEncoded::new();
        for player in self.tournament_players(tournament_id).iter() {
            result.push(player);
        }
        result
    }

    #[view(getPlatformFee)]
    fn get_platform_fee(&self) -> u64 {
        self.platform_fee_percent().get()
    }

    #[view(getAccumulatedFees)]
    fn get_accumulated_fees(&self) -> BigUint {
        self.accumulated_fees().get()
    }

    // ============================================================
    // Storage
    // ============================================================

    #[storage_mapper("battleshipContract")]
    fn battleship_contract(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("tournamentCounter")]
    fn tournament_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("tournaments")]
    fn tournaments(&self, id: u64) -> SingleValueMapper<Tournament<Self::Api>>;

    #[storage_mapper("tournamentPlayers")]
    fn tournament_players(&self, id: u64) -> UnorderedSetMapper<ManagedAddress>;

    #[storage_mapper("playerTournaments")]
    fn player_tournaments(&self, player: &ManagedAddress) -> UnorderedSetMapper<u64>;

    #[storage_mapper("platformFeePercent")]
    fn platform_fee_percent(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("accumulatedFees")]
    fn accumulated_fees(&self) -> SingleValueMapper<BigUint>;

    // ============================================================
    // Events
    // ============================================================

    #[event("tournamentCreated")]
    fn tournament_created_event(&self, #[indexed] tournament_id: u64, #[indexed] creator: &ManagedAddress);

    #[event("playerJoined")]
    fn player_joined_event(&self, #[indexed] tournament_id: u64, #[indexed] player: &ManagedAddress);

    #[event("tournamentStarted")]
    fn tournament_started_event(&self, #[indexed] tournament_id: u64);

    #[event("tournamentFinished")]
    fn tournament_finished_event(
        &self,
        #[indexed] tournament_id: u64,
        #[indexed] winner: &ManagedAddress,
        prize: BigUint,
    );

    #[event("tournamentCancelled")]
    fn tournament_cancelled_event(&self, #[indexed] tournament_id: u64);

    #[event("withdrawFees")]
    fn withdraw_fees_event(&self, amount: BigUint);
}
