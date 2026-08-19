import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactFormData } from '@/utils/validation';
import { Button, Input, Toggle } from '@/components/common';
import type { EmergencyContact } from '@/types';

interface ContactFormProps {
  initialData?: Partial<EmergencyContact>;
  onSubmit: (data: ContactFormData) => void;
  submitLabel?: string;
  loading?: boolean;
}

export function ContactForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Contact',
  loading = false,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      phone: initialData?.phone ?? '',
      relationship: initialData?.relationship ?? '',
      is_primary: initialData?.is_primary ?? false,
    },
  });

  const isPrimary = watch('is_primary');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Full Name"
        placeholder="e.g. Jane Smith"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Phone Number"
        type="tel"
        placeholder="e.g. (555) 123-4567"
        error={errors.phone?.message}
        {...register('phone')}
      />

      <Input
        label="Relationship"
        placeholder="e.g. Spouse, Parent, Doctor"
        error={errors.relationship?.message}
        {...register('relationship')}
      />

      <div className="py-2 border-t border-border">
        <Toggle
          checked={isPrimary}
          onChange={(checked) => setValue('is_primary', checked)}
          label="Primary Emergency Contact"
          description="Mark as your primary contact for quick access"
        />
      </div>

      <Button type="submit" fullWidth loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}