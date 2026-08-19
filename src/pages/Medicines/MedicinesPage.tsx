import { useState } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useMedicines, useCreateMedicine } from '@/hooks/useMedicines';
import { PageHeader, Input, Modal, LoadingState, ErrorState, EmptyState } from '@/components/common';
import { MedicineCard } from '@/components/medicine/MedicineCard';
import { MedicineForm } from '@/components/forms/MedicineForm';
import type { MedicineFormData } from '@/utils/validation';
import { motion } from 'framer-motion';

type FilterOption = 'all' | 'active' | 'ending';

export function MedicinesPage() {
  const { data: medicines, isLoading, error, refetch } = useMedicines();
  const createMedicine = useCreateMedicine();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleAddMedicine = async (data: MedicineFormData) => {
    try {
      await createMedicine.mutateAsync(data);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add medicine:', err);
    }
  };

  return (
    <div className="px-5">
      <PageHeader
        title="Medicines"
        subtitle={`${medicines?.length ?? 0} medicines`}
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover active:scale-95 transition-all duration-200 shadow-[0_2px_10px_rgba(15,118,110,0.25)]"
            aria-label="Add medicine"
          >
            <FiPlus className="w-5 h-5" />
          </button>
        }
      />

      {/* Premium Search Bar */}
      <div className="mb-4">
        <Input
          search
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<FiSearch className="w-[18px] h-[18px]" />}
        />
      </div>

      {/* Filter chips */}
      <div className="horizontal-scroll mb-6">
        {(['all', 'active', 'ending'] as FilterOption[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 shrink-0 ${
              filter === f
                ? 'bg-primary text-white shadow-[0_2px_8px_rgba(15,118,110,0.2)]'
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
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredMedicines.map((medicine, index) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              index={index}
            />
          ))}
        </motion.div>
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

