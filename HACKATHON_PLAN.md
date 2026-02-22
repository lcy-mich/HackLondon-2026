# HACKATHON_PLAN.md — Library Seat Reservation System (Frontend)

## 1. Tech Stack

| Tool | Purpose |
|------|---------|
| **Vite** | Build tool / dev server |
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Tailwind CSS v3** | Utility-first styling |
| **Axios** | HTTP client (swap mock → real) |
| **Lucide React** | Icon library |
| **Zustand** | Lightweight global state |
| **React Hot Toast** | Notifications |

---

## 2. Initialization Commands (NO git)

This is a **monorepo**. The React app lives entirely inside `frontend/`. Run all commands from the repo root `E:\projects\HackLondon-2026\`.

```bash
# 1. Create monorepo placeholder folders for all teams
mkdir backend hardware

# 2. Scaffold Vite + React + TypeScript INSIDE the frontend/ subdirectory
npm create vite@latest frontend -- --template react-ts

# 3. Enter the frontend directory — ALL subsequent commands run from here
cd frontend

# 4. Install base dependencies
npm install

# 5. Install runtime dependencies
npm install axios lucide-react zustand react-hot-toast

# 6. Install Tailwind + PostCSS toolchain
npm install -D tailwindcss postcss autoprefixer

# 7. Generate Tailwind config
npx tailwindcss init -p
```

> **Note:** After initialization, your terminal working directory for all development work is `E:\projects\HackLondon-2026\frontend\`. Every file path in this plan is relative to that directory unless prefixed with the repo root.

---

## 3. Directory Structure

```
E:\projects\HackLondon-2026\          ← monorepo root
├── backend/                           # Placeholder — FastAPI team's domain
├── hardware/                          # Placeholder — Arduino/MQTT team's domain
├── HACKATHON_PLAN.md                  # This file
│
└── frontend/                          # ← ALL React work lives here
    ├── public/
    │   └── favicon.ico
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Header.tsx           # App title, nav bar
    │   │   │   ├── GlobalTimeSlider.tsx # Time scrubber; sets globalSelectedTime in store
    │   │   │   └── Layout.tsx           # Page shell (Header + GlobalTimeSlider + main slot)
    │   │   ├── seats/
    │   │   │   ├── SeatMap.tsx          # Grid of SeatCard components
    │   │   │   ├── SeatCard.tsx         # Single seat tile (status colours)
    │   │   │   └── SeatStatusBadge.tsx  # "Free" / "Reserved" pill
    │   │   └── booking/
    │   │       ├── BookingModal.tsx     # Modal wrapper
    │   │       ├── BookingForm.tsx      # studentId + slot inputs
    │   │       └── SeatTimeline.tsx     # Binary Free/Booked bar + drag-to-select slot
    │   ├── hooks/
    │   │   ├── useSeats.ts              # Fetches seats + polling interval
    │   │   └── useBooking.ts            # Booking submission logic
    │   ├── pages/
    │   │   ├── HomePage.tsx             # SeatMap + BookingModal
    │   │   └── ConfirmationPage.tsx     # Post-booking confirmation screen
    │   ├── services/
    │   │   ├── mockApi.ts               # *** MOCK FastAPI responses ***
    │   │   └── api.ts                   # Real API calls (stubbed; swap later)
    │   ├── store/
    │   │   └── seatStore.ts             # Zustand: seats[], selectedSeat, bookings[]
    │   ├── types/
    │   │   └── index.ts                 # All TypeScript interfaces
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css                    # Tailwind directives
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 4. Core Data Models (`src/types/index.ts`)

