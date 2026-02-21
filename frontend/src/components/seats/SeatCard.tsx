import { useSeatStore } from '../../store/seatStore';
import type { Seat } from '../../types';
import { SeatStatusBadge } from './SeatStatusBadge';

interface SeatCardProps {
  seat: Seat;
  onClick: () => void;
  isSelected: boolean;
}

// Colour schemes for the two binary projected states — all resolved from active theme tokens
const freeClasses     = 'bg-free     border-muted text-primary hover:shadow-md hover:scale-105';
const reservedClasses = 'bg-reserved border-muted text-primary';
const selectedClasses = 'bg-surface  border-accent ring-2 ring-accent text-primary';

/**
 * Returns true if `slot` falls within any half-open interval [startSlot, endSlot)
 * in the seat's todayBookings. This is the core timeline lookup — O(n) over bookings.
 */
function isSlotBooked(bookings: Seat['todayBookings'], slot: number): boolean {
  return bookings.some((b) => slot >= b.startSlot && slot < b.endSlot);
}

export function SeatCard({ seat, onClick, isSelected }: SeatCardProps) {
  const globalSelectedSlot = useSeatStore((s) => s.globalSelectedSlot);

  // Derive the projected status at the slider time — binary free/reserved only.
  // Hardware states (upcoming, awaiting_checkin, occupied) are intentionally
  // ignored here; the map projection shows what the seat WILL be at any time.
  const bookedAtSelectedSlot = isSlotBooked(seat.todayBookings, globalSelectedSlot);
  const derivedStatus        = bookedAtSelectedSlot ? 'reserved' : 'free';

  const colorClasses = isSelected
    ? selectedClasses
    : bookedAtSelectedSlot
    ? reservedClasses
    : freeClasses;

  // Find the next upcoming booking relative to the slider position, so
  // free seats can hint when they next become occupied.
  const nextUpcomingSlot = !bookedAtSelectedSlot
    ? seat.todayBookings.find((b) => b.startSlot > globalSelectedSlot)
    : null;

  return (
    <button
      className={`rounded-xl border-2 p-4 flex flex-col gap-2 transition-all duration-150 cursor-pointer ${colorClasses}`}
      onClick={onClick}
      aria-label={`Seat ${seat.seatId} — ${derivedStatus} at selected time`}
    >
      <span className="text-lg font-bold">{seat.seatId}</span>
      <SeatStatusBadge status={derivedStatus} />
      {nextUpcomingSlot && (
        <span className="text-xs opacity-75 mt-1">
          Booked {String(Math.floor(nextUpcomingSlot.startSlot / 2)).padStart(2, '0')}:
          {nextUpcomingSlot.startSlot % 2 === 0 ? '00' : '30'}
        </span>
      )}
    </button>
  );
}
