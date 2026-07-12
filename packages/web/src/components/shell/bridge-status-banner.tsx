'use client';

import { Callout } from '@radix-ui/themes';
import { InfoIcon } from 'lucide-react';
import { useLocationGuardBridge } from '@/lib/use-stored-value';

export function BridgeStatusBanner() {
  const { data: bridge, isLoading } = useLocationGuardBridge();

  if (isLoading || bridge) return null;

  return (
    <Callout.Root variant="soft" color="amber" mb="5">
      <Callout.Icon><InfoIcon size={16} /></Callout.Icon>
      <Callout.Text>
        The Location Guard userscript wasn&rsquo;t detected on this page &mdash; Make sure it is installed and enabled
        in your UserScript manager.
      </Callout.Text>
    </Callout.Root>
  );
}
