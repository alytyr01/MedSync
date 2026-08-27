import { useState } from "react";
import type { ReactNode } from "react";
import { X, Pill, Edit2, RefreshCw } from "lucide-react";
import type { Medicine } from "@/types";
import { useUpdateMedicine, useDeleteMedicine } from "@/hooks/useMedicines";
import { useInventory, useRefillInventory } from "@/hooks/useInventory";
import { Modal, Button, Input } from "@/components/common";
import { MedicineForm } from "@/components/forms/MedicineForm";
import {
  getDaysRemaining,
  formatTime,
  formatQuantity,
} from "@/utils/format";
import { FREQUENCY_LABELS } from "@/constants";
import type { MedicineFormData } from "@/utils/validation";

/* Full-bleed hairline divider — breaks out of the card's horizontal padding */
function Divider() {
  return <div className="h-px -mx-5 bg-border-subtle" />;
}

/* Tiny uppercase eyebrow label shared by every micro-section */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-text-tertiary">
      {children}
    </p>
  );
}

/* One cell of the header stat trio */
function MetaCell({
  label,
  value,
  sub,
  subClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  subClassName?: string;
}) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-[15px] font-semibold tracking-tight text-text leading-tight break-words">
        {value}
      </p>
      {sub && (
        <p className={`text-[10.5px] font-medium mt-0.5 leading-none ${subClassName ?? ""}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* Quiet labelled paragraph for longer copy (instructions, notes) */
function TextBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="text-[13.5px] text-text leading-relaxed mt-1 whitespace-pre-line break-words">
        {children}
      </p>
    </div>
  );
}

/* Compact month/day renderer — "Aug 4" */
function dayMonth(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface MedicineDetailSheetProps {
  /** Live medicine record — pass null to keep it closed */
  medicine: Medicine | null;
  onClose: () => void;
}

/**
 * Compact centered medicine-details card over a dimmed backdrop.
 * Opens/closes instantly — no entrance or exit animation.
 * All mutations happen here; the owning page passes the live record.
 */
export function MedicineDetailSheet({
  medicine,
  onClose,
}: MedicineDetailSheetProps) {
  const { data: inventoryItems } = useInventory();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();
  const refill = useRefillInventory();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  // User-editable refill amount — pre-filled with full stock when opening
  const [refillQuantity, setRefillQuantity] = useState("");

  const inventory = medicine
    ? inventoryItems?.find((item) => item.medicine_id === medicine.id)
    : undefined;

  const daysRemaining = medicine ? getDaysRemaining(medicine.end_date) : null;

  const stockPercent = inventory
    ? Math.min(
        100,
        Math.round(
          (inventory.remaining_quantity /
            Math.max(1, inventory.total_quantity)) *
            100,
        ),
      )
    : 0;

  // Course days-left caption shown under the "Ends" cell
  const daysLeftSub =
    daysRemaining === null
      ? undefined
      : daysRemaining === 0
        ? "Final day"
        : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;

  const daysLeftTone =
    daysRemaining === 0
      ? "text-danger"
      : daysRemaining !== null && daysRemaining <= 7
        ? "text-warning"
        : "";

  // Refill form parsing / validation
  const parsedRefill = parseInt(refillQuantity, 10);
  const refillValid = !isNaN(parsedRefill) && parsedRefill > 0;
  const refillError =
    refillQuantity.trim() !== "" && !refillValid
      ? "Enter a positive whole number"
      : undefined;

  const handleUpdate = async (data: MedicineFormData) => {
    if (!medicine) return;
    try {
      await updateMedicine.mutateAsync({ id: medicine.id, values: data });
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update medicine:", err);
    }
  };

  const handleDelete = async () => {
    if (!medicine) return;
    try {
      await deleteMedicine.mutateAsync(medicine.id);
      setShowDeleteModal(false);
      onClose();
    } catch (err) {
      console.error("Failed to delete medicine:", err);
    }
  };

  // Opens the refill modal pre-filled with the current full-stock amount
  const openRefill = () => {
    if (!inventory) return;
    setRefillQuantity(String(inventory.total_quantity));
    setShowRefillModal(true);
  };

  const closeRefill = () => {
    setShowRefillModal(false);
    setRefillQuantity("");
  };

  const handleRefill = async () => {
    if (!inventory || !medicine || !refillValid) return;
    try {
      await refill.mutateAsync({
        id: inventory.id,
        quantity: parsedRefill,
      });
      closeRefill();
    } catch (err) {
      console.error("Failed to refill:", err);
    }
  };

  return (
    <>
      {/* ===== Details — compact centered card, instant open/close (no animation) ===== */}
      {medicine && (
        <div className="fixed inset-0 z-50">
          {/* Dimmed backdrop */}
          <div
            className="absolute inset-0 bg-black/35"
            style={{ backdropFilter: "blur(3px)" }}
          />
          {/* Scroll host + tap-to-dismiss */}
          <div
            className="absolute inset-0 overflow-y-auto overscroll-contain flex px-5 py-8"
            onClick={onClose}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Details for ${medicine.name}`}
              onClick={(e) => e.stopPropagation()}
              className="m-auto w-full max-w-sm bg-surface rounded-[28px] shadow-modal"
            >
              <div className="px-5 pt-5">
                {/* Header — icon chip · name · dosage · close */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-[14px] bg-surface-muted flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-secondary" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-semibold text-text tracking-tight truncate leading-snug">
                      {medicine.name}
                    </h3>
                    {medicine.dosage && (
                      <p className="text-[12.5px] text-text-secondary truncate mt-0.5 leading-snug">
                        {medicine.dosage}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close details"
                    className="w-8 h-8 -mr-1 shrink-0 rounded-full bg-surface-muted flex items-center justify-center hover:bg-border/70 active:scale-95 transition-all duration-150"
                  >
                    <X className="w-4 h-4 text-secondary" strokeWidth={2} />
                  </button>
                </div>

                <Divider />

                {/* Meta zone — schedule trio + alarm-time chips */}
                <div className="py-3.5">
                  <div className="grid grid-cols-3 divide-x divide-border-subtle">
                    <MetaCell
                      label="Schedule"
                      value={FREQUENCY_LABELS[medicine.frequency]}
                    />
                    <MetaCell
                      label="Reminders"
                      value={`${medicine.schedule_times.length || medicine.times_per_day}/day`}
                    />
                    <MetaCell
                      label="Ends"
                      value={
                        medicine.end_date
                          ? dayMonth(medicine.end_date)
                          : "No end date"
                      }
                      sub={daysLeftSub}
                      subClassName={daysLeftTone}
                    />
                  </div>

                  {medicine.schedule_times.length > 0 && (
                    <div className="mt-3.5">
                      <Eyebrow>Daily doses</Eyebrow>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {medicine.schedule_times.map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 rounded-pill bg-surface-muted text-[11.5px] font-semibold text-text tabular-nums whitespace-nowrap"
                          >
                            {formatTime(t)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Supplemental zone — stock · instructions · notes */}
                {(inventory || medicine.instructions || medicine.notes) && (
                  <div className="pb-5 pt-3.5 space-y-3.5">
                    {inventory && (
                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <p className="text-[20px] font-bold text-text tracking-tight leading-none tabular-nums">
                            {formatQuantity(inventory.remaining_quantity)}
                            <span className="text-[12px] font-medium text-text-tertiary ml-1 tracking-normal">
                              of {formatQuantity(inventory.total_quantity)} left
                            </span>
                          </p>
                          <span className="text-[13px] font-semibold text-text-secondary tabular-nums pb-0.5 shrink-0">
                            {stockPercent}%
                          </span>
                        </div>
                        <div
                          className="w-full mt-2.5 progress-track"
                          role="progressbar"
                          aria-valuenow={stockPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Stock remaining: ${inventory.remaining_quantity} of ${inventory.total_quantity} tablets`}
                        >
                          <div
                            className="progress-fill bg-primary"
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {medicine.instructions && (
                      <TextBlock label="Instructions">
                        {medicine.instructions}
                      </TextBlock>
                    )}

                    {medicine.notes && (
                      <TextBlock label="Notes">{medicine.notes}</TextBlock>
                    )}
                  </div>
                )}

                {/* Actions footer — edge-to-edge hairline separates it from content */}
                <div className="-mx-5 mt-0 border-t border-border-subtle px-5 pt-4 pb-5">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit2 className="w-4 h-4" strokeWidth={2} /> Edit
                    </Button>
                    {inventory && (
                      <Button
                        size="sm"
                        fullWidth
                        onClick={openRefill}
                        loading={refill.isPending}
                      >
                        <RefreshCw className="w-4 h-4" strokeWidth={2} />{" "}
                        Refill
                      </Button>
                    )}
                  </div>
                  {/* Destructive action — solid danger button per design system */}
                  <div className="mt-2.5">
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete Medicine
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sibling overlays — render after the screen so they stack above it */}
      {medicine && (
        <>
          {/* Edit */}
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

          {/* Refill */}
          <Modal
            isOpen={showRefillModal}
            onClose={closeRefill}
            title="Refill Medicine"
          >
            <div className="space-y-4">
              {/* Live stock context */}
              <div className="rounded-[16px] bg-surface-muted px-4 py-3">
                <p className="text-[14.5px] font-semibold text-text tracking-tight truncate">
                  {medicine.name}
                </p>
                <p className="text-[12px] text-text-secondary mt-0.5 leading-snug">
                  Currently {formatQuantity(inventory?.remaining_quantity ?? 0)}{" "}
                  left of {formatQuantity(inventory?.total_quantity ?? 0)}
                </p>
              </div>

              {/* Editable refill amount */}
              <Input
                label="New quantity"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={refillQuantity}
                onChange={(e) => setRefillQuantity(e.target.value)}
                placeholder={`e.g. ${inventory?.total_quantity ?? 60}`}
                error={refillError}
                hint={
                  refillError
                    ? undefined
                    : "Sets your stock (on-hand and total) to this amount."
                }
              />

              <div className="flex gap-3 pt-1">
                <Button variant="outline" fullWidth onClick={closeRefill}>
                  Cancel
                </Button>
                <Button
                  fullWidth
                  onClick={handleRefill}
                  loading={refill.isPending}
                  disabled={!refillValid}
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={2} /> Refill
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete confirmation */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Delete Medicine"
          >
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-text">{medicine.name}</span>
                ? This action cannot be undone.
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
        </>
      )}
    </>
  );
}
