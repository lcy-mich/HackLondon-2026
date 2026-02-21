from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class BookingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    seat_id: str
    student_id: str
    start_slot: int
    end_slot: int
    pin_code: str

    @field_validator("pin_code")
    @classmethod
    def pin_must_be_4_digits(cls, v: str) -> str:
        if not (len(v) == 4 and v.isdigit()):
            raise ValueError("pinCode must be exactly 4 decimal digits")
        return v


class BookingOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    booking_id: str
    seat_id: str
    student_id: str
    start_slot: int
    end_slot: int
    created_at: str
    status: str