```typescript
// --- Enums ---

export type SeatStatus = 'free' | 'reserved' | 'upcoming' | 'awaiting_checkin' | 'occupied';

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

// --- Domain Models ---

export interface TimeSlot {
  startSlot: number; // 0–47: inclusive start (slot N = [N×30 min, (N+1)×30 min))
  endSlot:   number; // 1–48: exclusive end; endSlot − startSlot = number of slots booked
}

export interface Seat {
  seatId: string;                      // e.g. "A1", "B3"
  status: SeatStatus;                  // retained for hardware state machine
  nextBookingStartTime: string | null; // ISO 8601; earliest upcoming booking, or null
  todayBookings: TimeSlot[];           // full day schedule; drives binary timeline UI
}

export interface BookingRequest {
  seatId: string;
  studentId: string;
  startSlot: number; // 0–47: inclusive start slot
  endSlot:   number; // 1–48: exclusive end slot; endSlot − startSlot ≥ 1 (min 30 min)
  pinCode: string;   // Exactly 4 digits e.g. "1234"; verified by Arduino keypad
}

export interface BookingResponse {
  bookingId: string;
  seatId: string;
  studentId: string;
  startSlot: number;
  endSlot:   number;
  createdAt: string; // ISO 8601 server timestamp
  status: BookingStatus;
}

// --- Generic API envelope (mirrors FastAPI response shape) ---

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
```

---

## 5. Mock API Contract (`src/services/mockApi.ts`)

The mock service must mirror the exact function signatures that `api.ts` will expose later.
No actual HTTP calls are made — responses are simulated with `setTimeout`.

| Function | Simulated FastAPI Route | Description |
|----------|------------------------|-------------|
| `getSeats()` | `GET /seats` | Returns `Seat[]` |
| `createBooking(req)` | `POST /bookings` | Creates booking, returns `BookingResponse` |
| `getBookings()` | `GET /bookings` | Returns `BookingResponse[]` |

Seed data: 12 seats (A1–A6, B1–B6). Pre-seed `todayBookings` arrays for at least 6 seats with realistic time ranges covering morning and afternoon slots so the binary timeline renders meaningfully.

Booking mutation must append the new `{ startSlot, endSlot }` to the seat's `todayBookings` array (sorted ascending by `startSlot`) and recompute `nextBookingStartTime` via `slotToIso()` so polling reflects the change immediately.

---

## 6. State Management (`src/store/seatStore.ts`)

Zustand store shape:

```
{
  seats: Seat[]
  selectedSeat: Seat | null
  isBookingModalOpen: boolean
  isLoading: boolean
  error: string | null
  globalSelectedSlot: number         // 0–47; driven by GlobalTimeSlider; defaults to currentSlot()

  // Actions
  setSeats(seats: Seat[]): void
  selectSeat(seat: Seat): void
  closeModal(): void
  setLoading(loading: boolean): void
  setError(error: string | null): void
  setGlobalSelectedSlot(slot: number): void
}
```

---

## 7. Polling Strategy (`src/hooks/useSeats.ts`)

- On mount, fetch `getSeats()` immediately.
- Set a `setInterval` to re-fetch every **10 seconds** (configurable via a `VITE_POLL_INTERVAL_MS` env var, defaulting to `10000`).
- Clear the interval on unmount.
- On each fetch, call `store.setSeats()` to update global state.
- This design works identically with mock or real API.

---

## 8. Tailwind Configuration

