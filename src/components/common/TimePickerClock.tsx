import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerClockProps {
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function getAngle(i: number, total: number) {
  return (i / total) * 360 - 90;
}

function polar(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function TimePickerClock({ value, onChange, onClose }: TimePickerClockProps) {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [isPM, setIsPM] = useState(() => parseInt(value.split(':')[0], 10) >= 12);
  const [hour12, setHour12] = useState(() => {
    const h = parseInt(value.split(':')[0], 10) % 12;
    return h === 0 ? 12 : h;
  });
  const [minute, setMinute] = useState(() => {
    const m = parseInt(value.split(':')[1], 10);
    return Math.round(m / 5) * 5;
  });

  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(260);

  useEffect(() => {
    const update = () => ref.current && setSize(ref.current.offsetWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const r = size / 2;
  const markerRadius = r - 30;

  const buildTime = (h: number, m: number, pm: boolean) => {
    const h24 = pm ? (h % 12) + 12 : h % 12;
    return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const pickHour = (h: number) => {
    setHour12(h);
    setMode('minute');
  };

  const pickMinute = (m: number) => {
    setMinute(m);
    onChange(buildTime(hour12, m, isPM));
    onClose();
  };

  const togglePM = (pm: boolean) => {
    setIsPM(pm);
    onChange(buildTime(hour12, minute, pm));
  };

  const hourAngle = getAngle(HOURS.indexOf(hour12), 12);
  const minAngle = getAngle(MINUTES.indexOf(minute), 12);

  // Hand tip positions - exactly at the center of the selected marker
  const hourTip = polar(hourAngle, markerRadius, r, r);
  const minTip = polar(minAngle, markerRadius, r, r);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" strokeWidth={2} />
          <span className="text-sm font-medium text-text">Select Time</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('hour')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'hour' ? 'bg-primary text-white' : 'bg-surface-muted text-secondary'
            }`}
          >
            {hour12}
          </button>
          <span className="text-sm font-semibold text-text-secondary">:</span>
          <button
            type="button"
            onClick={() => setMode('minute')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'minute' ? 'bg-primary text-white' : 'bg-surface-muted text-secondary'
            }`}
          >
            {String(minute).padStart(2, '0')}
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {[false, true].map((pm) => (
          <button
            key={String(pm)}
            type="button"
            onClick={() => togglePM(pm)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              isPM === pm ? 'bg-primary text-white' : 'bg-surface-muted text-secondary'
            }`}
          >
            {pm ? 'PM' : 'AM'}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        className="relative mx-auto w-full max-w-[280px] aspect-square rounded-full bg-surface-muted/60 select-none touch-none"
      >
        {/* SVG overlay for clock hands - drawn precisely to marker centers */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Hour hand */}
          {mode === 'hour' && (
            <line
              x1={r}
              y1={r}
              x2={hourTip.x}
              y2={hourTip.y}
              stroke="var(--color-primary)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}

          {/* Minute hand */}
          {mode === 'minute' && (
            <line
              x1={r}
              y1={r}
              x2={minTip.x}
              y2={minTip.y}
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.6}
            />
          )}

          {/* Center dot */}
          <circle cx={r} cy={r} r={5} fill="var(--color-primary)" />
        </svg>

        {mode === 'hour' &&
          HOURS.map((h, i) => {
            const p = polar(getAngle(i, 12), markerRadius, r, r);
            const sel = h === hour12;
            return (
              <button
                key={`h${h}`}
                type="button"
                onClick={() => pickHour(h)}
                className={`absolute w-9 h-9 -ml-[18px] -mt-[18px] rounded-full flex items-center justify-center text-[15px] font-semibold transition-all ${
                  sel ? 'bg-primary text-white scale-110 shadow-button' : 'text-text hover:bg-primary/10'
                }`}
                style={{ left: p.x, top: p.y }}
              >
                {h}
              </button>
            );
          })}

        {mode === 'minute' &&
          MINUTES.map((m, i) => {
            const p = polar(getAngle(i, 12), markerRadius, r, r);
            const sel = m === minute;
            return (
              <button
                key={`m${m}`}
                type="button"
                onClick={() => pickMinute(m)}
                className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all ${
                  sel ? 'bg-primary text-white scale-110 shadow-button' : 'text-text hover:bg-primary/10'
                }`}
                style={{ left: p.x, top: p.y }}
              >
                {String(m).padStart(2, '0')}
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