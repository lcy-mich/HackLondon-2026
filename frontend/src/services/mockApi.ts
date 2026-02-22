import type {
  ApiResponse,
  BookingRequest,
  BookingResponse,
  CancelBookingRequest,
  CancelBookingResponse,
  Seat,
  StudentBooking,
  TimeSlot,
} from '../types';

// --- Internal type: BookingResponse + stored pinCode (never returned in responses) ---

interface InternalBooking extends BookingResponse {
  pinCode: string;
}

// --- Helpers ---

/**
 * Convert a 0–47 slot index to a UTC ISO timestamp for today.
 * Slot N represents [N×30 min, (N+1)×30 min) from midnight UTC.
 */
function slotToIso(slot: number): string {
  const d = new Date();
  d.setUTCHours(Math.floor(slot / 2), (slot % 2) * 30, 0, 0);
  return d.toISOString();
}

/**
 * Return the ISO start time of the earliest booking that hasn't ended yet,
 * or null if every booking for today has already passed.
 */
function computeNextBookingStartTime(todayBookings: TimeSlot[]): string | null {
  const nowSlot = Math.floor(
    (new Date().getHours() * 60 + new Date().getMinutes()) / 30
  );
  const next = todayBookings.find((b) => b.endSlot > nowSlot);
  return next ? slotToIso(next.startSlot) : null;
}

// --- In-memory seed data ---
//
// Slot reference (slot N = [N×30 min, (N+1)×30 min) from midnight UTC):
//   slot 16 = 08:00–08:30   slot 19 = 09:30–10:00   slot 20 = 10:00–10:30
//   slot 22 = 11:00–11:30   slot 24 = 12:00–12:30   slot 25 = 12:30–13:00
//   slot 26 = 13:00–13:30   slot 28 = 14:00–14:30   slot 30 = 15:00–15:30
//   slot 32 = 16:00–16:30   slot 34 = 17:00–17:30
//
// todayBookings drives the binary timeline UI.
// status is retained for the hardware state machine only.

const seedSeats: Seat[] = [
  {
    seatId: 'A1',
    status: 'free',
    physicalStatus: 'occupied',          // walk-in with no booking
    nextBookingStartTime: slotToIso(28), // 14:00 — next booking forces them out
    todayBookings: [{ startSlot: 28, endSlot: 32 }], // 14:00–16:00
  },
  {
    seatId: 'A2',
    status: 'reserved',
    physicalStatus: 'empty',
    nextBookingStartTime: slotToIso(20),             // 10:00
    todayBookings: [{ startSlot: 20, endSlot: 24 }], // 10:00–12:00
  },
  {
    seatId: 'A3',
    status: 'upcoming',
    physicalStatus: 'empty',
    nextBookingStartTime: slotToIso(19),             // 09:30
    todayBookings: [{ startSlot: 19, endSlot: 22 }], // 09:30–11:00
  },
  {
    seatId: 'A4',
    status: 'awaiting_checkin',
    physicalStatus: 'empty',
    nextBookingStartTime: slotToIso(19),             // 09:30
    todayBookings: [{ startSlot: 19, endSlot: 23 }], // 09:30–11:30
  },
  {
    seatId: 'A5',
    status: 'occupied',
    physicalStatus: 'occupied',          // confirmed by IR sensor
    nextBookingStartTime: slotToIso(19),             // 09:30
    todayBookings: [
      { startSlot: 19, endSlot: 24 },               // 09:30–12:00
      { startSlot: 28, endSlot: 32 },               // 14:00–16:00
    ],
  },
  {
    seatId: 'A6',
    status: 'free',
    physicalStatus: 'empty',
    nextBookingStartTime: slotToIso(30),             // 15:00
    todayBookings: [{ startSlot: 30, endSlot: 34 }], // 15:00–17:00
  },
  {
    seatId: 'B1',
    status: 'free',
    physicalStatus: 'empty',
    nextBookingStartTime: null,
    todayBookings: [],
  },
  {
    seatId: 'B2',
    status: 'free',
    physicalStatus: 'empty',
    nextBookingStartTime: slotToIso(22),             // 11:00
    todayBookings: [{ startSlot: 22, endSlot: 25 }], // 11:00–12:30
  },
  {
    seatId: 'B3',
    status: 'reserved',
    physicalStatus: 'empty',
    nextBookingStartTime: slotToIso(26),             // 13:00
    todayBookings: [
      { startSlot: 16, endSlot: 19 },               // 08:00–09:30
      { startSlot: 26, endSlot: 30 },               // 13:00–15:00
    ],
  },
  {
    seatId: 'B4',
    status: 'free',
    physicalStatus: 'empty',
    nextBookingStartTime: null,
    todayBookings: [],
  },
  {
    seatId: 'B5',
    status: 'free',
    physicalStatus: 'empty',
    nextBookingStartTime: slotToIso(28),             // 14:00
    todayBookings: [{ startSlot: 28, endSlot: 32 }], // 14:00–16:00
  },
  {
    seatId: 'B6',
    status: 'free',
    physicalStatus: 'empty',
    nextBookingStartTime: null,
    todayBookings: [],
  },
];

