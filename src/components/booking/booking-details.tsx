import { MapPin, CalendarDays, Clock, Bus, Armchair, User } from 'lucide-react';
import type { Booking } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/format';
import { FareSummary } from './fare-summary';

function Row({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-gold" />
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium text-navy">{value}</dd>
      </div>
    </div>
  );
}

export function BookingDetails({ booking, showPassenger = true }: { booking: Booking; showPassenger?: boolean }) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Row icon={MapPin} label="Route" value={`${booking.origin} → ${booking.destination}`} />
        <Row icon={CalendarDays} label="Travel date" value={formatDate(booking.travelDate)} />
        <Row icon={Clock} label="Departure / arrival" value={`${formatTime(booking.departureTime)} – ${formatTime(booking.arrivalTime)}`} />
        <Row icon={Bus} label="Bus" value={`${booking.busNumber} · ${booking.busCategory.toUpperCase()}`} />
        <Row icon={Armchair} label="Seat(s) & class" value={`${booking.seatIds.join(', ')} · ${booking.seatCategory}`} />
        <Row icon={MapPin} label="Boarding point" value={booking.boardingPoint} />
        {showPassenger && (
          <>
            <Row icon={User} label="Passenger" value={booking.passenger.fullName} />
            <Row icon={User} label="Contact" value={`${booking.passenger.phone} · ${booking.passenger.email}`} />
          </>
        )}
      </dl>

      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <FareSummary
          fare={{ baseFare: booking.baseFare, fees: booking.fees, discount: booking.discount, total: booking.total }}
          seatCount={booking.seatIds.length}
          currencyNote
        />
        {booking.promoCode && (
          <p className="mt-2 text-xs text-green-700">Promo applied: {booking.promoCode}</p>
        )}
      </div>
    </div>
  );
}
