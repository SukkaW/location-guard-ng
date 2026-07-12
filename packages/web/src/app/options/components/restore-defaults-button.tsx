'use client';

import { useState } from 'react';
import { AlertDialog, Button, Flex } from '@radix-ui/themes';
import { useResetConfig } from '@/lib/use-location-guard-actions';
import { useLocationGuardBridge } from '@/lib/use-stored-value';

export function RestoreDefaultsButton() {
  const [open, setOpen] = useState(false);
  const { data: bridge, isLoading: bridgeLoading } = useLocationGuardBridge();
  const { trigger, isMutating } = useResetConfig();

  const handleConfirm = async () => {
    await trigger();
    setOpen(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger>
        <Button variant="outline" color="red" style={{ flex: 1 }} disabled={!bridgeLoading && !bridge}>
          Restore default options
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>Restore default options?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          This resets your default privacy level, noise settings, and every per-site rule back to
          {' '}their defaults. This can&rsquo;t be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">Cancel</Button>
          </AlertDialog.Cancel>
          <Button variant="solid" color="red" loading={isMutating} onClick={() => { void handleConfirm(); }}>
            Restore defaults
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
