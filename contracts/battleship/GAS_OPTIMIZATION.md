# Gas Optimization — `attack()` endpoint

`attack()` este cel mai apelat endpoint din MetaShipX (un apel per mutare, per joc).
Optimizările de gas aici au impact direct și multiplicat asupra costului total al
protocolului.

---

## Tehnici aplicate

### 1. `SetMapper` / `UnorderedSetMapper` în loc de `VecMapper`

```rust
// ❌ ÎNAINTE — VecMapper, contains() = O(n) = gaz liniar cu numărul de atacuri
#[storage_mapper("attackedPositions")]
fn attacked_positions(&self, game_id: u64) -> VecMapper<u32>;

// ✅ DUPĂ — SetMapper, contains() = O(1) = gaz constant
#[storage_mapper("attackedPositions")]
fn attacked_positions(&self, game_id: u64) -> UnorderedSetMapper<u32>;
// Folosește UnorderedSetMapper dacă nu ai nevoie de iterare în ordine.
// SetMapper păstrează ordinea de inserare, costă ceva mai mult per insert.
```

**Impact:** Pe un joc complet (100 celule maxim), diferența între O(n) și O(1)
la al 50-lea atac este ~50× mai puțin gas pentru `contains()` check.

---

### 2. Cache reads — citește storage o singură dată per funcție

```rust
// ❌ ÎNAINTE — 3 citiri din storage
#[endpoint(attack)]
fn attack(&self, position: u32) {
    let game_id = self.player_game(&self.blockchain().get_caller()).get();
    require!(!self.attacked_positions(game_id).contains(&position), "Already attacked");
    // ... alte logici care recitesc player_game() ...
    self.attacked_positions(game_id).insert(position); // a 3-a citire game_id
}

// ✅ DUPĂ — o singură citire, reutilizată
#[endpoint(attack)]
fn attack(&self, position: u32) {
    let caller  = self.blockchain().get_caller();  // cached
    let game_id = self.player_game(&caller).get(); // O singură citire storage
    require!(!self.attacked_positions(game_id).contains(&position), "Already attacked");
    self.attacked_positions(game_id).insert(position);
    // game_id refolosit — nu se mai citește din storage
}
```

---

### 3. Batch updates — o singură scriere finală

```rust
// ❌ ÎNAINTE — scrieri intermediare multiple
fn attack(&self, ...) {
    self.game_turn(game_id).set(next_player);  // scriere 1
    self.game_hits(game_id).set(hits + 1);    // scriere 2
    self.game_board(game_id).set(board);      // scriere 3
    // Fiecare .set() = 1 storage write = gas
}

// ✅ DUPĂ — construiește starea în memorie, o singură scriere
fn attack(&self, ...) {
    let mut game = self.games(game_id).get(); // O citire
    game.turn        = next_player;
    game.hits       += 1;
    game.board[pos]  = CellState::Hit;
    self.games(game_id).set(game);            // O singură scriere
}
```

**Impact:** Reduce numărul de storage writes de la N la 1, proportional cu
numărul de câmpuri updatate per atac.

---

### 4. Avoid `for` loops pe storage

```rust
// ❌ Fiecare iterație = gas aditional
for player in self.tournament_players(id).iter() {
    // procesare per jucător
}

// ✅ Alternativă: procesează offline și trimite rezultat agregat
// SAU limitează colecțiile la dimensiuni bounded (max 64 jucători în tournament)
```

---

### 5. `require!` cât mai devreme (fail fast)

```rust
// ✅ Verifică condițiile ieftine ÎNAINTE de operații scumpe
#[endpoint(attack)]
fn attack(&self, position: u32) {
    // 1. Check cheap: bounds
    require!(position < 100, "Invalid position");
    // 2. Check storage (costă gas)
    let caller  = self.blockchain().get_caller();
    let game_id = self.player_game(&caller).get();
    // 3. Check storage mai scump
    require!(!self.attacked_positions(game_id).contains(&position), "Already attacked");
    // 4. Logică principală
}
```

---

## Măsurare gas

Măsoară impactul real cu `mxpy`:

```bash
# Simulare locală — afișează gas folosit
mxpy contract call <ADDRESS> \
  --function attack \
  --arguments 0x00000001 0x05 0x03 \
  --simulate \
  --proxy https://devnet-gateway.multiversx.com

# Compară gas_used înainte și după optimizare
# Target: < 3_000_000 gas per attack() call
```

---

## Benchmark estimate

| Operație | Gas estimat |
|---|---|
| `SetMapper::contains()` | ~50 000 |
| `VecMapper::contains()` la poziția 50 | ~2 500 000 |
| Storage read (cached în var) | 0 (extra) |
| Storage read (din mapper) | ~50 000 |
| Storage write | ~100 000 |
| Event emit | ~30 000 |
| **Total `attack()` optimizat** | **~400 000 – 600 000** |
| **Total `attack()` neoptimizat** | **~3 000 000 – 5 000 000** |

---

## Gas limit recomandat pentru frontend

```typescript
// battleship.service.ts
export function attack(_address: string, gameId: number, row: number, col: number) {
  // 3_000_000 e conservator — după optimizare poți reduce la 1_500_000
  // Măsoară cu --simulate înainte de a reduce!
  return sendTx(`attack@${hex8(gameId)}@${hex2(row)}@${hex2(col)}`, '0', 3_000_000);
}
```

După optimizări confirmate pe devnet, scade gas limit la `1_500_000` pentru a
îmbunătăți UX (tranzacțiile cu gas limit prea mare par mai lente în estimare).
