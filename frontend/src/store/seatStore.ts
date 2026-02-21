import { create } from 'zustand';
import type { Seat } from '../types';

/** Convert the current wall-clock time to a 0–47 slot index (floor). */
function currentSlot(): number {
  const now = new Date();
  return Math.floor((now.getHours() * 60 + now.getMinutes()) / 30);
}

/**
 * Round the current wall-clock time UP to the next 30-min slot boundary,
 * then set the right thumb one slot ahead so the default range is 30 min.
 * Example: 21:40 → left = 44 (22:00), right = 45 (22:30).
 */
function initialTimeRange(): [number, number] {
  // DEBUG OVERRIDE — hardcoded start so the full slider is testable at any hour.
  // Remove this line before demo and let the real clock logic below take over.
  return [0, 2];

  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const left  = Math.min(Math.ceil(totalMinutes / 30), 47);
  const right = Math.min(left + 1, 48);
  return [left, right];
}

export type Theme = 'academic' | 'paper' | 'japanese';

export const THEMES: Theme[] = ['academic', 'paper', 'japanese'];

interface SeatStore {
  seats: Seat[];
  selectedSeat: Seat | null;
  isBookingModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  /** Visual slider range: [leftNode, rightNode] on the 0–48 node scale.
   *  leftNode is inclusive, rightNode is exclusive.
   *  Backend payload: startSlot = leftNode, endSlot = rightNode - 1. */
  selectedTimeRange: [number, number];
  currentTheme: Theme;

  setSeats: (seats: Seat[]) => void;
  selectSeat: (seat: Seat) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  /** Constraints: left < right, right <= 48. */
  setSelectedTimeRange: (range: [number, number]) => void;
  setTheme: (theme: Theme) => void;
}

export const useSeatStore = create<SeatStore>((set) => ({
  seats: [],
  selectedSeat: null,
  isBookingModalOpen: false,
  isLoading: false,
  error: null,
  selectedTimeRange: initialTimeRange(),
  currentTheme: 'academic',

  setSeats: (seats) => set({ seats }),
  selectSeat: (seat) => set({ selectedSeat: seat, isBookingModalOpen: true }),
  closeModal: () => set({ isBookingModalOpen: false, selectedSeat: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSelectedTimeRange: (range) => {
    const [left, right] = range;
    // Only enforce the structural invariants; the "no past booking" rule is
    // the backend's responsibility and would break the debug override.
    if (left < 0 || left >= right || right > 48) return;
    set({ selectedTimeRange: range });
  },
  setTheme: (theme) => set({ currentTheme: theme }),
}));
