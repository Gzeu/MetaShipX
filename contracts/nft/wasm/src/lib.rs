#![no_std]

multiversx_sc_wasm_adapter::wasm_endpoints! {
    nft
    (
        init
        registerShipCollection
        mintShip
        upgradeShip
        recordWin
        burnShip
        getShipMetadata
        getOwnerShips
        getMintPrice
        getCollectionId
    )
}

multiversx_sc_wasm_adapter::empty_callback! {}
