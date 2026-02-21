import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.models.seat import SeatDocument
from app.models.booking import BookingDocument
from app.schemas.booking import BookingRequest, BookingOut
from app.schemas.common import ApiResponse
from app.scheduler.pool import schedule_booking_activation, schedule_booking_timeout

router = APIRouter()


def _booking_to_out(b: BookingDocument) -> BookingOut:
    return BookingOut(
        booking_id=b.booking_id,
        seat_id=b.seat_id,
        student_id=b.student_id,
        start_time=b.start_time.isoformat(),
        end_time=b.end_time.isoformat(),
        created_at=b.created_at.isoformat(),
        status=b.status,
    )


@router.post("/bookings", response_model=ApiResponse[BookingOut])
async def create_booking(req: BookingRequest):
    seat = await SeatDocument.find_one(SeatDocument.seat_id == req.seat_id)
    if seat is None:
        return ApiResponse(success=False, message=f"Seat '{req.seat_id}' not found.", data=None)

    if seat.status == "reserved":
        return ApiResponse(success=False, message=f"Seat '{req.seat_id}' is already reserved.", data=None)

    start_dt = datetime.fromisoformat(req.start_time).replace(tzinfo=timezone.utc)
    end_dt = datetime.fromisoformat(req.end_time).replace(tzinfo=timezone.utc)

    booking_id = f"BK{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc)

    booking = BookingDocument(
        booking_id=booking_id,
        seat_id=req.seat_id,
        student_id=req.student_id,
        start_time=start_dt,
        end_time=end_dt,
        created_at=now,
        status="confirmed",
    )
    await booking.insert()

    seat.status = "reserved"
    seat.next_booking_start_time = start_dt
    await seat.save()

    schedule_booking_activation(booking_id, req.seat_id, start_dt)
    schedule_booking_timeout(booking_id, req.seat_id, end_dt)

    out = _booking_to_out(booking)
    return ApiResponse(
        success=True,
        message="Booking created successfully.",
        data=out.model_dump(by_alias=True),
    )


@router.get("/bookings", response_model=ApiResponse[list[BookingOut]])
async def get_bookings():
    bookings = await BookingDocument.find_all().to_list()
    data = [_booking_to_out(b).model_dump(by_alias=True) for b in bookings]
    return ApiResponse(success=True, message="Bookings retrieved successfully.", data=data)
