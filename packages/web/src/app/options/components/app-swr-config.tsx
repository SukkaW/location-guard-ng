'use client';

import type React from 'react';
import { SWRConfig } from 'swr';
import { bridgeMiddleware } from '@/lib/swr-bridge-middleware';

export default function AppSWRConfig({ children }: React.PropsWithChildren) {
  return (
    <SWRConfig value={{ use: [bridgeMiddleware] }}>
      {children}
    </SWRConfig>
  );
}
