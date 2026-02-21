import { useState, type FormEvent, type ChangeEvent } from 'react';
import type { BookingRequest, Seat, TimeSlot } from '../../types';
import { SeatTimeline } from './SeatTimeline';

interface BookingFormProps {
  seat: Seat;
  isSubmitting: boolean;
  onSubmit: (req: BookingRequest) => void;
  onCancel: () => void;
}

export function BookingForm({ seat, isSubmitting, onSubmit, onCancel }: BookingFormProps) {
  const [studentId, setStudentId] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const isPinValid  = /^\d{4}$/.test(pinCode);
  const canSubmit   = studentId.trim() !== '' && selectedSlot !== null && isPinValid && !isSubmitting;

  // Strip non-digits and cap at 4 characters so the field never holds invalid data
  function handlePinChange(e: ChangeEvent<HTMLInputElement>) {
    setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedSlot) return;
    onSubmit({
      seatId:    seat.seatId,
      studentId: studentId.trim(),
      startSlot: selectedSlot.startSlot,
      endSlot:   selectedSlot.endSlot,
      pinCode,
    });
  }

  const pinTouched   = pinCode.length > 0;
  const pinIsInvalid = pinTouched && !isPinValid;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Binary timeline slot picker */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          Select a time slot
        </label>
        <SeatTimeline seat={seat} onSlotSelected={setSelectedSlot} />
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
