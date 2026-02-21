import { useSeatStore } from '../../store/seatStore';

/** Format a 0–47 slot index as a human-readable "HH:MM" string. */
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

export function GlobalTimeSlider() {
  const globalSelectedSlot    = useSeatStore((s) => s.globalSelectedSlot);
  const setGlobalSelectedSlot = useSeatStore((s) => s.setGlobalSelectedSlot);

  return (
    <div className="bg-surface border-b border-muted py-3">
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-4">
        <span className="text-xs font-semibold tracking-widest uppercase text-secondary whitespace-nowrap">
          Time
        </span>
        <input
          type="range"
          min={0}
          max={47}
          value={globalSelectedSlot}
          onChange={(e) => setGlobalSelectedSlot(Number(e.target.value))}
          className="flex-1 accent-accent cursor-pointer"
        />
        <span className="text-sm font-bold text-accent w-12 text-right tabular-nums">
          {slotToLabel(globalSelectedSlot)}
        </span>
      </div>
    </div>
  );
}
