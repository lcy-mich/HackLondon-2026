# Backend API Contract — Library Seat Reservation
> Generated from `frontend/src/types/index.ts` and `frontend/src/services/mockApi.ts`
> Frontend repository: `E:\projects\HackLondon-2026\frontend`

---

## 0. Universal Response Envelope

Every endpoint — success **and** error — must return this JSON wrapper:

```json
{
  "success": true,          // boolean
  "message": "Human-readable string",
  "data": "<payload>"       // see per-endpoint section; null on error
}
```

- `success: false` + appropriate HTTP status code on any error.
- `data` may be `null` when `success` is `false`.

---

## 1. GET /seats

Fetch all seats, their current hardware state, and today's full booking schedule.

### Response `200 OK`

```json
{
  "success": true,
  "message": "Seats fetched successfully",
  "data": [
    {
      "seatId": "A1",
      "status": "free",
      "nextBookingStartTime": null,
      "todayBookings": []
    },
    {
      "seatId": "A2",
      "status": "reserved",
      "nextBookingStartTime": "2026-02-21T10:00:00Z",
      "todayBookings": [
        { "startSlot": 20, "endSlot": 24 }
      ]
    },
    {
      "seatId": "A5",
      "status": "occupied",
      "nextBookingStartTime": "2026-02-21T09:30:00Z",
      "todayBookings": [
        { "startSlot": 19, "endSlot": 24 },
        { "startSlot": 28, "endSlot": 32 }
      ]
    }
  ]
}
```

### Seat object fields

| Field | Type | Notes |
|-------|------|-------|
| `seatId` | `string` | Seat identifier, e.g. `"A1"`, `"B6"` |
| `status` | `"free"` \| `"reserved"` \| `"upcoming"` \| `"awaiting_checkin"` \| `"occupied"` | See state machine below |
| `nextBookingStartTime` | `string` (ISO 8601) \| `null` | ISO 8601 timestamp of the earliest upcoming booking; `null` when no upcoming bookings |
| `todayBookings` | `{ startSlot: number, endSlot: number }[]` | All confirmed bookings for this seat today, sorted ascending by `startSlot`. Each entry is a half-open integer interval `[startSlot, endSlot)` over the 48-slot grid. Used by the frontend to render the binary timeline and compute displayed status at any `globalSelectedSlot`. Empty array `[]` if none. |

### Seat State Machine

| State | Driven by | Meaning |
|-------|-----------|---------|
| `free` | Booking expiry / no booking | Available to book |
| `reserved` | `POST /bookings` | Booking confirmed; >10 min before start |
| `upcoming` | Backend scheduler at T−10 min | Warns walk-ins; seat will be taken soon |
| `awaiting_checkin` | Backend scheduler at T±0 | Booking window open; awaiting PIN at keypad |
| `occupied` | `POST /seats/{seatId}/checkin` | Student checked in and studying |

Transitions back to `free` when the booking `endTime` is reached.

> **Architecture note (Phase 2 timeline pivot):** The frontend no longer relies exclusively on the backend-computed `status` field to colour-code seats. Instead, it derives the *displayed* availability at a user-selected slot (`globalSelectedSlot`) by checking whether that slot falls inside any `[startSlot, endSlot)` interval in `todayBookings`. The `status` field is retained only to drive the hardware check-in state machine (`awaiting_checkin` → `occupied` etc.).

### Expected seat IDs (Phase 1)

`A1 A2 A3 A4 A5 A6 B1 B2 B3 B4 B5 B6` (12 total)

---

## 2. POST /bookings

Create a new booking expressed as a half-open slot interval `[startSlot, endSlot)`. The backend validates:
1. `startSlot < endSlot` — enforces the 30-minute minimum (1 slot) in a single integer comparison.
2. No existing entry in `todayBookings` overlaps: `max(startSlot, existing.startSlot) < min(endSlot, existing.endSlot)`.

### Request body

```json
{
  "seatId":    "A1",
  "studentId": "s1234567",
  "startSlot": 28,
  "endSlot":   31,
  "pinCode":   "1234"
}
```

> **Slot encoding:** slot 28 = 14:00, slot 31 = 15:30 → books 14:00–15:30 (90 min, 3 slots).

| Field | Type | Notes |
|-------|------|-------|
| `seatId` | `string` | Must match an existing seat |
| `studentId` | `string` | Student identifier (free-form string) |
| `startSlot` | `integer` 0–47 | Inclusive start of the booking window |
| `endSlot` | `integer` 1–48 | Exclusive end; `endSlot − startSlot` = number of 30-min slots booked |
| `pinCode` | `string` | Exactly 4 decimal digits (`"0000"`–`"9999"`); stored hashed; sent to Arduino |

### Response `201 Created`

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingId": "BK0001",
    "seatId":    "A1",
    "studentId": "s1234567",
    "startSlot": 28,
    "endSlot":   31,
    "createdAt": "2026-02-21T09:45:00Z",
    "status":    "confirmed"
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `bookingId` | `string` | Backend-generated unique ID |
| `seatId` | `string` | Echoed from request |
| `studentId` | `string` | Echoed from request |
| `startSlot` | `integer` | Echoed from request |
| `endSlot` | `integer` | Echoed from request |
| `createdAt` | `string` ISO 8601 | Server timestamp of creation |
| `status` | `"confirmed"` \| `"pending"` \| `"cancelled"` | Always `"confirmed"` on creation |

