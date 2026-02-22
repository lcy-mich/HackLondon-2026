import asyncio
import ssl
import paho.mqtt.client as mqtt
from app.config import get_settings

_client: mqtt.Client | None = None


def get_mqtt_client() -> mqtt.Client:
    if _client is None:
        raise RuntimeError("MQTT client not initialised. Call connect_and_loop_start() first.")
    return _client


def connect_and_loop_start() -> None:
    global _client
    settings = get_settings()

    # Capture the running event loop now (we are in the async lifespan context).
    # It will be passed to paho via userdata so the MQTT thread can schedule
    # coroutines safely with asyncio.run_coroutine_threadsafe().
    loop = asyncio.get_running_loop()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(settings.hivemq_username, settings.hivemq_password)
    client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)
    client.user_data_set(loop)

    from app.mqtt.handlers import on_connect, on_message
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(settings.hivemq_host, settings.hivemq_port)
    client.loop_start()
    _client = client
    print(f"[MQTT] Connecting to {settings.hivemq_host}:{settings.hivemq_port}")


def disconnect() -> None:
    global _client
    if _client:
        _client.loop_stop()
        _client.disconnect()
        _client = None
        print("[MQTT] Disconnected.")


def publish_booking_status(seat_id: str, status: str) -> None:
    """Broadcast booking-driven seat state to hardware.
    status: 'free' | 'reserved' | 'upcoming' | 'awaiting_checkin' | 'occupied'
    Topic: library/seat/{seatId}/booking_status
    """
    try:
        client = get_mqtt_client()
        topic = f"library/seat/{seat_id}/booking_status"
        client.publish(topic, status)
    except Exception as e:
        print(f"[MQTT] Failed to publish booking_status for seat {seat_id}: {e}")


# --- Future stubs ---
def publish_lcd(seat_id: str, text: str) -> None:
    """Future: send text to LCD screen."""
    pass
