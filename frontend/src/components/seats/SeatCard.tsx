import type { CSSProperties } from 'react';
import { useSeatStore } from '../../store/seatStore';
import type { Seat, TimeSlot } from '../../types';

interface SeatCardProps {
  seat: Seat;
  onClick: () => void;
  isSelected: boolean;
}

const freeClasses     = 'bg-free     border-muted   text-primary hover:border-primary transition-colors cursor-pointer';
const reservedClasses = 'bg-reserved border-muted   text-primary cursor-default';
const selectedClasses = 'bg-surface  border-accent  text-primary ring-2 ring-accent cursor-pointer';

/** Format a 0–48 node index as "HH:MM". Node 48 → "24:00". */
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * Returns true if the visual range [left, right) (right exclusive) overlaps
 * any booking in the list.  Booking intervals are half-open [startSlot, endSlot).
 * Overlap iff max(left, b.start) < min(right, b.end).
 */
function isRangeBooked(bookings: TimeSlot[], left: number, right: number): boolean {
  return bookings.some(
    (b) => Math.max(left, b.startSlot) < Math.min(right, b.endSlot)
  );
}

export function SeatCard({ seat, onClick, isSelected }: SeatCardProps) {
  const selectedTimeRange = useSeatStore((s) => s.selectedTimeRange);
  const currentTheme      = useSeatStore((s) => s.currentTheme);
  const [left, right] = selectedTimeRange;

  const bookedInRange = isRangeBooked(seat.todayBookings, left, right);

  // First booking that overlaps the selected range → show "Until HH:MM" hint.
  const currentBooking = bookedInRange
    ? (seat.todayBookings.find(
        (b) => Math.max(left, b.startSlot) < Math.min(right, b.endSlot)
      ) ?? null)
    : null;

  // First booking that starts at or after the right edge → show "From HH:MM" hint.
  const nextUpcomingSlot = !bookedInRange
    ? (seat.todayBookings.find((b) => b.startSlot >= right) ?? null)
    : null;

  // ── Japanese theme: sophisticated vertical-stack bar card ────────────────
  if (currentTheme === 'japanese') {
    let cardClass: string;
    let cardStyle: CSSProperties | undefined;

    if (isSelected) {
      cardClass = 'bg-white text-black cursor-pointer ring-2 ring-inset ring-[#334155]';
      cardStyle = undefined;
    } else if (bookedInRange) {
      cardClass = 'text-white cursor-default';
      cardStyle = {
        backgroundColor: '#334155',
        backgroundImage:
          'repeating-linear-gradient(45deg, #475569 0, #475569 1px, transparent 0, transparent 50%)',
        backgroundSize: '8px 8px',
      };
    } else {
      cardClass = 'bg-white text-black hover:bg-gray-50 cursor-pointer transition-colors';
      cardStyle = undefined;
    }

    return (
      <button
        className={`px-6 py-4 flex flex-row items-center justify-between min-h-[4.5rem] w-full ${cardClass}`}
        style={cardStyle}
        onClick={onClick}
        aria-label={`Seat ${seat.seatId} — ${bookedInRange ? 'reserved' : 'free'} during selected window`}
      >
        <span className="text-5xl font-mono font-black leading-none tracking-tight">
          {seat.seatId}
        </span>

        <div className="text-right">
          {currentBooking && (
            <span className="text-sm font-mono uppercase tracking-widest opacity-70">
              ✕ Until {slotToLabel(currentBooking.endSlot)}
            </span>
          )}
          {nextUpcomingSlot && (
            <span className="text-sm font-mono uppercase tracking-widest opacity-60">
              → From {slotToLabel(nextUpcomingSlot.startSlot)}
            </span>
          )}
        </div>
      </button>
    );
  }

  // ── Default card (academic / paper themes) ────────────────────────────────
  const colorClasses = isSelected
    ? selectedClasses
    : bookedInRange
    ? reservedClasses
    : freeClasses;

  return (
    <button
      className={`border-2 p-5 flex flex-col min-h-[5.5rem] ${colorClasses}`}
      onClick={onClick}
      aria-label={`Seat ${seat.seatId} — ${bookedInRange ? 'reserved' : 'free'} during selected window`}
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
