import { useState } from 'react';
import { BookingModal } from '../components/booking/BookingModal';
import { ManageBookingsModal } from '../components/booking/ManageBookingsModal';
import { SeatMap } from '../components/seats/SeatMap';
import { useSeatStore } from '../store/seatStore';

// ── Filter sidebar ─────────────────────────────────────────────────────────
// IDs must match the tag strings used in SeatMap's SEAT_TAGS lookup.
const FILTERS = [
  { id: 'power',   label: 'Power Outlet (220V)' },
  { id: 'window',  label: 'Window View'          },
  { id: 'monitor', label: 'Dual Monitor'         },
  { id: 'quiet',   label: 'Quiet Zone'           },
] as const;

type FilterId = typeof FILTERS[number]['id'];

interface FilterSidebarProps {
  activeFilters: FilterId[];
  onToggle: (id: FilterId) => void;
}

function FilterSidebar({ activeFilters, onToggle }: FilterSidebarProps) {
  const currentTheme = useSeatStore((s) => s.currentTheme);
  const isPaper    = currentTheme === 'paper';
  const isAcademic = currentTheme === 'academic';

  return (
    // sticky top offset = header (~78px) + slider (~76px) + 6px gap = 160px
    // max-h + overflow-y-auto keeps the sidebar scrollable if filters grow
    <aside className="w-64 shrink-0 sticky top-[180px] self-start max-h-[calc(100vh-180px)] overflow-y-auto">
      <div className={`bg-surface ${
        isPaper    ? 'border border-stone-300 rounded-md shadow-md'
        : isAcademic ? 'border border-slate-200 rounded-xl shadow-sm'
        : 'border border-muted'
      }`}>
        {/* Sidebar header */}
        <div className={`px-5 py-4 ${
          isPaper ? 'border-b border-stone-200' : 'border-b border-muted'
        }`}>
          {isPaper ? (
            <span className="font-serif italic text-sm text-stone-600">Filter Seats</span>
          ) : isAcademic ? (
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Filters</span>
          ) : (
            <span className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase text-secondary">
              Filters
            </span>
          )}
        </div>

        {/* Filter items */}
        <div className={`divide-y ${isPaper ? 'divide-stone-200' : 'divide-muted'}`}>
          {FILTERS.map(({ id, label }) => (
            <label
              key={id}
              htmlFor={id}
              className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-main transition-colors"
            >
              <input
                type="checkbox"
                id={id}
                checked={activeFilters.includes(id)}
                onChange={() => onToggle(id)}
                className="accent-accent w-3.5 h-3.5 shrink-0 cursor-pointer"
              />
              <span className={`text-xs tracking-wide text-primary select-none ${
                isPaper ? 'font-serif' : isAcademic ? 'font-medium' : 'font-mono'
              }`}>
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* Legend */}
        <div className={`px-5 py-4 ${isPaper ? 'border-t border-stone-200' : 'border-t border-muted'}`}>
          {isPaper ? (
            <span className="font-serif italic text-sm text-stone-500 block mb-3">Key</span>
          ) : isAcademic ? (
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-3">Legend</span>
          ) : (
            <span className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase text-secondary block mb-3">
              Legend
            </span>
          )}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              {isAcademic ? (
                <span className="inline-block w-3 h-3 shrink-0 rounded-full bg-white border-2 border-slate-300" />
              ) : (
                <span className={`inline-block w-3.5 h-3.5 shrink-0 bg-[#FCFCFA] ${isPaper ? 'border border-stone-300 rounded-sm shadow-sm' : 'border border-gray-400'}`} />
              )}
              <span className={`text-xs tracking-wide text-primary ${isPaper ? 'font-serif' : isAcademic ? 'font-medium' : 'font-mono'}`}>Empty</span>
            </div>
            <div className="flex items-center gap-2.5">
              {isAcademic ? (
                <span className="inline-block w-3 h-3 shrink-0 rounded-full bg-amber-200 border-2 border-amber-300" />
              ) : (
                <span className={`inline-block w-3.5 h-3.5 shrink-0 ${isPaper ? 'bg-[#FCFCFA] border border-stone-300 rounded-sm shadow-sm opacity-60' : 'bg-gray-300'}`} />
              )}
              <span className={`text-xs tracking-wide text-primary ${isPaper ? 'font-serif' : isAcademic ? 'font-medium' : 'font-mono'}`}>In Use (Walk-in)</span>
            </div>
            <div className="flex items-center gap-2.5">
              {isPaper ? (
                <span className="inline-block w-3.5 h-3.5 shrink-0 bg-[#FCFCFA] border border-stone-300 rounded-sm shadow-sm opacity-40" />
              ) : isAcademic ? (
                <span className="inline-block w-3 h-3 shrink-0 rounded-full bg-slate-400 border-2 border-slate-500" />
              ) : (
                <span
                  className="inline-block w-3.5 h-3.5 shrink-0"
                  style={{
                    backgroundColor: '#334155',
                    backgroundImage:
                      'repeating-linear-gradient(45deg, #475569 0, #475569 1px, transparent 0, transparent 50%)',
                    backgroundSize: '8px 8px',
                  }}
                />
              )}
              <span className={`text-xs tracking-wide text-primary ${isPaper ? 'font-serif' : isAcademic ? 'font-medium' : 'font-mono'}`}>Reserved</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function HomePage() {
  const [activeFilters, setActiveFilters] = useState<FilterId[]>([]);

  function toggleFilter(id: FilterId) {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  return (
    <>
      {/* Two-column layout: SeatMap (flex-1) + Filter sidebar (fixed width) */}
      <div className="flex flex-col md:flex-row gap-10 items-start">
        <div className="flex-1 min-w-0">
          <SeatMap activeFilters={activeFilters} />
        </div>
        <FilterSidebar activeFilters={activeFilters} onToggle={toggleFilter} />
      </div>
      <BookingModal />
      <ManageBookingsModal />
    </>
  );
}
