import time
import paho.mqtt.client as mqtt
import serial
import json

from arduino.app_utils import App, Bridge

print("Hello world!")

current_reservation_status = False;


def loop():
    global current_reservation_status
    """This function is called repeatedly by the App framework."""
    # You can replace this with any code you want your App to run repeatedly.
    
    # time.sleep(10)
    Bridge.notify("updateDisplay", current_reservation_status)
    print(Bridge.call("distInCm"))

    


# See: https://docs.arduino.cc/software/app-lab/tutorials/getting-started/#app-run
App.run(user_loop=loop)
