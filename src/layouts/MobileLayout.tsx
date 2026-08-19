import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiHome,
  FiThermometer,
  FiCamera,
  FiClock,
  FiSettings,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

interface NavItem {
  path: string;
  label: string;
  icon: IconType;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: FiHome },
  { path: '/medicines', label: 'Medicines', icon: FiThermometer },
  { path: '/scan', label: 'Scan', icon: FiCamera },
  { path: '/history', label: 'History', icon: FiClock },
  { path: '/settings', label: 'Settings', icon: FiSettings },
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
            <div className="relative bg-surface/95 backdrop-blur-xl border border-border rounded-[28px] shadow-nav">
              {/* Thin divider at top */}
              <div className="absolute inset-x-8 top-0 h-px bg-border/60" />

              <div className="flex items-stretch px-1 py-1.5">
                {navItems.map((item) => {
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => `
                        relative flex-1 flex flex-col items-center gap-1
                        py-2.5 rounded-2xl transition-colors duration-200
                        ${isActive ? 'text-tab-active' : 'text-tab-default hover:text-secondary'}
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={`relative w-10 h-7 flex items-center justify-center rounded-xl transition-colors duration-200 ${
                              isActive ? 'bg-primary-soft' : ''
                            }`}
                          >
                            <item.icon
                              className="w-[22px] h-[22px]"
                              strokeWidth={isActive ? 2.2 : 1.7}
                              fill={isActive ? 'currentColor' : 'none'}
                            />
                            {/* Green indicator */}
                            {isActive && (
                              <motion.div
                                layoutId="nav-dot"
                                className="absolute -bottom-[3px] w-1 h-1 rounded-full bg-primary"
                                transition={{
                                  type: 'spring',
                                  stiffness: 400,
                                  damping: 30,
                                }}
                              />
                            )}
                          </div>
                          <span
                            className={`text-[10px] leading-none ${
                              isActive ? 'font-semibold' : 'font-medium'
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
