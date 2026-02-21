from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BookingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    seat_id: str
    student_id: str
    start_time: str
    end_time: str


class BookingOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    booking_id: str
    seat_id: str
    student_id: str
    start_time: str
    end_time: str
    created_at: str
    status: str