Add to `tailwind.config.js` content array:
```js
content: ["./index.html", "./src/**/*.{ts,tsx}"]
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Seat colour scheme:
- `free` → green (`bg-green-100 border-green-400 text-green-800`)
- `reserved` → red (`bg-red-100 border-red-400 text-red-800`)
- `selected` → blue (`bg-blue-200 border-blue-500 ring-2 ring-blue-400`)
- `upcoming` → amber/orange (`bg-amber-100 border-amber-400 text-amber-800`)
- `awaiting_checkin` → purple (`bg-purple-100 border-purple-400 text-purple-800`)
- `occupied` → slate (`bg-slate-200 border-slate-500 text-slate-800`)

---

## 9. Execution Checklist

> **Working directory convention:** Steps 1a uses the **repo root** (`E:\projects\HackLondon-2026\`). All steps from 1b onward run from **`frontend/`** (`E:\projects\HackLondon-2026\frontend\`).

### Step 1 — Monorepo Scaffold & Project Initialization

- [ ] **(repo root)** `mkdir backend hardware` — create placeholder team directories
- [ ] **(repo root)** `npm create vite@latest frontend -- --template react-ts` — scaffold React app into `frontend/`
- [ ] **(repo root)** `cd frontend` — enter the frontend workspace; stay here for all remaining steps
- [ ] `npm install` — install Vite-generated dependencies
- [ ] `npm install axios lucide-react zustand react-hot-toast`
- [ ] `npm install -D tailwindcss postcss autoprefixer`
- [ ] `npx tailwindcss init -p`
- [ ] Verify `frontend/package.json` has all packages listed in §1
- [ ] Run `npm run dev` once to confirm Vite scaffolding works before any edits

### Step 2 — Boilerplate Cleanup & Tailwind Configuration

- [ ] Delete `src/App.css`
- [ ] Delete contents of `src/assets/` (keep folder)
- [ ] Replace `src/index.css` with the three Tailwind directives
- [ ] Update `tailwind.config.js` content paths (§8)
- [ ] Gut `src/App.tsx` to a minimal `<div>Hello HackLondon</div>` shell
- [ ] Confirm Tailwind classes render correctly in browser

### Step 3 — Types Definition

- [ ] Create `src/types/index.ts`
- [ ] Define `SeatStatus`, `BookingStatus` (type aliases)
- [ ] Define `Seat` interface
- [ ] Define `BookingRequest` interface
- [ ] Define `BookingResponse` interface
- [ ] Define `ApiResponse<T>` generic envelope

### Step 4 — Mock API Service

- [ ] Create `src/services/mockApi.ts`
- [ ] Seed 12 seats (A1–A6, B1–B6); pre-mark 4 as `reserved`
- [ ] Implement `getSeats(): Promise<ApiResponse<Seat[]>>`  (200ms simulated delay)
- [ ] Implement `createBooking(req: BookingRequest): Promise<ApiResponse<BookingResponse>>` (mutates seed data)
- [ ] Implement `getBookings(): Promise<ApiResponse<BookingResponse[]>>`
- [ ] Create `src/services/api.ts` with identical signatures that delegate to the mock; add a `TODO: swap to Axios` comment
- [ ] Write a quick manual test in browser console to verify mock returns expected shape

### Step 5 — Zustand Store

- [ ] Create `src/store/seatStore.ts`
- [ ] Define store state shape (§6)
- [ ] Implement all actions
- [ ] Export `useSeatStore` hook

### Step 6 — Polling Hook

- [ ] Create `src/hooks/useSeats.ts`
- [ ] Implement fetch-on-mount logic
- [ ] Implement `setInterval` with `VITE_POLL_INTERVAL_MS` (default 10000)
- [ ] Implement cleanup on unmount
- [ ] Create `src/hooks/useBooking.ts`
  - [ ] Accept `BookingRequest`, call `api.createBooking()`
  - [ ] On success: close modal, show toast, refetch seats
  - [ ] On error: show error toast

### Step 7 — Layout Components

- [ ] Create `src/components/layout/Header.tsx` — app title + tagline
- [ ] Create `src/components/layout/Layout.tsx` — wraps `<Header>` + `{children}`
- [ ] Create `src/components/layout/GlobalTimeSlider.tsx`
  - [ ] Full-width `<input type="range">` mapping today's 00:00–23:59 to millisecond offsets
  - [ ] Displays selected time as a human-readable label (e.g. "10:30 AM")
  - [ ] On change: calls `store.setGlobalSelectedTime(isoString)`
  - [ ] Defaults to current time (`new Date().toISOString()`)
- [ ] Mount `<GlobalTimeSlider>` inside `Layout.tsx` below the Header
- [ ] Update `src/App.tsx` to use `<Layout>`

### Step 8 — Seat Components

- [ ] Create `src/components/seats/SeatStatusBadge.tsx` — pill badge for status
- [ ] Create `src/components/seats/SeatCard.tsx`
  - [ ] Props: `seat: Seat`, `onClick: () => void`, `isSelected: boolean`
  - [ ] Reads `globalSelectedTime` from the Zustand store
  - [ ] Derives displayed status by checking whether `globalSelectedTime` falls inside any interval in `seat.todayBookings` — does NOT use `seat.status` for colour-coding
  - [ ] Apply colour classes based on derived status (§8)
  - [ ] Clickable for all seats; opens the Seat Timeline Modal on click
- [ ] Create `src/components/seats/SeatMap.tsx`
  - [ ] Call `useSeats()` hook
  - [ ] Render responsive grid of `<SeatCard>` components
  - [ ] Show loading skeleton while `isLoading`
  - [ ] Show error message if `error` is set
  - [ ] On card click: call `store.selectSeat(seat)` + open modal

### Step 9 — Booking Components

- [ ] Create `src/components/booking/SeatTimeline.tsx`
  - [ ] Props: `seat: Seat`, `onSlotSelected: (selection: TimeSlot) => void`
  - [ ] Renders a 48-cell horizontal binary bar (one cell = one 30-min slot): booked cells red, free cells green
  - [ ] User clicks/drags across free cells to select a contiguous range `[startSlot, endSlot)`
  - [ ] Selection must be ≥ 1 slot (endSlot > startSlot); clicking booked cells is a no-op
  - [ ] Displays selected range as a human-readable label (e.g. "14:00 – 15:30")
  - [ ] Calls `onSlotSelected({ startSlot, endSlot })` when a valid selection is committed
- [ ] Create `src/components/booking/BookingForm.tsx`
  - [ ] Props: `seatId: string`, `onSubmit`, `onCancel`
  - [ ] Embeds `<SeatTimeline>` to capture the selected `TimeSlot`
  - [ ] `studentId` text input, 4-digit PIN field, Submit + Cancel buttons
  - [ ] Disable submit until `startSlot < endSlot` is satisfied and PIN is 4 digits
  - [ ] Disable form during submission
- [ ] Create `src/components/booking/BookingModal.tsx`
  - [ ] Reads `selectedSeat` + `isBookingModalOpen` from store
  - [ ] Renders a wide centred overlay modal wrapping `<BookingForm>`
  - [ ] ESC key / backdrop click closes modal

### Step 10 — Pages & App Assembly

- [ ] Create `src/pages/HomePage.tsx` — renders `<SeatMap>` + `<BookingModal>`
- [ ] Create `src/pages/ConfirmationPage.tsx` — shows last `BookingResponse` details
- [ ] Update `src/App.tsx` to render `<HomePage>` inside `<Layout>`
- [ ] Add `<Toaster>` from `react-hot-toast` in `App.tsx`
- [ ] Run `npm run dev` from `frontend/`, perform end-to-end manual test:
  - [ ] Seats load and render with correct colours
  - [ ] Clicking free seat opens modal
  - [ ] Submitting booking marks seat as reserved in the map
  - [ ] 10-second poll re-fetches without page refresh
  - [ ] Reserved seat is unclickable

---

## 10. Phase 2 Architecture Notes (Do Not Build Yet)

| Feature | Planned location |
|---------|-----------------|
| PIN code (✓ Phase 2) | `pinCode` field in `BookingRequest`; user sets it in `BookingForm.tsx`; verified by Arduino |
| Hardware check-in (✓ Phase 2) | `POST /seats/{seatId}/checkin`; transitions `awaiting_checkin` → `occupied` |
| `upcoming` / `awaiting_checkin` states | Backend still drives these via scheduler for hardware; `SeatCard` derives its timeline status client-side from `todayBookings` + `globalSelectedTime` |
| IR sensor occupancy | New `Seat.isPhysicallyOccupied: boolean` field |
| Timeout logic | New `Seat.timeoutAt` field; countdown timer in `SeatCard` |
| WebSocket / SSE | Replace polling interval in `useSeats.ts` with WS listener |

All Phase 2 extensions are additive — no Phase 1 files need structural rewrites.

---

## 11. API Swap Guide (When Backend Is Ready)

1. Open `frontend/src/services/api.ts`
2. Replace each `mockApi.*` delegation with an Axios call to `VITE_API_BASE_URL`
3. Map the FastAPI response body to the existing `ApiResponse<T>` envelope
4. No other files change — all consumers already use `api.ts` abstractions
5. Create `frontend/.env.local` with:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_POLL_INTERVAL_MS=10000
```

---

*End of HACKATHON_PLAN.md*
