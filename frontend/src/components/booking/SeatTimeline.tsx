import type { Seat, TimeSlot } from '../../types';
import { useSeatStore } from '../../store/seatStore';

interface SeatTimelineProps {
  seat: Seat;
  onSlotSelected: (selection: TimeSlot | null) => void;
}

/** Format a 0–47 slot index (or 48 = end-of-day) as "HH:MM". */
function slotToLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

/** Current real-world slot index (0–47) based on the user's local clock. */
function currentRealWorldSlot(): number {
  const now = new Date();
  return Math.floor((now.getHours() * 60 + now.getMinutes()) / 30);
}

export function SeatTimeline({ seat }: SeatTimelineProps) {
  const selectedTimeRange = useSeatStore((s) => s.selectedTimeRange);
  const currentTheme      = useSeatStore((s) => s.currentTheme);
  const [selStart, selEnd] = selectedTimeRange; // selEnd is exclusive

  // Compute phantom block range for walk-in seats
  const nowSlot = currentRealWorldSlot();
  let phantomStart = -1;
  let phantomEnd = -1;
  if (seat.physicalStatus === 'occupied') {
    phantomStart = nowSlot;
    const nextFuture = seat.todayBookings
      .filter((b) => b.startSlot > nowSlot)
      .sort((a, b) => a.startSlot - b.startSlot)[0];
    phantomEnd = nextFuture ? nextFuture.startSlot : 48;
  }

  const isAcademic = currentTheme === 'academic';

  function getSlotClasses(i: number): string {
    // 1. Confirmed online booking → dark (highest priority: objective reality)
    if (seat.todayBookings.some((b) => i >= b.startSlot && i < b.endSlot))
      return isAcademic ? 'bg-slate-600' : 'bg-slate-700';
    // 2. Walk-in phantom block → light grey
    if (seat.physicalStatus === 'occupied' && i >= phantomStart && i < phantomEnd)
      return isAcademic ? 'bg-slate-200' : 'bg-gray-200';
    // 3. Global slider selection → accent colour (only for truly free slots)
    if (i >= selStart && i < selEnd)
      return isAcademic ? 'bg-indigo-400' : 'bg-amber-400';
    // 4. Free → white with border
    return 'bg-white border border-gray-200';
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-secondary mb-2 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-300" />
          Free
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-200" />
          Walk-in / In Use
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-700" />
          Booked
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block w-3 h-3 rounded-sm ${isAcademic ? 'bg-indigo-400' : 'bg-amber-400'}`} />
          Selected
        </span>
      </div>

      {/* 48-slot binary bar */}
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: 'repeat(48, minmax(0, 1fr))' }}
      >
        {Array.from({ length: 48 }, (_, i) => (
          <div
            key={i}
            className={`h-8 rounded-sm ${getSlotClasses(i)}`}
            title={slotToLabel(i)}
            aria-label={slotToLabel(i)}
          />
        ))}
      </div>

      {/* Hour labels: one per 4 slots (= every 2 hours) */}
      <div className="flex mt-1">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="flex-1 text-secondary text-left select-none"
            style={{ fontSize: '9px' }}
          >
            {`${String(i * 2).padStart(2, '0')}:00`}
          </div>
        ))}
      </div>
    </div>
  );
}
