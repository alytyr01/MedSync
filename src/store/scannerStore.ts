import { create } from 'zustand';

interface ScannerState {
  open: boolean;
  /** When true, the sheet opens straight into the live camera viewfinder */
  autoCamera: boolean;
  openScanner: (autoCamera?: boolean) => void;
  closeScanner: () => void;
}

/** Shared trigger for the Scan Prescription bottom sheet (nav + home card). */
export const useScannerStore = create<ScannerState>((set) => ({
  open: false,
  autoCamera: false,
  openScanner: (autoCamera = false) => set({ open: true, autoCamera }),
  closeScanner: () => set({ open: false, autoCamera: false }),
}));