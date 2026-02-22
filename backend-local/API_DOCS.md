# Smart Library Seat Reservation — Frontend API Documentation

> **Base URL**: `http://localhost:8000`
> **Content-Type**: `application/json`
> **CORS**: `http://localhost:5173` only

---

## Universal Response Envelope

Every endpoint returns:

```json
{
  "success": true | false,
  "message": "Human-readable description",
  "data": <object | array | null>
}
```

All JSON keys are **camelCase**.

---

## Time Slot Grid

Bookings use a **48-slot integer grid** (each slot = 30 minutes):

| Formula | Example |
|---------|---------|
| `slot → time` : `hour = slot ÷ 2`, `min = (slot % 2) × 30` | slot 28 → 14:00 |
| `time → slot` : `(hour × 60 + min) ÷ 30` | 15:30 → slot 31 |

`startSlot` is **inclusive** (0–47), `endSlot` is **exclusive** (1–48).
Bookings must not touch each other: `[0,3]` + `[3,5]` is rejected (adjacent = conflict).

---

## Seat State Machine (`status` field)

| Value | Meaning |
|-------|---------|
| `free` | No upcoming bookings — available to reserve |
| `reserved` | Booking confirmed; starts in > 10 min |
| `upcoming` | Booking starts in ≤ 10 min — seat will be taken soon |
| `awaiting_checkin` | Booking window open; student must check in via PIN |
| `occupied` | Student has checked in and is studying |

This field is driven entirely by the **booking state machine** and scheduler. It does **not** reflect physical sensor readings.

---

## Physical Occupancy (`physicalStatus` field)

| Value | Meaning |
|-------|---------|
| `free` | IR sensor reports no person at the desk |
| `occupied` | IR sensor detects a person at the desk |

This field is updated in real time by the hardware IR sensor via MQTT. It is **independent** of `status` — a seat can be `free` (no booking) but `physicalStatus: "occupied"` (someone sitting without a booking).

---

## 1. GET /seats

Returns all 12 seats with booking state and physical occupancy.

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Seats fetched successfully",
  "data": [
    {
      "seatId": "A1",
      "status": "free",
      "physicalStatus": "free",
      "nextBookingStartTime": null,
      "todayBookings": []
    },
    {
      "seatId": "A2",
      "status": "awaiting_checkin",
      "physicalStatus": "occupied",
      "nextBookingStartTime": "2026-02-21T14:00:00+00:00",
      "todayBookings": [
        { "startSlot": 28, "endSlot": 32 },
        { "startSlot": 36, "endSlot": 40 }
      ]
    }
  ]
}
```

**Field reference:**

| Field | Type | Description |
|-------|------|-------------|
| `seatId` | `string` | Seat ID: `A1`–`A6`, `B1`–`B6` |
| `status` | `string` | Booking state machine (see above) |
| `physicalStatus` | `"free"` \| `"occupied"` | Real-time hardware IR presence |
| `nextBookingStartTime` | `string (ISO 8601)` \| `null` | UTC start time of the nearest upcoming booking |
| `todayBookings` | `{startSlot, endSlot}[]` | All confirmed bookings for today, sorted ascending |

---

## 2. POST /bookings

Create a new booking using the slot grid.

**Request body:**

```json
{
  "seatId": "A1",
  "studentId": "s12345678",
  "startSlot": 28,
  "endSlot": 32,
  "pinCode": "1234"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `seatId` | `string` | Must match an existing seat |
| `studentId` | `string` | Student identifier (free-form) |
| `startSlot` | `integer` 0–47 | Must be > current slot (cannot book the past) |
| `endSlot` | `integer` 1–48 | Must be > `startSlot` |
| `pinCode` | `string` | Exactly 4 decimal digits; stored hashed; used for check-in |

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingId": "BKA3F9C2",
    "seatId": "A1",
    "studentId": "s12345678",
    "startSlot": 28,
    "endSlot": 32,
    "createdAt": "2026-02-21T09:33:12.456789+00:00",
    "status": "confirmed"
  }
}
```

**Error responses:**

| Scenario | HTTP | Message |
|----------|------|---------|
| Seat not found | `404` | `"Seat A1 not found"` |
| Slot overlaps or is adjacent to an existing booking | `409` | `"Seat A1 is already booked during that period"` |
| `startSlot >= endSlot` | `422` | `"startSlot must be less than endSlot..."` |
| `startSlot` is in the past | `422` | `"Cannot book a time slot that has already started or passed"` |
| `pinCode` not 4 digits | `422` | FastAPI validation error |

**Side effects on success:**
- Booking appended to `seat.todayBookings` (sorted)
- `seat.nextBookingStartTime` updated to earliest future booking
- `seat.status` set to `"reserved"` if it was `"free"`
- Scheduler jobs created: `upcoming` (T−10 min), `awaiting_checkin` (T+0), auto-cancel (T+30 min if no check-in), expire (at `endSlot`)

---

## 3. GET /bookings

Returns all bookings (admin/debug).

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Bookings fetched successfully",
  "data": [
    {
      "bookingId": "BKA3F9C2",
      "seatId": "A1",
      "studentId": "s12345678",
      "startSlot": 28,
      "endSlot": 32,
      "createdAt": "2026-02-21T09:33:12.456789+00:00",
      "status": "confirmed"
    }
  ]
}
```

Returns `"data": []` if no bookings exist.

---

## 4. POST /seats/{seatId}/checkin

Check in a student via the HTTP API (alternative to MQTT keypad).

**Request body:**

```json
{ "pinCode": "1234" }
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Check-in successful. Seat A1 is now occupied.",
  "data": { "seatId": "A1", "status": "occupied" }
}
```

**Error responses:**

| Scenario | HTTP | Message |
|----------|------|---------|
| Seat not found | `404` | `"Seat A1 not found"` |
| Seat not `awaiting_checkin` | `409` | `"Seat A1 is not awaiting check-in"` |
| Wrong PIN | `403` | `"Incorrect PIN for seat A1"` |

---

## Seat IDs

```
A1  A2  A3  A4  A5  A6
B1  B2  B3  B4  B5  B6
```

Seeded automatically on startup if the collection is empty.

---

## Quick Integration

```typescript
const BASE = "http://localhost:8000";

export async function getSeats(): Promise<ApiResponse<Seat[]>> {
  const res = await fetch(`${BASE}/seats`);
  return res.json();
}

export async function createBooking(req: BookingRequest): Promise<ApiResponse<BookingResponse>> {
  const res = await fetch(`${BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function getBookings(): Promise<ApiResponse<BookingResponse[]>> {
  const res = await fetch(`${BASE}/bookings`);
  return res.json();
}
```

> Interactive Swagger UI: `http://localhost:8000/docs`
