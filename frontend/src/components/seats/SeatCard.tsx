import type { Seat } from '../../types';
import { SeatStatusBadge } from './SeatStatusBadge';

interface SeatCardProps {
  seat: Seat;
  onClick: () => void;
  isSelected: boolean;
}

export function SeatCard({ seat, onClick, isSelected }: SeatCardProps) {
  const isReserved = seat.status === 'reserved';

  let containerClass =
    'rounded-xl border-2 p-4 flex flex-col gap-2 transition-all duration-150 ';

  if (isSelected) {
    containerClass += 'bg-blue-200 border-blue-500 ring-2 ring-blue-400 ';
  } else if (isReserved) {
    containerClass += 'bg-red-100 border-red-400 text-red-800 opacity-70 cursor-not-allowed ';
  } else {
    containerClass +=
      'bg-green-100 border-green-400 text-green-800 cursor-pointer hover:shadow-md hover:scale-105 ';
  }

  return (
    <button
      className={containerClass}
      onClick={isReserved ? undefined : onClick}
      disabled={isReserved}
      aria-label={`Seat ${seat.seatId} — ${seat.status}`}
    >
      <span className="text-lg font-bold">{seat.seatId}</span>
      <SeatStatusBadge status={seat.status} />
      {isReserved && seat.nextBookingStartTime && (
        <span className="text-xs text-red-600 mt-1">
          From {new Date(seat.nextBookingStartTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </button>
  );
}
