import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.models.seat import SeatDocument, TimeSlotEmbed
from app.models.booking import BookingDocument
from app.schemas.booking import BookingRequest, BookingOut, StudentBookingOut, CancelBookingRequest
from app.schemas.common import ApiResponse
from app.scheduler.pool import (
    schedule_booking_upcoming,
    schedule_booking_activation,
    schedule_booking_timeout,
    schedule_booking_checkin_timeout,
    cancel_booking_jobs,
)
from app.mqtt.client import publish_booking_status
from app.utils.slots import hash_pin, verify_pin, slot_to_datetime, slots_overlap

router = APIRouter()


def _booking_to_out(b: BookingDocument) -> dict:
    return BookingOut(
        booking_id=b.booking_id,
        seat_id=b.seat_id,
        student_id=b.student_id,
        start_slot=b.start_slot,
        end_slot=b.end_slot,
        created_at=b.created_at.isoformat(),
        status=b.status,
    ).model_dump(by_alias=True)


@router.post("/bookings", status_code=201)
async def create_booking(req: BookingRequest):
    if req.start_slot >= req.end_slot:
        return JSONResponse(
            status_code=422,
            content=ApiResponse(
                success=False,
                message="startSlot must be less than endSlot (minimum 1 slot = 30 minutes)",
                data=None,
            ).model_dump(),
        )

    now = datetime.now(timezone.utc)
    now_slot = int((now.hour * 60 + now.minute) / 30)
    if req.start_slot <= now_slot:
        return JSONResponse(
            status_code=422,
            content=ApiResponse(
                success=False,
                message="Cannot book a time slot that has already started or passed",
                data=None,
            ).model_dump(),
        )

    seat = await SeatDocument.find_one(SeatDocument.seat_id == req.seat_id)
    if seat is None:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                success=False, message=f"Seat {req.seat_id} not found", data=None
            ).model_dump(),
        )

    for existing in seat.today_bookings:
        if slots_overlap(req.start_slot, req.end_slot, existing.start_slot, existing.end_slot):
            return JSONResponse(
                status_code=409,
                content=ApiResponse(
                    success=False,
                    message=f"Seat {req.seat_id} is already booked during that period",
                    data=None,
                ).model_dump(),
            )

    # Physical occupancy: if someone is detected at the seat, block bookings from
    # now until the end of the nearest upcoming/active booking period.
    # If no bookings exist today, the entire rest of the day is blocked.
    if seat.physical_status == "occupied":
        future_bookings = sorted(
            [b for b in seat.today_bookings if b.end_slot > now_slot],
            key=lambda b: b.start_slot,
        )
        blocked_end = future_bookings[0].end_slot if future_bookings else 48
        if slots_overlap(req.start_slot, req.end_slot, now_slot + 1, blocked_end):
            return JSONResponse(
                status_code=409,
                content=ApiResponse(
                    success=False,
                    message=f"Seat {req.seat_id} is already booked during that period",
                    data=None,
                ).model_dump(),
            )

    booking_id = f"BK{uuid.uuid4().hex[:6].upper()}"
    booking = BookingDocument(
        booking_id=booking_id,
        seat_id=req.seat_id,
        student_id=req.student_id,
        start_slot=req.start_slot,
        end_slot=req.end_slot,
        pin_code_hash=hash_pin(req.pin_code),
        created_at=now,
        status="confirmed",
    )
    await booking.insert()

    seat.today_bookings.append(TimeSlotEmbed(start_slot=req.start_slot, end_slot=req.end_slot))
    seat.today_bookings.sort(key=lambda x: x.start_slot)

    # next_booking_start_time = earliest future booking's start time (ISO 8601 for hardware)
    upcoming = [b for b in seat.today_bookings if b.start_slot > now_slot]
    seat.next_booking_start_time = slot_to_datetime(upcoming[0].start_slot) if upcoming else None

    if seat.status == "free":
        seat.status = "reserved"
    await seat.save()

    start_dt = slot_to_datetime(req.start_slot)
    end_dt = slot_to_datetime(req.end_slot)
    schedule_booking_upcoming(booking_id, req.seat_id, start_dt)
    schedule_booking_activation(booking_id, req.seat_id, start_dt)
    schedule_booking_checkin_timeout(booking_id, req.seat_id, start_dt)
    schedule_booking_timeout(booking_id, req.seat_id, end_dt)

    return JSONResponse(
        status_code=201,
        content=ApiResponse(
            success=True,
            message="Booking created successfully",
            data=_booking_to_out(booking),
        ).model_dump(),
    )


