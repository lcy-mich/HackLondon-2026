import asyncio
import paho.mqtt.client as mqtt
from app.models.seat import SeatDocument

SEAT_STATUS_TOPIC_PREFIX = "library/seat/"
SEAT_STATUS_TOPIC_SUFFIX = "/status"


def on_connect(client: mqtt.Client, userdata, flags, reason_code, properties) -> None:
    if reason_code == 0:
        client.subscribe("library/seat/+/status")
        print("[MQTT] Connected and subscribed to library/seat/+/status")
    else:
        print(f"[MQTT] Connection failed, reason code: {reason_code}")


def on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage) -> None:
    topic: str = msg.topic
    payload: str = msg.payload.decode("utf-8").strip()

    # Parse seat_id from topic: library/seat/{seat_id}/status
    if not (topic.startswith(SEAT_STATUS_TOPIC_PREFIX) and topic.endswith(SEAT_STATUS_TOPIC_SUFFIX)):
        return

    seat_id = topic[len(SEAT_STATUS_TOPIC_PREFIX): -len(SEAT_STATUS_TOPIC_SUFFIX)]
    print(f"[MQTT] IR sensor update: seat={seat_id} payload={payload}")

    # Schedule the async DB update onto the running event loop
    loop = asyncio.get_event_loop()
    loop.create_task(_handle_ir_update(seat_id, payload))


async def _handle_ir_update(seat_id: str, payload: str) -> None:
    """Update seat status based on IR sensor reading.
    Payload 'occupied' → seat remains reserved (person present).
    Payload 'free' → could trigger auto-release logic (future scope).
    """
    seat = await SeatDocument.find_one(SeatDocument.seat_id == seat_id)
    if seat is None:
        print(f"[MQTT] Unknown seat: {seat_id}")
        return

    # Future scope: advanced auto-release logic goes here
    # For now, just log the presence detection
    print(f"[MQTT] Seat {seat_id} presence: {payload}")


# --- Future stubs ---
async def handle_keypad_message(seat_id: str, passcode: str) -> None:
    """Future: validate passcode and check in student."""
    pass
