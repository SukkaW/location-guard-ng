'use client';

import { useState } from 'react';
import type { Level } from 'location-guard-types';
import { Avatar, Callout, Flex, Select, Skeleton, Switch, Table, Text } from '@radix-ui/themes';
import { DOMAIN_LEVEL_LABELS } from '@/lib/level-labels';
import { useSiteLevels, useSetSiteLevel } from '@/lib/use-site-levels';
import { InfoIcon } from 'lucide-react';
import { DeleteSiteRuleButton } from './delete-site-rule-button';

const DOMAIN_LEVEL_ORDER = ['default', 'high', 'medium', 'low', 'fixed', 'real'] as const;
const DOMAIN_LEVEL_ALL_LABELS: Record<(typeof DOMAIN_LEVEL_ORDER)[number], string> = {
  default: 'Use default',
  ...DOMAIN_LEVEL_LABELS
};

// Radix Themes' Table defaults every cell to `vertical-align: top`, which looks fine for
// multi-line content but misaligns our single-line rows of differently-sized controls
// (Switch vs. Select vs. IconButton) against each other.
const CELL_STYLE = { verticalAlign: 'middle' } as const;

export function SiteLevelsTable() {
  const { data: rules, isLoading, error } = useSiteLevels();
  const { trigger, isMutating } = useSetSiteLevel();
  const [pendingHostname, setPendingHostname] = useState<string | null>(null);

  if (error) {
    return (
      <Callout.Root variant="soft" color="amber">
        <Callout.Icon><InfoIcon size={16} /></Callout.Icon>
        <Callout.Text>Couldn&rsquo;t load per-site rules from the userscript.</Callout.Text>
      </Callout.Root>
    );
  }

  if (isLoading || !rules) {
    return (
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell style={CELL_STYLE}>Domain</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={CELL_STYLE}>Include subdomains</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={CELL_STYLE}>Privacy level</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="40px" style={CELL_STYLE} />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {[0, 1, 2].map((row) => (
            <Table.Row key={row}>
              <Table.Cell style={CELL_STYLE}><Skeleton><Text size="2">example.com</Text></Skeleton></Table.Cell>
              <Table.Cell style={CELL_STYLE}><Skeleton><Text size="2">Toggle</Text></Skeleton></Table.Cell>
              <Table.Cell style={CELL_STYLE}><Skeleton><Text size="2">Privacy level</Text></Skeleton></Table.Cell>
              <Table.Cell style={CELL_STYLE}><Skeleton><Text size="2">&middot;</Text></Skeleton></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    );
  }

  if (rules.length === 0) {
    return <Text size="2" color="gray">No per-site rules yet.</Text>;
  }

  const commit = async (hostname: string, level: Level | null, includeSubdomain: boolean) => {
    setPendingHostname(hostname);
    try {
      await trigger({ hostname, level, includeSubdomain });
    } finally {
      setPendingHostname(null);
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell style={CELL_STYLE}>Domain</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={CELL_STYLE}>Include subdomains</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={CELL_STYLE}>Privacy level</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="40px" style={CELL_STYLE} />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rules.map((rule) => {
            const rowPending = isMutating && pendingHostname === rule.hostname;
            return (
              <Table.Row key={rule.hostname}>
                <Table.Cell style={CELL_STYLE}>
                  <Flex align="center" gap="3">
                    <Avatar
                      size="1"
                      src={`https://icons.duckduckgo.com/ip3/${rule.hostname}.ico`}
                      fallback={rule.hostname[0]}
                    />
                    <Text size="2" weight="medium">{rule.hostname}</Text>
                  </Flex>
                </Table.Cell>
                <Table.Cell style={CELL_STYLE}>
                  <Switch
                    checked={rule.includeSubdomain}
                    disabled={rowPending}
                    onCheckedChange={(checked) => { void commit(rule.hostname, rule.level, checked); }}
                  />
                </Table.Cell>
                <Table.Cell style={CELL_STYLE}>
                  <Select.Root
                    size="2"
                    value={rule.level}
                    disabled={rowPending}
                    onValueChange={(value) => {
                      void commit(rule.hostname, value === 'default' ? null : value as Level, rule.includeSubdomain);
                    }}
                  >
                    <Select.Trigger style={{ width: 180 }} />
                    <Select.Content>
                      {DOMAIN_LEVEL_ORDER.map((level) => (
                        <Select.Item key={level} value={level}>{DOMAIN_LEVEL_ALL_LABELS[level]}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Table.Cell>
                <Table.Cell style={CELL_STYLE}>
                  <DeleteSiteRuleButton
                    hostname={rule.hostname}
                    loading={rowPending}
                    onConfirm={() => commit(rule.hostname, null, rule.includeSubdomain)}
                  />
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
