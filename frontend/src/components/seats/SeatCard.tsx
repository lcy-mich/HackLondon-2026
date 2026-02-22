import type { CSSProperties } from 'react';
import { User } from 'lucide-react';
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

/** Current real-world slot index (0–47) based on the user's local clock. */
function currentRealWorldSlot(): number {
  const now = new Date();
  return Math.floor((now.getHours() * 60 + now.getMinutes()) / 30);
}

/**
 * Returns true if the visual range [left, right) overlaps any booking.
 * Intervals are half-open; overlap iff max(left, b.start) < min(right, b.end).
 */
function isRangeBooked(bookings: TimeSlot[], left: number, right: number): boolean {
  return bookings.some(
    (b) => Math.max(left, b.startSlot) < Math.min(right, b.endSlot)
  );
}

/**
 * Walk-in Phantom Booking check.
 *
 * If physicalStatus === "occupied", there's an unregistered person sitting now.
 * The system treats them as holding a phantom booking:
 *   phantomStart = currentRealWorldSlot   (inclusive)
 *   phantomEnd   = startSlot of the next future booking | 48  (exclusive)
 *
 * Returns true if the user's selected range [left, right) overlaps [phantomStart, phantomEnd).
 */
function isPhantomBlocking(seat: Seat, left: number, right: number): boolean {
  if (seat.physicalStatus !== 'occupied') return false;

  const nowSlot     = currentRealWorldSlot();
  const phantomStart = nowSlot;

  // First booking whose startSlot is strictly after now → walk-in is forced out at that point.
  const nextFuture = seat.todayBookings
    .filter((b) => b.startSlot > nowSlot)
    .sort((a, b) => a.startSlot - b.startSlot)[0];

  const phantomEnd = nextFuture ? nextFuture.startSlot : 48;

  return Math.max(left, phantomStart) < Math.min(right, phantomEnd);
}

export function SeatCard({ seat, onClick, isSelected }: SeatCardProps) {
  const selectedTimeRange = useSeatStore((s) => s.selectedTimeRange);
  const currentTheme      = useSeatStore((s) => s.currentTheme);
  const [left, right] = selectedTimeRange;

  const bookedInRange      = isRangeBooked(seat.todayBookings, left, right);
  const phantomBlocked     = isPhantomBlocking(seat, left, right);
  const isUnavailable      = bookedInRange || phantomBlocked;
  // True only when the physical walk-in (not an online booking) is the sole reason.
  const physicalOnlyBlock  = phantomBlocked && !bookedInRange;

  // First online booking that overlaps the selected range → show "Until HH:MM" hint.
  const currentBooking = bookedInRange
    ? (seat.todayBookings.find(
        (b) => Math.max(left, b.startSlot) < Math.min(right, b.endSlot)
      ) ?? null)
    : null;

  // First booking that starts at or after the right edge → show "From HH:MM" hint.
  const nextUpcomingSlot = !isUnavailable
    ? (seat.todayBookings.find((b) => b.startSlot >= right) ?? null)
    : null;

  // Walk-in status: find the next future booking to estimate when seat becomes reserved.
  const nowSlot = currentRealWorldSlot();
  const nextFutureBooking = physicalOnlyBlock
    ? (seat.todayBookings
        .filter((b) => b.startSlot > nowSlot)
        .sort((a, b) => a.startSlot - b.startSlot)[0] ?? null)
    : null;

  // ── Japanese theme: sophisticated vertical-stack bar card ────────────────
  if (currentTheme === 'japanese') {
    let cardClass: string;
    let cardStyle: CSSProperties | undefined;

    if (isSelected) {
      cardClass = 'bg-white text-black cursor-pointer ring-2 ring-inset ring-[#334155]';
      cardStyle = undefined;
    } else if (physicalOnlyBlock) {
      // Walk-in / physical occupancy — light grey, readable dark text
      cardClass = 'bg-gray-200 text-black cursor-default';
      cardStyle = undefined;
    } else if (isUnavailable) {
      // Online reservation — dark crosshatch
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
        aria-label={`Seat ${seat.seatId} — ${isUnavailable ? 'unavailable' : 'free'} during selected window`}
      >
        <span className="text-5xl font-mono font-black leading-none tracking-tight">
          {seat.seatId}
        </span>

        <div className="flex items-center gap-3 text-right">
          {/* Walk-in status text: estimated clearing time */}
          {physicalOnlyBlock && (
            <span className="text-sm font-mono uppercase tracking-widest opacity-70">
              {nextFutureBooking
                ? `✕ EST. ${slotToLabel(nextFutureBooking.startSlot)}`
                : '✕ UNTIL ?'}
            </span>
          )}

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
    : isUnavailable
    ? reservedClasses
    : freeClasses;

  return (
    <button
      className={`border-2 p-5 flex flex-col min-h-[5.5rem] ${colorClasses}`}
      onClick={onClick}
      aria-label={`Seat ${seat.seatId} — ${isUnavailable ? 'unavailable' : 'free'} during selected window`}
    >
      <span className="text-3xl font-bold tracking-tight leading-none">
        {seat.seatId}
      </span>

      <div className="mt-auto">
        {physicalOnlyBlock && (
          <span className="flex items-center gap-1 text-xs text-secondary uppercase tracking-widest">
            <User size={10} />
            walk‑in
          </span>
        )}
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
