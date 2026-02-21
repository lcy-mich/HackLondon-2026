import motor.motor_asyncio
import beanie
from app.config import get_settings
from app.models.seat import SeatDocument
from app.models.booking import BookingDocument

SEAT_IDS = [f"{row}{num}" for row in ("A", "B") for num in range(1, 7)]


async def init_db() -> None:
    settings = get_settings()
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.db_name]
    await beanie.init_beanie(database=db, document_models=[SeatDocument, BookingDocument])
    await _seed_seats()


async def _seed_seats() -> None:
    count = await SeatDocument.find_all().count()
    if count == 0:
        seats = [SeatDocument(seat_id=sid) for sid in SEAT_IDS]
        await SeatDocument.insert_many(seats)
        print(f"[DB] Seeded {len(seats)} seats.")
