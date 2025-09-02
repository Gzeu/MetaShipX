#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait BattleshipNft {
    #[init]
    fn init(&self) {
        self.set_pause(false);
    }

    // Storage mappers
    #[storage_mapper("paused")]
    fn paused(&self) -> SingleValueMapper<bool>;

    #[storage_mapper("token_id")]
    fn token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    // Admin functions
    #[only_owner]
    #[endpoint(setPause)]
    fn set_pause(&self, is_paused: bool) {
        self.paused().set(is_paused);
    }

    // NFT creation
    #[payable("EGLD")]
    #[endpoint(createNft)]
    fn create_nft(
        &self,
        name: ManagedBuffer,
        description: ManagedBuffer,
        attributes: ShipAttributes<Self::Api>,
        uri: ManagedBuffer,
        selling_price: BigUint,
    ) -> SCResult<u64> {
        require!(!self.paused().get(), "Contract is paused");
        
        let token_id = self.token_id().get();
        let caller = self.blockchain().get_caller();
        
        // Create NFT with metadata
        let nft_nonce = self.send().esdt_nft_create_compact::<_, ()>(
            &token_id,
            &BigUint::from(1u64),
            &name,
            &BigUint::zero(),
            &ManagedBuffer::new(),
            &attributes,
            &[][..],
        );
        
        // Transfer NFT to creator
        self.send().direct_esdt(
            &caller,
            &token_id,
            nft_nonce,
            &BigUint::from(1u64),
        );
        
        // Store additional NFT data if needed
        self.nft_owner(&nft_nonce).set(&caller);
        self.nft_price(&nft_nonce).set(&selling_price);
        
        Ok(nft_nonce)
    }
    
    // Storage for NFT data
    #[storage_mapper("nftOwner")]
    fn nft_owner(&self, nft_nonce: &u64) -> SingleValueMapper<ManagedAddress>;
    
    #[storage_mapper("nftPrice")]
    fn nft_price(&self, nft_nonce: &u64) -> SingleValueMapper<BigUint>;
}

// NFT attributes structure
#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi)]
pub struct ShipAttributes<M: ManagedTypeApi> {
    pub ship_type: ShipType,
    pub attack: u8,
    pub defense: u8,
    pub speed: u8,
    pub special_abilities: ManagedVec<M, SpecialAbility>,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone, PartialEq)]
pub enum ShipType {
    Carrier,
    Battleship,
    Cruiser,
    Submarine,
    Destroyer,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, Clone)]
pub enum SpecialAbility {
    DoubleAttack,
    Shield,
    Radar,
    Stealth,
    CriticalHit,
}

#[cfg(test)]
mod tests {
    use multiversx_sc_scenario::*;
    use multiversx_sc::types::Address;

    use crate::*;

    fn setup_contract() -> (BattleshipNftImpl, ContractInfo<BattleshipNftImpl>, TestWallets) {
        let blockchain = BlockchainMock::new();
        let owner = blockchain.create_user_account(&rust_biguint!(0));
        let sc = BattleshipNftImpl::new(blockchain, owner);
        let contract_info = ContractInfo::new(&sc);
        let wallets = TestWallets::new(&sc);
        (sc, contract_info, wallets)
    }

    struct TestWallets {
        owner: Address,
        user1: Address,
    }

    impl TestWallets {
        fn new(sc: &BattleshipNftImpl) -> Self {
            let blockchain = sc.blockchain();
            Self {
                owner: blockchain.get_owner_address().clone(),
                user1: blockchain.create_user_account(&rust_biguint!(1000)),
            }
        }
    }

    #[test]
    fn test_nft_creation() {
        let (sc, contract_info, wallets) = setup_contract();
        
        // Test NFT creation
        contract_info
            .call(&wallets.user1)
            .egld_value(&rust_biguint!(10))
            .create_nft(
                b"Test Ship".to_vec(),
                b"A powerful battleship".to_vec(),
                ShipAttributes {
                    ship_type: ShipType::Battleship,
                    attack: 8,
                    defense: 7,
                    speed: 5,
                    special_abilities: ManagedVec::new(),
                },
                b"ipfs://test".to_vec(),
                rust_biguint!(100),
            )
            .assert_ok();
    }
}
