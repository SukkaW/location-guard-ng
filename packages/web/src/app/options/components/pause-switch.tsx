'use client';

import { Skeleton, Switch } from '@radix-ui/themes';
import { useStoredValue, useSetStoredValue } from '@/lib/use-stored-value';

export function PauseSwitch() {
  const { data: paused, isLoading, error } = useStoredValue('paused');
  const { trigger, isMutating } = useSetStoredValue('paused');

  return (
    <Skeleton loading={isLoading}>
      <Switch
        checked={paused ?? false}
        disabled={isLoading || isMutating || !!error}
        onCheckedChange={(checked) => { trigger(checked); }}
      />
    </Skeleton>
  );
}