// Seed bookings — mirror the todayBookings above, each with a stored pinCode.
// Demo student s1234001 has three bookings (A1, A2, A6) with PIN 1111.
const bookings: InternalBooking[] = [
  { bookingId: 'BK_SEED_001', seatId: 'A1', studentId: 's1234001', startSlot: 28, endSlot: 32, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '1111' },
  { bookingId: 'BK_SEED_002', seatId: 'A2', studentId: 's1234001', startSlot: 20, endSlot: 24, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '1111' },
  { bookingId: 'BK_SEED_003', seatId: 'A3', studentId: 's1234002', startSlot: 19, endSlot: 22, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '2222' },
  { bookingId: 'BK_SEED_004', seatId: 'A4', studentId: 's1234003', startSlot: 19, endSlot: 23, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '3333' },
  { bookingId: 'BK_SEED_005', seatId: 'A5', studentId: 's1234004', startSlot: 19, endSlot: 24, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '4444' },
  { bookingId: 'BK_SEED_006', seatId: 'A5', studentId: 's1234005', startSlot: 28, endSlot: 32, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '5555' },
  { bookingId: 'BK_SEED_007', seatId: 'A6', studentId: 's1234001', startSlot: 30, endSlot: 34, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '1111' },
  { bookingId: 'BK_SEED_008', seatId: 'B2', studentId: 's1234002', startSlot: 22, endSlot: 25, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '2222' },
  { bookingId: 'BK_SEED_009', seatId: 'B3', studentId: 's1234003', startSlot: 16, endSlot: 19, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '3333' },
  { bookingId: 'BK_SEED_010', seatId: 'B3', studentId: 's1234006', startSlot: 26, endSlot: 30, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '6666' },
  { bookingId: 'BK_SEED_011', seatId: 'B5', studentId: 's1234007', startSlot: 28, endSlot: 32, createdAt: new Date().toISOString(), status: 'confirmed', pinCode: '7777' },
];

// Start dynamic IDs after the seed range
let bookingCounter = 12;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// --- Mock API functions ---

