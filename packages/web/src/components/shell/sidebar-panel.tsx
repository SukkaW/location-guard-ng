'use client';

import type React from 'react';
import styles from './app-shell.module.css';
import { useMobileSidebarOpen } from './mobile-sidebar-context';

export function SidebarPanel({ children }: React.PropsWithChildren) {
  const open = useMobileSidebarOpen();

  return (
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
      {children}
    </aside>
  );
}
