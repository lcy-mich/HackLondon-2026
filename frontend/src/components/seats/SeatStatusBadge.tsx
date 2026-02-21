import type { SeatStatus } from '../../types';

interface SeatStatusBadgeProps {
  status: SeatStatus;
}

export function SeatStatusBadge({ status }: SeatStatusBadgeProps) {
  const styles =
    status === 'free'
      ? 'bg-green-100 text-green-800 border border-green-400'
      : 'bg-red-100 text-red-800 border border-red-400';

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles}`}>
      {status === 'free' ? 'Free' : 'Reserved'}
    </span>
  );
}
