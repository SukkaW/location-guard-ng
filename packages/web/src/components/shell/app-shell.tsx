import { Fragment } from 'react';
import { Separator, Text } from '@radix-ui/themes';
import styles from './app-shell.module.css';
import { MapPinIcon } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav-items';
import { APP_VERSION } from '@/lib/app-info';
import { MobileSidebarProvider } from './mobile-sidebar-context';
import { SidebarOverlay } from './sidebar-overlay';
import { SidebarPanel } from './sidebar-panel';
import { SidebarToggleButton } from './sidebar-toggle-button';
import { NavLink } from './nav-link';
import { ActivePageTitle } from './active-page-title';

export default function AppShell({ children }: React.PropsWithChildren) {
  return (
    <MobileSidebarProvider>
      <div className={styles.shell}>
        <SidebarOverlay />

        <SidebarPanel>
          <div className={styles.sidebarHeader}>
            <div className={styles.logoMark}>
              <MapPinIcon size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
              <Text size="2" weight="bold">Location Guard Ng</Text>
              <Text size="1" color="gray">Userscript configuration</Text>
            </div>
          </div>

          <nav className={styles.sidebarNav}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const showSectionHeader = item.section !== null && item.section !== NAV_ITEMS[index - 1]?.section;
                return (
                  <Fragment key={item.href}>
                    {showSectionHeader && (
                      <div className={styles.navSection}>
                        <Separator size="4" />
                        <Text as="p" size="1" color="gray" weight="medium" className={styles.navSectionLabel}>
                          {item.section}
                        </Text>
                      </div>
                    )}
                    <NavLink href={item.href}>
                      <Icon size={16} />
                      {item.label}
                    </NavLink>
                  </Fragment>
                );
              })}
            </div>
          </nav>

          <div className={styles.sidebarFooter}>
            <Text size="1" color="gray">v{APP_VERSION}</Text>
          </div>
        </SidebarPanel>

        <div className={styles.main}>
          <div className={styles.header}>
            <SidebarToggleButton />
            <ActivePageTitle />
          </div>
          <div className={styles.content}>
            {children}
          </div>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
