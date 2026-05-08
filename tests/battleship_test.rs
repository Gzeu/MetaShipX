// ─── Battleship contract tests ────────────────────────────────────────────
// Run with: cargo test --manifest-path contracts/battleship/Cargo.toml

#[cfg(test)]
mod battleship_tests {
    use multiversx_sc_scenario::*;

    fn world() -> ScenarioWorld {
        let mut blockchain = ScenarioWorld::new();
        blockchain.register_contract(
            "file:contracts/battleship/output/battleship.wasm",
            battleship::ContractBuilder,
        );
        blockchain
    }

    #[test]
    fn test_create_game() {
        let mut world = world();
        world.run("tests/scenarios/create_game.scen.json");
    }

    #[test]
    fn test_join_game() {
        let mut world = world();
        world.run("tests/scenarios/join_game.scen.json");
    }

    #[test]
    fn test_place_ships() {
        let mut world = world();
        world.run("tests/scenarios/place_ships.scen.json");
    }

    #[test]
    fn test_attack_hit() {
        let mut world = world();
        world.run("tests/scenarios/attack_hit.scen.json");
    }

    #[test]
    fn test_attack_miss() {
        let mut world = world();
        world.run("tests/scenarios/attack_miss.scen.json");
    }

    #[test]
    fn test_withdraw_timeout() {
        let mut world = world();
        world.run("tests/scenarios/withdraw_timeout.scen.json");
    }
}
