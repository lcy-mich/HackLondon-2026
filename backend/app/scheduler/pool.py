from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.models.seat import SeatDocument
from app.models.booking import BookingDocument
from app.mqtt.client import publish_led

scheduler = AsyncIOScheduler()


def schedule_booking_activation(booking_id: str, seat_id: str, start_time: datetime) -> None:
    """At start_time: mark seat reserved and turn LED red."""
    scheduler.add_job(
        _activate_booking,
        trigger="date",
        run_date=start_time,
        args=[booking_id, seat_id],
        id=f"activate_{booking_id}",
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


async def _activate_booking(booking_id: str, seat_id: str) -> None:
    print(f"[Scheduler] Activating booking {booking_id} for seat {seat_id}")
    publish_led(seat_id, "red")
    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat:
        seat.status = "reserved"
        await seat.save()


async def _expire_booking(booking_id: str, seat_id: str) -> None:
    print(f"[Scheduler] Expiring booking {booking_id} for seat {seat_id}")
    booking = await BookingDocument.find_one(BookingDocument.booking_id == booking_id)
    if booking and booking.status != "cancelled":
        booking.status = "cancelled"
        await booking.save()

    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat:
        seat.status = "free"
        seat.next_booking_start_time = None
        await seat.save()

    publish_led(seat_id, "off")


# --- Future stub ---
async def schedule_auto_release(booking_id: str, seat_id: str) -> None:
    """Future: auto-release desk after 40 mins of no IR presence."""
    pass
