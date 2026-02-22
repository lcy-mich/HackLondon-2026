from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.models.seat import SeatDocument
from app.models.booking import BookingDocument
from app.mqtt.client import publish_booking_status
from app.utils.slots import slot_to_datetime

scheduler = AsyncIOScheduler()


def schedule_booking_upcoming(booking_id: str, seat_id: str, start_time: datetime) -> None:
    """At start_time - 10 min: transition seat to 'upcoming'."""
    scheduler.add_job(
        _upcoming_booking,
        trigger="date",
        run_date=start_time - timedelta(minutes=10),
        args=[booking_id, seat_id],
        id=f"upcoming_{booking_id}",
        replace_existing=True,
    )


def schedule_booking_activation(booking_id: str, seat_id: str, start_time: datetime) -> None:
    """At start_time: mark seat awaiting_checkin and turn LED red."""
    scheduler.add_job(
        _activate_booking,
        trigger="date",
        run_date=start_time,
        args=[booking_id, seat_id],
        id=f"activate_{booking_id}",
        replace_existing=True,
    )


def schedule_booking_checkin_timeout(booking_id: str, seat_id: str, start_time: datetime) -> None:
    """At start_time + 30 min: auto-cancel if student never checked in."""
    scheduler.add_job(
        _checkin_timeout,
        trigger="date",
        run_date=start_time + timedelta(minutes=30),
        args=[booking_id, seat_id],
        id=f"checkin_timeout_{booking_id}",
        replace_existing=True,
    )


def schedule_booking_timeout(booking_id: str, seat_id: str, end_time: datetime) -> None:
    """At end_time: free seat, turn LED off, cancel booking if still active."""
    scheduler.add_job(
        _expire_booking,
        trigger="date",
        run_date=end_time,
        args=[booking_id, seat_id],
        id=f"expire_{booking_id}",
        replace_existing=True,
    )


async def _upcoming_booking(booking_id: str, seat_id: str) -> None:
    print(f"[Scheduler] Upcoming: {booking_id} seat {seat_id}")
    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat and seat.status in ("reserved", "free"):
        seat.status = "upcoming"
        await seat.save()
        publish_booking_status(seat_id, "upcoming")


async def _activate_booking(booking_id: str, seat_id: str) -> None:
    print(f"[Scheduler] Activating: {booking_id} seat {seat_id}")
    booking = await BookingDocument.find_one(BookingDocument.booking_id == booking_id)
    if booking is None or booking.status != "confirmed":
        print(f"[Scheduler] Skipping activate for {booking_id}: booking missing or not confirmed")
        return
    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat:
        seat.status = "awaiting_checkin"
        await seat.save()
        publish_booking_status(seat_id, "awaiting_checkin")


async def _checkin_timeout(booking_id: str, seat_id: str) -> None:
    """30 min after booking start: auto-cancel if no check-in has occurred."""
    print(f"[Scheduler] Check-in timeout for {booking_id} seat {seat_id}")
    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat is None or seat.status != "awaiting_checkin":
        return

    booking = await BookingDocument.find_one(BookingDocument.booking_id == booking_id)
    if booking is None or booking.status != "confirmed":
        return

    await booking.delete()

    seat.today_bookings = [
        b for b in seat.today_bookings
        if not (b.start_slot == booking.start_slot and b.end_slot == booking.end_slot)
    ]
    seat.status = "free"
    now = datetime.now(timezone.utc)
    now_slot = int((now.hour * 60 + now.minute) / 30)
    remaining = [b for b in seat.today_bookings if b.start_slot > now_slot]
    seat.next_booking_start_time = slot_to_datetime(remaining[0].start_slot) if remaining else None
    await seat.save()

    try:
        scheduler.remove_job(f"expire_{booking_id}")
    except Exception:
        pass

    publish_booking_status(seat_id, "free")
    print(f"[Scheduler] Auto-cancelled {booking_id}: no check-in within 30 min")


async def _expire_booking(booking_id: str, seat_id: str) -> None:
    print(f"[Scheduler] Expiring: {booking_id} seat {seat_id}")
    booking = await BookingDocument.find_one(BookingDocument.booking_id == booking_id)
    if booking:
        await booking.delete()

    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat:
        if booking:
            seat.today_bookings = [
                b for b in seat.today_bookings
                if not (b.start_slot == booking.start_slot and b.end_slot == booking.end_slot)
            ]
        seat.status = "free"
        now = datetime.now(timezone.utc)
        now_slot = int((now.hour * 60 + now.minute) / 30)
        remaining = [b for b in seat.today_bookings if b.start_slot > now_slot]
        seat.next_booking_start_time = slot_to_datetime(remaining[0].start_slot) if remaining else None
        await seat.save()

    publish_booking_status(seat_id, "free")


