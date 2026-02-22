from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.mqtt.client import connect_and_loop_start, disconnect
from app.scheduler.pool import scheduler, schedule_status_broadcast
from app.routers import seats, bookings, checkin


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # --- Startup ---
    await init_db()
    connect_and_loop_start()
    scheduler.start()
    schedule_status_broadcast()
    print("[App] Startup complete.")
    yield
    # --- Shutdown ---
    disconnect()
    scheduler.shutdown()
    print("[App] Shutdown complete.")


app = FastAPI(title="Smart Library Seat Reservation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(seats.router)
app.include_router(bookings.router)
app.include_router(checkin.router)
