'use client';

import { MapPin } from 'lucide-react';
import { Select } from '@/components/ui/select';

/**
 * A labelled origin/destination picker with a leading location pin.
 * The native <select> keeps it fully keyboard-accessible and reliable on
 * low-end devices; long city names wrap via the browser's own menu so the
 * closed control never clips text.
 */
export function LocationSelect({
  id,
  label,
  value,
  cities,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  cities: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-orange-600"
          aria-hidden
        />
        <Select
          id={id}
          className="pl-9"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {disabled && <option value="">No active routes</option>}
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
