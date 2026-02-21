import { useState } from 'react';
import type { Seat, TimeSlot } from '../../types';

interface SeatTimelineProps {
  seat: Seat;
  onSlotSelected: (selection: TimeSlot | null) => void;
}

/** Format a 0–47 slot index (or 48 = end-of-day) as "HH:MM". */
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

/** True if slot index `i` is covered by any booking's [startSlot, endSlot). */
function isSlotBooked(bookings: TimeSlot[], i: number): boolean {
  return bookings.some((b) => i >= b.startSlot && i < b.endSlot);
}

/**
 * True if the inclusive range [lo, hi] intersects any booking.
 * Half-open interval math: [lo, hi] ∩ [b.start, b.end) ≠ ∅
 * iff max(lo, b.start) < min(hi + 1, b.end).
 */
function hasBookedSlotInRange(bookings: TimeSlot[], lo: number, hi: number): boolean {
  return bookings.some(
    (b) => Math.max(lo, b.startSlot) < Math.min(hi + 1, b.endSlot)
  );
}

export function SeatTimeline({ seat, onSlotSelected }: SeatTimelineProps) {
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd]     = useState<number | null>(null);

  // Normalised (lo ≤ hi) bounds — only valid once both clicks are registered.
  const selLo =
    selectionStart !== null && selectionEnd !== null
      ? Math.min(selectionStart, selectionEnd)
      : null;
  const selHi =
    selectionStart !== null && selectionEnd !== null
      ? Math.max(selectionStart, selectionEnd)
      : null;

  function handleSlotClick(i: number) {
    if (isSlotBooked(seat.todayBookings, i)) return;

    if (selectionStart === null || selectionEnd !== null) {
      // State 0 / State 2 → anchor a new start, clear any previous selection
      setSelectionStart(i);
      setSelectionEnd(null);
      onSlotSelected(null);
      return;
    }

    // State 1 → second click: attempt to complete the range
    const lo = Math.min(selectionStart, i);
    const hi = Math.max(selectionStart, i);

    if (hasBookedSlotInRange(seat.todayBookings, lo, hi)) {
      // Range crosses a booked block — reset silently; red blocks are self-evident
      setSelectionStart(null);
      setSelectionEnd(null);
      onSlotSelected(null);
      return;
    }

    setSelectionEnd(i);
    // endSlot is exclusive per API contract: last selected slot index + 1
    onSlotSelected({ startSlot: lo, endSlot: hi + 1 });
  }

  function getSlotClasses(i: number): string {
    if (isSlotBooked(seat.todayBookings, i)) {
      return 'bg-reserved disabled:cursor-not-allowed opacity-90';
    }
    if (selLo !== null && selHi !== null && i >= selLo && i <= selHi) {
      return 'bg-accent cursor-pointer';
    }
    if (selectionStart !== null && selectionEnd === null && i === selectionStart) {
      // Anchor slot: same accent colour, slightly dimmed to distinguish from confirmed range
      return 'bg-accent opacity-70 cursor-pointer';
    }
    return 'bg-free cursor-pointer';
  }

  const hasCompleteSelection = selLo !== null && selHi !== null;
  const slotCount = hasCompleteSelection ? selHi! - selLo! + 1 : 0;

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-secondary mb-2">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-free border border-muted" />
          Free
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-reserved" />
          Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-accent" />
          Selected
        </span>
      </div>

      {/* 48-slot binary bar */}
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: 'repeat(48, minmax(0, 1fr))' }}
      >
        {Array.from({ length: 48 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSlotClick(i)}
            disabled={isSlotBooked(seat.todayBookings, i)}
            className={`h-8 rounded-sm transition-colors ${getSlotClasses(i)}`}
            title={`${slotToLabel(i)}${isSlotBooked(seat.todayBookings, i) ? ' (booked)' : ''}`}
            aria-label={`${slotToLabel(i)} — ${isSlotBooked(seat.todayBookings, i) ? 'booked' : 'free'}`}
          />
        ))}
      </div>

      {/* Hour labels: one per 4 slots (= every 2 hours) */}
      <div className="flex mt-1">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="flex-1 text-secondary text-left select-none"
            style={{ fontSize: '9px' }}
          >
            {`${String(i * 2).padStart(2, '0')}:00`}
          </div>
        ))}
      </div>

      {/* Selection feedback — fixed height to prevent layout shift */}
      <div className="mt-2 min-h-[1.25rem]">
        {selectionStart !== null && selectionEnd === null && (
          <p className="text-xs text-accent">
            Start: <strong>{slotToLabel(selectionStart)}</strong> — click a second free slot
            to set the end time.
          </p>
        )}
        {hasCompleteSelection && (
          <p className="text-xs text-accent font-medium">
            Selected:{' '}
            <strong>
              {slotToLabel(selLo!)} – {slotToLabel(selHi! + 1)}
            </strong>
            <span className="text-secondary font-normal ml-1">
              ({slotCount} slot{slotCount !== 1 ? 's' : ''} · {slotCount * 30} min)
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
