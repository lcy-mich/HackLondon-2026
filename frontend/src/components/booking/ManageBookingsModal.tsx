import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X, Search } from 'lucide-react';
import { useSeatStore } from '../../store/seatStore';
import type { CancelBookingRequest, StudentBooking } from '../../types';
import { cancelBooking, getSeats, getStudentBookings } from '../../services/api';

/** Format a 0–48 slot index as "HH:MM". */
function slotLabel(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

interface SuccessInfo {
  seatId:    string;
  startSlot: number;
  endSlot:   number;
}

export function ManageBookingsModal() {
  const { isManageModalOpen, closeManageModal, setSeats, currentTheme } = useSeatStore();
  const isPaper = currentTheme === 'paper';

  const [studentId,    setStudentId]    = useState('');
  const [bookings,     setBookings]     = useState<StudentBooking[] | null>(null);
  const [isSearching,  setIsSearching]  = useState(false);
  const [searchError,  setSearchError]  = useState<string | null>(null);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [pin,          setPin]          = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError,  setCancelError]  = useState<string | null>(null);
  const [successInfo,  setSuccessInfo]  = useState<SuccessInfo | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');

  // Reset all state each time the modal opens so a fresh session starts.
  useEffect(() => {
    if (isManageModalOpen) {
      setStudentId('');
      setBookings(null);
      setIsSearching(false);
      setSearchError(null);
      setSelectedId(null);
      setPin('');
      setIsCancelling(false);
      setCancelError(null);
      setSuccessInfo(null);
      setTimelineFilter('ALL');
    }
  }, [isManageModalOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isManageModalOpen) closeManageModal();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isManageModalOpen, closeManageModal]);

  if (!isManageModalOpen) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const id = studentId.trim();
    if (!id) return;

    setIsSearching(true);
    setSearchError(null);
    setBookings(null);
    setSelectedId(null);
    setPin('');
    setCancelError(null);
    setSuccessInfo(null);
    setTimelineFilter('ALL');

    try {
      const res = await getStudentBookings(id);
      if (res.success) {
        setBookings(res.data);
      } else {
        setSearchError(res.message);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function selectBooking(id: string) {
    // Toggle: clicking the selected booking deselects it
    setSelectedId((prev) => (prev === id ? null : id));
    setPin('');
    setCancelError(null);
  }

  async function handleCancel(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !/^\d{4}$/.test(pin)) return;

    const target = bookings?.find((b) => b.bookingId === selectedId);
    if (!target) return;

    setIsCancelling(true);
    setCancelError(null);

    const req: CancelBookingRequest = {
      bookingId: selectedId,
      studentId: studentId.trim(),
      pinCode:   pin,
    };

    try {
      const res = await cancelBooking(req);
      if (res.success) {
        setSuccessInfo({ seatId: target.seatId, startSlot: target.startSlot, endSlot: target.endSlot });
        setSelectedId(null);
        setPin('');

        // Refresh the booking list from the mock
        const refreshRes = await getStudentBookings(studentId.trim());
        if (refreshRes.success) setBookings(refreshRes.data);

        // Refresh global seat map so the freed slot is visible
        const seatsRes = await getSeats();
        if (seatsRes.success) setSeats(seatsRes.data);
      } else {
        setCancelError(res.message);
      }
    } finally {
      setIsCancelling(false);
    }
  }

  const selectedBooking = bookings?.find((b) => b.bookingId === selectedId) ?? null;
  const isPinValid       = /^\d{4}$/.test(pin);

  // Unique seat IDs across the fetched bookings — drives the filter dropdown.
  const uniqueSeatIds = bookings
    ? [...new Set(bookings.map((b) => b.seatId))]
    : [];

  // Only the timeline uses this filtered view; the booking list always shows all.
  const timelineBookings = timelineFilter === 'ALL'
    ? (bookings ?? [])
    : (bookings ?? []).filter((b) => b.seatId === timelineFilter);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={closeManageModal}
    >
      <div
        className={`bg-surface w-full max-w-2xl mx-4 relative max-h-[85vh] flex flex-col ${
          isPaper
            ? 'rounded-md border-2 border-stone-200 shadow-xl'
            : 'shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal header ──────────────────────────────────────────────── */}
        <div className="border-b border-muted px-6 py-4 flex items-center justify-between shrink-0">
          <span
            className={isPaper
              ? 'font-serif text-xl font-bold text-stone-800'
              : 'font-mono text-lg font-bold tracking-widest uppercase text-primary'}
          >
            {isPaper ? 'My Bookings' : 'Manage Bookings'}
          </span>
          <button
            onClick={closeManageModal}
            className="text-secondary hover:text-primary transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* ── Step 1: Student ID search ──────────────────────────────── */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={studentId}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStudentId(e.target.value)}
              placeholder="Student ID — e.g. s1234001"
              disabled={isSearching}
              className={`flex-1 px-3 py-2.5 text-base bg-surface focus:outline-none disabled:opacity-50 ${
                isPaper
                  ? 'border border-stone-300 font-serif text-stone-800 focus:border-amber-600 rounded-sm'
                  : 'border border-muted font-mono text-primary focus:border-primary'
              }`}
            />
            <button
              type="submit"
              disabled={isSearching || !studentId.trim()}
              className={`px-5 py-2.5 text-xs font-bold tracking-[0.25em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 ${
                isPaper
                  ? 'border border-amber-700 font-serif text-amber-700 hover:bg-amber-700 hover:text-white rounded-sm'
                  : 'border border-primary font-mono text-primary hover:bg-primary hover:text-surface'
              }`}
            >
              <Search className="w-4 h-4" />
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {searchError && (
            <p className="font-mono text-sm text-red-500">{searchError}</p>
          )}

          {/* ── Step 2 & 3: Results + auth ─────────────────────────────── */}
          {bookings !== null && (
            <div className="flex flex-col gap-4">

              {/* Section label */}
              <div className="border-b border-muted pb-2">
                <span
                  className={isPaper
                    ? 'font-serif italic text-stone-600 text-sm'
                    : 'font-mono text-sm tracking-[0.35em] uppercase text-secondary'}
                >
                  {bookings.length === 0
                    ? 'No active bookings'
                    : `${bookings.length} Active Booking${bookings.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* ── Step 4 success banner ──────────────────────────────── */}
              {successInfo && (
                <div className={`px-4 py-3 ${isPaper ? 'border border-stone-300 rounded-sm bg-amber-50' : 'border border-muted'}`}>
                  <span className={`text-sm ${isPaper ? 'font-serif italic text-stone-700' : 'font-mono text-primary'}`}>
                    ✓ Cancelled — Seat {successInfo.seatId} · {slotLabel(successInfo.startSlot)}–{slotLabel(successInfo.endSlot)}
                  </span>
                </div>
              )}

              {bookings.length > 0 && (
                <>
                  {/* ── Step 2: Timeline visualisation ────────────────── */}
                  <div>
                    {/* Filter row: label left, seat-filter dropdown right */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs uppercase tracking-widest text-secondary">
                        Timeline
                      </span>
                      <select
                        value={timelineFilter}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          setTimelineFilter(e.target.value)
                        }
                        className="border border-muted bg-surface font-mono text-xs text-primary px-2 py-1 focus:outline-none focus:border-primary"
                      >
                        <option value="ALL">All Seats</option>
                        {uniqueSeatIds.map((id) => (
                          <option key={id} value={id}>Seat {id}</option>
                        ))}
                      </select>
                    </div>

                    {/* Full-day 48-slot bar with absolute-positioned booking blocks */}
                    <div className="relative h-12 bg-gray-100 border border-muted overflow-hidden">
                      {timelineBookings.map((b) => (
                        <button
                          key={b.bookingId}
                          style={{
                            position: 'absolute',
                            left:     `${(b.startSlot / 48) * 100}%`,
                            width:    `${Math.max(((b.endSlot - b.startSlot) / 48) * 100, 3)}%`,
                            top:      0,
                            bottom:   0,
                          }}
                          onClick={() => selectBooking(b.bookingId)}
                          title={`SEAT ${b.seatId} — ${slotLabel(b.startSlot)}–${slotLabel(b.endSlot)}`}
                          className={`flex items-center justify-center overflow-hidden transition-colors ${
                            selectedId === b.bookingId
                              ? 'bg-slate-900 ring-2 ring-amber-400 ring-inset z-10'
                              : 'bg-slate-800 hover:bg-slate-600'
                          }`}
                        >
                          <span className="text-white font-mono font-bold text-sm px-1 truncate leading-none">
                            {b.seatId}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Hour labels: every 2 hours (12 labels, matching SeatTimeline) */}
                    <div className="flex mt-1">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div
                          key={i}
                          className="flex-1 font-mono text-xs text-secondary text-left select-none"
                        >
                          {`${String(i * 2).padStart(2, '0')}:00`}
                        </div>
                      ))}
                    </div>

                    <p className="font-mono text-xs text-secondary mt-1">
                      Click a block to select it for cancellation.
                    </p>
                  </div>

                  {/* ── Booking list ────────────────────────────────────── */}
                  <div className="divide-y divide-muted">
                    {bookings.map((b) => (
                      <button
                        key={b.bookingId}
                        onClick={() => selectBooking(b.bookingId)}
                        className={`w-full flex items-center gap-4 py-3 text-left transition-colors ${
                          selectedId === b.bookingId ? 'bg-main' : 'hover:bg-main'
                        }`}
                      >
                        <span className={`text-base font-bold w-14 shrink-0 ${isPaper ? 'font-serif text-stone-800' : 'font-mono text-primary'}`}>
                          {b.seatId}
                        </span>
                        <span className={`text-base ${isPaper ? 'font-mono text-stone-500' : 'font-mono text-secondary'}`}>
                          {slotLabel(b.startSlot)}–{slotLabel(b.endSlot)}
                        </span>
                        {selectedId === b.bookingId && (
                          <span className={`ml-auto text-sm shrink-0 ${isPaper ? 'font-serif italic text-amber-700' : 'font-mono tracking-widest uppercase text-accent'}`}>
                            {isPaper ? 'Select →' : 'Selected ›'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* ── Step 3: PIN auth (visible when a booking is selected) ── */}
                  {selectedBooking && (
                    <form
                      onSubmit={handleCancel}
                      className="border-t border-muted pt-4 flex flex-col gap-3"
                    >
                      <span className={isPaper
                        ? 'font-serif italic text-sm text-stone-600'
                        : 'font-mono text-sm tracking-[0.25em] uppercase text-secondary'}
                      >
                        {isPaper ? 'Cancel reservation: ' : 'Cancel: '}
                        Seat {selectedBooking.seatId} · {slotLabel(selectedBooking.startSlot)}–{slotLabel(selectedBooking.endSlot)}
                      </span>

                      <div className="flex gap-2">
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={pin}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                          }
                          placeholder="4-digit PIN"
                          disabled={isCancelling}
                          className={`w-44 px-3 py-2.5 text-base bg-surface focus:outline-none disabled:opacity-50 ${
                            isPaper
                              ? 'border border-stone-300 font-serif text-stone-800 focus:border-amber-600 rounded-sm'
                              : 'border border-muted font-mono text-primary focus:border-primary'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={isCancelling || !isPinValid}
                          className={`px-5 py-2.5 text-sm font-bold tracking-[0.25em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            isPaper
                              ? 'border border-red-700 font-serif text-red-700 hover:bg-red-700 hover:text-white rounded-sm'
                              : 'border border-red-600 font-mono text-red-600 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          {isCancelling ? 'Cancelling…' : 'Confirm Cancel'}
                        </button>
                      </div>

                      {cancelError && (
                        <p className="font-mono text-sm text-red-500">{cancelError}</p>
                      )}
                    </form>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
