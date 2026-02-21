import type { ApiResponse, BookingRequest, BookingResponse, Seat } from '../types';

// --- In-memory seed data ---

const seedSeats: Seat[] = [
  { seatId: 'A1', status: 'free', nextBookingStartTime: null },
  { seatId: 'A2', status: 'reserved', nextBookingStartTime: '2026-02-21T10:00:00Z' },
  { seatId: 'A3', status: 'free', nextBookingStartTime: null },
  { seatId: 'A4', status: 'reserved', nextBookingStartTime: '2026-02-21T11:30:00Z' },
  { seatId: 'A5', status: 'free', nextBookingStartTime: null },
  { seatId: 'A6', status: 'free', nextBookingStartTime: null },
  { seatId: 'B1', status: 'free', nextBookingStartTime: null },
  { seatId: 'B2', status: 'free', nextBookingStartTime: null },
  { seatId: 'B3', status: 'reserved', nextBookingStartTime: '2026-02-21T13:00:00Z' },
  { seatId: 'B4', status: 'free', nextBookingStartTime: null },
  { seatId: 'B5', status: 'reserved', nextBookingStartTime: '2026-02-21T14:30:00Z' },
  { seatId: 'B6', status: 'free', nextBookingStartTime: null },
];

const bookings: BookingResponse[] = [];

let bookingCounter = 1;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// --- Mock API functions ---

export async function getSeats(): Promise<ApiResponse<Seat[]>> {
  await delay(200);
  return {
    success: true,
    message: 'Seats fetched successfully',
    data: seedSeats.map((s) => ({ ...s })),
  };
}

export async function createBooking(
  req: BookingRequest
): Promise<ApiResponse<BookingResponse>> {
  await delay(200);

  const seat = seedSeats.find((s) => s.seatId === req.seatId);
  if (!seat) {
    return {
      success: false,
      message: `Seat ${req.seatId} not found`,
      data: null as unknown as BookingResponse,
    };
  }
  if (seat.status === 'reserved') {
    return {
      success: false,
      message: `Seat ${req.seatId} is already reserved`,
      data: null as unknown as BookingResponse,
    };
  }

  // Mutate in-memory seed so polling reflects the change
  seat.status = 'reserved';
  seat.nextBookingStartTime = req.startTime;

  const booking: BookingResponse = {
    bookingId: `BK${String(bookingCounter++).padStart(4, '0')}`,
    seatId: req.seatId,
    studentId: req.studentId,
    startTime: req.startTime,
    endTime: req.endTime,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
  };
  bookings.push(booking);

  return {
    success: true,
    message: 'Booking created successfully',
    data: booking,
  };
}

export async function getBookings(): Promise<ApiResponse<BookingResponse[]>> {
  await delay(200);
  return {
    success: true,
    message: 'Bookings fetched successfully',
    data: [...bookings],
  };
}
