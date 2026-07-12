'use client';

import { Button } from '@radix-ui/themes';
import styles from './app-shell.module.css';
import { MenuIcon } from 'lucide-react';
import { useSetMobileSidebarOpen } from './mobile-sidebar-context';

export function SidebarToggleButton() {
  const setOpen = useSetMobileSidebarOpen();

  return (
    <Button
      variant="ghost"
      color="gray"
      className={styles.menuButton}
      onClick={() => setOpen(true)}
      aria-label="Open navigation"
    >
      <MenuIcon size={18} />
    </Button>
  );
}
