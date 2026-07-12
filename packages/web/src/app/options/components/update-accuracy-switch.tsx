'use client';

import { Skeleton, Switch } from '@radix-ui/themes';
import { useStoredValue, useSetStoredValue } from '@/lib/use-stored-value';

export function UpdateAccuracySwitch() {
  const { data: updateAccuracy, isLoading, error } = useStoredValue('updateAccuracy');
  const { trigger, isMutating } = useSetStoredValue('updateAccuracy');

  return (
    <Skeleton loading={isLoading}>
      <Switch
        checked={updateAccuracy ?? false}
        disabled={isMutating || !!error}
        onCheckedChange={(checked) => { void trigger(checked); }}
      />
    </Skeleton>
  );
}
