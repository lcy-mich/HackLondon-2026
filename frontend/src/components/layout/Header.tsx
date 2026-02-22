import { BookOpen } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useSeatStore } from '../../store/seatStore';

export function Header() {
  const openManageModal = useSeatStore((s) => s.openManageModal);

  return (
    <header className="sticky top-0 z-50 bg-header text-header-fg shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
        <BookOpen className="w-7 h-7 shrink-0" />
        <div>
          <h1 className="text-xl font-bold leading-tight">Library Seat Reservation</h1>
          <p className="text-sm opacity-75">HackLondon 2026 — Find and book your spot</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={openManageModal}
            className="border border-header-fg px-3 py-1.5 text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-header-fg opacity-75 hover:opacity-100 transition-opacity"
          >
            Manage / Cancel
          </button>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
