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

    booking.status = "cancelled"
    await booking.save()

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
    if booking and booking.status != "cancelled":
        booking.status = "cancelled"
        await booking.save()

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


# --- Future stub ---
async def schedule_auto_release(booking_id: str, seat_id: str) -> None:
    """Future: auto-release desk after 40 mins of no IR presence."""
    pass
