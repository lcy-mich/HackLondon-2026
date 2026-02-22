import type { SeatStatus } from '../../types';

interface SeatStatusBadgeProps {
  status: SeatStatus;
}

const badgeConfig: Record<SeatStatus, { classes: string; label: string }> = {
  free:             { classes: 'bg-green-100  text-green-800  border-green-400',  label: 'Free' },
  reserved:         { classes: 'bg-red-100    text-red-800    border-red-400',    label: 'Reserved' },
  upcoming:         { classes: 'bg-amber-100  text-amber-800  border-amber-400',  label: 'Upcoming' },
  awaiting_checkin: { classes: 'bg-purple-100 text-purple-800 border-purple-400', label: 'Check-in' },
  occupied:         { classes: 'bg-slate-200  text-slate-800  border-slate-500',  label: 'Occupied' },
};

export function SeatStatusBadge({ status }: SeatStatusBadgeProps) {
  const { classes, label } = badgeConfig[status];

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${classes}`}>
      {label}
    </span>
  );
}
