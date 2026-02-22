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
  isManageModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  /** Visual slider range: [leftNode, rightNode] on the 0–48 node scale.
   *  leftNode is inclusive, rightNode is exclusive.
   *  Backend payload: startSlot = leftNode, endSlot = rightNode (both use exclusive-end convention). */
  selectedTimeRange: [number, number];
  currentTheme: Theme;

  setSeats: (seats: Seat[]) => void;
  selectSeat: (seat: Seat) => void;
  closeModal: () => void;
  openManageModal: () => void;
  closeManageModal: () => void;
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
  isManageModalOpen: false,
  isLoading: true, // true on startup so the skeleton shows before the first fetch completes
  error: null,
  selectedTimeRange: initialTimeRange(),
  currentTheme: 'academic',

  setSeats: (seats) => set((state) => ({
    seats,
    // Keep selectedSeat in sync with the freshly-fetched seats array.
    // Without this, the polling interval updates `seats` but leaves
    // `selectedSeat` as a stale snapshot captured at click-time, causing the
    // SeatTimeline inside BookingModal to render empty even though SeatCard
    // (which reads from `seats`) correctly shows an upcoming booking.
    selectedSeat: state.selectedSeat
      ? (seats.find((s) => s.seatId === state.selectedSeat!.seatId) ?? state.selectedSeat)
      : null,
  })),
  selectSeat: (seat) => set({ selectedSeat: seat, isBookingModalOpen: true }),
  closeModal: () => set({ isBookingModalOpen: false, selectedSeat: null }),
  openManageModal: () => set({ isManageModalOpen: true }),
  closeManageModal: () => set({ isManageModalOpen: false }),
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
