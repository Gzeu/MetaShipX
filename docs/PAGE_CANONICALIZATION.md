# Page Canonicalization — next-massive-update

## Problem

During rapid development (v0.1–v0.4), several pages accumulated duplicate
implementations: a flat `.tsx` file **and** a sub-directory with the same name,
plus a `XPage.tsx` re-export wrapper that was never wired consistently.

## Decision (May 2026)

| Flow | Canonical file | Deprecated aliases |
|---|---|---|
| Game | `GamePage/index.tsx` | `Game.tsx` |
| Marketplace | `MarketplacePage.tsx` | `Marketplace.tsx` |
| Staking | `StakingPage.tsx` | `Staking.tsx` |
| Tournaments | `Tournaments.tsx` | `TournamentsPage.tsx` |
| Leaderboard | `Leaderboard.tsx` | `LeaderboardPage.tsx` |
| Home | `Home.tsx` | `HomePage.tsx` |
| Profile | `Profile.tsx` | `ProfilePage.tsx` |
| NotFound | `NotFound.tsx` | `NotFoundPage.tsx` |

## Migration steps

1. All deprecated aliases now re-export from canonical.
2. Router (`App.tsx`) must import canonical only.
3. Deprecated files to be **deleted** in the v1.0.0 release PR.
4. Sub-directories (`Game/`, `Marketplace/`, etc.) contain shared components
   used by the canonical page — they are NOT pages themselves.

## Router import example

```tsx
// ✅ correct
import GamePage    from './pages/GamePage';
import MarketplacePage from './pages/MarketplacePage';
import StakingPage from './pages/StakingPage';

// ❌ old — will be removed
import Game        from './pages/Game';
import Marketplace from './pages/Marketplace';
```