def cancel_booking_jobs(booking_id: str) -> None:
    """Remove all scheduler jobs for a booking (called on manual cancellation)."""
    for prefix in ("upcoming", "activate", "checkin_timeout", "expire"):
        try:
            scheduler.remove_job(f"{prefix}_{booking_id}")
        except Exception:
            pass


def schedule_status_broadcast() -> None:
    """Every 30 s: publish all seat statuses to MQTT for hardware subscribers."""
    scheduler.add_job(
        _broadcast_seat_status,
        trigger="interval",
        seconds=30,
        id="status_broadcast",
        replace_existing=True,
    )


async def _broadcast_seat_status() -> None:
    try:
        seats = await SeatDocument.find_all().to_list()
        for seat in seats:
            publish_booking_status(seat.seat_id, seat.status)
        print(f"[Scheduler] Broadcast seat statuses ({len(seats)} seats)")
    except Exception as e:
        print(f"[Scheduler] Status broadcast failed: {e}")


async def recover_stale_bookings() -> None:
    """Called once at startup: reschedule jobs for live bookings; hard-expire those
    whose end time already passed while the server was offline."""
    now = datetime.now(timezone.utc)
    now_slot = int((now.hour * 60 + now.minute) / 30)

    bookings = await BookingDocument.find(BookingDocument.status == "confirmed").to_list()
    recovered = expired = 0

    for booking in bookings:
        start_time = slot_to_datetime(booking.start_slot)
        end_time = slot_to_datetime(booking.end_slot)

        if end_time <= now:
            # Fully past — delete and clean up the seat
            await booking.delete()
            seat = await SeatDocument.find_one(SeatDocument.seat_id == booking.seat_id)
            if seat:
                seat.today_bookings = [
                    b for b in seat.today_bookings
                    if not (b.start_slot == booking.start_slot and b.end_slot == booking.end_slot)
                ]
                remaining_future = [b for b in seat.today_bookings if b.end_slot > now_slot]
                remaining_upcoming = [b for b in seat.today_bookings if b.start_slot > now_slot]
                seat.next_booking_start_time = (
                    slot_to_datetime(remaining_upcoming[0].start_slot) if remaining_upcoming else None
                )
                if not remaining_future:
                    seat.status = "free"
                await seat.save()
                publish_booking_status(booking.seat_id, seat.status)
            expired += 1
        else:
            # Still active or upcoming — reschedule remaining jobs
            if start_time > now:
                # Future booking: all four jobs still needed
                schedule_booking_upcoming(booking.booking_id, booking.seat_id, start_time)
                schedule_booking_activation(booking.booking_id, booking.seat_id, start_time)
                schedule_booking_checkin_timeout(booking.booking_id, booking.seat_id, start_time)
            else:
                # Mid-flight: only reschedule checkin_timeout if 30-min window hasn't closed
                checkin_deadline = start_time + timedelta(minutes=30)
                if now < checkin_deadline:
                    schedule_booking_checkin_timeout(booking.booking_id, booking.seat_id, start_time)
            schedule_booking_timeout(booking.booking_id, booking.seat_id, end_time)
            recovered += 1

    print(f"[Startup] Recovery: {recovered} job(s) rescheduled, {expired} stale booking(s) expired")


def schedule_ended_booking_cleanup() -> None:
    """Every 30 min: delete booking records whose slot window has already ended."""
    scheduler.add_job(
        _cleanup_ended_bookings,
        trigger="interval",
        minutes=30,
        id="ended_booking_cleanup",
        replace_existing=True,
    )


async def _cleanup_ended_bookings() -> None:
    """Hard-delete all bookings whose end_slot is in the past and clean up seats."""
    now = datetime.now(timezone.utc)
    now_slot = int((now.hour * 60 + now.minute) / 30)

    ended = await BookingDocument.find(BookingDocument.end_slot <= now_slot).to_list()
    if not ended:
        return

    affected_seat_ids = {b.seat_id for b in ended}
    for booking in ended:
        await booking.delete()

    for seat_id in affected_seat_ids:
        seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
        if seat:
            seat.today_bookings = [b for b in seat.today_bookings if b.end_slot > now_slot]
            remaining_upcoming = [b for b in seat.today_bookings if b.start_slot > now_slot]
            seat.next_booking_start_time = (
                slot_to_datetime(remaining_upcoming[0].start_slot) if remaining_upcoming else None
            )
            if not seat.today_bookings:
                seat.status = "free"
            await seat.save()

    print(f"[Scheduler] Cleanup: deleted {len(ended)} ended booking record(s)")


# --- Future stub ---
async def schedule_auto_release(booking_id: str, seat_id: str) -> None:
    """Future: auto-release desk after 40 mins of no IR presence."""
    pass
