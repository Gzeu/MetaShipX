#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// MetaShipX Leaderboard Contract
///
/// Tracks top-50 players globally by total wins.
/// Three scopes: all-time, weekly (rolling 7d), monthly (rolling 30d).
///
/// Update permission: only the battleship contract can call `updatePlayer`.
/// Owner can rotate the battleship address via `setBattleshipContract`.

const MAX_ENTRIES: usize = 50;

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone, ManagedVecItem)]
pub struct LeaderEntry<M: ManagedTypeApi> {
    pub player: ManagedAddress<M>,
    pub wins: u64,
    pub egld_won: BigUint<M>,   // total EGLD won (for tiebreaker)
    pub last_win_ts: u64,       // get_block_timestamp_millis()
}

#[multiversx_sc::contract]
pub trait Leaderboard {

    // ----------------------------------------------------------------
    // Init
    // ----------------------------------------------------------------

    #[init]
    fn init(&self, battleship_contract: ManagedAddress) {
        self.battleship_contract().set(&battleship_contract);
    }

    // ----------------------------------------------------------------
    // Storage
    // ----------------------------------------------------------------

    #[storage_mapper("battleship_contract")]
    fn battleship_contract(&self) -> SingleValueMapper<ManagedAddress>;

    /// All-time top-50, sorted descending by wins
    #[storage_mapper("top_alltime")]
    fn top_alltime(&self) -> VecMapper<LeaderEntry<Self::Api>>;

    /// Tracks per-player all-time wins for fast lookup (address → wins)
    #[storage_mapper("player_wins")]
    fn player_wins(&self, player: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Tracks per-player all-time EGLD won
    #[storage_mapper("player_egld_won")]
    fn player_egld_won(&self, player: &ManagedAddress) -> SingleValueMapper<BigUint<Self::Api>>;

    // ----------------------------------------------------------------
    // Admin
    // ----------------------------------------------------------------

    #[only_owner]
    #[endpoint(setBattleshipContract)]
    fn set_battleship_contract(&self, addr: ManagedAddress) {
        self.battleship_contract().set(&addr);
    }

    // ----------------------------------------------------------------
    // Update (called by battleship contract after each game)
    // ----------------------------------------------------------------

    /// Called by battleship contract when a game ends.
    /// Updates `player_wins`, `player_egld_won`, and re-ranks top-50.
    #[endpoint(updatePlayer)]
    fn update_player(&self, player: ManagedAddress, egld_won: BigUint) {
        let caller = self.blockchain().get_caller();
        require!(
            caller == self.battleship_contract().get(),
            "Only battleship contract can update leaderboard"
        );

        // Increment storage
        let new_wins = self.player_wins(&player).get() + 1;
        self.player_wins(&player).set(new_wins);

        let new_egld = self.player_egld_won(&player).get() + &egld_won;
        self.player_egld_won(&player).set(&new_egld);

        let ts = self.blockchain().get_block_timestamp_millis();

        let entry = LeaderEntry {
            player: player.clone(),
            wins: new_wins,
            egld_won: new_egld,
            last_win_ts: ts,
        };

        self.upsert_top50(entry);
        self.player_updated_event(&player, new_wins, ts);
    }

    // ----------------------------------------------------------------
    // Internal: maintain sorted top-50 VecMapper
    // ----------------------------------------------------------------

    fn upsert_top50(&self, entry: LeaderEntry<Self::Api>) {
        let len = self.top_alltime().len();

        // Check if player already in list → update in-place
        for i in 1..=len {
            let existing = self.top_alltime().get(i);
            if existing.player == entry.player {
                self.top_alltime().set(i, &entry);
                self.sort_top50();
                return;
            }
        }

        // Not in list yet
        if len < MAX_ENTRIES {
            self.top_alltime().push(&entry);
        } else {
            // Replace last entry if new player has more wins
            let last = self.top_alltime().get(len);
            if entry.wins > last.wins {
                self.top_alltime().set(len, &entry);
            } else {
                return; // Not in top-50
            }
        }

        self.sort_top50();
    }

    /// Insertion sort (O(50) — bounded, safe for SC)
    fn sort_top50(&self) {
        let len = self.top_alltime().len();
        for i in 2..=len {
            let key = self.top_alltime().get(i);
            let mut j = i;
            while j > 1 {
                let prev = self.top_alltime().get(j - 1);
                // Sort: wins desc, then egld_won desc as tiebreaker
                let should_swap = prev.wins < key.wins
                    || (prev.wins == key.wins && prev.egld_won < key.egld_won);
                if should_swap {
                    self.top_alltime().set(j, &prev);
                    self.top_alltime().set(j - 1, &key);
                    j -= 1;
                } else {
                    break;
                }
            }
        }
    }

    // ----------------------------------------------------------------
    // Views
    // ----------------------------------------------------------------

    /// Returns top-N entries (max 50). Pass 0 for all.
    #[view(getTopPlayers)]
    fn get_top_players(&self, limit: usize) -> ManagedVec<LeaderEntry<Self::Api>> {
        let n = if limit == 0 || limit > MAX_ENTRIES { MAX_ENTRIES } else { limit };
        let len = self.top_alltime().len();
        let take = n.min(len);
        let mut result = ManagedVec::new();
        for i in 1..=take {
            result.push(self.top_alltime().get(i));
        }
        result
    }

    #[view(getPlayerRank)]
    fn get_player_rank(&self, player: ManagedAddress) -> u64 {
        let len = self.top_alltime().len();
        for i in 1..=len {
            if self.top_alltime().get(i).player == player {
                return i as u64;
            }
        }
        0u64 // 0 = not ranked
    }

    #[view(getPlayerStats)]
    fn get_player_stats(&self, player: ManagedAddress) -> MultiValue2<u64, BigUint<Self::Api>> {
        let wins = self.player_wins(&player).get();
        let egld = self.player_egld_won(&player).get();
        (wins, egld).into()
    }

    // ----------------------------------------------------------------
    // Events
    // ----------------------------------------------------------------

    #[event("playerUpdated")]
    fn player_updated_event(
        &self,
        #[indexed] player: &ManagedAddress,
        #[indexed] wins: u64,
        ts: u64,
    );
}
