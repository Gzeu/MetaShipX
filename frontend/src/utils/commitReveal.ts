/**
 * Commit-Reveal utilities for ship placement anti-cheat.
 * The salt is generated client-side and NEVER sent to the backend
 * until the reveal phase.
 */

const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

/** Generate a cryptographically random salt (hex string) */
export function generateSalt(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Compute SHA-256 hash of sorted positions + salt */
export async function computeCommitHash(positions: number[], salt: string): Promise<string> {
  const sorted = [...positions].sort((a, b) => a - b);
  const payload = JSON.stringify(sorted) + '|' + salt;
  const encoded = new TextEncoder().encode(payload);
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Verify that a revealed placement matches the original commit hash */
export async function verifyCommitHash(
  positions: number[],
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await computeCommitHash(positions, salt);
  return actualHash === expectedHash;
}

/**
 * Validate ship placement rules:
 * - All cells in bounds [0, GRID_SIZE*GRID_SIZE)
 * - No duplicate cells (overlap check)
 * - Each ship is contiguous (horizontal or vertical only)
 */
export function validateShipPlacement(ships: number[][]): { valid: boolean; reason?: string } {
  const allCells = ships.flat();

  // Bounds check
  if (allCells.some(c => c < 0 || c >= TOTAL_CELLS)) {
    return { valid: false, reason: 'Cell out of bounds' };
  }

  // Overlap check
  const unique = new Set(allCells);
  if (unique.size !== allCells.length) {
    return { valid: false, reason: 'Ships overlap' };
  }

  // Contiguity check per ship
  for (const ship of ships) {
    if (ship.length < 1) continue;
    const rows = ship.map(c => Math.floor(c / GRID_SIZE));
    const cols = ship.map(c => c % GRID_SIZE);
    const sorted = [...ship].sort((a, b) => a - b);

    const isHorizontal = rows.every(r => r === rows[0]);
    const isVertical   = cols.every(c => c === cols[0]);

    if (!isHorizontal && !isVertical) {
      return { valid: false, reason: `Ship at cells [${ship}] is not straight` };
    }

    // Check contiguous (no gaps)
    for (let i = 1; i < sorted.length; i++) {
      const step = isHorizontal ? 1 : GRID_SIZE;
      if (sorted[i] - sorted[i - 1] !== step) {
        return { valid: false, reason: `Ship at cells [${ship}] has a gap` };
      }
    }
  }

  return { valid: true };
}

/** Store salt securely in memory (NOT localStorage — xPortal iframe blocks it) */
const saltStore = new Map<string, string>();

export function storeSalt(gameId: string, salt: string): void {
  saltStore.set(gameId, salt);
}

export function retrieveSalt(gameId: string): string | undefined {
  return saltStore.get(gameId);
}

export function clearSalt(gameId: string): void {
  saltStore.delete(gameId);
}
