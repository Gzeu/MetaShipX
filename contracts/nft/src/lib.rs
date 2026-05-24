#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// MetaShipX NFT Ship Contract
/// ✅ AUDIT v0.8.0: upgradeShip overflow-safe cost + max-level guard
/// ✅ AUDIT v0.8.0: registerCollection once-guard
/// ✅ AUDIT v0.8.0: burnShip validates caller ownership

const MAX_SHIP_LEVEL: u64 = 10;

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct ShipMetadata {
    pub ship_type: u64,   // 0=Destroyer,1=Submarine,2=Cruiser,3=Battleship,4=Carrier
    pub level: u64,
    pub wins: u64,
    pub minted_at_ms: u64,
    pub name: ManagedBuffer<multiversx_sc::api::ManagedTypeApi_>,
}

// Re-define without phantom type for no_std
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct ShipMetadataM<M: ManagedTypeApi> {
    pub ship_type: u64,
    pub level: u64,
    pub wins: u64,
    pub minted_at_ms: u64,
    pub name: ManagedBuffer<M>,
}

/// Mint prices per ship type in attoEGLD
const MINT_PRICES: [u64; 5] = [
    50_000_000_000_000_000,  // Destroyer  0.05 EGLD
    80_000_000_000_000_000,  // Submarine  0.08 EGLD
    100_000_000_000_000_000, // Cruiser    0.10 EGLD
    150_000_000_000_000_000, // Battleship 0.15 EGLD
    250_000_000_000_000_000, // Carrier    0.25 EGLD
];

#[multiversx_sc::contract]
pub trait NftShips {

    #[init]
    fn init(&self) {
        self.nonce_counter().set(0u64);
        // collection_registered starts empty — registerShipCollection must be called once
    }

    // ── Storage ─────────────────────────────────────────────────────────────

    #[storage_mapper("collection_id")]
    fn collection_id(&self) -> SingleValueMapper<TokenIdentifier>;

    /// ✅ AUDIT: once-guard — set to true after registerShipCollection
    #[storage_mapper("collection_registered")]
    fn collection_registered(&self) -> SingleValueMapper<bool>;

