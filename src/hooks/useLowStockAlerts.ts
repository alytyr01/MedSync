import { useEffect } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useMedicines } from '@/hooks/useMedicines';
import { useSettingsStore } from '@/store/settingsStore';
import { notifyLowStock } from '@/services/alarm';

/**
 * Watches inventory levels and fires ONE low-stock notification per
 * medicine per day whenever remaining quantity is at/below its threshold.
 *
 * - Respects the Low Stock Alerts setting instantly (toggle off = silence)
 * - Delivery is a local native notification on Android, browser
 *   notification on web
 * - Deduplicated via localStorage (`medicineId -> last-alerted date`)
 *   so switching tabs / remounting never spams
 */

const SEEN_KEY = 'medsync_low_stock_seen_v1';
const MAX_SEEN = 60;

type SeenMap = Record<string, string>; // medicineId -> YYYY-MM-DD

function loadSeen(): SeenMap {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as SeenMap;
  } catch {
    return {};
  }
}

function saveSeen(map: SeenMap): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable — alerts would just repeat more often
  }
}

export function useLowStockAlerts(): void {
  const { data: inventory } = useInventory();
  const { data: medicines } = useMedicines();
  const lowStockAlerts = useSettingsStore((s) => s.settings.lowStockAlerts);

  useEffect(() => {
    if (!lowStockAlerts || !inventory || inventory.length === 0) return;

    const names = new Map(
      (medicines ?? []).map((m) => [m.id, m.name] as const)
    );
    const seen = loadSeen();
    const today = new Date().toISOString().slice(0, 10);
    let changed = false;

    for (const item of inventory) {
      if (item.remaining_quantity > item.low_stock_threshold) continue;
      if (seen[item.medicine_id] === today) continue;

      seen[item.medicine_id] = today;
      changed = true;

      const name = names.get(item.medicine_id) ?? 'A medicine';
      void notifyLowStock(name, item.remaining_quantity);
    }

    // Prune very old entries so the map cannot grow forever
    const keys = Object.keys(seen);
    if (keys.length > MAX_SEEN) {
      for (const k of keys.slice(0, keys.length - MAX_SEEN)) delete seen[k];
      changed = true;
    }

    if (changed) saveSeen(seen);
  }, [inventory, medicines, lowStockAlerts]);
}