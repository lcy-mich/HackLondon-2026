import type {
  ApiResponse,
  BookingRequest,
  BookingResponse,
  CancelBookingRequest,
  CancelBookingResponse,
  Seat,
  StudentBooking,
} from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL as string;

export async function getSeats(): Promise<ApiResponse<Seat[]>> {
  const res = await fetch(`${BASE}/seats`);
  return res.json();
}

export async function createBooking(
  req: BookingRequest
): Promise<ApiResponse<BookingResponse>> {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function getBookings(): Promise<ApiResponse<BookingResponse[]>> {
  const res = await fetch(`${BASE}/bookings`);
  return res.json();
}

export async function getStudentBookings(
  studentId: string
): Promise<ApiResponse<StudentBooking[]>> {
  const res = await fetch(`${BASE}/bookings/student/${encodeURIComponent(studentId)}`);
  return res.json();
}

export async function cancelBooking(
  req: CancelBookingRequest
): Promise<ApiResponse<CancelBookingResponse>> {
  const res = await fetch(`${BASE}/bookings/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return res.json();
}
