from datetime import datetime
from beanie import Document


class BookingDocument(Document):
    booking_id: str
    seat_id: str
    student_id: str
    start_time: datetime
    end_time: datetime
    created_at: datetime
    status: str = "confirmed"  # "confirmed" | "pending" | "cancelled"

    class Settings:
        name = "bookings"
