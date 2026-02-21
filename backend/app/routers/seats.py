from fastapi import APIRouter
from app.models.seat import SeatDocument
from app.schemas.seat import SeatOut
from app.schemas.common import ApiResponse

router = APIRouter()


@router.get("/seats", response_model=ApiResponse[list[SeatOut]])
async def get_seats():
    seats = await SeatDocument.find_all().to_list()
    data = [
        SeatOut(
            seat_id=s.seat_id,
            status=s.status,
            next_booking_start_time=(
                s.next_booking_start_time.isoformat() if s.next_booking_start_time else None
            ),
        )
        for s in seats
    ]
    return ApiResponse(
        success=True,
        message="Seats retrieved successfully.",
        data=[d.model_dump(by_alias=True) for d in data],
    )
