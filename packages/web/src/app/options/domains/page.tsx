import { Flex, Text } from '@radix-ui/themes';
import { SiteLevelsTable } from './components/site-levels-table';
import { AddSiteRuleDialog } from './components/add-site-rule-dialog';

export default function DomainsPage() {
  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between" gap="4" wrap="wrap">
        <Text as="p" size="2" color="gray" style={{ maxWidth: 520 }}>
          Override the default level for specific domains.
        </Text>
        <AddSiteRuleDialog />
      </Flex>

      <SiteLevelsTable />
    </Flex>
  );
}
