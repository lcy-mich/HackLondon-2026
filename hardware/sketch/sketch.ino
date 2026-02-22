#include <Arduino_RouterBridge.h>
#include <Keypad.h>

#define TIME_FOR_PRESS 50

#define ROWS 4
#define COLS 4

char Keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

byte rowPins[ROWS] = {4, 7, 6, 5}; 
byte colPins[COLS] = {A0, 3, 2, 13}; 

Keypad customKeypad = Keypad(makeKeymap(Keys), rowPins, colPins, ROWS, COLS); 

#define GREEN_LED 11
#define RED_LED 12

#define TRIG 10
#define ECHO 9

#define SPEED_OF_SOUND_IN_CM_PER_uS 0.0343
#define DISTANCE_FOR_OCCUPIED 10f

void updateDisplayStatus(String reserved_status) {
  // resetDisplayStatus();
  if (reserved_status == "reserved") {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);
    return;
  }
  
  if (reserved_status == "free") {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(RED_LED, LOW);
    return;
  }

  if (reserved_status == "upcoming") {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);
    delay(100);
    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
    delay(100);
    return;
  }

  if (reserved_status == "awaiting_checkin") {
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    delay(100);
    digitalWrite(RED_LED, LOW);
    delay(100);
    return;
  }

  if (reserved_status == "occupied") {
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, LOW);
    return;
  }
        
  digitalWrite(RED_LED, HIGH);
  digitalWrite(GREEN_LED, HIGH);
  return;
}


int ultrasonicDistInCm() {
  int duration;
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  duration = pulseIn(ECHO, HIGH, 5000);
  
  return SPEED_OF_SOUND_IN_CM_PER_uS*duration*0.5;
  // return duration;
}



void setup() {
  Bridge.begin();
  Monitor.begin();
  // put your setup code here, to run once:
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  pinMode(1, INPUT_PULLUP);
  pinMode(7, INPUT_PULLUP);
  pinMode(6, INPUT_PULLUP);
  pinMode(5, INPUT_PULLUP);
  

  
  Bridge.provide_safe("updateDisplay", updateDisplayStatus);
  Bridge.provide_safe("distInCm", ultrasonicDistInCm);

  customKeypad.addEventListener(keypadEvent);
  
}

String typed_keys = "";
char last_keys[16] = {'1', '2', '3', 'A','4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'};
long last_times[16] = {millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis(), millis()};

void keypadEvent(KeypadEvent key) {
  // Monitor.println(customKeypad.getState());
  
  switch (customKeypad.getState()) {
    
    case PRESSED:
      for (int i = 0; i < 16; i++) {
        if (key == last_keys[i]) {
          // Monitor.println("yippeee!!!");
          last_times[i] = millis();
          break;
        }
      }
      break;
    case RELEASED:
      for (int i = 0; i < 16; i++) {
        if (key == last_keys[i]) {
          if (millis() - last_times[i] > TIME_FOR_PRESS) {
            Monitor.println(key);
            if (key == '#' || key == '*') {
              typed_keys = "";
            } else if (typed_keys.length() < 4){
              typed_keys.concat(key);
            } else {
              Bridge.notify("sendCheckInCode", typed_keys);
              typed_keys = "";
            }
          }
          break;
        }
      }
  }
}

void loop() {  
  customKeypad.getKey();
  
  // put your main code here, to run repeatedly:  
  // current_reservation_status = (ultrasonicDistInCm() >= DISTANCE_FOR_OCCUPIED);
  // Monitor.println(ultrasonicDistInCm());
  // updateDisplayStatus(current_reservation_status);
  // digitalWrite(TRIG, LOW);
  // delayMicroseconds(2);
  // digitalWrite(TRIG, HIGH);
  // delayMicroseconds(10);
  // digitalWrite(TRIG, LOW);

  // duration = pulseIn(ECHO, HIGH, 10000);
  
  // Monitor.println(duration);
}
