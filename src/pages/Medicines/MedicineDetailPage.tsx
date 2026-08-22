import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Edit2, Clock, CalendarDays, Package, AlertTriangle, Pill, RefreshCw } from 'lucide-react';
import { useMedicine, useUpdateMedicine, useDeleteMedicine } from '@/hooks/useMedicines';
import { useInventory, useRefillInventory } from '@/hooks/useInventory';
import {
  BackHeader,
  Badge,
  LoadingState,
  ErrorState,
  Modal,
  Button,
} from '@/components/common';
import { MedicineForm } from '@/components/forms/MedicineForm';
import { formatTime, formatDate, getDaysRemaining } from '@/utils/format';
import { FREQUENCY_LABELS } from '@/constants';
import type { MedicineFormData } from '@/utils/validation';

export function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: medicine, isLoading, error, refetch } = useMedicine(id);
  const { data: inventoryItems } = useInventory();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();
  const refill = useRefillInventory();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);

  const inventory = inventoryItems?.find(
    (item) => item.medicine_id === medicine?.id
  );

  const daysRemaining = medicine ? getDaysRemaining(medicine.end_date) : null;
  const stockPercent = inventory
    ? Math.min(
        100,
        (inventory.remaining_quantity / Math.max(1, inventory.total_quantity)) *
          100
      )
    : 0;

  const handleUpdate = async (data: MedicineFormData) => {
    if (!medicine) return;
    try {
      await updateMedicine.mutateAsync({
        id: medicine.id,
        values: data,
      });
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update medicine:', err);
    }
  };

  const handleDelete = async () => {
    if (!medicine) return;
    try {
      await deleteMedicine.mutateAsync(medicine.id);
      navigate('/medicines');
    } catch (err) {
      console.error('Failed to delete medicine:', err);
    }
  };

  const handleRefill = async () => {
    if (!inventory || !medicine) return;
    try {
      await refill.mutateAsync({
        id: inventory.id,
        quantity: inventory.total_quantity,
      });
      setShowRefillModal(false);
    } catch (err) {
      console.error('Failed to refill:', err);
    }
  };

  if (isLoading) return <LoadingState label="Loading medicine..." />;

  if (error || !medicine) {
    return (
      <>
        <BackHeader title="Medicine" onBack={() => navigate('/medicines')} />
        <ErrorState
          message="Failed to load medicine details"
          onRetry={() => refetch()}
        />
      </>
    );
  }

  return (
    <div className="px-3">
      <BackHeader
        title="Medicine Details"
        onBack={() => navigate('/medicines')}
        action={
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-danger hover:bg-danger/10 transition-colors"
            aria-label="Delete medicine"
          >
            <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        }
      />

      <div className="space-y-4">
        {/* Medicine Info Card */}
        <div className="premium-card p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-[12px] bg-pastel-mint flex items-center justify-center shrink-0">
                  <Pill className="w-6 h-6 text-mint-deep" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-[26px] font-bold text-text tracking-tight leading-tight">
                    {medicine.name}
                  </h1>
                  <p className="text-[15px] text-secondary mt-1">
                    {medicine.dosage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="info">
                  {FREQUENCY_LABELS[medicine.frequency]}
                </Badge>
                {daysRemaining !== null && daysRemaining <= 7 && (
                  <Badge variant="warning" dot>
                    Ending soon
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-border-subtle space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-secondary">
                <Clock className="w-[15px] h-[15px]" strokeWidth={2} />
                Schedule
              </span>
              <span className="font-semibold text-text">
                {medicine.schedule_times.map(formatTime).join(', ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-secondary">
                <CalendarDays className="w-[15px] h-[15px]" strokeWidth={2} />
                Start Date
              </span>
              <span className="font-semibold text-text">
                {formatDate(medicine.start_date)}
              </span>
            </div>
            {medicine.end_date && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-secondary">
                  <CalendarDays className="w-[15px] h-[15px]" strokeWidth={2} />
                  End Date
                </span>
                <span className="font-semibold text-text">
                  {formatDate(medicine.end_date)}
                </span>
              </div>
            )}
            {daysRemaining !== null && (
              <div className="flex items-center justify-between">
                <span className="text-secondary">Remaining</span>
                <span className="font-semibold text-text">
                  {daysRemaining} days
                </span>
              </div>
            )}
          </div>

          {medicine.instructions && (
            <div className="mt-5 p-4 rounded-[14px] bg-blue-soft">
              <p className="text-[13px] text-blue-deep">
                <span className="font-semibold">Instructions: </span>
                {medicine.instructions}
              </p>
            </div>
          )}

          {medicine.notes && (
            <div className="mt-3 p-4 rounded-[14px] bg-surface-muted">
              <p className="text-[13px] text-secondary">
                <span className="font-semibold text-text">Notes: </span>
                {medicine.notes}
              </p>
            </div>
          )}
        </div>

        {/* Inventory Card */}
        {inventory && (
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-[18px] font-semibold text-text tracking-tight">
                <Package className="w-[18px] h-[18px] text-primary" strokeWidth={2} />
                Inventory
              </h2>
              {inventory.remaining_quantity <=
                inventory.low_stock_threshold && (
                <Badge variant="warning" dot>
                  <AlertTriangle className="w-3 h-3" strokeWidth={2} /> Low Stock
                </Badge>
              )}
            </div>
            <div>
              <div className="text-[36px] font-bold text-text tracking-tight">
                {inventory.remaining_quantity}
                <span className="text-sm font-normal text-secondary ml-1.5">
                  / {inventory.total_quantity} tablets
                </span>
              </div>
              <div className="w-full mt-4 progress-track">
                <div
                  className={`progress-fill ${
                    stockPercent <= 20 ? 'bg-warning' : 'bg-primary'
                  }`}
                  style={{ width: `${stockPercent}%` }}
                />
              </div>
            </div>

            <Button
              onClick={() => setShowRefillModal(true)}
              fullWidth
              className="mt-6 min-h-[56px]"
            >
              <RefreshCw className="w-5 h-5" strokeWidth={2} />
              Refill
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          fullWidth
          onClick={() => setShowEditModal(true)}
          className="min-h-[56px]"
        >
          <Edit2 className="w-4 h-4" strokeWidth={2} /> Edit Medicine
        </Button>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Medicine"
      >
        <MedicineForm
          initialData={medicine}
          onSubmit={handleUpdate}
          submitLabel="Save Changes"
          loading={updateMedicine.isPending}
        />
      </Modal>

      {/* Refill Modal */}
      <Modal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        title="Refill Medicine"
      >
        <div className="space-y-5">
          <div className="p-4 rounded-[12px] bg-mint-soft">
            <p className="text-[15px] font-semibold text-mint-deep">
              {medicine.name}
            </p>
            <p className="text-[13px] text-mint-deep/70 mt-0.5">
              Stock will be restored to {inventory?.total_quantity} tablets
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowRefillModal(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleRefill}
              loading={refill.isPending}
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2} /> Refill
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Medicine"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-text">{medicine.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleDelete}
              loading={deleteMedicine.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}