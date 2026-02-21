import { create } from 'zustand';
import type { Seat } from '../types';

interface SeatStore {
  seats: Seat[];
  selectedSeat: Seat | null;
  isBookingModalOpen: boolean;
  isLoading: boolean;
  error: string | null;

  setSeats: (seats: Seat[]) => void;
  selectSeat: (seat: Seat) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSeatStore = create<SeatStore>((set) => ({
  seats: [],
  selectedSeat: null,
  isBookingModalOpen: false,
  isLoading: false,
  error: null,

  setSeats: (seats) => set({ seats }),
  selectSeat: (seat) => set({ selectedSeat: seat, isBookingModalOpen: true }),
  closeModal: () => set({ isBookingModalOpen: false, selectedSeat: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
