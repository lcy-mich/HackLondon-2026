interface TimeSlotPickerProps {
  startTime: string;
  endTime: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function TimeSlotPicker({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: TimeSlotPickerProps) {
  const isEndBeforeStart = endTime && startTime && endTime <= startTime;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => onStartChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => onEndChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {isEndBeforeStart && (
          <p className="text-red-500 text-xs mt-1">End time must be after start time</p>
        )}
      </div>
    </div>
  );
}
