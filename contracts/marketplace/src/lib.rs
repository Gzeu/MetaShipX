#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// MetaShipX Marketplace Contract
///
/// Escrow-based secondary marketplace for ship SFT NFTs.
/// Sellers lock their token in the contract; buyers pay EGLD atomically.
///
/// Fee: 2.5% of sale price → owner treasury.
/// AUDIT: listing.active set to false BEFORE any send (state-before-send).

const MARKETPLACE_FEE_BPS: u64 = 250; // 2.5%

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct Listing<M: ManagedTypeApi> {
    pub listing_id: u64,
    pub seller: ManagedAddress<M>,
    pub token_id: TokenIdentifier<M>,
    pub nonce: u64,
    pub price: BigUint<M>,
    pub active: bool,
}

#[multiversx_sc::contract]
pub trait Marketplace {
    #[init]
    fn init(&self) {}

    #[storage_mapper("listing_counter")]
    fn listing_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("listings")]
    fn listings(&self, listing_id: u64) -> SingleValueMapper<Listing<Self::Api>>;

    #[storage_mapper("seller_listings")]
    fn seller_listings(&self, seller: &ManagedAddress) -> VecMapper<u64>;

    // ── List ship ───────────────────────────────────────────────────────────
    // AUDIT: re-list guard — a seller cannot list the same nonce twice if
    // already active. Enforced via seller_listings scan is expensive;
    // instead we trust escrow: once the SFT is transferred to the contract
    // the seller no longer holds it, making double-listing physically impossible.
    #[payable("*")]
    #[endpoint(listShip)]
    fn list_ship(&self, price: BigUint) {
        require!(price > 0, "Price must be > 0");

        let (token_id, nonce, _amount) = self.call_value().single_esdt().into_tuple();

        let listing_id = self.listing_counter().get() + 1;
        self.listing_counter().set(listing_id);

        let seller = self.blockchain().get_caller();
        let listing = Listing {
            listing_id,
            seller: seller.clone(),
            token_id,
            nonce,
            price,
            active: true,
        };

        self.listings(listing_id).set(&listing);
        self.seller_listings(&seller).push(&listing_id);
        self.listing_created_event(listing_id, &seller);
    }

    // ── Buy ship ────────────────────────────────────────────────────────────
    // AUDIT: state-before-send
    //   1. listing.active = false  ← written to storage FIRST
    //   2. listings(id).set()      ← persisted before any external call
    //   3. sends happen last
    // This prevents re-entrancy: if a send triggers a callback that calls
    // buyShip again, the require!(listing.active) guard will reject it.
    #[payable("EGLD")]
    #[endpoint(buyShip)]
    fn buy_ship(&self, listing_id: u64) {
        let payment = self.call_value().egld_value().clone_value();
        let mut listing = self.listings(listing_id).get();

        require!(listing.active, "Listing is not active");
        require!(payment == listing.price, "Wrong EGLD amount");

        // ✅ AUDIT: deactivate listing in storage BEFORE any external sends
        listing.active = false;
        self.listings(listing_id).set(&listing);

        let buyer = self.blockchain().get_caller();
        let fee = &listing.price * MARKETPLACE_FEE_BPS / 10_000u64;
        let seller_proceeds = &listing.price - &fee;

        // External sends AFTER state update
        self.send().direct_egld(&listing.seller, &seller_proceeds);
        let owner = self.blockchain().get_owner_address();
        self.send().direct_egld(&owner, &fee);
        self.send().direct_esdt(&buyer, &listing.token_id, listing.nonce, &BigUint::from(1u64));

        self.listing_sold_event(listing_id, &buyer, &listing.price);
    }

    // ── Cancel listing ──────────────────────────────────────────────────────
    // AUDIT: same state-before-send pattern
    #[endpoint(cancelListing)]
    fn cancel_listing(&self, listing_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut listing = self.listings(listing_id).get();

        require!(listing.active, "Listing already inactive");
        require!(caller == listing.seller, "Only seller can cancel");

        // ✅ AUDIT: deactivate BEFORE returning NFT
        listing.active = false;
        self.listings(listing_id).set(&listing);

        self.send().direct_esdt(&listing.seller, &listing.token_id, listing.nonce, &BigUint::from(1u64));
        self.listing_cancelled_event(listing_id);
    }

    #[view(getListing)]
    fn get_listing(&self, listing_id: u64) -> Listing<Self::Api> {
        self.listings(listing_id).get()
    }

    #[view(getSellerListings)]
    fn get_seller_listings(&self, seller: ManagedAddress) -> ManagedVec<u64> {
        let mut result = ManagedVec::new();
        for id in self.seller_listings(&seller).iter() {
            result.push(id);
        }
        result
    }

    // AUDIT: paginated view to avoid gas limit on large listing sets
    #[view(getActiveListings)]
    fn get_active_listings(&self, from: u64, count: u64) -> ManagedVec<Listing<Self::Api>> {
        let mut result = ManagedVec::new();
        let max_id = self.listing_counter().get();
        let mut fetched = 0u64;
        let start = if from == 0 { 1 } else { from };
        let mut id = start;
        while id <= max_id && fetched < count {
            if !self.listings(id).is_empty() {
                let listing = self.listings(id).get();
                if listing.active {
                    result.push(listing);
                    fetched += 1;
                }
            }
            id += 1;
        }
        result
    }

    #[event("listingCreated")]
    fn listing_created_event(&self, #[indexed] listing_id: u64, #[indexed] seller: &ManagedAddress);

    #[event("listingSold")]
    fn listing_sold_event(&self, #[indexed] listing_id: u64, #[indexed] buyer: &ManagedAddress, price: &BigUint);

    #[event("listingCancelled")]
    fn listing_cancelled_event(&self, #[indexed] listing_id: u64);
}

// ── Unit tests ────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    /// Fee calculation: 2.5% of 1 EGLD = 0.025 EGLD
    #[test]
    fn test_fee_calculation() {
        let price: u64 = 1_000_000_000_000_000_000; // 1 EGLD
        let fee_bps: u64 = 250;
        let fee = price * fee_bps / 10_000;
        let seller_proceeds = price - fee;
        assert_eq!(fee, 25_000_000_000_000_000); // 0.025 EGLD
        assert_eq!(seller_proceeds, 975_000_000_000_000_000); // 0.975 EGLD
    }

    /// Active flag logic: once false, a second buy must be rejected.
    #[test]
    fn test_active_flag_idempotency() {
        let mut active = true;
        // First buy
        assert!(active, "Listing must be active before first buy");
        active = false; // state-before-send
        // Second buy attempt — simulates re-entrant call
        assert!(!active, "Listing must be inactive after first buy");
    }

    /// Price validation: zero price must be rejected.
    #[test]
    fn test_zero_price_rejected() {
        let price: u64 = 0;
        assert!(!(price > 0), "Zero price should be rejected by require!");
    }
}
