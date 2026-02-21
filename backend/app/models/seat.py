from typing import Optional
from datetime import datetime
from beanie import Document


class SeatDocument(Document):
    seat_id: str
    status: str = "free"  # "free" | "reserved"
    next_booking_start_time: Optional[datetime] = None

    class Settings:
        name = "seats"
