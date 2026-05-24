#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// MetaShipX Marketplace Contract
///
/// Escrow-based secondary marketplace for ship SFT NFTs.
/// ✅ AUDIT v0.8.0: listing.active = false BEFORE sends (re-entrancy safe)
/// ✅ AUDIT v0.8.0: re-list guard — cannot list same nonce twice
/// ✅ AUDIT v0.8.0: getActiveListings paginated view added

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

    /// ✅ AUDIT: track active listing per (token_id, nonce) to prevent double-listing
    #[storage_mapper("active_listing_by_nonce")]
    fn active_listing_by_nonce(&self, token_id: &TokenIdentifier, nonce: u64) -> SingleValueMapper<u64>;

    #[payable("*")]
    #[endpoint(listShip)]
    fn list_ship(&self, price: BigUint) {
        require!(price > 0, "Price must be > 0");
        let (token_id, nonce, _amount) = self.call_value().single_esdt().into_tuple();

        // ✅ AUDIT: re-list guard — prevent same nonce being listed twice
        require!(
            self.active_listing_by_nonce(&token_id, nonce).is_empty(),
            "Ship already listed — cancel existing listing first"
        );

        let listing_id = self.listing_counter().get() + 1;
        self.listing_counter().set(listing_id);

        let seller = self.blockchain().get_caller();
        let listing = Listing {
            listing_id,
            seller: seller.clone(),
            token_id: token_id.clone(),
            nonce,
            price,
            active: true,
        };

        self.listings(listing_id).set(&listing);
        self.seller_listings(&seller).push(&listing_id);
        self.active_listing_by_nonce(&token_id, nonce).set(listing_id);

        self.listing_created_event(listing_id, &seller);
    }

    #[payable("EGLD")]
    #[endpoint(buyShip)]
    fn buy_ship(&self, listing_id: u64) {
        let payment = self.call_value().egld_value().clone_value();
        let mut listing = self.listings(listing_id).get();

        require!(listing.active, "Listing is not active");
        require!(payment == listing.price, "Wrong EGLD amount");

        // ✅ AUDIT: set active=false BEFORE any sends — re-entrancy safe
        listing.active = false;
        self.listings(listing_id).set(&listing);
        self.active_listing_by_nonce(&listing.token_id, listing.nonce).clear();

        let buyer = self.blockchain().get_caller();
        let fee = &listing.price * MARKETPLACE_FEE_BPS / 10_000u64;
        let seller_proceeds = &listing.price - &fee;

        // All state writes done — now safe to send
        self.send().direct_egld(&listing.seller, &seller_proceeds);
        let owner = self.blockchain().get_owner_address();
        self.send().direct_egld(&owner, &fee);
        self.send().direct_esdt(&buyer, &listing.token_id, listing.nonce, &BigUint::from(1u64));

        self.listing_sold_event(listing_id, &buyer, &listing.price);
    }

    #[endpoint(cancelListing)]
    fn cancel_listing(&self, listing_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut listing = self.listings(listing_id).get();

        require!(listing.active, "Listing already inactive");
        require!(caller == listing.seller, "Only seller can cancel");

        // ✅ AUDIT: set active=false BEFORE send
        listing.active = false;
        self.listings(listing_id).set(&listing);
        self.active_listing_by_nonce(&listing.token_id, listing.nonce).clear();

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

    /// ✅ NEW: paginated active listings — used by frontend P2P tab
    /// offset: start from listing_id offset+1, limit: max results
    #[view(getActiveListings)]
    fn get_active_listings(&self, offset: u64, limit: u64) -> ManagedVec<Listing<Self::Api>> {
        let mut result = ManagedVec::new();
        let total = self.listing_counter().get();
        let mut count = 0u64;
        let start = if offset < total { offset } else { total };
        let mut i = start + 1;
        while i <= total && count < limit {
            if !self.listings(i).is_empty() {
                let l = self.listings(i).get();
                if l.active {
                    result.push(l);
                    count += 1;
                }
            }
            i += 1;
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

#[cfg(test)]
mod tests {
    #[test]
    fn fee_calculation_correct() {
        // 2.5% fee on 1 EGLD (1e18 attoEGLD)
        let price: u128 = 1_000_000_000_000_000_000;
        let fee_bps: u128 = 250;
        let fee = price * fee_bps / 10_000;
        let proceeds = price - fee;
        assert_eq!(fee, 25_000_000_000_000_000u128);     // 0.025 EGLD
        assert_eq!(proceeds, 975_000_000_000_000_000u128); // 0.975 EGLD
        assert_eq!(fee + proceeds, price);                 // no EGLD lost
    }

    #[test]
    fn marketplace_fee_bps_value() {
        assert_eq!(super::MARKETPLACE_FEE_BPS, 250);
    }
}
