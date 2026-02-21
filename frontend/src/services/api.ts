// TODO: swap to Axios calls against VITE_API_BASE_URL when backend is ready.
// Replace each delegation below with:
//   axios.get(`${import.meta.env.VITE_API_BASE_URL}/seats`)
// and map the response to ApiResponse<T>.

import * as mockApi from './mockApi';
import type { ApiResponse, BookingRequest, BookingResponse, Seat } from '../types';

export function getSeats(): Promise<ApiResponse<Seat[]>> {
  return mockApi.getSeats();
}

export function createBooking(
  req: BookingRequest
): Promise<ApiResponse<BookingResponse>> {
  return mockApi.createBooking(req);
}

export function getBookings(): Promise<ApiResponse<BookingResponse[]>> {
  return mockApi.getBookings();
}
