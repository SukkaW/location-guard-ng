import { Button, Card, Flex, Separator, Text } from '@radix-ui/themes';
import { DefaultLevelSelect } from './components/default-level-select';
import { PauseSwitch } from './components/pause-switch';
import { UpdateAccuracySwitch } from './components/update-accuracy-switch';
import { DeleteCacheButton } from './components/delete-cache-button';
import { RestoreDefaultsButton } from './components/restore-defaults-button';
import { GithubIcon } from '../../components/icons';
import { APP_VERSION, REPO_URL, SPONSOR_URL } from '@/lib/app-info';
import { HeartIcon, MapPinIcon } from 'lucide-react';

export default function OptionsPage() {
  return (
    <Flex direction="column" gap="5">
      <Card size="3">
        <Flex direction="column" gap="2">
          <Text as="label" size="2" weight="medium">Default privacy level</Text>
          <Text as="p" size="1" color="gray">
            Applied to any site without its own rule (see Per-Site Rules).
          </Text>
          <DefaultLevelSelect />
        </Flex>
      </Card>

      <Card size="3">
        <Flex direction="column" gap="4">
          <Flex align="center" justify="between" gap="4">
            <Flex direction="column">
              <Text size="2" weight="medium">Pause</Text>
              <Text size="1" color="gray">
                Temporarily report the real location everywhere, ignoring all rules below.
              </Text>
            </Flex>
            <PauseSwitch />
          </Flex>

          <Separator size="4" />

          <Flex align="center" justify="between" gap="4">
            <Flex direction="column">
              <Text size="2" weight="medium">Update accuracy</Text>
              <Text size="1" color="gray">
                Adapts the reported accuracy to the amount of added noise.
              </Text>
            </Flex>
            <UpdateAccuracySwitch />
          </Flex>
        </Flex>
      </Card>

      <Flex gap="3">
        <DeleteCacheButton />
        <RestoreDefaultsButton />
      </Flex>

      <Card size="3">
        <Flex direction="column" gap="3">
          <Flex align="center" gap="3">
            <Flex
              align="center"
              justify="center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-3)',
                backgroundColor: 'var(--accent-9)',
                color: 'var(--accent-contrast)',
                flexShrink: 0
              }}
            >
              <MapPinIcon size={18} />
            </Flex>
            <Flex direction="column">
              <Text size="2" weight="bold">Location Guard Ng</Text>
              <Text size="1" color="gray">Version {APP_VERSION}</Text>
            </Flex>
          </Flex>

          <Text as="p" size="2" color="gray">
            Protects your location while browsing by adding controlled noise or spoofing a fixed
            position. Free and open source, built as a userscript.
          </Text>

          <Flex gap="3" wrap="wrap">
            <Button asChild variant="outline" style={{ flex: 1 }}>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <GithubIcon size={16} />
                View on GitHub
              </a>
            </Button>
            <Button asChild variant="outline" style={{ flex: 1 }}>
              <a href={SPONSOR_URL} target="_blank" rel="noopener noreferrer">
                <HeartIcon size={16} />
                Sponsor
              </a>
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
