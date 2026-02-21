import { BookOpen } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
        <BookOpen className="w-7 h-7" />
        <div>
          <h1 className="text-xl font-bold leading-tight">Library Seat Reservation</h1>
          <p className="text-blue-200 text-sm">HackLondon 2026 — Find and book your spot</p>
        </div>
      </div>
    </header>
  );
}
