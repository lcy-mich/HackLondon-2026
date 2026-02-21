from typing import Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class SeatOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    seat_id: str
    status: str
    next_booking_start_time: Optional[str] = None
