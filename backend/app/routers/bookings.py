import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.models.seat import SeatDocument, TimeSlotEmbed
from app.models.booking import BookingDocument
from app.schemas.booking import BookingRequest, BookingOut
from app.schemas.common import ApiResponse
from app.scheduler.pool import (
    schedule_booking_upcoming,
    schedule_booking_activation,
    schedule_booking_timeout,
    schedule_booking_checkin_timeout,
)
from app.utils.slots import hash_pin, slot_to_datetime, slots_overlap

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
    bookings = await BookingDocument.find_all().to_list()
    return ApiResponse(
        success=True,
        message="Bookings fetched successfully",
        data=[_booking_to_out(b) for b in bookings],
    )
