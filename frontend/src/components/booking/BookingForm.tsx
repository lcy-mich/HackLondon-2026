import { useState, type FormEvent, type ChangeEvent } from 'react';
import type { BookingRequest, Seat } from '../../types';
import { useSeatStore } from '../../store/seatStore';
import { SeatTimeline } from './SeatTimeline';

/** Format a 0–48 node index as "HH:MM". Node 48 → "24:00". */
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

interface BookingFormProps {
  seat: Seat;
  isSubmitting: boolean;
  onSubmit: (req: BookingRequest) => void;
  onCancel: () => void;
}

export function BookingForm({ seat, isSubmitting, onSubmit, onCancel }: BookingFormProps) {
  const selectedTimeRange = useSeatStore((s) => s.selectedTimeRange);
  const [left, right] = selectedTimeRange;

  const [studentId, setStudentId] = useState('');
  const [pinCode, setPinCode]     = useState('');

  const isPinValid = /^\d{4}$/.test(pinCode);
  const canSubmit  = studentId.trim() !== '' && isPinValid && !isSubmitting;

  function handlePinChange(e: ChangeEvent<HTMLInputElement>) {
    setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    // Math Hack: visual node `right` is exclusive, so backend endSlot = right - 1.
    onSubmit({
      seatId:    seat.seatId,
      studentId: studentId.trim(),
      startSlot: left,
      endSlot:   right - 1,
      pinCode,
    });
  }

  const pinTouched   = pinCode.length > 0;
  const pinIsInvalid = pinTouched && !isPinValid;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Booking window (driven by the global dual-thumb slider) */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-1">
          Booking window
        </label>
        <p className="text-base font-bold text-accent">
          {slotToLabel(left)} – {slotToLabel(right)}
        </p>
        <p className="text-xs text-secondary mt-0.5">
          Adjust the time slider above to change your booking window.
        </p>
      </div>

      {/* Per-seat availability timeline (read-only reference) */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          Seat availability today
        </label>
        <SeatTimeline seat={seat} onSlotSelected={() => {}} />
      </div>

      {/* Student ID */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-1">Student ID</label>
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="e.g. s1234567"
          disabled={isSubmitting}
          className="w-full border border-muted rounded-lg px-3 py-2 text-sm text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
      </div>

      {/* Check-in PIN */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-1">Check-in PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pinCode}
          onChange={handlePinChange}
          placeholder="••••"
          disabled={isSubmitting}
          className={`w-full border rounded-lg px-3 py-2 text-sm text-primary bg-surface focus:outline-none focus:ring-2 disabled:opacity-50 ${
            pinIsInvalid
              ? 'border-reserved focus:ring-reserved'
              : 'border-muted focus:ring-accent'
          }`}
        />
        {pinIsInvalid ? (
          <p className="text-xs text-red-500 mt-1">PIN must be exactly 4 digits.</p>
        ) : (
          <p className="text-xs text-secondary mt-1">
            You'll type this at the seat keypad to check in.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 bg-accent text-header-fg rounded-lg py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Booking…' : 'Confirm Booking'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-surface border border-muted text-secondary rounded-lg py-2 text-sm font-semibold hover:bg-main disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
