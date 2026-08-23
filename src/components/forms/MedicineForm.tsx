import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicineSchema, type MedicineFormData } from '@/utils/validation';
import { Button, Modal, TimePickerClock } from '@/components/common';
import { Plus, Trash2, Clock, Pill, Syringe, FlaskConical, Tablets } from 'lucide-react';
import { getTodayISO } from '@/utils/format';
import { TIME_OPTIONS } from '@/constants';
import type { Medicine, MedicineType, MealRelation } from '@/types';

interface MedicineFormProps {
  initialData?: Partial<Medicine>;
  onSubmit: (data: MedicineFormData) => void;
  submitLabel?: string;
  loading?: boolean;
}

const MEDICINE_TYPES: {
  value: MedicineType;
  label: string;
  icon: typeof Pill;
}[] = [
  { value: 'tablet', label: 'Tablet', icon: Pill },
  { value: 'syrup', label: 'Syrup', icon: FlaskConical },
  { value: 'capsule', label: 'Capsule', icon: Tablets },
  { value: 'injection', label: 'Injection', icon: Syringe },
];

const MEAL_OPTIONS: { value: MealRelation; label: string }[] = [
  { value: 'before_meal', label: 'Before Meal' },
  { value: 'after_meal', label: 'After Meal' },
  { value: 'anytime', label: 'Anytime' },
];

