import type React from 'react';
import ThemeRegistry from './theme-registry';

export default function RootLayout({
  children
}: React.PropsWithChildren) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry
          options={{
            key: 'sukka'
          }}
        >
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