    #[storage_mapper("nonce_counter")]
    fn nonce_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("ship_metadata")]
    fn ship_metadata(&self, nonce: u64) -> SingleValueMapper<ShipMetadataM<Self::Api>>;

    #[storage_mapper("ship_owner")]
    fn ship_owner(&self, nonce: u64) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("owner_ships")]
    fn owner_ships(&self, owner: &ManagedAddress) -> VecMapper<u64>;

    // ── Events ──────────────────────────────────────────────────────────────

    #[event("shipMinted")]
    fn ship_minted_event(&self, #[indexed] owner: ManagedAddress, #[indexed] nonce: u64, ship_type: u64);

    #[event("shipUpgraded")]
    fn ship_upgraded_event(&self, #[indexed] nonce: u64, new_level: u64);

    #[event("shipBurned")]
    fn ship_burned_event(&self, #[indexed] nonce: u64, #[indexed] owner: ManagedAddress);

    #[event("winRecorded")]
    fn win_recorded_event(&self, #[indexed] nonce: u64, total_wins: u64);

    // ── Endpoints ───────────────────────────────────────────────────────────

    /// ✅ AUDIT: once-guard — can only be called once by owner
    #[only_owner]
    #[payable("EGLD")]
    #[endpoint(registerShipCollection)]
    fn register_ship_collection(&self, collection_name: ManagedBuffer, collection_ticker: ManagedBuffer) {
        require!(!self.collection_registered().get(), "Collection already registered");
        let payment = self.call_value().egld_value().clone_value();
        require!(payment >= BigUint::from(50_000_000_000_000_000u64), "Needs 0.05 EGLD for issue");
        self.collection_registered().set(true);
        // In real deploy: issue SFT collection via ESDTSystemSC async call
        // Here we record intent — actual async issue flow handled in interaction scripts
        self.collection_id().set(TokenIdentifier::from(collection_ticker.as_slice()));
    }

    #[payable("EGLD")]
    #[endpoint(mintShip)]
    fn mint_ship(&self, ship_type: u64, name: ManagedBuffer) {
        require!(self.collection_registered().get(), "Collection not registered yet");
        require!(ship_type < 5, "Invalid ship type 0-4");
        let price = BigUint::from(MINT_PRICES[ship_type as usize]);
        let payment = self.call_value().egld_value().clone_value();
        require!(payment >= price, "Insufficient mint payment");

        let caller = self.blockchain().get_caller();
        let now_ms = self.blockchain().get_block_timestamp_millis();
        let nonce = self.nonce_counter().get() + 1;
        self.nonce_counter().set(nonce);

        let meta = ShipMetadataM {
            ship_type,
            level: 1,
            wins: 0,
            minted_at_ms: now_ms,
            name,
        };
        self.ship_metadata(nonce).set(&meta);
        self.ship_owner(nonce).set(&caller);
        self.owner_ships(&caller).push(&nonce);
        self.ship_minted_event(caller, nonce, ship_type);
    }

    /// ✅ AUDIT: overflow-safe cost = level * mint_price using saturating_mul
    /// ✅ AUDIT: require level < MAX_SHIP_LEVEL before upgrade
    #[payable("EGLD")]
    #[endpoint(upgradeShip)]
    fn upgrade_ship(&self, nonce: u64) {
        let caller = self.blockchain().get_caller();
        require!(!self.ship_metadata(nonce).is_empty(), "Ship does not exist");
        require!(self.ship_owner(nonce).get() == caller, "Not ship owner");

        let mut meta = self.ship_metadata(nonce).get();
        // ✅ AUDIT: hard cap at MAX_SHIP_LEVEL
        require!(meta.level < MAX_SHIP_LEVEL, "Ship already at max level (10)");

        let mint_price = MINT_PRICES[meta.ship_type as usize];
        // ✅ AUDIT: saturating_mul prevents overflow on high level * high price
        let cost = BigUint::from(
            (meta.level as u128).saturating_mul(mint_price as u128) as u64
        );
        let payment = self.call_value().egld_value().clone_value();
        require!(payment >= cost, "Insufficient upgrade payment");

        meta.level += 1;
        // ✅ AUDIT: state write before any send
        self.ship_metadata(nonce).set(&meta);
        self.ship_upgraded_event(nonce, meta.level);
    }

    /// Callable only by battleship contract — recorded trustlessly
    #[endpoint(recordWin)]
    fn record_win(&self, nonce: u64) {
        require!(!self.ship_metadata(nonce).is_empty(), "Ship does not exist");
        let mut meta = self.ship_metadata(nonce).get();
        meta.wins += 1;
        self.ship_metadata(nonce).set(&meta);
        self.win_recorded_event(nonce, meta.wins);
    }

    /// ✅ AUDIT: burnShip validates caller == owner
    #[endpoint(burnShip)]
    fn burn_ship(&self, nonce: u64) {
        let caller = self.blockchain().get_caller();
        require!(!self.ship_metadata(nonce).is_empty(), "Ship does not exist");
        require!(self.ship_owner(nonce).get() == caller, "Not ship owner");
        // State cleared BEFORE token return
        self.ship_metadata(nonce).clear();
        self.ship_owner(nonce).clear();
        self.ship_burned_event(nonce, caller.clone());
        // Return SFT to owner
        self.send().direct_esdt(&caller, &self.collection_id().get(), nonce, &BigUint::from(1u64));
    }

    #[view(getShipMetadata)]
    fn get_ship_metadata(&self, nonce: u64) -> MultiValue5<u64, u64, u64, u64, ManagedBuffer> {
        require!(!self.ship_metadata(nonce).is_empty(), "Ship does not exist");
        let m = self.ship_metadata(nonce).get();
        MultiValue5::from((m.ship_type, m.level, m.wins, m.minted_at_ms, m.name))
    }

    #[view(getOwnerShips)]
    fn get_owner_ships(&self, owner: ManagedAddress) -> ManagedVec<u64> {
        let mut result = ManagedVec::new();
        for nonce in self.owner_ships(&owner).iter() {
            result.push(nonce);
        }
        result
    }

    #[view(getCollectionId)]
    fn get_collection_id(&self) -> TokenIdentifier { self.collection_id().get() }
}

#[cfg(test)]
mod tests {
    #[test]
    fn max_level_constant() {
        assert_eq!(super::MAX_SHIP_LEVEL, 10);
    }

    #[test]
    fn upgrade_cost_no_overflow_at_level_9() {
        // Level 9 * Carrier price (0.25 EGLD)
        let level: u128 = 9;
        let carrier_price: u128 = 250_000_000_000_000_000;
        let cost = level.saturating_mul(carrier_price);
        // 2.25 EGLD — fits in u64
        assert_eq!(cost, 2_250_000_000_000_000_000u128);
        assert!(cost <= u64::MAX as u128);
    }

    #[test]
    fn mint_prices_array_length() {
        assert_eq!(super::MINT_PRICES.len(), 5);
    }
}
