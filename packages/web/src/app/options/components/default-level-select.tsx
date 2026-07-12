'use client';

import type { Level } from 'location-guard-types';
import { Select, Skeleton } from '@radix-ui/themes';
import { LEVEL_LABELS } from '@/lib/level-labels';
import { useStoredValue, useSetStoredValue } from '@/lib/use-stored-value';

const LEVEL_ORDER: Level[] = ['high', 'medium', 'low', 'fixed', 'real'];

export function DefaultLevelSelect() {
  const { data: defaultLevel, isLoading, error } = useStoredValue('defaultLevel');
  const { trigger, isMutating } = useSetStoredValue('defaultLevel');

  return (
    <Skeleton loading={isLoading}>
      <Select.Root
        value={defaultLevel ?? ''}
        onValueChange={(value) => { void trigger(value as Level); }}
        disabled={isMutating || !!error}
      >
        <Select.Trigger style={{ width: 320 }} />
        <Select.Content>
          {LEVEL_ORDER.map((level) => (
            <Select.Item key={level} value={level}>{LEVEL_LABELS[level]}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Skeleton>
  );
}
