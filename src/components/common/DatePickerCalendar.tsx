import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface DatePickerCalendarProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DatePickerCalendar({ value, onChange, onClose }: DatePickerCalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(value + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = new Date();
  const todayISO = toISO(today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const pickDate = (day: number) => {
    const d = new Date(year, month, day);
    onChange(toISO(d));
    onClose();
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" strokeWidth={2} />
          <span className="text-sm font-medium text-text">Select Date</span>
        </div>
        <span className="text-sm font-semibold text-text-secondary">
          {formatDisplay(value)}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center text-secondary hover:bg-border/70 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
        </button>
        <span className="text-[15px] font-semibold text-text">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center text-secondary hover:bg-border/70 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-text-tertiary py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateISO = toISO(new Date(year, month, day));
          const isSelected = dateISO === value;
          const isToday = dateISO === todayISO;

          return (
            <button
              key={dateISO}
              type="button"
              onClick={() => pickDate(day)}
              className={`
                aspect-square rounded-full flex items-center justify-center
                text-[13px] font-medium transition-all duration-150
                ${
                  isSelected
                    ? 'bg-primary text-white font-semibold shadow-button'
                    : isToday
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-text hover:bg-primary/10'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:bg-surface-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}