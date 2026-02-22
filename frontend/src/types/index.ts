// --- Enums ---

export type SeatStatus = 'free' | 'reserved' | 'upcoming' | 'awaiting_checkin' | 'occupied';

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

// --- Domain Models ---

export interface TimeSlot {
  startSlot: number; // 0–47: the first 30-min slot of the booking (inclusive)
  endSlot:   number; // 1–48: the first 30-min slot NOT in the booking (exclusive)
}

export interface Seat {
  seatId: string;                      // e.g. "A1", "B3"
  status: SeatStatus;                  // retained for hardware state machine
  physicalStatus: 'empty' | 'occupied'; // live IR sensor reading
  nextBookingStartTime: string | null; // ISO 8601; earliest upcoming booking, or null
  todayBookings: TimeSlot[];           // full day schedule; drives binary timeline UI
}

export interface BookingRequest {
  seatId: string;
  studentId: string;
  startSlot: number; // 0–47: inclusive start slot
  endSlot:   number; // 1–48: exclusive end slot; endSlot − startSlot ≥ 1 (min 30 min)
  pinCode: string;   // Exactly 4 digits e.g. "1234"; verified by Arduino keypad
}

export interface BookingResponse {
  bookingId: string;
  seatId: string;
  studentId: string;
  startSlot: number;
  endSlot:   number;
  createdAt: string; // ISO 8601 server timestamp
  status: BookingStatus;
}

// --- Cancel booking ---

/** Safe student-facing view of a booking — pinCode is deliberately excluded. */
export interface StudentBooking {
  bookingId: string;
  seatId:    string;
  startSlot: number;
  endSlot:   number;
  status:    BookingStatus;
}

/** Request body for POST /bookings/cancel */
export interface CancelBookingRequest {
  bookingId: string;
  studentId: string;
  pinCode:   string; // 4-digit PIN the student set during booking
}

/** Response data for POST /bookings/cancel */
export interface CancelBookingResponse {
  bookingId: string;
  status:    'cancelled';
}

// --- Generic API envelope (mirrors FastAPI response shape) ---

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
