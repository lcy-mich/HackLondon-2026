#include <Arduino_RouterBridge.h>

#define GREEN_LED 6
#define RED_LED 8

#define TRIG 10
#define ECHO 9

#define SPEED_OF_SOUND_IN_CM_PER_uS 0.0343
#define DISTANCE_FOR_OCCUPIED 10f

void updateDisplayStatus(bool reserved_status) {
  // resetDisplayStatus();
  if (reserved_status) {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);
    return;
  }
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(RED_LED, LOW);
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

  Bridge.provide_safe("updateDisplay", updateDisplayStatus);
  Bridge.provide_safe("distInCm", ultrasonicDistInCm);
  
}


void loop() {
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
