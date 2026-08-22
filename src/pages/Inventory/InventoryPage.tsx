import { useState } from 'react';
import { RefreshCw, AlertTriangle, Package, TrendingUp, Clock3, XCircle, Sparkles } from 'lucide-react';
import { useInventory, useRefillInventory } from '@/hooks/useInventory';
import {
  PageHeader,
  Card,
  Badge,
  Modal,
  Input,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';

interface InventoryWithMedicine {
  id: string;
  medicine_id: string;
  total_quantity: number;
  remaining_quantity: number;
  low_stock_threshold: number;
  refill_reminder: boolean;
  last_refilled_at: string | null;
  medicines?: {
    name: string;
    dosage: string;
  } | null;
}

export function InventoryPage() {
  const { data: inventory, isLoading, error, refetch } = useInventory();
  const refill = useRefillInventory();

  const [refillItem, setRefillItem] = useState<InventoryWithMedicine | null>(
    null
  );
  const [refillQuantity, setRefillQuantity] = useState('');

  const items = (inventory ?? []) as InventoryWithMedicine[];

  const lowStockItems = items.filter(
    (item) => item.remaining_quantity <= item.low_stock_threshold
  );
  const healthyItems = items.filter(
    (item) => item.remaining_quantity > item.low_stock_threshold
  );

  // AI Health Summary calculations
  const adherenceScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        healthyItems.length > 0
          ? (healthyItems.length / Math.max(1, items.length)) * 100
          : 0
      )
    )
  );

  const CIRCLE_R = 62;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
  const circleOffset = CIRCUMFERENCE * (1 - adherenceScore / 100);

  const handleRefill = async () => {
    if (!refillItem) return;
    const quantity = parseInt(refillQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) return;

    try {
      await refill.mutateAsync({
        id: refillItem.id,
        quantity,
      });
      setRefillItem(null);
      setRefillQuantity('');
    } catch (err) {
      console.error('Failed to refill inventory:', err);
    }
  };

  if (isLoading) return <LoadingState variant="cards" label="Loading insights..." />;

  if (error) {
    return (
      <ErrorState
        message="Failed to load inventory"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="px-3">
      <PageHeader
        title="Health Summary"
        subtitle="AI-powered medication insights"
      />

      {items.length === 0 ? (
        <EmptyState
          title="No inventory yet"
          description="Add medicines to start tracking your stock levels."
        />
      ) : (
        <div className="space-y-8">
          {/* ===== AI Health Summary - Circular Score ===== */}
          <div className="premium-card p-7 text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} />
              <span className="text-[13px] font-semibold text-primary uppercase tracking-wider">
                AI Health Summary
              </span>
            </div>

            <div className="relative w-[150px] h-[150px] mx-auto">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle
                  cx="75"
                  cy="75"
                  r={CIRCLE_R}
                  fill="none"
                  stroke="rgba(15, 118, 110, 0.06)"
                  strokeWidth="10"
                />
                <circle
                  cx="75"
                  cy="75"
                  r={CIRCLE_R}
                  fill="none"
                  stroke="#0F766E"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={circleOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[44px] font-bold text-text tracking-tight leading-none">
                  {adherenceScore}
                </span>
                <span className="text-[12px] text-secondary mt-1.5 font-medium">
                  Adherence
                </span>
              </div>
            </div>

            <p className="text-[15px] text-secondary mt-5 leading-relaxed max-w-xs mx-auto">
              Your medication inventory is in great shape. Keep it up!
            </p>
          </div>

          {/* ===== Summary Metrics ===== */}
          <div>
            <h2 className="section-title mb-4">Summary</h2>
            <div className="premium-card p-6">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[10px] bg-mint-soft flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-mint-deep" strokeWidth={2} />
                      </div>
                      <span className="text-[14px] font-medium text-text">
                        Medication consistency
                      </span>
                    </div>
                    <span className="text-[15px] font-bold text-mint-deep">
                      {adherenceScore}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill bg-success"
                      style={{ width: `${adherenceScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[10px] bg-rose-soft flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-rose-deep" strokeWidth={2} />
                      </div>
                      <span className="text-[14px] font-medium text-text">
                        Items low on stock
                      </span>
                    </div>
                    <span className="text-[15px] font-bold text-rose-deep">
                      {lowStockItems.length}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill bg-danger"
                      style={{ width: `${items.length ? (lowStockItems.length / items.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[10px] bg-yellow-soft flex items-center justify-center">
                        <Clock3 className="w-4 h-4 text-yellow-deep" strokeWidth={2} />
                      </div>
                      <span className="text-[14px] font-medium text-text">
                        Refill needed
                      </span>
                    </div>
                    <span className="text-[15px] font-bold text-yellow-deep">
                      {lowStockItems.filter((i) => i.remaining_quantity <= 5).length}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill bg-warning"
                      style={{ width: `${items.length ? (lowStockItems.filter((i) => i.remaining_quantity <= 5).length / items.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button fullWidth className="mt-6 min-h-[56px]">
              <Sparkles className="w-5 h-5" strokeWidth={2} />
              View Recommendations
            </Button>
          </div>

          {/* ===== Low Stock Section ===== */}
          {lowStockItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-7 h-7 rounded-[10px] bg-rose-soft flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-deep" strokeWidth={2} />
                </div>
                <h2 className="text-[18px] font-semibold text-text tracking-tight">
                  Low Stock
                </h2>
                <Badge variant="danger">{lowStockItems.length}</Badge>
              </div>
              <div className="space-y-4">
                {lowStockItems.map((item) => (
                  <div key={item.id}>
                    <Card className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-text text-[15px] truncate">
                              {item.medicines?.name ?? 'Unknown Medicine'}
                            </h3>
                            <Badge variant="danger" dot>
                              Low
                            </Badge>
                          </div>
                          <p className="text-[13px] text-secondary mt-0.5">
                            {item.medicines?.dosage}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="w-24 h-2 bg-rose-soft rounded-full overflow-hidden">
                              <div
                                className="h-full bg-danger rounded-full"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (item.remaining_quantity /
                                      Math.max(1, item.total_quantity)) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-rose-deep font-semibold">
                              {item.remaining_quantity} left
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setRefillItem(item);
                            setRefillQuantity(
                              String(item.total_quantity || 30)
                            );
                          }}
                          className="flex items-center gap-1.5 px-4 py-3 rounded-pill bg-primary text-white text-[13px] font-semibold hover:bg-primary-light active:scale-[0.98] transition-all duration-200 shadow-button shrink-0 ml-3"
                        >
                          <RefreshCw className="w-4 h-4" strokeWidth={2} /> Refill
                        </button>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== In Stock Section ===== */}
          {healthyItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-7 h-7 rounded-[10px] bg-mint-soft flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-mint-deep" strokeWidth={2} />
                </div>
                <h2 className="text-[18px] font-semibold text-text tracking-tight">
                  In Stock
                </h2>
              </div>
              <div className="space-y-4">
                {healthyItems.map((item) => (
                  <div key={item.id}>
                    <Card className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text text-[15px] truncate">
                            {item.medicines?.name ?? 'Unknown Medicine'}
                          </h3>
                          <p className="text-[13px] text-secondary mt-0.5">
                            {item.medicines?.dosage}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="w-24 h-2 bg-mint-soft rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success rounded-full"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (item.remaining_quantity /
                                      Math.max(1, item.total_quantity)) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="text-xl font-bold text-text tracking-tight">
                            {item.remaining_quantity}
                            <span className="text-xs font-normal text-secondary ml-1">
                              / {item.total_quantity}
                            </span>
                          </div>
                          <Badge variant="success" dot className="mt-1.5">
                            In stock
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refill Modal */}
      <Modal
        isOpen={refillItem !== null}
        onClose={() => setRefillItem(null)}
        title="Refill Inventory"
      >
        {refillItem && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-text text-[17px]">
                {refillItem.medicines?.name}
              </h3>
              <p className="text-sm text-secondary mt-0.5">
                Current: {refillItem.remaining_quantity} remaining
              </p>
            </div>
            <Input
              label="New Quantity"
              type="number"
              min={1}
              value={refillQuantity}
              onChange={(e) => setRefillQuantity(e.target.value)}
              placeholder="Enter new quantity"
            />
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setRefillItem(null)}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleRefill}
                loading={refill.isPending}
              >
                Refill
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}