import hashlib
from datetime import datetime, timezone, timedelta


def slot_to_datetime(slot: int) -> datetime:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return today + timedelta(minutes=slot * 30)


def slots_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    # Adjacent bookings (endSlot of A == startSlot of B) are also considered conflicting.
    # "not (A ends before B starts OR B ends before A starts)" — using strict <.
    return a_end >= b_start and b_end >= a_start


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


def verify_pin(pin: str, hashed: str) -> bool:
    return hash_pin(pin) == hashed
