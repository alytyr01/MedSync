import type { KeyboardEvent } from "react";
import { Pill } from "lucide-react";
import type { Medicine } from "@/types";
import { formatTime, formatQuantity, getDaysRemaining } from "@/utils/format";
import { FREQUENCY_LABELS } from "@/constants";

interface MedicineCardProps {
  medicine: Medicine;
  stockRemaining?: number;
  totalStock?: number;
  lowStockThreshold?: number;
  /** Opens the details sheet (overrides the old route navigation) */
  onOpen?: () => void;
}

export function MedicineCard({
  medicine,
  stockRemaining,
  totalStock,
  lowStockThreshold = 5,
  onOpen,
}: MedicineCardProps) {
  const daysRemaining = getDaysRemaining(medicine.end_date);

  const times = medicine.schedule_times ?? [];
  const showStock = stockRemaining !== undefined && !!totalStock;

  const statusTone: Record<string, string> = {
    "In stock": "text-text-secondary",
    "Low stock": "text-yellow-deep",
    "Refill needed": "text-rose-deep",
  };
  const stockStatus = showStock
    ? stockRemaining! <= 5
      ? "Refill needed"
      : stockRemaining! <= lowStockThreshold
        ? "Low stock"
        : "In stock"
    : null;

  const meta = [
    medicine.dosage,
    FREQUENCY_LABELS[medicine.frequency],
    ...times.map(formatTime),
  ]
    .filter(Boolean)
    .join(" · ");

  const open = () => onOpen?.();
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${medicine.name} details`}
      onClick={open}
      onKeyDown={onKeyDown}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none
        hover:bg-surface-muted/70 active:bg-surface-muted transition-colors duration-150"
    >
      {/* Leading icon */}
      <div className="w-9 h-9 rounded-[10px] bg-surface-muted flex items-center justify-center shrink-0">
        <Pill className="w-4 h-4 text-text-secondary" strokeWidth={2} />
      </div>

      {/* Name + one-line meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-text tracking-tight truncate leading-snug">
          {medicine.name}
        </p>
        <p className="text-[12px] text-text-secondary truncate mt-0.5 leading-snug">
          {meta}
        </p>
      </div>

      {/* Trailing stock / duration */}
      <div className="shrink-0 text-right">
        {showStock ? (
          <>
            <p className="text-[13.5px] font-bold text-text tabular-nums leading-none tracking-tight">
              {formatQuantity(stockRemaining!)}
              <span className="text-[11px] font-medium text-text-tertiary">
                {" "}
                /{formatQuantity(totalStock!)}
              </span>
            </p>
            <p
              className={`text-[10.5px] font-medium mt-1 leading-none ${statusTone[stockStatus!]}`}
            >
              {stockStatus}
            </p>
          </>
        ) : (
          <p className="text-[11px] font-medium text-text-tertiary leading-none">
            {daysRemaining !== null ? `${daysRemaining}d left` : "Active"}
          </p>
        )}
      </div>
    </div>
  );
}
