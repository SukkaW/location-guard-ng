'use client';

import { useState } from 'react';
import { AlertDialog, Button, Flex, IconButton, Text } from '@radix-ui/themes';
import { Trash2Icon } from 'lucide-react';

interface DeleteSiteRuleButtonProps {
  hostname: string,
  loading?: boolean,
  onConfirm: () => Promise<void>
}

export function DeleteSiteRuleButton({ hostname, loading, onConfirm }: DeleteSiteRuleButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger>
        <IconButton variant="ghost" color="gray" size="1" loading={loading} aria-label={`Remove ${hostname}`}>
          <Trash2Icon size={15} />
        </IconButton>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>Remove rule for {hostname}?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          <Text weight="bold">{hostname}</Text> will go back to using the default privacy level.
          {' '}This can&rsquo;t be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">Cancel</Button>
          </AlertDialog.Cancel>
          <Button variant="solid" color="red" loading={loading} onClick={() => { void handleConfirm(); }}>
            Remove rule
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
