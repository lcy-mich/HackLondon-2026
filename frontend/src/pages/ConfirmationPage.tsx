import { CheckCircle } from 'lucide-react';
import type { BookingResponse } from '../types';

interface ConfirmationPageProps {
  booking: BookingResponse;
  onBack: () => void;
}

export function ConfirmationPage({ booking, onBack }: ConfirmationPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
      <CheckCircle className="w-16 h-16 text-green-500" />
      <h2 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h2>
      <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-sm text-left space-y-3">
        <Row label="Booking ID" value={booking.bookingId} />
        <Row label="Seat" value={booking.seatId} />
        <Row label="Student ID" value={booking.studentId} />
        <Row
          label="Start"
          value={new Date(booking.startTime).toLocaleString()}
        />
        <Row
          label="End"
          value={new Date(booking.endTime).toLocaleString()}
        />
        <Row label="Status" value={booking.status} />
      </div>
      <button
        onClick={onBack}
        className="bg-blue-600 text-white rounded-lg px-6 py-2 font-semibold hover:bg-blue-700 transition-colors"
      >
        Back to Seat Map
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-gray-800 font-semibold">{value}</span>
    </div>
  );
}
