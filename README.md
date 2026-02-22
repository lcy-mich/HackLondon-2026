# Super Seat Saver! 🪑

> **HackLondon 2026 — Hardware Track**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-FF6B6B?style=flat-square)](https://zustand-demo.pmnd.rs)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com)
[![MQTT](https://img.shields.io/badge/MQTT-HiveMQ_Cloud-6600CC?style=flat-square&logo=mqtt)](https://www.hivemq.com)
[![Arduino](https://img.shields.io/badge/Arduino-C%2B%2B-00878F?style=flat-square&logo=arduino)](https://www.arduino.cc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## The Problem & Solution

University libraries are plagued by **seat hoarding** — students dump their bag on a desk and disappear for hours, leaving a seat visually "taken" but physically unused. Walk-in students have no way to know if a seat is genuinely occupied or just abandoned. Booking systems that require accounts add friction without solving the ghost-booking problem.

**Super Seat Saver!** fixes this with a lightweight IoT loop:

1. **Reserve** a seat from any browser — no account needed, just a student ID and a self-chosen 4-digit PIN.
2. **Show up** within 10 minutes of your booking start time and enter your PIN on the physical keypad at the desk. Fail to check in and the seat is auto-released for walk-ins.
3. **LED feedback** tells everyone at a glance whether a seat is free, about to be taken, waiting for check-in, or occupied.
4. **IR presence detection** independently tracks whether someone is actually sitting there, exposing ghost-bookings and unauthorized squatters in real time on the dashboard.

No accounts. No apps to install. No way to hoard a seat without showing up.

---

## Key Features

| Feature | Detail |
|---------|--------|
| **Real-time seat dashboard** | 12 seats (A1–A6, B1–B6) polled every 5 seconds; colour-coded by booking state |
| **30-minute slot booking** | Full day split into 48 half-hour slots; overlap-free enforcement on the backend |
| **Stateless PIN check-in** | 4-digit PIN entered at the physical keypad or the web UI; stored hashed |
| **Walk-in protection** | Seats auto-cancel if the student doesn't check in within 30 minutes of booking start |
| **10-minute warning** | `upcoming` state alerts walk-ins that a seat is about to be claimed |
| **Hardware-software sync** | Backend broadcasts booking state to desk hardware every 30 s (and instantly on transitions) via MQTT over TLS |
| **IR presence detection** | Independent physical occupancy channel (`physicalStatus`) exposes ghost-bookings — someone sitting without a booking, or a no-show with one |
| **RGB LED feedback** | Desk LED changes colour based on booking state: off = free/reserved, amber = upcoming, red = awaiting check-in, green = occupied |
| **Three UI themes** | Academic (blue), Paper (amber), Swiss (red/black) — switchable at runtime |

---

## System Architecture

```
┌──────────────────────────────────────────────┐
│               React Frontend                 │
│  Vite + TypeScript + Tailwind + Zustand      │
│  Polls GET /seats every 5 s                  │
└─────────────────┬────────────────────────────┘
                  │ HTTP REST (localhost:8000)
┌─────────────────▼────────────────────────────┐
│              FastAPI Backend                  │
│  Beanie ODM · APScheduler · paho-mqtt        │
│  MongoDB Atlas (seat & booking state)        │
└──────┬──────────────────────────┬────────────┘
       │ MQTT over TLS (HiveMQ)   │
       │  library/seat/+/         │
  subscribe                   publish
       │                          │
┌──────▼──────────────────────────▼────────────┐
│            Arduino Desk Unit                  │
│  IR sensor → physicalStatus                  │
│  Matrix Keypad → check-in PIN                │
│  RGB LED ← booking_status                    │
└──────────────────────────────────────────────┘
```

---

## Hardware Architecture

Each of the 12 library desks hosts an Arduino unit wired with three peripherals:

### IR Presence Sensor
Continuously monitors whether a person is seated. When occupancy changes, the Arduino publishes to `library/seat/{seatId}/ir` with payload `occupied` or `free`. The backend receives this via MQTT and updates `physicalStatus` on the seat record, which flows back to the dashboard on the next poll — completely independent of the booking state machine.

### Matrix Keypad
Activated when the booking state is `awaiting_checkin`. The student types their 4-digit PIN and submits. The Arduino publishes the raw PIN string to `library/seat/{seatId}/check-in`. The backend validates the PIN hash; on success, it transitions the seat to `occupied` and immediately broadcasts that state back.

### RGB LED
Driven by the `booking_status` topic the Arduino subscribes to (`library/seat/+/booking_status`). The backend pushes updates every 30 seconds and instantly on any state transition:

| State | LED |
|-------|-----|
| `free` | Off |
| `reserved` | Off |
| `upcoming` | Amber — booking arrives in ≤ 10 min |
| `awaiting_checkin` | Red — enter your PIN now |
| `occupied` | Green — seat legitimately taken |

### MQTT Topic Map

```
Backend → Hardware
  library/seat/{seatId}/booking_status   plain string: free | reserved | upcoming | awaiting_checkin | occupied

Hardware → Backend
  library/seat/{seatId}/ir              plain string: occupied | free
  library/seat/{seatId}/check-in        plain string: 4-digit PIN, e.g. "1234"
```

Transport: HiveMQ Cloud, port `8883`, MQTT v3.1.1 over TLS.

---

## Booking Lifecycle

```
POST /bookings
      │
      ▼
   reserved        (booking confirmed; > 10 min until start)
      │
      │ T − 10 min
      ▼
   upcoming        (amber LED — walk-ins warned)
      │
      │ T + 0 min
      ▼
   awaiting_checkin  (red LED — student has 30 min to enter PIN)
      │
      ├── [PIN correct within 30 min] ──► occupied (green LED)
      │                                        │
      │                                   at endSlot
      │                                        ▼
      │                                      free
      │
      └── [no check-in after 30 min] ──► auto-cancelled ──► free
```

---

## Getting Started (Local Dev)

### Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 20+** with `npm`
- **MongoDB Atlas** cluster (or local `mongod`)
- **HiveMQ Cloud** account (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/your-org/HackLondon-2026.git
cd HackLondon-2026
```

### 2. Configure the backend

```bash
cd backend-local
cp .env.example .env   # fill in your MongoDB URI and HiveMQ credentials
```

`.env` keys:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>
HIVEMQ_HOST=<your-cluster>.s1.eu.hivemq.cloud
HIVEMQ_PORT=8883
HIVEMQ_USERNAME=<username>
HIVEMQ_PASSWORD=<password>
```

### 3. Start the FastAPI backend

```bash
cd backend-local
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive API docs available at **http://localhost:8000/docs**

### 4. Start the React frontend

```bash
cd frontend
npm install
npm run dev
```

App available at **http://localhost:5173**

> **Demo mode**: `backend-local/main.py` has `USE_DEMO_DATA = True` by default, which wipes the DB on startup and loads rich mock data. Set it to `False` for a clean install.

---

## Project Structure

```
HackLondon-2026/
├── frontend/                  # React + TypeScript + Vite
│   └── src/
│       ├── components/        # Seat grid, booking modal, layout, theme switcher
│       ├── services/          # API client (real + mock)
│       ├── store/             # Zustand seat store
│       └── types/             # Shared TypeScript types
├── backend-local/             # FastAPI + Beanie + APScheduler + paho-mqtt
│   └── app/
│       ├── models/            # Beanie ODM documents
│       ├── routers/           # seats, bookings, checkin endpoints
│       ├── mqtt/              # MQTT client & message handlers
│       └── scheduler/         # APScheduler jobs (upcoming, checkin, expire)
├── hardware/                  # Arduino firmware (IR sensor, keypad, LED)
├── BACKEND_API_CONTRACT.md
└── HACKATHON_PLAN.md
```

---

## License

MIT — see [LICENSE](LICENSE).
