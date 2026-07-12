'use client';

import styles from './app-shell.module.css';
import { useMobileSidebarOpen, useSetMobileSidebarOpen } from './mobile-sidebar-context';

export function SidebarOverlay() {
  const open = useMobileSidebarOpen();
  const setOpen = useSetMobileSidebarOpen();

  return (
    <div
      className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
      onClick={() => setOpen(false)}
    />
  );
}
