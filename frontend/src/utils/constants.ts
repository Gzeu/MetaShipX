import type { ShipType } from '../types';

export const BOARD_SIZE = 10;
export const POLL_INTERVAL_MS = 5_000;
export const TURN_TIMEOUT_SEC = 120;

export const SHIP_TYPES: ShipType[] = ['Destroyer', 'Submarine', 'Cruiser', 'Battleship', 'Carrier'];

export const SHIP_SIZES: Record<ShipType, number> = {
  Destroyer:  2,
  Submarine:  3,
  Cruiser:    3,
  Battleship: 4,
  Carrier:    5,
};

export const SHIP_MINT_PRICE_EGLD: Record<ShipType, string> = {
  Destroyer:  '0.05',
  Submarine:  '0.08',
  Cruiser:    '0.10',
  Battleship: '0.15',
  Carrier:    '0.25',
};

export const STATUS_LABELS = ['Created', 'Active', 'Finished', 'Cancelled'] as const;
export const TOURNAMENT_STATUS_LABEL: Record<string, string> = {
  upcoming:     'Upcoming',
  registration: 'Open',
  active:       'Live',
  finished:     'Ended',
};

export const COL_LABELS = ['A','B','C','D','E','F','G','H','I','J'] as const;
export const ROW_LABELS = ['1','2','3','4','5','6','7','8','9','10'] as const;
