import '@radix-ui/themes/styles.css';
import './globals.css';
import './custom-theme.css';

import { ThemeProvider } from 'next-themes';
import { Theme } from '@radix-ui/themes';

import AppShell from '../components/shell/app-shell';

export default function RootLayout({
  children
}: React.PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class">
          <Theme accentColor="gray" radius="medium" panelBackground="solid" style={{ height: '100%' }}>
            <AppShell>{children}</AppShell>
          </Theme>
        </ThemeProvider>
      </body>
    </html>
  );
}
