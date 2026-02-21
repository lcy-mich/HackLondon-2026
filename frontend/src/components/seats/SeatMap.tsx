import { useSeats } from '../../hooks/useSeats';
import { useSeatStore } from '../../store/seatStore';
import { SeatCard } from './SeatCard';

const ZONES = [
  { key: 'A', label: 'Zone A — Window Tables' },
  { key: 'B', label: 'Zone B — Inner Tables'  },
] as const;

export function SeatMap() {
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

  // ── Japanese: Architectural Floorplan ─────────────────────────────────────
  // gap-px with a black container background creates 1px hairline dividers
  // between cells — no double borders, no gaps, pure blueprint aesthetic.
  if (currentTheme === 'japanese') {
    return (
      <div className="space-y-6">
        {ZONES.map(({ key, label }) => {
          const zoneSeats = seats.filter((s) => s.seatId.startsWith(key));
          return (
            <section key={key}>
              <div className="border-l-2 border-black pl-3 mb-2">
                <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-black">
                  {label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-px bg-black border border-black">
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

  // ── Default: academic / paper ─────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {ZONES.map(({ key, label }) => {
        const zoneSeats = seats.filter((s) => s.seatId.startsWith(key));
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
