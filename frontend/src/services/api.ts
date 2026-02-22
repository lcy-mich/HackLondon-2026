import type {
  ApiResponse,
  BookingRequest,
  BookingResponse,
  CancelBookingRequest,
  CancelBookingResponse,
  Seat,
  StudentBooking,
} from '../types';

const BASE_URL = 'http://localhost:8000';

const NETWORK_ERROR = {
  success: false,
  message: 'Network error: Could not connect to backend',
  data: null,
} as const;

export async function getSeats(): Promise<ApiResponse<Seat[]>> {
  try {
    const res = await fetch(`${BASE_URL}/seats`);
    return await res.json();
  } catch {
    return NETWORK_ERROR as ApiResponse<Seat[]>;
  }
}

export async function createBooking(
  req: BookingRequest
): Promise<ApiResponse<BookingResponse>> {
  try {
    const res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return await res.json();
  } catch {
    return NETWORK_ERROR as ApiResponse<BookingResponse>;
  }
}

export async function getStudentBookings(
  studentId: string
): Promise<ApiResponse<StudentBooking[]>> {
  try {
    const res = await fetch(`${BASE_URL}/bookings/student/${studentId}`);
    return await res.json();
  } catch {
    return NETWORK_ERROR as ApiResponse<StudentBooking[]>;
  }
}

export async function cancelBooking(
  req: CancelBookingRequest
): Promise<ApiResponse<CancelBookingResponse>> {
  try {
    const res = await fetch(`${BASE_URL}/bookings/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return await res.json();
  } catch {
    return NETWORK_ERROR as ApiResponse<CancelBookingResponse>;
  }
}
