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

/**
 * Thin wrapper around fetch that throws a descriptive Error for non-2xx
 * responses instead of silently returning the error body.  Without this,
 * FastAPI's {"detail": "..."} error payloads get parsed as a successful
 * ApiResponse and the UI silently shows empty content.
 */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.clone().json();
      if (body?.detail) detail = String(body.detail);
      else if (body?.message) detail = String(body.message);
    } catch { /* ignore parse errors on the error body */ }
    throw new Error(`API error: ${detail}`);
  }
  return res;
}

export async function getSeats(): Promise<ApiResponse<Seat[]>> {
  const res = await apiFetch(`${BASE}/seats`);
  return res.json();
}

export async function createBooking(
  req: BookingRequest
): Promise<ApiResponse<BookingResponse>> {
  const res = await apiFetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function getBookings(): Promise<ApiResponse<BookingResponse[]>> {
  const res = await apiFetch(`${BASE}/bookings`);
  return res.json();
}

export async function getStudentBookings(
  studentId: string
): Promise<ApiResponse<StudentBooking[]>> {
  const res = await apiFetch(`${BASE}/bookings/student/${encodeURIComponent(studentId)}`);
  return res.json();
}

export async function cancelBooking(
  req: CancelBookingRequest
): Promise<ApiResponse<CancelBookingResponse>> {
  const res = await apiFetch(`${BASE}/bookings/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return res.json();
}
