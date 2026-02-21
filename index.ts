// --- Enums ---

export type SeatStatus = 'free' | 'reserved';
// Phase 2 will extend: 'occupied' | 'timeout'

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

// --- Domain Models ---

export interface Seat {
  seatId: string;                      // e.g. "A1", "B3"
  status: SeatStatus;
  nextBookingStartTime: string | null; // ISO 8601 or null if free
}

export interface BookingRequest {
  seatId: string;
  studentId: string;
  startTime: string; // ISO 8601  e.g. "2026-02-21T14:00:00Z"
  endTime: string;   // ISO 8601
}

export interface BookingResponse {
  bookingId: string;
  seatId: string;
  studentId: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  status: BookingStatus;
}

// --- Generic API envelope (mirrors FastAPI response shape) ---

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