export async function getSeats(): Promise<ApiResponse<Seat[]>> {
  await delay(200);
  return {
    success: true,
    message: 'Seats fetched successfully',
    // Shallow-copy todayBookings so external mutations don't corrupt seed data
    data: seedSeats.map((s) => ({ ...s, todayBookings: [...s.todayBookings] })),
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

  // Validate slot ordering — this also enforces the 30-minute minimum (1 slot)
  if (req.startSlot >= req.endSlot) {
    return {
      success: false,
      message: 'startSlot must be less than endSlot (minimum 1 slot = 30 minutes)',
      data: null as unknown as BookingResponse,
    };
  }

  // Overlap check: two half-open intervals [a,b) and [c,d) overlap iff max(a,c) < min(b,d)
  const hasOverlap = seat.todayBookings.some(
    (existing) =>
      Math.max(req.startSlot, existing.startSlot) < Math.min(req.endSlot, existing.endSlot)
  );

  if (hasOverlap) {
    return {
      success: false,
      message: `Seat ${req.seatId} is already booked during that period`,
      data: null as unknown as BookingResponse,
    };
  }

  // Mutate in-memory seed: append and sort ascending by startSlot
  seat.todayBookings.push({ startSlot: req.startSlot, endSlot: req.endSlot });
  seat.todayBookings.sort((a, b) => a.startSlot - b.startSlot);
  seat.nextBookingStartTime = computeNextBookingStartTime(seat.todayBookings);

  const booking: InternalBooking = {
    bookingId: `BK${String(bookingCounter++).padStart(4, '0')}`,
    seatId: req.seatId,
    studentId: req.studentId,
    startSlot: req.startSlot,
    endSlot: req.endSlot,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    pinCode: req.pinCode,
  };
  bookings.push(booking);

  // Return without pinCode
  const { pinCode: _pin, ...publicBooking } = booking;
  void _pin;
  return {
    success: true,
    message: 'Booking created successfully',
    data: publicBooking,
  };
}

export async function getBookings(): Promise<ApiResponse<BookingResponse[]>> {
  await delay(200);
  // Strip pinCode before returning
  return {
    success: true,
    message: 'Bookings fetched successfully',
    data: bookings.map(({ pinCode: _pin, ...b }) => { void _pin; return b; }),
  };
}

/** GET /bookings/student/{studentId} — returns active bookings without pinCode. */
export async function getStudentBookings(
  studentId: string
): Promise<ApiResponse<StudentBooking[]>> {
  await delay(200);

  const studentBookings: StudentBooking[] = bookings
    .filter((b) => b.studentId === studentId && b.status === 'confirmed')
    .map(({ bookingId, seatId, startSlot, endSlot, status }) => ({
      bookingId,
      seatId,
      startSlot,
      endSlot,
      status,
    }));

  return {
    success: true,
    message:
      studentBookings.length > 0
        ? `Found ${studentBookings.length} booking(s) for ${studentId}`
        : `No active bookings found for ${studentId}`,
    data: studentBookings,
  };
}

/** POST /bookings/cancel — verifies studentId + pinCode, then frees the slot. */
export async function cancelBooking(
  req: CancelBookingRequest
): Promise<ApiResponse<CancelBookingResponse>> {
  await delay(300);

  const booking = bookings.find((b) => b.bookingId === req.bookingId);
  if (!booking) {
    return {
      success: false,
      message: `Booking ${req.bookingId} not found`,
      data: null as unknown as CancelBookingResponse,
    };
  }

  if (booking.studentId !== req.studentId) {
    return {
      success: false,
      message: 'Student ID does not match this booking',
      data: null as unknown as CancelBookingResponse,
    };
  }

  if (booking.pinCode !== req.pinCode) {
    return {
      success: false,
      message: 'Incorrect PIN',
      data: null as unknown as CancelBookingResponse,
    };
  }

  if (booking.status === 'cancelled') {
    return {
      success: false,
      message: 'Booking is already cancelled',
      data: null as unknown as CancelBookingResponse,
    };
  }

  // Mark cancelled
  booking.status = 'cancelled';

  // Remove the interval from the seat's todayBookings and recompute next start time
  const seat = seedSeats.find((s) => s.seatId === booking.seatId);
  if (seat) {
    seat.todayBookings = seat.todayBookings.filter(
      (ts) => !(ts.startSlot === booking.startSlot && ts.endSlot === booking.endSlot)
    );
    seat.nextBookingStartTime = computeNextBookingStartTime(seat.todayBookings);
  }

  return {
    success: true,
    message: `Booking ${req.bookingId} cancelled successfully`,
    data: { bookingId: req.bookingId, status: 'cancelled' },
  };
}
