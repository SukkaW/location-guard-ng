import { Callout, Text } from '@radix-ui/themes';
import { InfoIcon } from 'lucide-react';
import { PrivacyLevelTabs } from './components/privacy-level-tabs';

export default function PrivacyPage() {
  return (
    <PrivacyLevelTabs
      pageHeader={(
        <Callout.Root variant="soft" color="gray">
          <Callout.Icon><InfoIcon size={16} /></Callout.Icon>
          <Callout.Text>
            This is where your configure the amount of noise applied to your location per different <Text weight="bold">privacy level</Text>.
            <br />
            You may have different privacy levels for different sites, so multiple privacy levels can be active.
          </Callout.Text>
        </Callout.Root>
      )}
      noisyInfo={(
        <Callout.Root variant="soft" color="gray">
          <Callout.Icon><InfoIcon size={16} /></Callout.Icon>
          <Callout.Text>
            Sites at this level never see your real position. To preview where this noise range would place you, the map below still needs your browser&rsquo;s real location permission &mdash; this page only displays it and never stores it.
          </Callout.Text>
        </Callout.Root>
      )}
      fixedInfo={(
        <Callout.Root variant="soft" color="gray">
          <Callout.Icon><InfoIcon size={16} /></Callout.Icon>
          <Callout.Text>
            This is the location reported when the privacy level is set to <Text weight="bold">Use fixed location</Text>.
            {' '}Click anywhere on the map below, or drag the marker, to set new coordinates.
          </Callout.Text>
        </Callout.Root>
      )}
      realInfo={(
        <Callout.Root variant="soft" color="blue">
          <Callout.Icon><InfoIcon size={16} /></Callout.Icon>
          <Callout.Text weight="bold" mb="1">No faking applied</Callout.Text>
          <Callout.Text>Sites see the browser&rsquo;s unmodified location and accuracy. Use this level for sites you trust.</Callout.Text>
          <Callout.Text>Your browser may ask for location permission to show the reported accuracy below &mdash; this page only displays it and never stores it.</Callout.Text>
        </Callout.Root>
      )}
    />
  );
}
