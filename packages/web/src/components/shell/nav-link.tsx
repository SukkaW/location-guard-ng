'use client';

import type React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './app-shell.module.css';
import { useSetMobileSidebarOpen } from './mobile-sidebar-context';

interface NavLinkProps {
  href: string
}

export function NavLink({ href, children }: React.PropsWithChildren<NavLinkProps>) {
  const pathname = usePathname();
  const setOpen = useSetMobileSidebarOpen();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
      onClick={() => setOpen(false)}
    >
      {children}
    </Link>
  );
}
