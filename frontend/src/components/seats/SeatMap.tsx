import { useSeats } from '../../hooks/useSeats';
import { useSeatStore } from '../../store/seatStore';
import { SeatCard } from './SeatCard';

const ZONES = [
  { key: 'A', label: 'Zone A — Window Tables' },
  { key: 'B', label: 'Zone B — Inner Tables'  },
] as const;

// ── Static tag lookup ─────────────────────────────────────────────────────
// All A seats have 'window'; all B seats have 'quiet'.
// 'power' and 'monitor' are spread across both zones.
const SEAT_TAGS: Record<string, string[]> = {
  A1: ['window', 'power'],
  A2: ['window'],
  A3: ['window', 'monitor'],
  A4: ['window', 'power'],
  A5: ['window', 'monitor'],
  A6: ['window'],
  B1: ['quiet', 'power'],
  B2: ['quiet'],
  B3: ['quiet', 'monitor'],
  B4: ['quiet', 'power'],
  B5: ['quiet', 'monitor'],
  B6: ['quiet'],
};

interface SeatMapProps {
  activeFilters: string[];
}

export function SeatMap({ activeFilters }: SeatMapProps) {
  useSeats();

  const { seats, selectedSeat, isLoading, error, selectSeat, currentTheme } = useSeatStore();

  if (isLoading && seats.length === 0) {
    return (
      <div className="space-y-10">
        {ZONES.map(({ key }) => (
          <section key={key}>
            <div className="h-3 w-32 bg-muted mb-4 animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse" />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold text-primary">Failed to load seats</p>
        <p className="text-secondary text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Apply tag filter: a seat is visible only if it has ALL active filter tags.
  const visibleSeats = activeFilters.length === 0
    ? seats
    : seats.filter((seat) => {
        const tags = SEAT_TAGS[seat.seatId] ?? [];
        return activeFilters.every((f) => tags.includes(f));
      });

  // ── Paper: Vintage Library Index Cards ────────────────────────────────────
  if (currentTheme === 'paper') {
    return (
      <div>
        <header className="mb-10">
          <p className="text-xs font-serif italic text-stone-400 mb-1 tracking-wide">
            University College London · Main Library
          </p>
          <h2 className="text-3xl font-serif font-bold text-stone-800 leading-tight">
            Reading Room, Floor I
          </h2>
          <p className="text-xs font-mono tracking-[0.2em] uppercase text-stone-400 mt-1">
            Select a seat to reserve your place
          </p>
        </header>

        <div className="space-y-10">
          {ZONES.map(({ key, label }) => {
            const zoneSeats = visibleSeats.filter((s) => s.seatId.startsWith(key));
            return (
              <section key={key}>
                {/* Archival chapter-label header */}
                <div className="border-y-2 border-stone-300 py-2 mb-6">
                  <h3 className="text-sm font-serif italic text-stone-600 tracking-wide">
                    {label}
                  </h3>
                </div>
                {/* Generous gap so each card reads as a discrete physical object */}
                <div className="grid grid-cols-3 gap-8">
                  {zoneSeats.map((seat) => (
                    <SeatCard
                      key={seat.seatId}
                      seat={seat}
                      isSelected={selectedSeat?.seatId === seat.seatId}
                      onClick={() => selectSeat(seat)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Japanese: Vertical Minimalist Stack ───────────────────────────────────
  if (currentTheme === 'japanese') {
    return (
      <div>
        <header className="mb-10">
          <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-gray-400 mb-2">
            University College London Library
          </p>
          <h2 className="text-4xl font-mono font-black tracking-tight text-black leading-none">
            FLOOR 1
          </h2>
          <p className="text-xs font-mono tracking-[0.2em] uppercase text-gray-400 mt-1">
            — Quiet Study Zone
          </p>
        </header>

        <div className="space-y-8">
          {ZONES.map(({ key, label }) => {
            const zoneSeats = visibleSeats.filter((s) => s.seatId.startsWith(key));
            return (
              <section key={key}>
                <div className="border-l-2 border-[#334155] pl-3 mb-2">
                  <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#334155]">
                    {label}
                  </span>
                </div>
                <div className="flex flex-col gap-px bg-[#334155] border border-[#334155]">
                  {zoneSeats.map((seat) => (
                    <SeatCard
                      key={seat.seatId}
                      seat={seat}
                      isSelected={selectedSeat?.seatId === seat.seatId}
                      onClick={() => selectSeat(seat)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Default: academic / paper ─────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {ZONES.map(({ key, label }) => {
        const zoneSeats = visibleSeats.filter((s) => s.seatId.startsWith(key));
        return (
          <section key={key}>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-secondary border-b border-muted pb-2 mb-4">
              {label}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {zoneSeats.map((seat) => (
                <SeatCard
                  key={seat.seatId}
                  seat={seat}
                  isSelected={selectedSeat?.seatId === seat.seatId}
                  onClick={() => selectSeat(seat)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
