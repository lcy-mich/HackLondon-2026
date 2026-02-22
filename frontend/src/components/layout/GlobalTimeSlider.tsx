import { useRef, useState } from 'react';
import { useSeatStore } from '../../store/seatStore';

const SLOTS = 48; // nodes 0–48 inclusive

/** Format a 0–48 node index as "HH:MM". Node 48 → "24:00". */
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

/** Map a clientX pixel position onto the 0–48 integer range. */
function pxToSlot(clientX: number, rect: DOMRect): number {
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return Math.round(ratio * SLOTS);
}

/** Current real-world slot index (floor). Matches backend's now_slot formula. */
function currentRealWorldSlot(): number {
  const now = new Date();
  return Math.floor((now.getHours() * 60 + now.getMinutes()) / 30);
}

const THUMB =
  'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ' +
  'w-[18px] h-[18px] rounded-full bg-accent border-2 border-white ' +
  'shadow-md cursor-grab active:cursor-grabbing touch-none select-none';

export function GlobalTimeSlider() {
  const selectedTimeRange    = useSeatStore((s) => s.selectedTimeRange);
  const setSelectedTimeRange = useSeatStore((s) => s.setSelectedTimeRange);
  const [left, right] = selectedTimeRange;

  /** When true, the left thumb can travel all the way back to 00:00 (slot 0). */
  const [demoUnlocked, setDemoUnlocked] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);

  /**
   * Attach pointer capture to the thumb element so pointermove/pointerup are
   * always delivered to it, even when the pointer leaves the element or the
   * browser window — no global window listeners needed.
   */
  function handlePointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    thumb: 'left' | 'right',
  ) {
    e.preventDefault(); // prevent text selection / scroll during drag
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    // Capture the rect once at drag-start; it won't move during the drag.
    const rect = trackRef.current!.getBoundingClientRect();

    // Snapshot the toggle at drag-start so toggling mid-drag has no effect.
    const unlocked = demoUnlocked;

    function onMove(pe: PointerEvent) {
      const v = pxToSlot(pe.clientX, rect);
      if (thumb === 'left') {
        // When locked: left thumb cannot go before the current real-world slot.
        const minLeft = unlocked ? 0 : currentRealWorldSlot();
        setSelectedTimeRange([Math.min(Math.max(v, minLeft), right - 1), right]);
      } else {
        // Clamp: right can never reach or pass left
        setSelectedTimeRange([left, Math.max(v, left + 1)]);
      }
    }

    function onUp() {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup',   onUp);
    }

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup',   onUp);
  }

  const leftPct  = `${(left  / SLOTS) * 100}%`;
  const rightPct = `${(right / SLOTS) * 100}%`;

  return (
    <div className="sticky top-[78px] z-40 bg-surface border-b border-muted py-3">
      <div className="max-w-5xl mx-auto px-6">
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-widest uppercase text-secondary">
            Booking Window
          </span>

          <div className="flex items-center gap-3">
            {/* Demo time-travel toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={demoUnlocked}
                onChange={(e) => setDemoUnlocked(e.target.checked)}
                className="w-3 h-3 rounded accent-accent"
              />
              <span className="text-xs text-slate-400">⏱ Unlock Time</span>
            </label>

            <span className="text-sm font-bold text-accent tabular-nums">
              {slotToLabel(left)} – {slotToLabel(right)}
            </span>
          </div>
        </div>

        {/* Track — all thumb positions are measured relative to this div */}
        <div ref={trackRef} className="relative h-5 select-none">
          {/* Grey background rail */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-muted rounded-full" />

          {/* Accent fill between the two thumbs */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-accent rounded-full"
            style={{ left: leftPct, right: `${100 - (right / SLOTS) * 100}%` }}
          />

          {/* Left thumb — z-10 */}
          <div
            role="slider"
            aria-label="Booking start time"
            aria-valuenow={left}
            aria-valuemin={0}
            aria-valuemax={SLOTS - 1}
            tabIndex={0}
            className={`${THUMB} z-10`}
            style={{ left: leftPct }}
            onPointerDown={(e) => handlePointerDown(e, 'left')}
          />

          {/* Right thumb — z-20; always above left so it is never blocked */}
          <div
            role="slider"
            aria-label="Booking end time"
            aria-valuenow={right}
            aria-valuemin={1}
            aria-valuemax={SLOTS}
            tabIndex={0}
            className={`${THUMB} z-20`}
            style={{ left: rightPct }}
            onPointerDown={(e) => handlePointerDown(e, 'right')}
          />
        </div>
      </div>
    </div>
  );
}
