from typing import List, Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel


class TimeSlotEmbed(BaseModel):
    start_slot: int
    end_slot: int


class SeatDocument(Document):
    seat_id: str
    # Booking-driven state (frontend state machine)
    status: str = "free"  # "free"|"reserved"|"upcoming"|"awaiting_checkin"|"occupied"
    next_booking_start_time: Optional[datetime] = None
    today_bookings: List[TimeSlotEmbed] = []
    # Hardware-detected physical occupancy (IR sensor)
    physical_status: str = "empty"  # "empty" | "occupied"

    class Settings:
        name = "seats"
