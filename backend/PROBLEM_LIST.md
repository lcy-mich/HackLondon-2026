# Backend Problem List — Full Code Review

> Audit only — no existing files were modified. Issues ordered by practical impact.

---

## [P1] CRITICAL — Server restart loses all scheduler jobs → seats permanently stuck

**Files:** `app/scheduler/pool.py`, `app/database.py`

APScheduler uses an **in-memory job store**. On any server restart, all pending jobs
(`upcoming_*`, `activate_*`, `checkin_timeout_*`, `expire_*`) are lost.
`seat.status` and `seat.today_bookings` persist in MongoDB.

**Consequences after restart:**
- A seat mid-booking stays `"reserved"` / `"upcoming"` / `"awaiting_checkin"` forever — no job fires to free it.
- Old `today_bookings` slots are never removed — those slots appear occupied and block new bookings with 409.
- A seat in `"awaiting_checkin"` will never auto-cancel (30-min timeout job is gone).

**Fix needed:** On startup, scan DB for in-progress bookings and either reschedule their
remaining jobs or immediately expire bookings whose `slot_to_datetime(end_slot) < now`.

---

## [P2] HIGH — `publish_booking_status` raises `RuntimeError` if MQTT not connected

**File:** `app/mqtt/client.py:8-11`, called from `app/scheduler/pool.py` and routers

`get_mqtt_client()` raises `RuntimeError("MQTT client not initialised…")` when `_client is None`.
This happens if the broker is unreachable at startup or disconnects at runtime.

Scheduler jobs (`_activate_booking`, `_expire_booking`, etc.) call `publish_booking_status()`
with no try/except — the unhandled exception aborts the job mid-way, potentially leaving
`seat.status` saved in DB but the MQTT message unsent, or the reverse.

**Fix needed:** Wrap `publish_booking_status` (or its call sites) in try/except and log
the failure gracefully instead of crashing.

---

## [P3] HIGH — Cancel endpoint: seat stays `"upcoming"` after cancelling the booking that caused it

**File:** `app/routers/bookings.py:203-204`

```python
if not remaining_future or (is_active and seat.status in ("awaiting_checkin", "occupied")):
    seat.status = "free"
```

**Scenario:** At T−10min the scheduler sets `seat.status = "upcoming"`. The user then
cancels that booking before its start time.

- `is_active` → **False** (booking hasn't started yet — `start_slot > now_slot`).
- `remaining_future` may be non-empty (other later bookings exist).
- The condition evaluates to False → `seat.status` stays `"upcoming"` with no booking behind it.
  Hardware will show the seat as "about to be taken" indefinitely.

**Fix needed:** Also reset status when `seat.status == "upcoming"` and the cancelled
booking is the one that triggered it (i.e. no other booking starts within T−10min of now).

---

## [P4] HIGH — No slot range validation (`startSlot`/`endSlot` out of bounds accepted)

**Files:** `app/schemas/booking.py`, `app/routers/bookings.py:34-54`

No check that `startSlot ∈ [0, 47]` and `endSlot ∈ [1, 48]`. A negative `startSlot` (e.g. `-5`)
passes both the `startSlot < endSlot` check and the past-slot check
(`now_slot ≥ 0` so negative always appears "future"). The booking is stored and
`slot_to_datetime(-5)` schedules jobs at invalid datetimes.

**Fix needed:** Add `field_validator` range checks in `BookingRequest` (schema layer).

---

## [P5] MEDIUM — `CheckinRequest` has no PIN format validation

**File:** `app/routers/checkin.py:15-17`

`BookingRequest` validates that `pin_code` is exactly 4 decimal digits via `@field_validator`.
`CheckinRequest` has no equivalent — any string (empty, letters, 20 chars) is accepted,
reaches `verify_pin()`, and simply fails verification. Not a crash, but inconsistent and
allows malformed input past the schema boundary.

**Fix needed:** Add the same `@field_validator("pin_code")` as in `BookingRequest`.

---

## [P6] MEDIUM — Race: `_activate_booking` can fire concurrently with a cancel request

**Files:** `app/scheduler/pool.py:68-74`, `app/routers/bookings.py:179-180`

`cancel_booking_jobs()` calls `scheduler.remove_job()`. If the activate job has **already
started executing** when cancel is called, `remove_job()` raises `JobLookupError`
(silently caught by `except Exception: pass`), and the job continues running. It then
saves `seat.status = "awaiting_checkin"` after the cancel endpoint already set it to
`"free"`. The seat is left stuck in `"awaiting_checkin"` with no backing booking.

Unlike `_checkin_timeout`, `_activate_booking` does not verify the booking still exists
and is confirmed before acting.

**Fix needed:** In `_activate_booking`, fetch the booking first and abort if it is `None`
or `status != "confirmed"`.

---

## [P7] MEDIUM — Scheduler-cancelled bookings appear in `GET /bookings`

**Files:** `app/routers/bookings.py:138-144`, `app/scheduler/pool.py:88-89, 114-116`

Scheduler auto-cancellations (checkin timeout, expiry) **soft-delete**: they set
`booking.status = "cancelled"` but leave the document in the DB.
Manual cancellation via the cancel endpoint **hard-deletes** (`await booking.delete()`).
`GET /bookings` uses `find_all()`, so soft-cancelled records are returned to callers —
inconsistent with the hard-delete behaviour and noisy for debugging.

**Fix needed:** Either always hard-delete in the scheduler too, or filter
`status != "cancelled"` in `GET /bookings`.

---

## [P8] LOW — `today_bookings` has no daily reset mechanism

**Files:** `app/database.py`, `app/scheduler/pool.py`

Each booking's slot is removed from `seat.today_bookings` by its expiry job. If the server
is down when an expiry job should fire, that slot is never removed. It will then appear
occupied the following day (and every subsequent day), permanently blocking that time slot.
There is no midnight cron job to reset `today_bookings = []` and `status = "free"`.

**Fix needed:** Add startup recovery (overlaps with the P1 fix) that clears/re-evaluates
stale slots, and/or a midnight cleanup scheduled job.

---

## FALSE POSITIVES — issues raised but verified not to be bugs

| Claimed issue | Why it is not a bug |
|---|---|
| `slots_overlap` uses `>=` (claimed should be `>`) | **Intentional** — user explicitly requires adjacent bookings [0,3]+[3,5] to conflict |
| `upcoming[0]` potential `IndexError` | Correctly guarded by `if remaining else None` on every call site |
| Physical block uses `now_slot + 1` as range start | Correct — `startSlot > now_slot` is enforced earlier; earliest bookable is `now_slot + 1` |
| `booking_id` unused in `_expire_booking` | IS used: `BookingDocument.find_one(BookingDocument.booking_id == booking_id)` |
| Route conflict `GET /bookings` vs `GET /bookings/student/{id}` | FastAPI matches exact paths before parameterised ones; no conflict |
| `data=[d.model_dump(...)]` type mismatch in `seats.py` response_model | Pydantic v2 coerces dicts into model instances during response serialisation |
