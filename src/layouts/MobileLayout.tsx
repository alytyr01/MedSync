import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Pill, ScanLine, Clock, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useReminderScheduler } from '@/hooks/useReminderScheduler';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { ScannerSheet } from '@/components/scanner/ScannerSheet';
import { useScannerStore } from '@/store/scannerStore';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

// Main nav items (without Scan — it gets its own dedicated container)
const mainNavItems: NavItem[] = [
  { path: '/', label: 'Today', icon: Home },
  { path: '/medicines', label: 'Medicines', icon: Pill },
  { path: '/history', label: 'Schedule', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const scanNavItem = {
  label: 'Scan',
  icon: ScanLine,
};

function NavLinkButton({ item, className = '' }: { item: NavItem; className?: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `
        relative flex flex-col items-center justify-center gap-1
        px-2 py-2.5 rounded-[16px] transition-all duration-200
        ${isActive ? 'bg-white/15' : 'hover:bg-white/5'}
        ${className}
      `}
    >
      {({ isActive }) => (
        <>
          <Icon
            className="w-[22px] h-[22px]"
            strokeWidth={isActive ? 2.2 : 1.8}
            color={isActive ? '#FFFFFF' : '#8A9099'}
          />
          <span
            className={`text-[10px] leading-none ${
              isActive ? 'font-semibold text-white' : 'font-medium text-[#8A9099]'
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function ScanNavButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const Icon = scanNavItem.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1
        px-2 py-2.5 rounded-[16px] hover:bg-white/5 transition-all duration-200
        ${className}
      `}
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={1.8} color="#8A9099" />
      <span className="text-[10px] leading-none font-medium text-[#8A9099]">
        {scanNavItem.label}
      </span>
    </button>
  );
}

export function MobileLayout() {
  const location = useLocation();
  const scanOpen = useScannerStore((s) => s.open);
  const autoCamera = useScannerStore((s) => s.autoCamera);
  const closeScanner = useScannerStore((s) => s.closeScanner);

  // Keep native notifications in sync with medicines
  useReminderScheduler();
  // Fire low-stock refill nudges (respects the Low Stock Alerts setting)
  useLowStockAlerts();

  // Hide bottom nav on auth; /scan goes fully immersive (its own back arrow)
  const hideNav =
    location.pathname.startsWith('/auth') || location.pathname === '/scan';

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-md mx-auto pb-32 safe-top">
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
          <div className="max-w-md mx-auto px-4 pb-3">
            <div className="flex items-stretch justify-between gap-2">
              {/* ===== Main nav container (4 items, moderate radius) ===== */}
              <div className="flex-1 bg-ink/95 backdrop-blur-xl rounded-[22px] shadow-float ring-1 ring-white/10">
                <div className="grid grid-cols-4 gap-1.5 p-1.5">
                  {mainNavItems.map((item) => (
                    <NavLinkButton key={item.path} item={item} className="w-full" />
                  ))}
                </div>
              </div>

              {/* ===== Scan — opens the scanner bottom sheet ===== */}
              <div className="w-16 h-16 shrink-0 bg-ink/95 backdrop-blur-xl rounded-[18px] shadow-float ring-1 ring-white/10">
                <div className="h-full w-full p-1.5">
                  <ScanNavButton onClick={() => useScannerStore.getState().openScanner(false)} className="w-full h-full" />
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* ===== Scan Prescription — bottom sheet ===== */}
      <ScannerSheet
        open={scanOpen}
        autoCamera={autoCamera}
        onClose={closeScanner}
      />
    </div>
  );
}