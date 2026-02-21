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
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-primary mb-1">Book Seat {selectedSeat.seatId}</h2>
        <p className="text-sm text-secondary mb-5">
          Click a start slot, then an end slot on the timeline below, then confirm your details.
        </p>

        <BookingForm
          seat={selectedSeat}
          isSubmitting={isSubmitting}
          onSubmit={submitBooking}
          onCancel={closeModal}
        />
      </div>
    </div>
  );
}