function format12Hour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function MedicineForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Medicine',
  loading = false,
}: MedicineFormProps) {
  const [activeTimeIndex, setActiveTimeIndex] = useState<number | null>(null);

  // Derive a sensible end date from duration_days when editing
  const defaultEndDate = initialData?.duration_days
    ? addDaysISO(
        initialData.start_date ?? getTodayISO(),
        initialData.duration_days - 1
      )
    : '';

  const defaultValues: MedicineFormData = {
    name: initialData?.name ?? '',
    dosage: initialData?.dosage ?? '',
    frequency: initialData?.frequency ?? 'daily',
    times_per_day: initialData?.times_per_day ?? 1,
    schedule_times:
      initialData?.schedule_times && initialData.schedule_times.length > 0
        ? initialData.schedule_times
        : ['08:00'],
    duration_days: initialData?.duration_days ?? null,
    start_date: initialData?.start_date ?? getTodayISO(),
    instructions: initialData?.instructions ?? '',
    notes: initialData?.notes ?? '',
    total_quantity: 0,
    low_stock_threshold: 5,
    refill_reminder: true,
    medicine_type: 'tablet',
    meal_relation: 'anytime',
    end_date: defaultEndDate,
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues,
  });

  const scheduleTimes = watch('schedule_times');
  const startDate = watch('start_date');
  const medicineType = watch('medicine_type');
  const mealRelation = watch('meal_relation');

  const handleAddTime = () => {
    const usedTimes = new Set(scheduleTimes);
    const available = TIME_OPTIONS.find((t) => !usedTimes.has(t));
    if (available) {
      setValue('schedule_times', [...scheduleTimes, available]);
      setActiveTimeIndex(scheduleTimes.length);
    }
  };

  const handleRemoveTime = (index: number) => {
    const current = [...scheduleTimes];
    current.splice(index, 1);
    setValue('schedule_times', current);
  };

  const handleTimeChange = (index: number, value: string) => {
    const current = [...scheduleTimes];
    current[index] = value;
    setValue('schedule_times', current);
  };

  const submit = handleSubmit((values) => {
    // Convert the End Date into duration_days for storage
    let duration_days = values.duration_days;
    if (values.end_date) {
      const start = new Date(values.start_date + 'T00:00:00');
      const end = new Date(values.end_date + 'T00:00:00');
      const days =
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      duration_days = Math.max(1, days);
    }
    onSubmit({ ...values, duration_days });
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Medicine Name */}
      <div>
        <input
          type="text"
          placeholder="Medicine Name"
          {...register('name')}
          className="
            w-full h-[52px] px-4 rounded-lg text-[15px] shadow-card
            bg-surface text-text border border-border placeholder:text-text-tertiary
            focus:outline-none focus:ring-[3px] focus:ring-primary/10 focus:border-primary/50
            transition-all duration-200
          "
        />
        {errors.name?.message && (
          <p className="mt-1.5 text-sm text-danger">{errors.name.message}</p>
        )}
      </div>

      {/* Dosage */}
      <div>
        <input
          type="text"
          placeholder="Dosage (e.g. 500mg)"
          {...register('dosage')}
          className="
            w-full h-[52px] px-4 rounded-lg text-[15px] shadow-card
            bg-surface text-text border border-border placeholder:text-text-tertiary
            focus:outline-none focus:ring-[3px] focus:ring-primary/10 focus:border-primary/50
            transition-all duration-200
          "
        />
        {errors.dosage?.message && (
          <p className="mt-1.5 text-sm text-danger">{errors.dosage.message}</p>
        )}
      </div>

      {/* Medicine Type */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">Type</label>
        <div className="flex flex-wrap gap-2">
          {MEDICINE_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('medicine_type', value)}
              className={`
                inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold
                transition-all duration-200
                ${
                  medicineType === value
                    ? 'bg-primary text-white shadow-button'
                    : 'bg-surface text-secondary border border-border hover:border-primary/40'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Meal Relation */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">Meal</label>
        <div className="flex flex-wrap gap-2">
          {MEAL_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('meal_relation', value)}
              className={`
                px-4 py-2 rounded-md text-[13px] font-semibold
                transition-all duration-200
                ${
                  mealRelation === value
                    ? 'bg-primary text-white shadow-button'
                    : 'bg-surface text-secondary border border-border hover:border-primary/40'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="absolute -top-2 left-3 px-1 text-[11px] font-medium text-secondary bg-surface z-10">
            Start Date
          </label>
          <input
            type="date"
            {...register('start_date')}
            className="
              w-full h-[52px] px-3 rounded-lg text-[14px] shadow-card
              bg-surface text-text border border-border
              focus:outline-none focus:ring-[3px] focus:ring-primary/10 focus:border-primary/50
              transition-all duration-200
            "
          />
        </div>
        <div className="relative">
          <label className="absolute -top-2 left-3 px-1 text-[11px] font-medium text-secondary bg-surface z-10">
            End Date
          </label>
          <input
            type="date"
            min={startDate}
            {...register('end_date')}
            className="
              w-full h-[52px] px-3 rounded-lg text-[14px] shadow-card
              bg-surface text-text border border-border
              focus:outline-none focus:ring-[3px] focus:ring-primary/10 focus:border-primary/50
              transition-all duration-200
            "
          />
        </div>
      </div>

      {/* Time */}
      <div>
        <button
          type="button"
          onClick={() => setActiveTimeIndex(0)}
          className="
            w-full h-[52px] px-4 rounded-lg text-[15px] shadow-card
            bg-surface text-text border-border
            flex items-center justify-between
            focus:outline-none focus:ring-[3px] focus:ring-primary/10 focus:border-primary/50
            transition-all duration-200
          "
        >
          <span className="font-medium">
            {format12Hour(scheduleTimes[0] ?? '08:00')}
          </span>
          <Clock className="w-4 h-4 text-text-tertiary" strokeWidth={2} />
        </button>

        {/* Additional times (when editing a multi-time medicine) */}
        {scheduleTimes.length > 1 && (
          <div className="mt-2 space-y-2">
            {scheduleTimes.slice(1).map((time, i) => (
              <div key={i + 1} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTimeIndex(i + 1)}
                  className="
                    flex-1 h-[44px] px-4 rounded-lg text-[14px]
                    bg-surface text-text border border-border
                    flex items-center justify-between
                    transition-all duration-200
                  "
                >
                  <span className="font-medium">{format12Hour(time)}</span>
                  <Clock
                    className="w-4 h-4 text-text-tertiary"
                    strokeWidth={2}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTime(i + 1)}
                  className="p-2 rounded-xl text-danger hover:bg-danger/10 transition-colors"
                  aria-label="Remove time"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}

        {scheduleTimes.length < 6 && (
          <button
            type="button"
            onClick={handleAddTime}
            className="mt-2 text-sm text-primary font-medium flex items-center gap-1 hover:text-primary-dark"
          >
            <Plus className="w-4 h-4" strokeWidth={2} /> Add another time
          </button>
        )}
        {errors.schedule_times?.message && (
          <p className="mt-1.5 text-sm text-danger">
            {errors.schedule_times.message}
          </p>
        )}
      </div>

      {/* Primary Action */}
      <Button type="submit" fullWidth loading={loading}>
        {submitLabel}
      </Button>

      <Modal
        isOpen={activeTimeIndex !== null}
        onClose={() => setActiveTimeIndex(null)}
        title="Select Time"
        centered
      >
        {activeTimeIndex !== null && (
          <TimePickerClock
            value={scheduleTimes[activeTimeIndex]}
            onChange={(t) => handleTimeChange(activeTimeIndex, t)}
            onClose={() => setActiveTimeIndex(null)}
          />
        )}
      </Modal>
    </form>
  );
}