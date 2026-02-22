# Hardware Integration Guide — Smart Library Seat Reservation

> **For the hardware/Arduino team.**
> This document covers all MQTT topics, payload formats, and timing contracts
> between the backend and physical seat hardware.

---

## 1. MQTT Broker

| Parameter | Value |
|-----------|-------|
| Host | HiveMQ Cloud (see `.env` → `HIVEMQ_HOST`) |
| Port | `8883` (TLS) |
| Transport | TCP + TLS |
| Authentication | Username + password (see `.env`) |
| Protocol | MQTT v3.1.1 |

---

## 2. Two Independent State Channels

The system separates **booking state** (driven by the reservation system) from **physical occupancy** (detected by the IR sensor). They are independent and use **different topics**.

| Channel | Direction | Topic pattern | Managed by |
|---------|-----------|---------------|------------|
| Booking state | Backend → Hardware | `library/seat/{seatId}/booking_status` | Scheduler |
| Physical occupancy | Hardware → Backend | `library/seat/{seatId}/ir` | IR sensor |
| Check-in PIN | Hardware → Backend | `library/seat/{seatId}/check-in` | Keypad |

> `{seatId}` ∈ `{ A1, A2, A3, A4, A5, A6, B1, B2, B3, B4, B5, B6 }`

---

## 3. Backend → Hardware Topics

### Booking State Broadcast — `library/seat/{seatId}/booking_status`

Published by the backend **every 30 seconds** for all 12 seats.
Also published immediately on every state transition (check-in, cancellation, upcoming alert, etc.).

**Payload** (plain string, no JSON):

| Value | Meaning | Suggested LED |
|-------|---------|---------------|
| `free` | No active bookings — seat is available | Off |
| `reserved` | Booking confirmed; starts in > 10 min | Off |
| `upcoming` | Booking starts in ≤ 10 min — warn walk-ins | Amber |
| `awaiting_checkin` | Booking window open; PIN entry expected now | Red |
| `occupied` | Student has checked in | Green |

**Example:**
```
Topic:   library/seat/A1/booking_status
Payload: awaiting_checkin
```

Use this topic to:
- Drive LCD display text
- Control RGB LED colour based on the state value
- Decide whether to activate the keypad for input

---

## 4. Hardware → Backend Topics

### 4a. IR Presence Detection — `library/seat/{seatId}/ir`

Published by the IR sensor whenever the physical occupancy at a seat changes.
The backend receives this and updates `physicalStatus` in the database, which is then
returned to the frontend on the next `GET /seats` poll.

**Payload** (plain string, no JSON):

| Value | Meaning |
|-------|---------|
| `occupied` | Person detected at the desk |
| `free` | Desk is now empty |

**Example:**
```
Topic:   library/seat/A3/ir
Payload: occupied
```

> This data feeds the `physicalStatus` field on the seat object returned to the frontend.
> It is completely independent of the booking state (`status` field).

---

### 4b. Keypad Check-in — `library/seat/{seatId}/check-in`

Published by the physical keypad when a student submits their 4-digit PIN.

**Payload**: Raw 4-digit string, **no JSON wrapper**.

```
Topic:   library/seat/A1/check-in
Payload: 1234
```

**Backend response (via `booking_status` topic):**

| Outcome | booking_status published |
|---------|--------------------------|
| PIN correct + seat is `awaiting_checkin` | `occupied` — seat transitions to occupied |
| PIN wrong or seat not in `awaiting_checkin` | No response — state unchanged |

> The hardware should drive the LED from the `booking_status` value it receives.
> On success, the backend will publish `occupied` which triggers the green LED.

---

## 5. Booking Lifecycle & Timing

```
POST /bookings (frontend)
        │
        ▼
   seat → "reserved"     booking_status: (no broadcast — 30s cycle will catch it)
        │
        │  T − 10 min
        ▼
   seat → "upcoming"     booking_status: "upcoming" broadcast immediately
        │
        │  T + 0 min
        ▼
   seat → "awaiting_checkin"   booking_status: "awaiting_checkin" broadcast immediately
        │
        ├─── [PIN received on library/seat/{id}/check-in within 30 min]
        │          │
        │          ▼
        │    seat → "occupied"   booking_status: "occupied" broadcast immediately
        │          │
        │          │  at endSlot time
        │          ▼
        │    seat → "free"   booking_status: "free" broadcast immediately
        │
        └─── [no check-in within 30 min]
                   │
                   ▼
             booking auto-cancelled
             seat → "free"   booking_status: "free" broadcast immediately
```

---

## 6. Subscription Summary for Hardware Devices

**Subscribe to (backend → hardware):**
```
library/seat/+/booking_status    ← drive LCD text and RGB LED
```

**Publish to (hardware → backend):**
```
library/seat/{seatId}/ir         ← IR sensor readings: "occupied" or "free"
library/seat/{seatId}/check-in   ← keypad PIN: 4-digit string, e.g. "1234"
```

---

## 7. `.env` Reference

```
HIVEMQ_HOST=<your-cluster>.s1.eu.hivemq.cloud
HIVEMQ_PORT=8883
HIVEMQ_USERNAME=<username>
HIVEMQ_PASSWORD=<password>
```

---

