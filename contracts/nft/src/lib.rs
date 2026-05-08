#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, PartialEq, Clone, Copy)]
pub enum ShipType {
    Destroyer,
    Submarine,
    Cruiser,
    Battleship,
    Carrier,
}

/// ✅ Supernova: minted_at_ms stores milliseconds (get_block_timestamp_millis).
/// This makes the field meaningful even at 600 ms block cadence.
#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub struct ShipMetadata<M: ManagedTypeApi> {
    pub ship_type: ShipType,
    pub level: u8,
    pub wins: u32,
    pub owner: ManagedAddress<M>,
    pub name: ManagedBuffer<M>,
    /// Millisecond timestamp when the ship was minted.
    pub minted_at_ms: u64,
}

#[multiversx_sc::contract]
pub trait ShipNft {

    // ── Init ────────────────────────────────────────────────────────────────

    #[init]
    fn init(
        &self,
        collection_name: ManagedBuffer,
        collection_ticker: ManagedBuffer,
        mint_price: BigUint,
    ) {
        self.collection_name().set(&collection_name);
        self.collection_ticker().set(&collection_ticker);
        self.mint_price().set(&mint_price);
        self.token_id_counter().set(0u64);
        self.owner().set(self.blockchain().get_caller());
    }

    // ── Storage ─────────────────────────────────────────────────────────────

    #[storage_mapper("collection_name")]
    fn collection_name(&self) -> SingleValueMapper<ManagedBuffer>;

    #[storage_mapper("collection_ticker")]
    fn collection_ticker(&self) -> SingleValueMapper<ManagedBuffer>;

