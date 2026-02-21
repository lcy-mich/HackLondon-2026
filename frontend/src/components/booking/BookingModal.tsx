import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useBooking } from '../../hooks/useBooking';
import { useSeatStore } from '../../store/seatStore';
import { BookingForm } from './BookingForm';

export function BookingModal() {
  const { selectedSeat, isBookingModalOpen, closeModal } = useSeatStore();
  const { submitBooking, isSubmitting } = useBooking();

  // Close on ESC key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isBookingModalOpen) closeModal();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isBookingModalOpen, closeModal]);

  if (!isBookingModalOpen || !selectedSeat) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-gray-800 mb-1">Book Seat {selectedSeat.seatId}</h2>
        <p className="text-sm text-gray-500 mb-5">Fill in your details to reserve this seat.</p>

        <BookingForm
          seatId={selectedSeat.seatId}
          isSubmitting={isSubmitting}
          onSubmit={submitBooking}
          onCancel={closeModal}
        />
      </div>
    </div>
  );
}
