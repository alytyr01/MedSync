import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pill, Plus, Search } from "lucide-react";
import { useMedicines, useCreateMedicine } from "@/hooks/useMedicines";
import { useInventory } from "@/hooks/useInventory";
import { Input, Modal, ErrorState, EmptyState, LoadingState } from "@/components/common";
import { MedicineCard } from "@/components/medicine/MedicineCard";
import { MedicineDetailSheet } from "@/components/medicine/MedicineDetailSheet";
import { MedicineForm } from "@/components/forms/MedicineForm";
import type { MedicineFormData } from "@/utils/validation";

type FilterOption = "all" | "active" | "ending";

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  // Auto-open the Add Medicine modal when arriving with ?add=1
  // (e.g. via the "Add Reminder" button on the home page)
  const [showAddModal, setShowAddModal] = useState(
    () => searchParams.get("add") === "1",
  );
  // Selected card opens the bottom-sheet details (no navigation)
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(
    null,
  );

  const inventoryItems = (inventory ?? []) as InventoryWithMedicine[];

  // Derive from the live list so edits/deletes reflect instantly in the sheet
  const selectedMedicine =
    (medicines ?? []).find((m) => m.id === selectedMedicineId) ?? null;

  const filteredMedicines = (medicines ?? []).filter((medicine) => {
    const matchesSearch = medicine.name
      .toLowerCase()
      .includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === "all") return true;
    if (filter === "active")
      return !medicine.end_date || new Date(medicine.end_date) >= new Date();
    if (filter === "ending") {
      if (!medicine.end_date) return false;
      const daysLeft =
        (new Date(medicine.end_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      return daysLeft <= 30;
    }
    return true;
  });

  // Courses still running (no end date, or ending today or later)
  const activeCourseCount = (medicines ?? []).filter(
    (m) => !m.end_date || new Date(m.end_date) >= new Date(),
  ).length;

  // Inventory lookup per medicine (for stock bars on cards)
  const inventoryByMedicine = new Map(
    inventoryItems.map((item) => [item.medicine_id, item]),
  );

  const filterTabs: { key: FilterOption; label: string; count: number }[] = [
    { key: "all", label: "All", count: (medicines ?? []).length },
    { key: "active", label: "Active", count: activeCourseCount },
    {
      key: "ending",
      label: "Ending soon",
      count: (medicines ?? []).filter((medicine) => {
        if (!medicine.end_date) return false;
        return (
          (new Date(medicine.end_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24) <=
          30
        );
      }).length,
    },
  ];

  const handleAddMedicine = async (data: MedicineFormData) => {
    try {
      await createMedicine.mutateAsync(data);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add medicine:", err);
    }
  };

  return (
    <div className="px-3">
      {/* ===== Hero Header ===== */}
      <header className="pt-7 pb-5">
        <p className="eyebrow mb-1.5">Medicine Cabinet</p>
        <h1 className="text-[28px] font-bold text-text tracking-tight leading-tight">
          My Medicines
        </h1>
      </header>

      {/* ===== Search ===== */}
      <div className="mb-4">
        <Input
          search
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-[18px] h-[18px]" strokeWidth={2} />}
        />
      </div>

      {/* ===== Filter pills with live counts ===== */}
      <div className="horizontal-scroll -mx-3 px-3 mb-7">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-pill text-[13px] font-semibold transition-all duration-200 active:scale-95 ${
              filter === tab.key
                ? "bg-primary text-white shadow-button"
                : "bg-surface text-secondary border border-border shadow-card hover:border-primary/30"
            }`}
          >
            {tab.label}
            <span
              className={`min-w-5 text-center text-[11px] px-1.5 py-0.5 rounded-pill ${
                filter === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-surface-muted text-secondary"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading && <LoadingState label="Loading medicines..." />}

      {error && (
        <ErrorState
          message="Failed to load medicines"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !error && filteredMedicines.length === 0 && (
        <EmptyState
          icon={<Pill className="w-7 h-7 text-primary" strokeWidth={2} />}
          title={search ? "No results found" : "No medicines yet"}
          description={
            search
              ? `No medicines match "${search}"`
              : "Add your first medicine to start tracking your medication schedule."
          }
          action={
            !search ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-pill bg-primary text-white text-sm font-semibold shadow-button active:scale-95 transition-all duration-200"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                Add Medicine
              </button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !error && filteredMedicines.length > 0 && (
        <div className="premium-card overflow-hidden divide-y divide-border-subtle">
          {filteredMedicines.map((medicine) => {
            const inv = inventoryByMedicine.get(medicine.id);
            return (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                stockRemaining={inv?.remaining_quantity}
                totalStock={inv?.total_quantity}
                lowStockThreshold={inv?.low_stock_threshold}
                onOpen={() => setSelectedMedicineId(medicine.id)}
              />
            );
          })}
        </div>
      )}

      {/* Extra breathing room so content clears the floating Add + Scan stack */}
      <div className="h-6" />

      {/* ===== Floating Add button — stacked above the Scan nav item ===== */}
      <div
        className="fixed inset-x-0 z-30"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
      >
        <div className="max-w-md mx-auto px-4 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-16 h-16 bg-primary text-white rounded-[18px] shadow-float ring-1 ring-white/10 flex items-center justify-center hover:bg-primary-light active:scale-95 transition-all duration-200"
            aria-label="Add medicine"
          >
            <Plus className="w-7 h-7" strokeWidth={2} />
          </button>
        </div>
      </div>

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

      {/* ===== Medicine details bottom sheet ===== */}
      <MedicineDetailSheet
        medicine={selectedMedicine}
        onClose={() => setSelectedMedicineId(null)}
      />
    </div>
  );
}
