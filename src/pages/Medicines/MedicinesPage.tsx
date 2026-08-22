import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, AlertTriangle, Package } from 'lucide-react';
import { useMedicines, useCreateMedicine } from '@/hooks/useMedicines';
import { useInventory } from '@/hooks/useInventory';
import { PageHeader, Input, Modal, LoadingState, ErrorState, EmptyState } from '@/components/common';
import { MedicineCard } from '@/components/medicine/MedicineCard';
import { MedicineForm } from '@/components/forms/MedicineForm';
import type { MedicineFormData } from '@/utils/validation';

type FilterOption = 'all' | 'active' | 'ending';

interface InventoryWithMedicine {
  id: string;
  medicine_id: string;
  total_quantity: number;
  remaining_quantity: number;
  low_stock_threshold: number;
  refill_reminder: boolean;
  last_refilled_at: string | null;
  medicines?: { name: string; dosage: string } | null;
}

export function MedicinesPage() {
  const { data: medicines, isLoading, error, refetch } = useMedicines();
  const { data: inventory } = useInventory();
  const createMedicine = useCreateMedicine();

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  // Auto-open the Add Medicine modal when arriving with ?add=1
  // (e.g. via the "Add Reminder" button on the home page)
  const [showAddModal, setShowAddModal] = useState(
    () => searchParams.get('add') === '1'
  );

  const inventoryItems = (inventory ?? []) as InventoryWithMedicine[];

  const filteredMedicines = (medicines ?? []).filter((medicine) => {
    const matchesSearch = medicine.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'active') return !medicine.end_date || new Date(medicine.end_date) >= new Date();
    if (filter === 'ending') {
      if (!medicine.end_date) return false;
      const daysLeft = (new Date(medicine.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30;
    }
    return true;
  });

  const lowStockCount = inventoryItems.filter(
    (item) => item.remaining_quantity <= item.low_stock_threshold
  ).length;
  const healthyCount = inventoryItems.filter(
    (item) => item.remaining_quantity > item.low_stock_threshold
  ).length;
  const refillCount = inventoryItems.filter(
    (item) => item.remaining_quantity <= 5
  ).length;

  const handleAddMedicine = async (data: MedicineFormData) => {
    try {
      await createMedicine.mutateAsync(data);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add medicine:', err);
    }
  };

  return (
    <div className="px-3">
      <PageHeader
        title="My Medicines"
        subtitle={`${medicines?.length ?? 0} medicines`}
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light active:scale-95 transition-all duration-200 shadow-button"
            aria-label="Add medicine"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
          </button>
        }
      />

      {/* Premium Search Bar */}
      <div className="mb-5">
        <Input
          search
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-[18px] h-[18px]" strokeWidth={2} />}
        />
      </div>

      {/* Filter chips — pill-shaped */}
      <div className="horizontal-scroll mb-6">
        {(['all', 'active', 'ending'] as FilterOption[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-pill text-[13px] font-semibold transition-all duration-200 shrink-0 ${
              filter === f
                ? 'bg-primary text-white shadow-button'
                : 'bg-surface text-secondary border border-border hover:border-primary/30'
            }`}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Ending Soon'}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState variant="cards" label="Loading medicines..." />}

      {error && (
        <ErrorState
          message="Failed to load medicines"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !error && filteredMedicines.length === 0 && (
        <EmptyState
          title={search ? 'No results found' : 'No medicines yet'}
          description={
            search
              ? `No medicines match "${search}"`
              : 'Add your first medicine to start tracking your medication schedule.'
          }
          action={
            !search ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-sm text-primary font-medium"
              >
                Add Medicine
              </button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !error && filteredMedicines.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {filteredMedicines.map((medicine, index) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              index={index}
            />
          ))}
        </div>
      )}

      {/* ===== Inventory Insights ===== */}
      {!isLoading && !error && (
        <div className="mt-8">
          <h2 className="section-title mb-4">Inventory Insights</h2>
          <div className="premium-card p-6">
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-deep" strokeWidth={2} />
                    <span className="text-[14px] font-medium text-text">Low stock</span>
                  </div>
                  <span className="text-[14px] font-bold text-orange-deep">
                    {lowStockCount}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill bg-warning"
                    style={{ width: `${inventoryItems.length ? (lowStockCount / inventoryItems.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-deep" strokeWidth={2} />
                    <span className="text-[14px] font-medium text-text">Refill needed</span>
                  </div>
                  <span className="text-[14px] font-bold text-blue-deep">
                    {refillCount}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill bg-primary-light"
                    style={{ width: `${inventoryItems.length ? (refillCount / inventoryItems.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-mint-deep" strokeWidth={2} />
                    <span className="text-[14px] font-medium text-text">In stock</span>
                  </div>
                  <span className="text-[14px] font-bold text-mint-deep">
                    {healthyCount}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill bg-success"
                    style={{ width: `${inventoryItems.length ? (healthyCount / inventoryItems.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Medicine"
      >
        <MedicineForm
          onSubmit={handleAddMedicine}
          submitLabel="Add Medicine"
          loading={createMedicine.isPending}
        />
      </Modal>
    </div>
  );
}