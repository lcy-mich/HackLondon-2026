from datetime import datetime
from beanie import Document


class BookingDocument(Document):
    booking_id: str
    seat_id: str
    student_id: str
    start_slot: int
    end_slot: int
    pin_code_hash: str
    created_at: datetime
    status: str = "confirmed"  # "confirmed" | "pending" | "cancelled"

    class Settings:
        name = "bookings"
