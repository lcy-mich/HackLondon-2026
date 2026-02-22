import { useState } from 'react';
import { BookingModal } from '../components/booking/BookingModal';
import { ManageBookingsModal } from '../components/booking/ManageBookingsModal';
import { SeatMap } from '../components/seats/SeatMap';

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
  return (
    // sticky top offset = header (~78px) + slider (~76px) + 6px gap = 160px
    // max-h + overflow-y-auto keeps the sidebar scrollable if filters grow
    <aside className="w-64 shrink-0 sticky top-[180px] self-start max-h-[calc(100vh-180px)] overflow-y-auto">
      <div className="bg-surface border border-muted">
        {/* Sidebar header */}
        <div className="border-b border-muted px-5 py-4">
          <span className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase text-secondary">
            Filters
          </span>
        </div>

        {/* Filter items */}
        <div className="divide-y divide-muted">
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
              <span className="text-xs font-mono tracking-wide text-primary select-none">
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* Legend */}
        <div className="border-t border-muted px-5 py-4">
          <span className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase text-secondary block mb-3">
            Legend
          </span>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-3.5 h-3.5 shrink-0 border border-gray-400 bg-white" />
              <span className="text-xs font-mono tracking-wide text-primary">Empty</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-3.5 h-3.5 shrink-0 bg-gray-200" />
              <span className="text-xs font-mono tracking-wide text-primary">In Use (Walk-in)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className="inline-block w-3.5 h-3.5 shrink-0"
                style={{
                  backgroundColor: '#334155',
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #475569 0, #475569 1px, transparent 0, transparent 50%)',
                  backgroundSize: '8px 8px',
                }}
              />
              <span className="text-xs font-mono tracking-wide text-primary">Reserved</span>
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
