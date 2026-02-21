from fastapi import APIRouter
from app.models.seat import SeatDocument
from app.schemas.seat import SeatOut, TimeSlotOut
from app.schemas.common import ApiResponse

router = APIRouter()


@router.get("/seats", response_model=ApiResponse[list[SeatOut]])
async def get_seats():
    seats = await SeatDocument.find_all().to_list()
    data = [
        SeatOut(
            seat_id=s.seat_id,
            status=s.status,
            physical_status=s.physical_status,
            next_booking_start_time=(
                s.next_booking_start_time.isoformat() if s.next_booking_start_time else None
            ),
            today_bookings=[
                TimeSlotOut(start_slot=b.start_slot, end_slot=b.end_slot)
                for b in s.today_bookings
            ],
        )
        for s in seats
    ]
    return ApiResponse(
        success=True,
        message="Seats fetched successfully",
        data=[d.model_dump(by_alias=True) for d in data],
    )
