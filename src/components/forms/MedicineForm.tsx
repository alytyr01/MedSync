import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicineSchema, type MedicineFormData } from '@/utils/validation';
import { Button, Input, Select, Textarea } from '@/components/common';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { getTodayISO } from '@/utils/format';
import { TIME_OPTIONS } from '@/constants';
import type { Medicine } from '@/types';

interface MedicineFormProps {
  initialData?: Partial<Medicine>;
  onSubmit: (data: MedicineFormData) => void;
  submitLabel?: string;
  loading?: boolean;
}

export function MedicineForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Medicine',
  loading = false,
}: MedicineFormProps) {
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

  const frequency = watch('frequency');
  const timesPerDay = watch('times_per_day');
  const scheduleTimes = watch('schedule_times');

  const handleTimesPerDay = (n: number) => {
    setValue('times_per_day', n);
    const current = [...scheduleTimes];
    while (current.length < n) {
      const used = new Set(current);
      const next = TIME_OPTIONS.find((t) => !used.has(t));
      if (next) current.push(next);
      else break;
    }
    while (current.length > n) current.pop();
    setValue('schedule_times', current);
  };

  const handleAddTime = () => {
    const usedTimes = new Set(scheduleTimes);
    const available = TIME_OPTIONS.find((t) => !usedTimes.has(t));
    if (available) {
      setValue('schedule_times', [...scheduleTimes, available]);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Medicine Name"
        placeholder="e.g. Amoxicillin"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Dosage"
        placeholder="e.g. 500mg"
        error={errors.dosage?.message}
        {...register('dosage')}
      />

      <Select
        label="Frequency"
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'as_needed', label: 'As Needed' },
        ]}
        error={errors.frequency?.message}
        {...register('frequency')}
      />

      {frequency === 'daily' && (
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Times Per Day
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleTimesPerDay(n)}
                className={`
                  flex-1 py-2 rounded-xl border text-sm font-medium
                  transition-colors duration-200
                  ${timesPerDay === n
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-secondary border-border hover:border-primary/50'}
                `}
              >
                {n}x
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-text">
            Schedule Times
          </label>
          <button
            type="button"
            onClick={handleAddTime}
            className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary-dark"
          >
            <FiPlus className="w-4 h-4" /> Add Time
          </button>
        </div>
        <div className="space-y-2">
          {scheduleTimes.map((time, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={time}
                onChange={(e) => handleTimeChange(index, e.target.value)}
                options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
              />
              <button
                type="button"
                onClick={() => handleRemoveTime(index)}
                className="p-2.5 rounded-xl text-danger hover:bg-danger/10 transition-colors"
                aria-label="Remove time"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {errors.schedule_times?.message && (
          <p className="mt-1.5 text-sm text-danger">
            {errors.schedule_times.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          error={errors.start_date?.message}
          {...register('start_date')}
        />
        <Input
          label="Duration (days)"
          type="number"
          placeholder="Optional"
          min={1}
          error={errors.duration_days?.message}
          {...register('duration_days', {
            setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
          })}
        />
      </div>

      <Textarea
        label="Instructions"
        placeholder="e.g. Take with food"
        rows={3}
        error={errors.instructions?.message}
        {...register('instructions')}
      />

      <Textarea
        label="Notes"
        placeholder="Additional notes..."
        rows={2}
        error={errors.notes?.message}
        {...register('notes')}
      />

      <Button type="submit" fullWidth loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}