@router.get("/bookings")
async def get_bookings():
    bookings = await BookingDocument.find(BookingDocument.status == "confirmed").to_list()
    return ApiResponse(
        success=True,
        message="Bookings fetched successfully",
        data=[_booking_to_out(b) for b in bookings],
    )


@router.get("/bookings/student/{student_id}")
async def get_student_bookings(student_id: str):
    bookings = await BookingDocument.find(
        BookingDocument.student_id == student_id,
        BookingDocument.status == "confirmed",
    ).to_list()
    data = [
        StudentBookingOut(
            booking_id=b.booking_id,
            seat_id=b.seat_id,
            start_slot=b.start_slot,
            end_slot=b.end_slot,
            status=b.status,
        ).model_dump(by_alias=True)
        for b in bookings
    ]
    count = len(data)
    message = (
        f"Found {count} booking(s) for {student_id}"
        if count > 0
        else f"No active bookings for {student_id}"
    )
    return ApiResponse(success=True, message=message, data=data)


@router.post("/bookings/cancel")
async def cancel_booking(req: CancelBookingRequest):
    booking = await BookingDocument.find_one(BookingDocument.booking_id == req.booking_id)
    if booking is None:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                success=False, message=f"Booking {req.booking_id} not found", data=None
            ).model_dump(),
        )

    if booking.student_id != req.student_id:
        return JSONResponse(
            status_code=403,
            content=ApiResponse(
                success=False, message="Student ID does not match this booking", data=None
            ).model_dump(),
        )

    if not verify_pin(req.pin_code, booking.pin_code_hash):
        return JSONResponse(
            status_code=403,
            content=ApiResponse(
                success=False, message="Incorrect PIN", data=None
            ).model_dump(),
        )

    # Cancel all scheduler jobs for this booking
    cancel_booking_jobs(req.booking_id)

    # Hard-delete the booking document
    await booking.delete()

    # Update the seat: remove slot, recompute status and next_booking_start_time
    seat = await SeatDocument.find_one(SeatDocument.seat_id == booking.seat_id)
    if seat:
        seat.today_bookings = [
            b for b in seat.today_bookings
            if not (b.start_slot == booking.start_slot and b.end_slot == booking.end_slot)
        ]
        now = datetime.now(timezone.utc)
        now_slot = int((now.hour * 60 + now.minute) / 30)

        is_active = booking.start_slot <= now_slot < booking.end_slot
        remaining_future = [b for b in seat.today_bookings if b.end_slot > now_slot]
        remaining_upcoming = [b for b in seat.today_bookings if b.start_slot > now_slot]

        seat.next_booking_start_time = (
            slot_to_datetime(remaining_upcoming[0].start_slot) if remaining_upcoming else None
        )
        # Determine the correct post-cancel seat status
        if not remaining_future:
            seat.status = "free"
        elif is_active and seat.status in ("awaiting_checkin", "occupied"):
            seat.status = "free"
        elif seat.status == "upcoming" and booking.start_slot > now_slot:
            # The upcoming window was triggered by this booking; revert to reserved
            # (the next booking's upcoming job will re-fire when its time comes)
            seat.status = "reserved" if remaining_upcoming else "free"
        await seat.save()

        publish_booking_status(booking.seat_id, seat.status)

    return ApiResponse(
        success=True,
        message=f"Booking {req.booking_id} cancelled successfully",
        data={"bookingId": req.booking_id, "status": "cancelled"},
    )
