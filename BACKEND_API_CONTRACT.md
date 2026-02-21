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

Fetch all seats and their current availability.

### Response `200 OK`

```json
{
  "success": true,
  "message": "Seats fetched successfully",
  "data": [
    {
      "seatId": "A1",
      "status": "free",
      "nextBookingStartTime": null
    },
    {
      "seatId": "A2",
      "status": "reserved",
      "nextBookingStartTime": "2026-02-21T10:00:00Z"
    }
  ]
}
```

### Seat object fields

| Field | Type | Notes |
|-------|------|-------|
| `seatId` | `string` | Seat identifier, e.g. `"A1"`, `"B6"` |
| `status` | `"free"` \| `"reserved"` | Phase 2 will add `"occupied"` |
| `nextBookingStartTime` | `string` (ISO 8601) \| `null` | `null` when seat is free |

### Expected seat IDs (Phase 1)

`A1 A2 A3 A4 A5 A6 B1 B2 B3 B4 B5 B6` (12 total)

---

## 2. POST /bookings

Create a new booking. The seat must currently have `status: "free"`.

### Request body

```json
{
  "seatId": "A1",
  "studentId": "s1234567",
  "startTime": "2026-02-21T14:00:00Z",
  "endTime":   "2026-02-21T16:00:00Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `seatId` | `string` | Must match an existing seat |
| `studentId` | `string` | Student identifier (free-form string) |
| `startTime` | `string` ISO 8601 UTC | Booking start |
| `endTime` | `string` ISO 8601 UTC | Booking end; must be after `startTime` |

### Response `201 Created`

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingId": "BK0001",
    "seatId": "A1",
    "studentId": "s1234567",
    "startTime": "2026-02-21T14:00:00Z",
    "endTime":   "2026-02-21T16:00:00Z",
    "createdAt": "2026-02-21T09:45:00Z",
    "status": "confirmed"
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `bookingId` | `string` | Backend-generated unique ID |
| `seatId` | `string` | Echoed from request |
| `studentId` | `string` | Echoed from request |
| `startTime` | `string` ISO 8601 | Echoed from request |
| `endTime` | `string` ISO 8601 | Echoed from request |
| `createdAt` | `string` ISO 8601 | Server timestamp of creation |
| `status` | `"confirmed"` \| `"pending"` \| `"cancelled"` | Always `"confirmed"` on creation |

**Side effect:** The backend must update the seat's `status` to `"reserved"` and set
`nextBookingStartTime` to the `startTime` value, so the next `GET /seats` poll reflects the change.

### Error responses

| Scenario | HTTP | `success` | `message` example |
|----------|------|-----------|-------------------|
| Seat not found | `404` | `false` | `"Seat X9 not found"` |
| Seat already reserved | `409` | `false` | `"Seat A1 is already reserved"` |
| Invalid body / missing fields | `422` | `false` | FastAPI default validation message |

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
      "seatId": "A1",
      "studentId": "s1234567",
      "startTime": "2026-02-21T14:00:00Z",
      "endTime":   "2026-02-21T16:00:00Z",
      "createdAt": "2026-02-21T09:45:00Z",
      "status": "confirmed"
    }
  ]
}
```

Returns an empty array `[]` in `data` if no bookings exist yet.

---

## 4. Datetime Format

All datetime strings must be **ISO 8601 UTC** (trailing `Z`):

```
2026-02-21T14:00:00Z
```

The frontend converts `<input type="datetime-local">` values to this format via `new Date(value).toISOString()`.

---

## 5. CORS

The FastAPI server must allow requests from the frontend dev origin:

```
http://localhost:5173
```

Use FastAPI's `CORSMiddleware` with `allow_origins=["http://localhost:5173"]` (or `["*"]` during development).

---

## 6. Environment / Base URL

The frontend reads the API base URL from:

```
VITE_API_BASE_URL=http://localhost:8000   # set in frontend/.env.local
```

All routes above are appended to this base, e.g. `http://localhost:8000/seats`.

---

## 7. Swap Guide (Frontend Side)

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
