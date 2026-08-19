import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
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

  if (isLoading) return <LoadingState variant="cards" label="Loading inventory..." />;

  if (error) {
    return (
      <ErrorState
        message="Failed to load inventory"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="px-5">
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} medicines tracked`}
      />

      {items.length === 0 ? (
        <EmptyState
          title="No inventory yet"
          description="Add medicines to start tracking your stock levels."
        />
      ) : (
        <div className="space-y-8">
          {/* Low Stock Section */}
          {lowStockItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-7 h-7 rounded-[10px] bg-warning/10 flex items-center justify-center">
                  <FiAlertTriangle className="w-3.5 h-3.5 text-warning" />
                </div>
                <h2 className="text-[17px] font-semibold text-text tracking-tight">
                  Low Stock
                </h2>
                <Badge variant="warning">{lowStockItems.length}</Badge>
              </div>
              <div className="space-y-3">
                {lowStockItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-5 border-warning/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-text text-[15px] truncate">
                              {item.medicines?.name ?? 'Unknown Medicine'}
                            </h3>
                            <Badge variant="warning" dot>
                              Low
                            </Badge>
                          </div>
                          <p className="text-[13px] text-secondary mt-0.5">
                            {item.medicines?.dosage}
                          </p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-warning/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-warning rounded-full"
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
                            <span className="text-xs text-warning font-medium">
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
                          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-button bg-primary text-white text-[13px] font-medium hover:bg-primary-hover active:scale-[0.98] transition-all duration-200 shadow-[0_2px_8px_rgba(15,118,110,0.15)] shrink-0 ml-3"
                        >
                          <FiRefreshCw className="w-4 h-4" /> Refill
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Healthy Stock Section */}
          {healthyItems.length > 0 && (
            <div>
              <h2 className="text-[17px] font-semibold text-text tracking-tight mb-3 px-1">
                In Stock
              </h2>
              <div className="space-y-3">
                {healthyItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text text-[15px] truncate">
                            {item.medicines?.name ?? 'Unknown Medicine'}
                          </h3>
                          <p className="text-[13px] text-secondary mt-0.5">
                            {item.medicines?.dosage}
                          </p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-primary-soft rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
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
                  </motion.div>
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

