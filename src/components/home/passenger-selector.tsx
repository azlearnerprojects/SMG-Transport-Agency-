'use client';

import { Users } from 'lucide-react';
import { Select } from '@/components/ui/select';

/** Minimum / maximum passengers per booking (kept in sync with tripSearchSchema). */
export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 5;

/**
 * Passenger count picker. Uses a native <select> bounded to the booking limits
 * so the value can never fall outside what the search schema accepts.
 */
export function PassengerSelector({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const options = Array.from(
    { length: MAX_PASSENGERS - MIN_PASSENGERS + 1 },
    (_, index) => MIN_PASSENGERS + index,
  );

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        Passengers
      </label>
      <div className="relative">
        <Users
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-orange-600"
          aria-hidden
        />
        <Select
          id={id}
          className="pl-9"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {options.map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? 'passenger' : 'passengers'}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
