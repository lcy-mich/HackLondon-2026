import { useState } from 'react';
import toast from 'react-hot-toast';
import { createBooking, getSeats } from '../services/api';
import { useSeatStore } from '../store/seatStore';
import type { BookingRequest, BookingResponse } from '../types';

export function useBooking() {
  const { closeModal, setSeats } = useSeatStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastBooking, setLastBooking] = useState<BookingResponse | null>(null);

  async function submitBooking(req: BookingRequest): Promise<boolean> {
    setIsSubmitting(true);
    try {
      const res = await createBooking(req);
      if (res.success) {
        setLastBooking(res.data);
        closeModal();
        toast.success(`Seat ${req.seatId} booked successfully!`);
        // Refetch seats so the map reflects the new reservation
        const seatsRes = await getSeats();
        if (seatsRes.success) setSeats(seatsRes.data);
        return true;
      } else {
        toast.error(res.message || 'Booking failed');
        return false;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { submitBooking, isSubmitting, lastBooking };
}
