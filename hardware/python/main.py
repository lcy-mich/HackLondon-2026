import time
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
import json

from arduino.app_utils import App, Bridge

current_reservation_status = "reserved"

statuses = ("free", "reserved", "upcoming", "awaiting_checkin", "occupied")

detect_distance = 60
DETECT_SENSITIVITY_COUNT = 5

host = "2299016638da456eaadc1dd4befc8bdd.s1.eu.hivemq.cloud"
port = 8883

keep_alive = 200

username = "HackLondon"
password = "HackLondon-2026" #im too lazy to do the os.environ thing whatever it was called
#also idk ive never done it before

device_id = "A1"
booking_stat_topic = "library/seat/"+device_id+"/booking_status"
detect_stat_topic = "library/seat/"+device_id+"/ir"
check_in_topic = "library/seat/"+device_id+"/check-in"

def on_message(cl, userdata, msg):
    global current_reservation_status
    data = msg.payload.decode("utf-8")

    if data in statuses:

        current_reservation_status = data
        print(data)
    

def on_connect(cl, userdata, flags, reason_code, prop):
    
    print(f"connected with res code {reason_code}")
    client.subscribe(booking_stat_topic, 2)
    

client = mqtt.Client(CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message

client.tls_set()

client.username_pw_set(username, password)

client.connect(host, port, keep_alive)

print("Hello world AAAAAAAAAAAAAAA!")

last_detected = False


def send_checkin_code(code):
    print(code)
    client.publish(check_in_topic, code)

Bridge.provide("sendCheckInCode", send_checkin_code)

def loop():
    global current_reservation_status, last_detected
    """This function is called repeatedly by the App framework."""
    # You can replace this with any code you want your App to run repeatedly.
    
    # time.sleep(1)
    client.loop()
    
    Bridge.notify("updateDisplay", current_reservation_status)

    detected = Bridge.call("distInCm") <= detect_distance
    
    if last_detected != detected:
        print("occupied!" if detected else "free!")
        client.publish(detect_stat_topic, "occupied" if detected else "free")
    last_detected = detected

    


# See: https://docs.arduino.cc/software/app-lab/tutorials/getting-started/#app-run
App.run(user_loop=loop)
