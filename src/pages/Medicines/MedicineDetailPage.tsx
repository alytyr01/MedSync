import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiTrash2, FiEdit2, FiClock, FiCalendar, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useMedicine, useUpdateMedicine, useDeleteMedicine } from '@/hooks/useMedicines';
import { useInventory } from '@/hooks/useInventory';
import {
  BackHeader,
  Card,
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const inventory = inventoryItems?.find(
    (item) => item.medicine_id === medicine?.id
  );

  const daysRemaining = medicine ? getDaysRemaining(medicine.end_date) : null;

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
    <div className="px-5">
      <BackHeader
        title="Medicine Details"
        onBack={() => navigate('/medicines')}
        action={
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-danger hover:bg-danger/10 transition-colors"
            aria-label="Delete medicine"
          >
            <FiTrash2 className="w-[18px] h-[18px]" />
          </button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Medicine Info Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-bold text-text tracking-tight">
                {medicine.name}
              </h1>
              <div className="flex items-center gap-2 mt-2.5">
                <Badge variant="info">{medicine.dosage}</Badge>
                <Badge variant="neutral">
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

          <div className="mt-5 pt-5 border-t border-border-subtle space-y-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-secondary">
                <FiClock className="w-[15px] h-[15px]" />
                Schedule
              </span>
              <span className="font-medium text-text">
                {medicine.schedule_times.map(formatTime).join(', ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-secondary">
                <FiCalendar className="w-[15px] h-[15px]" />
                Start Date
              </span>
              <span className="font-medium text-text">
                {formatDate(medicine.start_date)}
              </span>
            </div>
            {medicine.end_date && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-secondary">
                  <FiCalendar className="w-[15px] h-[15px]" />
                  End Date
                </span>
                <span className="font-medium text-text">
                  {formatDate(medicine.end_date)}
                </span>
              </div>
            )}
            {daysRemaining !== null && (
              <div className="flex items-center justify-between">
                <span className="text-secondary">Remaining</span>
                <span className="font-medium text-text">
                  {daysRemaining} days
                </span>
              </div>
            )}
          </div>

          {medicine.instructions && (
            <div className="mt-5 p-3.5 rounded-[14px] bg-primary-faint">
              <p className="text-[13px] text-primary-dark">
                <span className="font-semibold">Instructions: </span>
                {medicine.instructions}
              </p>
            </div>
          )}

          {medicine.notes && (
            <div className="mt-3 p-3.5 rounded-[14px] bg-surface-muted">
              <p className="text-[13px] text-secondary">
                <span className="font-semibold text-text">Notes: </span>
                {medicine.notes}
              </p>
            </div>
          )}
        </Card>

        {/* Inventory Card */}
        {inventory && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-[17px] font-semibold text-text tracking-tight">
                <FiPackage className="w-[18px] h-[18px] text-primary" />
                Inventory
              </h2>
              {inventory.remaining_quantity <=
                inventory.low_stock_threshold && (
                <Badge variant="warning" dot>
                  <FiAlertTriangle className="w-3 h-3" /> Low Stock
                </Badge>
              )}
            </div>
            <div>
              <div className="text-3xl font-bold text-text tracking-tight">
                {inventory.remaining_quantity}
                <span className="text-sm font-normal text-secondary ml-1.5">
                  / {inventory.total_quantity} tablets
                </span>
              </div>
              <div className="w-full mt-3 bg-surface-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    inventory.remaining_quantity <=
                    inventory.low_stock_threshold
                      ? 'bg-warning'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (inventory.remaining_quantity /
                        Math.max(1, inventory.total_quantity)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        <Button
          variant="outline"
          fullWidth
          onClick={() => setShowEditModal(true)}
          className="min-h-[52px]"
        >
          <FiEdit2 className="w-4 h-4" /> Edit Medicine
        </Button>
      </motion.div>

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