**Side effect:** The backend appends `{ startSlot, endSlot }` to the seat's `todayBookings` array (kept sorted ascending by `startSlot`), and updates `nextBookingStartTime` to the ISO equivalent of the earliest upcoming booking's `startSlot`, so the next `GET /seats` poll reflects the change immediately.

### Error responses

| Scenario | HTTP | `success` | `message` example |
|----------|------|-----------|-------------------|
| Seat not found | `404` | `false` | `"Seat X9 not found"` |
| Time slot overlaps existing booking | `409` | `false` | `"Seat A1 is already booked during that period"` |
| `startSlot >= endSlot` | `422` | `false` | `"startSlot must be less than endSlot (minimum 1 slot = 30 minutes)"` |
| Invalid body / missing fields | `422` | `false` | FastAPI default validation message |
| `pinCode` not exactly 4 digits | `422` | `false` | FastAPI default validation message |

---

## 3. GET /bookings

Fetch all bookings (for admin / debugging).

### Response `200 OK`

```json
{
  "success": true,
  "message": "Bookings fetched successfully",
  "data": [
    {
      "bookingId": "BK0001",
      "seatId":    "A1",
      "studentId": "s1234567",
      "startSlot": 28,
      "endSlot":   32,
      "createdAt": "2026-02-21T09:45:00Z",
      "status":    "confirmed"
    }
  ]
}
```

Returns an empty array `[]` in `data` if no bookings exist yet.

---

## 4. POST /seats/{seatId}/checkin

Hardware check-in endpoint. Called by the Arduino (via WiFi/ESP32) when a student enters their
PIN at the physical keypad. Transitions the seat from `awaiting_checkin` → `occupied`.

### Path parameter

| Parameter | Type | Notes |
|-----------|------|-------|
| `seatId` | `string` | e.g. `"A1"` |

### Request body

```json
{ "pinCode": "1234" }
```

| Field | Type | Notes |
|-------|------|-------|
| `pinCode` | `string` | 4-digit string entered on keypad |

### Response `200 OK`

```json
{
  "success": true,
  "message": "Check-in successful. Seat A1 is now occupied.",
  "data": {
    "seatId": "A1",
    "status": "occupied"
  }
}
```

### Error responses

| Scenario | HTTP | `success` | `message` example |
|----------|------|-----------|-------------------|
| Seat not found | `404` | `false` | `"Seat X9 not found"` |
| Seat not in `awaiting_checkin` state | `409` | `false` | `"Seat A1 is not awaiting check-in"` |
| Wrong PIN | `403` | `false` | `"Incorrect PIN for seat A1"` |

> **Security note:** The backend stores the PIN hashed (e.g. bcrypt). Compare the submitted
> `pinCode` against the stored hash. Never return the stored PIN in any response.

### MQTT alternative (optional)

If the hardware team prefers pub/sub over HTTP, the equivalent MQTT topic is:

- **Publish topic:** `library/seats/{seatId}/checkin`
- **Payload:** `{ "pinCode": "1234" }`
- **Subscribe topic for result:** `library/seats/{seatId}/status`

---

## 5. Time Representation — 48-Slot Grid

Booking windows are expressed as **integer slot indices**, not ISO strings.

| Concept | Formula | Example |
|---------|---------|---------|
| Slot index → hour | `Math.floor(slot / 2)` | slot 28 → 14:00 |
| Slot index → minute | `(slot % 2) * 30` | slot 29 → 14:30 |
| Time → slot index | `Math.floor((h * 60 + m) / 30)` | 15:45 → slot 31 |
| Slot count → duration | `(endSlot − startSlot) × 30 min` | 3 slots → 90 min |

```
Slot  0 = 00:00–00:30   Slot 20 = 10:00–10:30   Slot 40 = 20:00–20:30
Slot  1 = 00:30–01:00   Slot 24 = 12:00–12:30   Slot 47 = 23:30–00:00
```

`nextBookingStartTime` on the `Seat` object remains an **ISO 8601 UTC string** — it is computed server-side from the slot and is used exclusively by the hardware/Arduino team.

`createdAt` on `BookingResponse` is also an ISO 8601 UTC string (server timestamp).

---

## 6. CORS

The FastAPI server must allow requests from the frontend dev origin:

```
http://localhost:5173
```

Use FastAPI's `CORSMiddleware` with `allow_origins=["http://localhost:5173"]` (or `["*"]` during development).

---

## 7. Environment / Base URL

The frontend reads the API base URL from:

```
VITE_API_BASE_URL=http://localhost:8000   # set in frontend/.env.local
```

All routes above are appended to this base, e.g. `http://localhost:8000/seats`.

---

## 8. Swap Guide (Frontend Side)

When the backend is running, open **`frontend/src/services/api.ts`** and replace the three
mock delegations with Axios calls. No other frontend file changes are needed.

```typescript
// Example replacement for getSeats():
import axios from 'axios';
const BASE = import.meta.env.VITE_API_BASE_URL;

export async function getSeats(): Promise<ApiResponse<Seat[]>> {
  const res = await axios.get(`${BASE}/seats`);
  return res.data; // FastAPI must return the ApiResponse envelope directly
}
```

---

*Derived from `frontend/src/types/index.ts` and `frontend/src/services/mockApi.ts`*
