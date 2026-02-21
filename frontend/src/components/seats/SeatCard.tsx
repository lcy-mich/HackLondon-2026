import type { CSSProperties } from 'react';
import { useSeatStore } from '../../store/seatStore';
import type { Seat } from '../../types';

interface SeatCardProps {
  seat: Seat;
  onClick: () => void;
  isSelected: boolean;
}

const freeClasses     = 'bg-free     border-muted   text-primary hover:border-primary transition-colors cursor-pointer';
const reservedClasses = 'bg-reserved border-muted   text-primary cursor-default';
const selectedClasses = 'bg-surface  border-accent  text-primary ring-2 ring-accent cursor-pointer';

/** Format a 0–48 slot index as "HH:MM". */
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * Returns true if `slot` falls within any half-open interval [startSlot, endSlot)
 * in the seat's todayBookings.
 */
function isSlotBooked(bookings: Seat['todayBookings'], slot: number): boolean {
  return bookings.some((b) => slot >= b.startSlot && slot < b.endSlot);
}

export function SeatCard({ seat, onClick, isSelected }: SeatCardProps) {
  const globalSelectedSlot = useSeatStore((s) => s.globalSelectedSlot);
  const currentTheme       = useSeatStore((s) => s.currentTheme);

  const bookedAtSelectedSlot = isSlotBooked(seat.todayBookings, globalSelectedSlot);

  // Reserved: find the booking that covers the current slot → show its end time.
  const currentBooking = bookedAtSelectedSlot
    ? (seat.todayBookings.find(
        (b) => globalSelectedSlot >= b.startSlot && globalSelectedSlot < b.endSlot
      ) ?? null)
    : null;

  // Free: find the next upcoming booking → hint when the seat next becomes occupied.
  const nextUpcomingSlot = !bookedAtSelectedSlot
    ? (seat.todayBookings.find((b) => b.startSlot > globalSelectedSlot) ?? null)
    : null;

  // ── Japanese theme: brutally minimal architectural card ───────────────────
  if (currentTheme === 'japanese') {
    let cardClass: string;
    let cardStyle: CSSProperties | undefined;

    if (isSelected) {
      // Selected: white fill, heavy inset ring to signal active state
      cardClass = 'bg-white text-black cursor-pointer ring-2 ring-inset ring-black';
      cardStyle = undefined;
    } else if (bookedAtSelectedSlot) {
      // Reserved: near-black fill with subtle crosshatch, white text
      cardClass = 'text-white cursor-default';
      cardStyle = {
        backgroundColor: '#111827',
        backgroundImage:
          'repeating-linear-gradient(45deg, #1f2937 0, #1f2937 1px, transparent 0, transparent 50%)',
        backgroundSize: '8px 8px',
      };
    } else {
      // Free: pure white, hover tint
      cardClass = 'bg-white text-black hover:bg-gray-50 cursor-pointer transition-colors';
      cardStyle = undefined;
    }

    return (
      <button
        className={`p-4 flex flex-col min-h-[5rem] w-full ${cardClass}`}
        style={cardStyle}
        onClick={onClick}
        aria-label={`Seat ${seat.seatId} — ${bookedAtSelectedSlot ? 'reserved' : 'free'} at selected time`}
      >
        <span className="text-2xl font-mono font-bold leading-none tracking-tight">
          {seat.seatId}
        </span>

        <div className="mt-auto">
          {currentBooking && (
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">
              ✕ {slotToLabel(currentBooking.endSlot)}
            </span>
          )}
          {nextUpcomingSlot && (
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">
              → {slotToLabel(nextUpcomingSlot.startSlot)}
            </span>
          )}
        </div>
      </button>
    );
  }

  // ── Default card (academic / paper themes) ────────────────────────────────
  const colorClasses = isSelected
    ? selectedClasses
    : bookedAtSelectedSlot
    ? reservedClasses
    : freeClasses;

  return (
    <button
      className={`border-2 p-5 flex flex-col min-h-[5.5rem] ${colorClasses}`}
      onClick={onClick}
      aria-label={`Seat ${seat.seatId} — ${bookedAtSelectedSlot ? 'reserved' : 'free'} at selected time`}
    >
      <span className="text-3xl font-bold tracking-tight leading-none">
        {seat.seatId}
      </span>

      <div className="mt-auto">
        {currentBooking && (
          <span className="text-xs text-secondary uppercase tracking-widest">
            Until {slotToLabel(currentBooking.endSlot)}
          </span>
        )}
        {nextUpcomingSlot && (
          <span className="text-xs text-secondary uppercase tracking-widest">
            From {slotToLabel(nextUpcomingSlot.startSlot)}
          </span>
        )}
      </div>
    </button>
  );
}
