#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// MetaShipX Marketplace Contract
///
/// Escrow-based secondary marketplace for ship SFT NFTs.
/// Sellers lock their token in the contract; buyers pay EGLD atomically.
///
/// Fee: 2.5% of sale price → owner treasury.

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

    // ----------------------------------------------------------------
    // Storage
    // ----------------------------------------------------------------

    #[storage_mapper("listing_counter")]
    fn listing_counter(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("listings")]
    fn listings(&self, listing_id: u64) -> SingleValueMapper<Listing<Self::Api>>;

    #[storage_mapper("seller_listings")]
    fn seller_listings(&self, seller: &ManagedAddress) -> VecMapper<u64>;

    // ----------------------------------------------------------------
    // List ship
    //
    // Seller transfers their SFT to the contract with a desired price.
    // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // Buy ship
    //
    // Buyer pays exact EGLD price. Contract:
    //   1. Sends 97.5% EGLD to seller
    //   2. Sends 2.5% EGLD to owner (treasury)
    //   3. Sends SFT NFT to buyer
    // ----------------------------------------------------------------
    #[payable("EGLD")]
    #[endpoint(buyShip)]
    fn buy_ship(&self, listing_id: u64) {
        let payment = self.call_value().egld_value().clone_value();
        let mut listing = self.listings(listing_id).get();

        require!(listing.active, "Listing is not active");
        require!(payment == listing.price, "Wrong EGLD amount");

        listing.active = false;
        self.listings(listing_id).set(&listing);

        let buyer = self.blockchain().get_caller();
        let fee = &listing.price * MARKETPLACE_FEE_BPS / 10_000u64;
        let seller_proceeds = &listing.price - &fee;

        // Pay seller
        self.send().direct_egld(&listing.seller, &seller_proceeds);
        // Pay treasury
        let owner = self.blockchain().get_owner_address();
        self.send().direct_egld(&owner, &fee);
        // Send NFT to buyer
        self.send().direct_esdt(&buyer, &listing.token_id, listing.nonce, &BigUint::from(1u64));

        self.listing_sold_event(listing_id, &buyer, &listing.price);
    }

    // ----------------------------------------------------------------
    // Cancel listing — only seller can cancel
    // ----------------------------------------------------------------
    #[endpoint(cancelListing)]
    fn cancel_listing(&self, listing_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut listing = self.listings(listing_id).get();

        require!(listing.active, "Listing already inactive");
        require!(caller == listing.seller, "Only seller can cancel");

        listing.active = false;
        self.listings(listing_id).set(&listing);

        // Return NFT to seller
        self.send().direct_esdt(&listing.seller, &listing.token_id, listing.nonce, &BigUint::from(1u64));

        self.listing_cancelled_event(listing_id);
    }

    // ----------------------------------------------------------------
    // Views
    // ----------------------------------------------------------------

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

    // ----------------------------------------------------------------
    // Events
    // ----------------------------------------------------------------

    #[event("listingCreated")]
    fn listing_created_event(&self, #[indexed] listing_id: u64, #[indexed] seller: &ManagedAddress);

    #[event("listingSold")]
    fn listing_sold_event(&self, #[indexed] listing_id: u64, #[indexed] buyer: &ManagedAddress, price: &BigUint);

    #[event("listingCancelled")]
    fn listing_cancelled_event(&self, #[indexed] listing_id: u64);
}
