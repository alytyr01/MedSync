import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Pill, ScanLine, Clock, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Today', icon: Home },
  { path: '/medicines', label: 'Medicines', icon: Pill },
  { path: '/scan', label: 'Scan', icon: ScanLine },
  { path: '/history', label: 'Schedule', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function MobileLayout() {
  const location = useLocation();

  // Hide bottom nav on detail pages
  const hideNav =
    location.pathname.startsWith('/medicines/') ||
    location.pathname.startsWith('/auth');

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-md mx-auto pb-32 safe-top">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
          <div className="max-w-md mx-auto px-4 pb-3">
            <div className="bg-ink/95 backdrop-blur-xl rounded-pill shadow-float ring-1 ring-white/10">
              <div className="flex items-stretch px-1.5 py-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => `
                        relative flex-1 flex flex-col items-center gap-1
                        py-2.5 rounded-pill transition-all duration-200
                        ${isActive ? 'bg-white/15' : 'hover:bg-white/5'}
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
                              isActive
                                ? 'font-semibold text-white'
                                : 'font-medium text-[#8A9099]'
                            }`}
                          >
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}