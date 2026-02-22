import motor.motor_asyncio
import beanie
from datetime import datetime, timezone

from app.config import get_settings
from app.models.seat import SeatDocument, TimeSlotEmbed
from app.models.booking import BookingDocument
from app.utils.slots import hash_pin, slot_to_datetime

SEAT_IDS = [f"{row}{num}" for row in ("A", "B") for num in range(1, 7)]


async def init_db(use_demo_data: bool = False) -> None:
    settings = get_settings()
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.db_name]
    await beanie.init_beanie(database=db, document_models=[SeatDocument, BookingDocument])

    if use_demo_data:
        await _seed_demo_data()
    else:
        await _seed_seats()


# ---------------------------------------------------------------------------
# Production path: seed 12 clean seats only when the collection is empty.
# ---------------------------------------------------------------------------

async def _seed_seats() -> None:
    count = await SeatDocument.find_all().count()
    if count == 0:
        seats = [SeatDocument(seat_id=sid) for sid in SEAT_IDS]
        await SeatDocument.insert_many(seats)
        print(f"[DB] Seeded {len(seats)} clean seats.")


# ---------------------------------------------------------------------------
# Demo path: wipe everything and load rich mock data.
#
# Seat A1 is intentionally kept clean (status "free", no bookings) because it
# is reserved for the live hardware / MQTT demonstration during the pitch.
# All other seats carry varied statuses so the UI's full feature set is visible.
#
# PIN reference (stored as SHA-256 hashes in the DB):
#   s1234001 → 1111  (A2, A6)
#   s1234002 → 2222  (A3, B2)
#   s1234003 → 3333  (A4, B3 08:00)
#   s1234004 → 4444  (A5 09:30–12:00)
#   s1234005 → 5555  (A5 14:00–16:00)
#   s1234006 → 6666  (B3 13:00–15:00)
#   s1234007 → 7777  (B5)
# ---------------------------------------------------------------------------

async def _seed_demo_data() -> None:
    # Always start fresh so every server restart gives a consistent demo state.
    await SeatDocument.find_all().delete()
    await BookingDocument.find_all().delete()

    now = datetime.now(timezone.utc)

    seats = [
        # ------------------------------------------------------------------
        # A1 — LIVE DEMO seat: always clean, reserved for MQTT hardware demo.
        # ------------------------------------------------------------------
        SeatDocument(seat_id="A1"),

        # ------------------------------------------------------------------
        # A-row — rich demo data
        # ------------------------------------------------------------------
        SeatDocument(
            seat_id="A2",
            status="reserved",
            physical_status="free",
            next_booking_start_time=slot_to_datetime(20),      # 10:00
            today_bookings=[TimeSlotEmbed(start_slot=20, end_slot=24)],  # 10:00–12:00
        ),
        SeatDocument(
            seat_id="A3",
            status="upcoming",
            physical_status="free",
            next_booking_start_time=slot_to_datetime(19),      # 09:30
            today_bookings=[TimeSlotEmbed(start_slot=19, end_slot=22)],  # 09:30–11:00
        ),
        SeatDocument(
            seat_id="A4",
            status="awaiting_checkin",
            physical_status="free",
            next_booking_start_time=slot_to_datetime(19),      # 09:30
            today_bookings=[TimeSlotEmbed(start_slot=19, end_slot=23)],  # 09:30–11:30
        ),
        SeatDocument(
            seat_id="A5",
            status="occupied",
            physical_status="occupied",                        # IR sensor confirms presence
            next_booking_start_time=slot_to_datetime(19),      # 09:30
            today_bookings=[
                TimeSlotEmbed(start_slot=19, end_slot=24),     # 09:30–12:00
                TimeSlotEmbed(start_slot=28, end_slot=32),     # 14:00–16:00
            ],
        ),
        SeatDocument(
            seat_id="A6",
            status="free",
            physical_status="free",
            next_booking_start_time=slot_to_datetime(30),      # 15:00
            today_bookings=[TimeSlotEmbed(start_slot=30, end_slot=34)],  # 15:00–17:00
        ),

        # ------------------------------------------------------------------
        # B-row — mix of clean and occupied seats
        # ------------------------------------------------------------------
        SeatDocument(seat_id="B1"),  # completely free

        SeatDocument(
            seat_id="B2",
            status="free",
            physical_status="free",
            next_booking_start_time=slot_to_datetime(22),      # 11:00
            today_bookings=[TimeSlotEmbed(start_slot=22, end_slot=25)],  # 11:00–12:30
        ),
        SeatDocument(
            seat_id="B3",
            status="reserved",
            physical_status="free",
            next_booking_start_time=slot_to_datetime(26),      # 13:00
            today_bookings=[
                TimeSlotEmbed(start_slot=16, end_slot=19),     # 08:00–09:30 (past)
                TimeSlotEmbed(start_slot=26, end_slot=30),     # 13:00–15:00
            ],
        ),
        SeatDocument(seat_id="B4"),  # completely free

        SeatDocument(
            seat_id="B5",
            status="free",
            physical_status="free",
            next_booking_start_time=slot_to_datetime(28),      # 14:00
            today_bookings=[TimeSlotEmbed(start_slot=28, end_slot=32)],  # 14:00–16:00
        ),
        SeatDocument(seat_id="B6"),  # completely free
    ]
    await SeatDocument.insert_many(seats)

    bookings = [
        # BK_SEED_001 (A1) intentionally omitted — A1 is the live MQTT demo seat.
        BookingDocument(
            booking_id="BK_SEED_002", seat_id="A2", student_id="s1234001",
            start_slot=20, end_slot=24, pin_code_hash=hash_pin("1111"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_003", seat_id="A3", student_id="s1234002",
            start_slot=19, end_slot=22, pin_code_hash=hash_pin("2222"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_004", seat_id="A4", student_id="s1234003",
            start_slot=19, end_slot=23, pin_code_hash=hash_pin("3333"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_005", seat_id="A5", student_id="s1234004",
            start_slot=19, end_slot=24, pin_code_hash=hash_pin("4444"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_006", seat_id="A5", student_id="s1234005",
            start_slot=28, end_slot=32, pin_code_hash=hash_pin("5555"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_007", seat_id="A6", student_id="s1234001",
            start_slot=30, end_slot=34, pin_code_hash=hash_pin("1111"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_008", seat_id="B2", student_id="s1234002",
            start_slot=22, end_slot=25, pin_code_hash=hash_pin("2222"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_009", seat_id="B3", student_id="s1234003",
            start_slot=16, end_slot=19, pin_code_hash=hash_pin("3333"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_010", seat_id="B3", student_id="s1234006",
            start_slot=26, end_slot=30, pin_code_hash=hash_pin("6666"),
            created_at=now, status="confirmed",
        ),
        BookingDocument(
            booking_id="BK_SEED_011", seat_id="B5", student_id="s1234007",
            start_slot=28, end_slot=32, pin_code_hash=hash_pin("7777"),
            created_at=now, status="confirmed",
        ),
    ]
    await BookingDocument.insert_many(bookings)

    print(f"[DB] Demo data seeded: {len(seats)} seats, {len(bookings)} bookings.")
    print("[DB] A1 is clean — reserved for live MQTT hardware demo.")
