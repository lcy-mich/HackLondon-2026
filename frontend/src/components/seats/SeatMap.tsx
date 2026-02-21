import { useSeats } from '../../hooks/useSeats';
import { useSeatStore } from '../../store/seatStore';
import { SeatCard } from './SeatCard';

export function SeatMap() {
  useSeats();

  const { seats, selectedSeat, isLoading, error, selectSeat } = useSeatStore();

  if (isLoading && seats.length === 0) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-gray-200 bg-gray-100 h-24 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-semibold">Failed to load seats</p>
        <p className="text-gray-500 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Available Seats</h2>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-400" /> Free
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-red-400" /> Reserved
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-400" /> Selected
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {seats.map((seat) => (
          <SeatCard
            key={seat.seatId}
            seat={seat}
            isSelected={selectedSeat?.seatId === seat.seatId}
            onClick={() => selectSeat(seat)}
          />
        ))}
      </div>
    </div>
  );
}
