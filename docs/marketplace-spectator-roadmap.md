# Marketplace & Spectator Roadmap

## NFT Secondary Marketplace
- Add smart contract or escrow flow for `listShip`, `cancelListing`, `buyShip`
- Transfer ship ownership atomically against EGLD payment
- Optional marketplace fee routed to treasury or staking pool
- Add seller dashboard and owned listings page

## Spectator Mode
- Read-only public match rooms via backend WebSocket gateway
- Subscribe to `game:{id}` room
- Stream move events and board deltas without private ship positions
- Add replay timeline for finished matches

## Sound & Hit/Miss Animations
- Add mp3/ogg assets in `frontend/public/sounds/`
- Trigger audio from attack results in `useGame`
- Overlay `BattleFx` component for hit/miss/sunk/gameover states
- Respect reduced motion + mute toggle

## Ship Skin System
- Cosmetic-only metadata layer per ship
- `equipSkin(ship_nonce, skin_id)` can live off-chain first, on-chain later
- Skins affect visuals only, never gameplay stats
- Future: skin NFTs, rarity, seasonal drops
