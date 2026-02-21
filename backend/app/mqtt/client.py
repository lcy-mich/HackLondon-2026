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

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(settings.hivemq_username, settings.hivemq_password)
    client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)

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


def publish_led(seat_id: str, color: str) -> None:
    """color: 'red' | 'green' | 'off'"""
    client = get_mqtt_client()
    topic = f"library/seat/{seat_id}/led"
    client.publish(topic, color)


# --- Future stubs ---
def publish_lcd(seat_id: str, text: str) -> None:
    """Future: send text to LCD screen."""
    pass
