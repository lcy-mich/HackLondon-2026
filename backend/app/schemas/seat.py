from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class TimeSlotOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    start_slot: int
    end_slot: int


class SeatOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    seat_id: str
    status: str                          # booking state machine
    physical_status: str = "empty"       # IR sensor: "empty" | "occupied"
    next_booking_start_time: Optional[str] = None
    today_bookings: List[TimeSlotOut] = []
