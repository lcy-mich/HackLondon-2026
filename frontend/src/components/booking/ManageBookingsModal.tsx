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
  const { isManageModalOpen, closeManageModal, setSeats } = useSeatStore();

  const [studentId,    setStudentId]    = useState('');
  const [bookings,     setBookings]     = useState<StudentBooking[] | null>(null);
  const [isSearching,  setIsSearching]  = useState(false);
  const [searchError,  setSearchError]  = useState<string | null>(null);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [pin,          setPin]          = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError,  setCancelError]  = useState<string | null>(null);
  const [successInfo,  setSuccessInfo]  = useState<SuccessInfo | null>(null);

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={closeManageModal}
    >
      <div
        className="bg-surface w-full max-w-2xl mx-4 shadow-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal header ──────────────────────────────────────────────── */}
        <div className="border-b border-muted px-6 py-4 flex items-center justify-between shrink-0">
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase font-bold text-primary">
            Manage Bookings
          </span>
          <button
            onClick={closeManageModal}
            className="text-secondary hover:text-primary transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">

          {/* ── Step 1: Student ID search ──────────────────────────────── */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={studentId}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStudentId(e.target.value)}
              placeholder="Student ID — e.g. s1234001"
              disabled={isSearching}
              className="flex-1 border border-muted px-3 py-2 text-sm font-mono text-primary bg-surface focus:outline-none focus:border-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSearching || !studentId.trim()}
              className="border border-primary px-4 py-2 text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-primary hover:bg-primary hover:text-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
            >
              <Search className="w-3 h-3" />
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {searchError && (
            <p className="font-mono text-xs text-red-500">{searchError}</p>
          )}

          {/* ── Step 2 & 3: Results + auth ─────────────────────────────── */}
          {bookings !== null && (
            <div className="flex flex-col gap-5">

              {/* Section label */}
              <div className="border-b border-muted pb-2">
                <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-secondary">
                  {bookings.length === 0
                    ? 'No active bookings'
                    : `${bookings.length} Active Booking${bookings.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* ── Step 4 success banner ──────────────────────────────── */}
              {successInfo && (
                <div className="border border-muted px-4 py-2.5">
                  <span className="font-mono text-xs text-primary">
                    ✓ Cancelled — Seat {successInfo.seatId} · {slotLabel(successInfo.startSlot)}–{slotLabel(successInfo.endSlot)}
                  </span>
                </div>
              )}

              {bookings.length > 0 && (
                <>
                  {/* ── Step 2: Timeline visualisation ────────────────── */}
                  <div>
                    {/* Full-day 48-slot bar with absolute-positioned booking blocks */}
                    <div className="relative h-8 bg-gray-100 border border-muted overflow-hidden">
                      {bookings.map((b) => (
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
                          <span
                            className="text-white font-mono font-bold px-0.5 truncate leading-none"
                            style={{ fontSize: '8px' }}
                          >
                            {b.seatId}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Hour labels: every 2 hours (12 labels, matching SeatTimeline) */}
                    <div className="flex mt-0.5">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div
                          key={i}
                          className="flex-1 font-mono text-secondary text-left select-none"
                          style={{ fontSize: '8px' }}
                        >
                          {`${String(i * 2).padStart(2, '0')}:00`}
                        </div>
                      ))}
                    </div>

                    <p className="font-mono text-secondary mt-2" style={{ fontSize: '10px' }}>
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
                        <span className="font-mono text-xs font-bold text-primary w-12 shrink-0">
                          {b.seatId}
                        </span>
                        <span className="font-mono text-xs text-secondary">
                          {slotLabel(b.startSlot)}–{slotLabel(b.endSlot)}
                        </span>
                        {selectedId === b.bookingId && (
                          <span className="ml-auto font-mono text-[10px] tracking-widest uppercase text-accent shrink-0">
                            Selected ›
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
                      <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-secondary">
                        Cancel: Seat {selectedBooking.seatId} · {slotLabel(selectedBooking.startSlot)}–{slotLabel(selectedBooking.endSlot)}
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
                          className="w-36 border border-muted px-3 py-2 text-sm font-mono text-primary bg-surface focus:outline-none focus:border-primary disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={isCancelling || !isPinValid}
                          className="border border-red-600 px-4 py-2 text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isCancelling ? 'Cancelling…' : 'Confirm Cancel'}
                        </button>
                      </div>

                      {cancelError && (
                        <p className="font-mono text-xs text-red-500">{cancelError}</p>
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
