from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from app.models.seat import SeatDocument
from app.models.booking import BookingDocument
from app.schemas.common import ApiResponse
from app.mqtt.client import publish_booking_status
from app.utils.slots import verify_pin

router = APIRouter()


class CheckinRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    pin_code: str

    @field_validator("pin_code")
    @classmethod
    def pin_must_be_4_digits(cls, v: str) -> str:
        if not (len(v) == 4 and v.isdigit()):
            raise ValueError("pinCode must be exactly 4 decimal digits")
        return v


@router.post("/seats/{seat_id}/checkin")
async def checkin(seat_id: str, req: CheckinRequest):
    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat is None:
        return JSONResponse(
            status_code=404,
            content=ApiResponse(
                success=False, message=f"Seat {seat_id} not found", data=None
            ).model_dump(),
        )

    if seat.status != "awaiting_checkin":
        return JSONResponse(
            status_code=409,
            content=ApiResponse(
                success=False, message=f"Seat {seat_id} is not awaiting check-in", data=None
            ).model_dump(),
        )

    now = datetime.now(timezone.utc)
    current_slot = int((now.hour * 60 + now.minute) / 30)
    booking = await BookingDocument.find_one(
        BookingDocument.seat_id == seat_id,
        BookingDocument.status == "confirmed",
        BookingDocument.start_slot <= current_slot,
        BookingDocument.end_slot > current_slot,
    )

    if booking is None or not verify_pin(req.pin_code, booking.pin_code_hash):
        return JSONResponse(
            status_code=403,
            content=ApiResponse(
                success=False, message=f"Incorrect PIN for seat {seat_id}", data=None
            ).model_dump(),
        )

    seat.status = "occupied"
    await seat.save()
    publish_booking_status(seat_id, "occupied")

    return ApiResponse(
        success=True,
        message=f"Check-in successful. Seat {seat_id} is now occupied.",
        data={"seatId": seat_id, "status": "occupied"},
    )
