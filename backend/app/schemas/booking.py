from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class BookingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    seat_id: str
    student_id: str
    start_slot: int
    end_slot: int
    pin_code: str

    @field_validator("start_slot")
    @classmethod
    def start_slot_in_range(cls, v: int) -> int:
        if not (0 <= v <= 47):
            raise ValueError("startSlot must be between 0 and 47")
        return v

    @field_validator("end_slot")
    @classmethod
    def end_slot_in_range(cls, v: int) -> int:
        if not (1 <= v <= 48):
            raise ValueError("endSlot must be between 1 and 48")
        return v

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


class StudentBookingOut(BaseModel):
    """Returned by GET /bookings/student/{studentId} — no pinCode, no createdAt."""
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    booking_id: str
    seat_id: str
    start_slot: int
    end_slot: int
    status: str


class CancelBookingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    booking_id: str
    student_id: str
    pin_code: str
