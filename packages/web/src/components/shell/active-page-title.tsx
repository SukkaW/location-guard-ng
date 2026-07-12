'use client';

import { usePathname } from 'next/navigation';
import { Text } from '@radix-ui/themes';
import { NAV_ITEMS, NAV_ITEMS_BY_HREF } from '@/lib/nav-items';

export function ActivePageTitle() {
  const pathname = usePathname();
  const activeItem = NAV_ITEMS_BY_HREF.get(pathname) ?? NAV_ITEMS[0];

  return <Text size="3" weight="bold">{activeItem.label}</Text>;
}
