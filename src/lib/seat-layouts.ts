import type { SeatCategory, SeatCell, SeatLayout } from './types';

const SEAT_LETTERS = 'ABCDEF';

function categoryForRow(row: number, vipRows: number, businessRows: number): SeatCategory {
  if (row <= vipRows) return 'vip';
  if (row <= vipRows + businessRows) return 'business';
  return 'standard';
}

export function buildSeatLayoutTemplate(opts: {
  id: string;
  name: string;
  rows: number;
  leftSeats: number;
  rightSeats: number;
  vipRows: number;
  businessRows: number;
  createdAt: string;
  updatedAt?: string;
}): SeatLayout {
  const cols = opts.leftSeats + 1 + opts.rightSeats;
  const cells: SeatCell[] = [];

  for (let row = 1; row <= opts.rows; row += 1) {
    const category = categoryForRow(row, opts.vipRows, opts.businessRows);
    let seatIdx = 0;
    for (let col = 0; col < cols; col += 1) {
      if (col === opts.leftSeats) {
        cells.push({ id: '', row, col, kind: 'aisle', category });
        continue;
      }
      const letter = SEAT_LETTERS[seatIdx] ?? 'X';
      cells.push({ id: `${row}${letter}`, row, col, kind: 'seat', category });
      seatIdx += 1;
    }
  }

  return {
    id: opts.id,
    name: opts.name,
    rows: opts.rows,
    cols,
    cells,
    capacity: cells.filter((cell) => cell.kind === 'seat').length,
    createdAt: opts.createdAt,
    updatedAt: opts.updatedAt ?? opts.createdAt,
  };
}
