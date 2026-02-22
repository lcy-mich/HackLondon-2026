from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.mqtt.client import connect_and_loop_start, disconnect
from app.scheduler.pool import (
    scheduler,
    schedule_status_broadcast,
    schedule_ended_booking_cleanup,
    recover_stale_bookings,
)
from app.routers import seats, bookings, checkin
from app.config import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # --- Startup ---
    await init_db()
    connect_and_loop_start()
    scheduler.start()
    schedule_status_broadcast()
    schedule_ended_booking_cleanup()
    await recover_stale_bookings()
    print("[App] Startup complete.")
    yield
    # --- Shutdown ---
    disconnect()
    scheduler.shutdown()
    print("[App] Shutdown complete.")


app = FastAPI(title="Smart Library Seat Reservation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(seats.router)
app.include_router(bookings.router)
app.include_router(checkin.router)
