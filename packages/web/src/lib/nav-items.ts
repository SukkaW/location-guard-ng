import { HomeIcon, SettingsIcon, GlobeIcon, MapPinIcon } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Homepage', icon: HomeIcon, section: null },
  { href: '/options', label: 'Options', icon: SettingsIcon, section: 'UserScript Configuration' },
  { href: '/options/privacy', label: 'Privacy Levels', icon: MapPinIcon, section: 'UserScript Configuration' },
  { href: '/options/domains', label: 'Per-Site Rules', icon: GlobeIcon, section: 'UserScript Configuration' }
] as const;

export const NAV_ITEMS_BY_HREF: ReadonlyMap<string, (typeof NAV_ITEMS)[number]> = new Map(
  NAV_ITEMS.map((item) => [item.href, item])
);
