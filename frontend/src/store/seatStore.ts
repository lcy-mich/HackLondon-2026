import { create } from 'zustand';
import type { Seat } from '../types';

/** Convert the current wall-clock time to a 0–47 slot index. */
function currentSlot(): number {
  const now = new Date();
  return Math.floor((now.getHours() * 60 + now.getMinutes()) / 30);
}

export type Theme = 'academic' | 'paper' | 'japanese';

export const THEMES: Theme[] = ['academic', 'paper', 'japanese'];

interface SeatStore {
  seats: Seat[];
  selectedSeat: Seat | null;
  isBookingModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  globalSelectedSlot: number; // 0–47; driven by GlobalTimeSlider
  currentTheme: Theme;

  setSeats: (seats: Seat[]) => void;
  selectSeat: (seat: Seat) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setGlobalSelectedSlot: (slot: number) => void;
  setTheme: (theme: Theme) => void;
}

export const useSeatStore = create<SeatStore>((set) => ({
  seats: [],
  selectedSeat: null,
  isBookingModalOpen: false,
  isLoading: false,
  error: null,
  globalSelectedSlot: currentSlot(),
  currentTheme: 'academic',

  setSeats: (seats) => set({ seats }),
  selectSeat: (seat) => set({ selectedSeat: seat, isBookingModalOpen: true }),
  closeModal: () => set({ isBookingModalOpen: false, selectedSeat: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setGlobalSelectedSlot: (slot) => set({ globalSelectedSlot: slot }),
  setTheme: (theme) => set({ currentTheme: theme }),
}));
