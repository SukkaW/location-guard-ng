'use client';

import { createContextState } from 'foxact/create-context-state';

export const [MobileSidebarProvider, useMobileSidebarOpen, useSetMobileSidebarOpen] = createContextState(false);
