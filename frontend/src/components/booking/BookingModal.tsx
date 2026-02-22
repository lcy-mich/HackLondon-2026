import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useBooking } from '../../hooks/useBooking';
import { useSeatStore } from '../../store/seatStore';
import { BookingForm } from './BookingForm';

export function BookingModal() {
  const { selectedSeat, isBookingModalOpen, closeModal, currentTheme } = useSeatStore();
  const { submitBooking, isSubmitting } = useBooking();
  const isPaper    = currentTheme === 'paper';
  const isAcademic = currentTheme === 'academic';

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
        className={`bg-surface w-full max-w-4xl mx-4 p-6 relative ${
          isPaper    ? 'rounded-md border-2 border-stone-200 shadow-xl'
          : isAcademic ? 'rounded-2xl border border-slate-200 shadow-2xl'
          : 'rounded-2xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isPaper ? (
          <>
            <h2 className="font-serif text-2xl font-bold text-stone-800 mb-0.5">
              Reserve Seat {selectedSeat.seatId}
            </h2>
            <p className="font-serif italic text-sm text-stone-500 mb-5">
              Choose your time window on the timeline, then fill in your details below.
            </p>
          </>
        ) : isAcademic ? (
          <>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-500">Reservation</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">
              Book Seat {selectedSeat.seatId}
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Select your time window on the timeline, then confirm your details below.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-primary mb-1">Book Seat {selectedSeat.seatId}</h2>
            <p className="text-sm text-secondary mb-5">
              Click a start slot, then an end slot on the timeline below, then confirm your details.
            </p>
          </>
        )}

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
