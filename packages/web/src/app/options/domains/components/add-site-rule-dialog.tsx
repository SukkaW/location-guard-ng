'use client';

import { useState } from 'react';
import type { Level } from 'location-guard-types';
import { Button, Dialog, Flex, Select, Switch, Text, TextField } from '@radix-ui/themes';
import { PlusIcon } from 'lucide-react';
import { DOMAIN_LEVEL_LABELS } from '@/lib/level-labels';
import { useSetSiteLevel } from '@/lib/use-site-levels';

const ADDABLE_LEVELS = ['fixed', 'real', 'low', 'medium', 'high'] as const satisfies readonly Level[];

/** Accepts a bare domain or a pasted URL and returns just the hostname, or `null` if unparseable. */
function normalizeHostname(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname || null;
  } catch {
    return null;
  }
}

export function AddSiteRuleDialog() {
  const [open, setOpen] = useState(false);
  const [hostnameInput, setHostnameInput] = useState('');
  const [level, setLevel] = useState<Level>('fixed');
  const [includeSubdomain, setIncludeSubdomain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trigger, isMutating } = useSetSiteLevel();

  const reset = () => {
    setHostnameInput('');
    setLevel('fixed');
    setIncludeSubdomain(false);
    setError(null);
  };

  const handleSubmit = async () => {
    const hostname = normalizeHostname(hostnameInput);
    if (!hostname) {
      setError('Enter a valid domain, e.g. example.com');
      return;
    }
    await trigger({ hostname, level, includeSubdomain });
    setOpen(false);
    reset();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger>
        <Button size="2">
          <PlusIcon size={15} />
          Add domain
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Add a per-site rule</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Set a privacy level for a specific domain, overriding the default.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <label>
            <Text as="div" size="2" weight="medium" mb="1">Domain</Text>
            <TextField.Root
              placeholder="example.com"
              value={hostnameInput}
              onChange={(event) => {
                setHostnameInput(event.target.value);
                setError(null);
              }}
            />
            {error && <Text as="div" size="1" color="red" mt="1">{error}</Text>}
          </label>

          <label>
            <Text as="div" size="2" weight="medium" mb="1">Privacy level</Text>
            <Select.Root value={level} onValueChange={(value) => setLevel(value as Level)}>
              <Select.Trigger style={{ width: '100%' }} />
              <Select.Content>
                {ADDABLE_LEVELS.map((addableLevel) => (
                  <Select.Item key={addableLevel} value={addableLevel}>{DOMAIN_LEVEL_LABELS[addableLevel]}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>

          <Flex asChild align="center" justify="between">
            <label>
              <Text size="2" weight="medium">Include all subdomains</Text>
              <Switch checked={includeSubdomain} onCheckedChange={setIncludeSubdomain} />
            </label>
          </Flex>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Cancel</Button>
          </Dialog.Close>
          <Button variant="solid" loading={isMutating} onClick={() => { void handleSubmit(); }}>
            Add rule
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
