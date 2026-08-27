import { createBrowserRouter } from 'react-router-dom';
import { MobileLayout } from '@/layouts/MobileLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthPage } from '@/pages/Auth/AuthPage';
import { HomePage } from '@/pages/Home/HomePage';
import { ScanPage } from '@/pages/Scan/ScanPage';
import { MedicinesPage } from '@/pages/Medicines/MedicinesPage';
import { InventoryPage } from '@/pages/Inventory/InventoryPage';
import { HistoryPage } from '@/pages/History/HistoryPage';
import { SettingsPage } from '@/pages/Settings/SettingsPage';
import { ContactsPage } from '@/pages/Contacts/ContactsPage';

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MobileLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'scan', element: <ScanPage /> },
          { path: 'medicines', element: <MedicinesPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'contacts', element: <ContactsPage /> },
        ],
      },
    ],
  },
]);
