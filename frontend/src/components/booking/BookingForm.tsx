import { useState, type FormEvent } from 'react';
import type { BookingRequest } from '../../types';
import { TimeSlotPicker } from './TimeSlotPicker';

interface BookingFormProps {
  seatId: string;
  isSubmitting: boolean;
  onSubmit: (req: BookingRequest) => void;
  onCancel: () => void;
}

export function BookingForm({ seatId, isSubmitting, onSubmit, onCancel }: BookingFormProps) {
  const [studentId, setStudentId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const isTimeValid = startTime && endTime && endTime > startTime;
  const canSubmit = studentId.trim() && isTimeValid && !isSubmitting;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      seatId,
      studentId: studentId.trim(),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="e.g. s1234567"
          disabled={isSubmitting}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        />
      </div>

      <TimeSlotPicker
        startTime={startTime}
        endTime={endTime}
        onStartChange={setStartTime}
        onEndChange={setEndTime}
      />

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Booking…' : 'Confirm Booking'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
