# Mock Data Archive

This file preserves the in-memory seed data from the original `src/services/mockApi.ts`.
Use this as a reference for seeding the real MongoDB database via a migration script.

---

## Seed Seats

```typescript
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
```

---

## Seed Bookings

Slot reference (slot N = N×30 min from midnight UTC):

| Slot | Time |
|------|------|
| 16 | 08:00 |
| 19 | 09:30 |
| 20 | 10:00 |
| 22 | 11:00 |
| 24 | 12:00 |
| 25 | 12:30 |
| 26 | 13:00 |
| 28 | 14:00 |
| 30 | 15:00 |
| 32 | 16:00 |
| 34 | 17:00 |

Demo student **s1234001** has bookings on A1, A2, A6 with PIN `1111`.

```typescript
const seedBookings = [
  { bookingId: 'BK_SEED_001', seatId: 'A1', studentId: 's1234001', startSlot: 28, endSlot: 32, status: 'confirmed', pinCode: '1111' },
  { bookingId: 'BK_SEED_002', seatId: 'A2', studentId: 's1234001', startSlot: 20, endSlot: 24, status: 'confirmed', pinCode: '1111' },
  { bookingId: 'BK_SEED_003', seatId: 'A3', studentId: 's1234002', startSlot: 19, endSlot: 22, status: 'confirmed', pinCode: '2222' },
  { bookingId: 'BK_SEED_004', seatId: 'A4', studentId: 's1234003', startSlot: 19, endSlot: 23, status: 'confirmed', pinCode: '3333' },
  { bookingId: 'BK_SEED_005', seatId: 'A5', studentId: 's1234004', startSlot: 19, endSlot: 24, status: 'confirmed', pinCode: '4444' },
  { bookingId: 'BK_SEED_006', seatId: 'A5', studentId: 's1234005', startSlot: 28, endSlot: 32, status: 'confirmed', pinCode: '5555' },
  { bookingId: 'BK_SEED_007', seatId: 'A6', studentId: 's1234001', startSlot: 30, endSlot: 34, status: 'confirmed', pinCode: '1111' },
  { bookingId: 'BK_SEED_008', seatId: 'B2', studentId: 's1234002', startSlot: 22, endSlot: 25, status: 'confirmed', pinCode: '2222' },
  { bookingId: 'BK_SEED_009', seatId: 'B3', studentId: 's1234003', startSlot: 16, endSlot: 19, status: 'confirmed', pinCode: '3333' },
  { bookingId: 'BK_SEED_010', seatId: 'B3', studentId: 's1234006', startSlot: 26, endSlot: 30, status: 'confirmed', pinCode: '6666' },
  { bookingId: 'BK_SEED_011', seatId: 'B5', studentId: 's1234007', startSlot: 28, endSlot: 32, status: 'confirmed', pinCode: '7777' },
];
```

---

## Student / PIN Reference

| studentId  | PIN  | Seats booked      |
|------------|------|-------------------|
| s1234001   | 1111 | A1, A2, A6        |
| s1234002   | 2222 | A3, B2            |
| s1234003   | 3333 | A4, B3 (08:00)    |
| s1234004   | 4444 | A5 (09:30–12:00)  |
| s1234005   | 5555 | A5 (14:00–16:00)  |
| s1234006   | 6666 | B3 (13:00–15:00)  |
| s1234007   | 7777 | B5                |
