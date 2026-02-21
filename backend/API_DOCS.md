# Smart Library Seat Reservation — Backend API Documentation

> **Base URL**: `http://localhost:8000`
> **Content-Type**: `application/json`
> **CORS**: Only `http://localhost:5173` (Vite dev server) is allowed.

---

## Universal Response Envelope

Every endpoint returns the same top-level wrapper:

```json
{
  "success": true | false,
  "message": "Human-readable description",
  "data": <object | array | null>
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` on success, `false` on failure |
| `message` | `string` | Human-readable result or error reason |
| `data` | `any \| null` | Payload on success; `null` on failure |

> All JSON keys are **camelCase**, matching the frontend TypeScript types exactly.

---

## Seats

### `GET /api/seats`

Returns all 12 seats and their current availability.

**Request params**: none

**Success response** `200 OK`:

```json
{
  "success": true,
  "message": "Seats retrieved successfully.",
  "data": [
    {
      "seatId": "A1",
      "status": "free",
      "nextBookingStartTime": null
    },
    {
      "seatId": "A2",
      "status": "reserved",
      "nextBookingStartTime": "2026-02-21T14:00:00+00:00"
    }
  ]
}
```

**`data[]` fields**:

| Field | Type | Description |
|-------|------|-------------|
| `seatId` | `string` | Seat identifier — `A1`–`A6` or `B1`–`B6` |
| `status` | `"free" \| "reserved"` | Current seat status |
| `nextBookingStartTime` | `string (ISO 8601) \| null` | Start time of the next booking; `null` if none |

---

## Bookings

### `POST /api/bookings`

Creates a new seat reservation.

**Request body**:

```json
{
  "seatId": "A1",
  "studentId": "s12345678",
  "startTime": "2026-02-21T14:00:00",
  "endTime": "2026-02-21T16:00:00"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `seatId` | `string` | ✅ | Target seat ID |
| `studentId` | `string` | ✅ | Student identifier |
| `startTime` | `string (ISO 8601)` | ✅ | Reservation start time (UTC) |
| `endTime` | `string (ISO 8601)` | ✅ | Reservation end time (UTC) |

**Success response** `200 OK`:

```json
{
  "success": true,
  "message": "Booking created successfully.",
  "data": {
    "bookingId": "BKA3F9C2",
    "seatId": "A1",
    "studentId": "s12345678",
    "startTime": "2026-02-21T14:00:00+00:00",
    "endTime": "2026-02-21T16:00:00+00:00",
    "createdAt": "2026-02-21T09:33:12.456789+00:00",
    "status": "confirmed"
  }
}
```

**`data` fields**:

| Field | Type | Description |
|-------|------|-------------|
| `bookingId` | `string` | System-generated unique ID (format: `BK` + 6 uppercase hex chars) |
| `seatId` | `string` | Seat ID |
| `studentId` | `string` | Student ID |
| `startTime` | `string (ISO 8601)` | Reservation start time |
| `endTime` | `string (ISO 8601)` | Reservation end time |
| `createdAt` | `string (ISO 8601)` | Timestamp when the record was created |
| `status` | `"confirmed" \| "pending" \| "cancelled"` | Booking status — always `"confirmed"` on creation |

**Failure responses**:

```json
{
  "success": false,
  "message": "Seat 'A1' is already reserved.",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Seat 'Z9' not found.",
  "data": null
}
```

**Failure scenarios**:

| Scenario | `message` |
|----------|-----------|
| Seat ID does not exist | `"Seat '{id}' not found."` |
| Seat is already reserved | `"Seat '{id}' is already reserved."` |

---

### `GET /api/bookings`

Returns all booking records.

**Request params**: none

**Success response** `200 OK`:

```json
{
  "success": true,
  "message": "Bookings retrieved successfully.",
  "data": [
    {
      "bookingId": "BKA3F9C2",
      "seatId": "A1",
      "studentId": "s12345678",
      "startTime": "2026-02-21T14:00:00+00:00",
      "endTime": "2026-02-21T16:00:00+00:00",
      "createdAt": "2026-02-21T09:33:12.456789+00:00",
      "status": "confirmed"
    }
  ]
}
```

Field definitions are the same as the `POST /api/bookings` response.

---

## Seat ID Reference

The system has **12 fixed seats**, seeded automatically on startup:

```
A1  A2  A3  A4  A5  A6
B1  B2  B3  B4  B5  B6
```

---

## TypeScript Type Mapping

| TypeScript type | Maps to |
|-----------------|---------|
| `Seat` | Each element in `GET /api/seats` → `data[]` |
| `BookingRequest` | Request body of `POST /api/bookings` |
| `BookingResponse` | `data` of `POST /api/bookings` and each element in `GET /api/bookings` → `data[]` |
| `ApiResponse<T>` | Top-level wrapper on every response |

---

## Quick Integration (replacing mockApi)

Swap the mock calls in [api.ts](api.ts) for real HTTP requests:

```typescript
const BASE = "http://localhost:8000/api";

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

> The interactive Swagger UI is available at `http://localhost:8000/docs` once the backend is running — no Postman needed.
