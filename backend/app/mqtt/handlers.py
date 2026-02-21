import asyncio
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app.models.seat import SeatDocument
from app.models.booking import BookingDocument
from app.mqtt.client import publish_booking_status
from app.utils.slots import verify_pin

TOPIC_PREFIX = "library/seat/"
SUFFIX_IR = "/ir"                # Hardware → Backend: IR presence detection
SUFFIX_CHECKIN = "/check-in"     # Hardware → Backend: PIN entry from keypad


def on_connect(client: mqtt.Client, userdata, flags, reason_code, properties) -> None:
    if reason_code == 0:
        client.subscribe("library/seat/+/ir")
        client.subscribe("library/seat/+/check-in")
        print("[MQTT] Connected — subscribed to library/seat/+/ir and library/seat/+/check-in")
    else:
        print(f"[MQTT] Connection failed, reason code: {reason_code}")


def on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage) -> None:
    topic: str = msg.topic
    payload: str = msg.payload.decode("utf-8").strip()
    loop = asyncio.get_event_loop()

    if topic.startswith(TOPIC_PREFIX) and topic.endswith(SUFFIX_CHECKIN):
        seat_id = topic[len(TOPIC_PREFIX):-len(SUFFIX_CHECKIN)]
        print(f"[MQTT] Check-in request: seat={seat_id}")
        loop.create_task(_handle_checkin_message(seat_id, payload))

    elif topic.startswith(TOPIC_PREFIX) and topic.endswith(SUFFIX_IR):
        seat_id = topic[len(TOPIC_PREFIX):-len(SUFFIX_IR)]
        print(f"[MQTT] IR sensor update: seat={seat_id} payload={payload}")
        loop.create_task(_handle_ir_update(seat_id, payload))


async def _handle_checkin_message(seat_id: str, pin_code: str) -> None:
    """Handle PIN check-in sent from the physical keypad over MQTT."""
    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat is None:
        print(f"[MQTT] Check-in: unknown seat {seat_id}")
        return

    if seat.status != "awaiting_checkin":
        print(f"[MQTT] Check-in: seat {seat_id} not awaiting check-in (status={seat.status})")
        return

    now = datetime.now(timezone.utc)
    current_slot = int((now.hour * 60 + now.minute) / 30)
    booking = await BookingDocument.find_one(
        BookingDocument.seat_id == seat_id,
        BookingDocument.status == "confirmed",
        BookingDocument.start_slot <= current_slot,
        BookingDocument.end_slot > current_slot,
    )

    if booking is None or not verify_pin(pin_code, booking.pin_code_hash):
        print(f"[MQTT] Check-in: incorrect PIN for seat {seat_id}")
        return

    seat.status = "occupied"
    await seat.save()
    publish_booking_status(seat_id, "occupied")
    print(f"[MQTT] Check-in: seat {seat_id} now occupied")


async def _handle_ir_update(seat_id: str, payload: str) -> None:
    """Handle IR sensor presence detection — updates seat.physical_status in DB.
    Payload 'occupied' → person physically detected at the desk.
    Payload 'free'     → desk is physically empty.
    """
    if payload not in ("occupied", "free"):
        print(f"[MQTT] IR: unknown payload '{payload}' for seat {seat_id}, ignoring")
        return

    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat is None:
        print(f"[MQTT] IR: unknown seat {seat_id}")
        return

    seat.physical_status = "occupied" if payload == "occupied" else "empty"
    await seat.save()
    print(f"[MQTT] Seat {seat_id} physical_status → {seat.physical_status}")
