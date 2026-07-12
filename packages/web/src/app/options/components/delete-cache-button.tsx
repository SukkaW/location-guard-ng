'use client';

import { Button } from '@radix-ui/themes';
import { useEmptyCachedPos } from '@/lib/use-location-guard-actions';
import { useLocationGuardBridge } from '@/lib/use-stored-value';

export function DeleteCacheButton() {
  const { data: bridge, isLoading: bridgeLoading } = useLocationGuardBridge();
  const { trigger, isMutating } = useEmptyCachedPos();

  return (
    <Button
      variant="outline"
      style={{ flex: 1 }}
      loading={isMutating}
      disabled={!bridgeLoading && !bridge}
      onClick={() => { void trigger(); }}
    >
      Delete fake location cache
    </Button>
  );
}