    #[storage_mapper("ship_token_id")]
    fn ship_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("mint_price")]
    fn mint_price(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("token_id_counter")]
    fn token_id_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("ship_metadata")]
    fn ship_metadata(&self, nonce: u64) -> SingleValueMapper<ShipMetadata<Self::Api>>;

    #[storage_mapper("owner_ships")]
    fn owner_ships(&self, owner: &ManagedAddress) -> UnorderedSetMapper<u64>;

    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    // ── Events ──────────────────────────────────────────────────────────────

    #[event("shipMinted")]
    fn ship_minted_event(
        &self,
        #[indexed] nonce: u64,
        #[indexed] owner: ManagedAddress,
        ship_type: ShipType,
        minted_at_ms: u64,
    );

    #[event("shipUpgraded")]
    fn ship_upgraded_event(&self, #[indexed] nonce: u64, new_level: u8);

    #[event("winRecorded")]
    fn win_recorded_event(&self, #[indexed] nonce: u64, total_wins: u32);

    // ── Endpoints ───────────────────────────────────────────────────────────

    #[only_owner]
    #[payable("EGLD")]
    #[endpoint(registerShipCollection)]
    fn register_ship_collection(&self) {
        let payment = self.call_value().egld_value().clone_value();
        require!(payment >= BigUint::from(50_000_000_000_000_000u64), "Need 0.05 EGLD for issue");

        self.send()
            .esdt_system_sc_proxy()
            .issue_semi_fungible(
                payment,
                &self.collection_name().get(),
                &self.collection_ticker().get(),
                SemiFungibleTokenProperties {
                    can_freeze: true,
                    can_wipe: true,
                    can_pause: true,
                    can_transfer_create_role: true,
                    can_change_owner: true,
                    can_upgrade: true,
                    can_add_special_roles: true,
                },
            )
            .async_call()
            .with_callback(self.callbacks().issue_callback())
            .call_and_exit();
    }

    #[callback]
    fn issue_callback(
        &self,
        #[call_result] result: ManagedAsyncCallResult<TokenIdentifier>,
    ) {
        match result {
            ManagedAsyncCallResult::Ok(token_id) => {
                self.ship_token_id().set(&token_id);
            }
            ManagedAsyncCallResult::Err(_) => {
                let returned = self.call_value().egld_value().clone_value();
                if returned > 0u64 {
                    self.send().direct_egld(&self.owner().get(), &returned);
                }
            }
        }
    }

    #[payable("EGLD")]
    #[endpoint(mintShip)]
    fn mint_ship(&self, ship_type: ShipType, ship_name: ManagedBuffer) -> u64 {
        let payment = self.call_value().egld_value().clone_value();
        let price = self.mint_price().get();
        require!(payment >= price, "Insufficient payment");
        require!(!self.ship_token_id().is_empty(), "Collection not registered yet");

        let caller = self.blockchain().get_caller();
        // ✅ Supernova: store minted_at in milliseconds
        let now_ms = self.blockchain().get_block_timestamp_millis();
        let nonce = self.token_id_counter().get() + 1;
        self.token_id_counter().set(nonce);

        let metadata = ShipMetadata {
            ship_type,
            level: 1,
            wins: 0,
            owner: caller.clone(),
            name: ship_name.clone(),
            minted_at_ms: now_ms,
        };
        self.ship_metadata(nonce).set(&metadata);
        self.owner_ships(&caller).insert(nonce);

        let token_id = self.ship_token_id().get();
        let uris: ManagedVec<ManagedBuffer> = ManagedVec::new();
        let attributes = metadata.top_encode_to_vec_or_panic();
        self.send().esdt_nft_create(
            &token_id,
            &BigUint::from(1u64),
            &ship_name,
            &BigUint::zero(),
            &ManagedBuffer::new(),
            &ManagedBuffer::from(attributes.as_slice()),
            &uris,
        );
        self.send().direct_esdt(&caller, &token_id, nonce, &BigUint::from(1u64));

        self.ship_minted_event(nonce, caller.clone(), ship_type, now_ms);

        let excess = payment - price;
        if excess > 0u64 {
            self.send().direct_egld(&caller, &excess);
        }
        nonce
    }

    #[payable("EGLD")]
    #[endpoint(upgradeShip)]
    fn upgrade_ship(&self, nonce: u64) {
        require!(!self.ship_metadata(nonce).is_empty(), "Ship does not exist");
        let caller = self.blockchain().get_caller();
        let mut metadata = self.ship_metadata(nonce).get();
        require!(metadata.owner == caller, "Not the owner");
        require!(metadata.level < 10, "Max level reached");

        let upgrade_cost = self.mint_price().get() * BigUint::from(metadata.level as u64);
        let payment = self.call_value().egld_value().clone_value();
        require!(payment >= upgrade_cost, "Insufficient payment for upgrade");

        metadata.level += 1;
        self.ship_metadata(nonce).set(&metadata);
        self.ship_upgraded_event(nonce, metadata.level);

        let excess = payment - upgrade_cost;
        if excess > 0u64 {
            self.send().direct_egld(&caller, &excess);
        }
    }

    #[endpoint(recordWin)]
    fn record_win(&self, nonce: u64) {
        require!(!self.ship_metadata(nonce).is_empty(), "Ship does not exist");
        let mut metadata = self.ship_metadata(nonce).get();
        metadata.wins += 1;
        self.ship_metadata(nonce).set(&metadata);
        self.win_recorded_event(nonce, metadata.wins);
    }

    #[payable("*")]
    #[endpoint(burnShip)]
    fn burn_ship(&self) {
        let payment = self.call_value().single_esdt();
        require!(!self.ship_token_id().is_empty(), "No collection");
        require!(payment.token_identifier == self.ship_token_id().get(), "Wrong token");
        require!(payment.amount == BigUint::from(1u64), "Send exactly 1 NFT");

        let nonce = payment.token_nonce;
        let caller = self.blockchain().get_caller();
        let metadata = self.ship_metadata(nonce).get();
        require!(metadata.owner == caller, "Not the owner");

        self.owner_ships(&caller).remove(&nonce);
        self.ship_metadata(nonce).clear();
    }

    // ── Views ────────────────────────────────────────────────────────────────

    #[view(getShipMetadata)]
    fn get_ship_metadata(&self, nonce: u64) -> ShipMetadata<Self::Api> {
        self.ship_metadata(nonce).get()
    }

    #[view(getOwnerShips)]
    fn get_owner_ships(&self, owner: ManagedAddress) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for nonce in self.owner_ships(&owner).iter() {
            result.push(nonce);
        }
        result
    }

    #[view(getMintPrice)]
    fn get_mint_price(&self) -> BigUint {
        self.mint_price().get()
    }

    /// ✅ Supernova diagnostic: current block timestamp in milliseconds.
    #[view(getCurrentTimestampMs)]
    fn get_current_timestamp_ms(&self) -> u64 {
        self.blockchain().get_block_timestamp_millis()
    }
}
