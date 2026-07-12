'use client';

import { useState } from 'react';
import { useComponentWillReceiveUpdate } from 'foxact/use-component-will-receive-update';
import { Box, Flex, Skeleton, Slider, Text } from '@radix-ui/themes';

const MONO_FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

interface NoisyLevelControlsProps {
  radius: number | undefined,
  cacheMinutes: number | undefined,
  range: { min: number, max: number, step: number },
  loading?: boolean,
  disabled?: boolean,
  onRadiusCommit: (radius: number) => void,
  onCacheMinutesCommit: (minutes: number) => void
}

export function NoisyLevelControls({ radius, cacheMinutes, range, loading, disabled, onRadiusCommit, onCacheMinutesCommit }: NoisyLevelControlsProps) {
  // Local, immediately-responsive drag state; only committed (and written through
  // to GM storage) once the user releases the slider, via onValueCommit below.
  const [liveRadius, setLiveRadius] = useState(radius ?? range.min);
  const [liveCacheMinutes, setLiveCacheMinutes] = useState(cacheMinutes ?? 0);

  useComponentWillReceiveUpdate(() => {
    if (radius !== undefined) setLiveRadius(radius);
  }, [radius]);
  useComponentWillReceiveUpdate(() => {
    if (cacheMinutes !== undefined) setLiveCacheMinutes(cacheMinutes);
  }, [cacheMinutes]);

  // Placeholder approximation of reported accuracy from the protection radius;
  // the real value comes from PlanarLaplace.expectedError(epsilon) once wired up.
  const accuracyMeters = Math.round(liveRadius * 2.37);

  return (
    <Flex direction="column" gap="5" py="4">
      <Flex justify="between" align="center" wrap="wrap" gap="5">
        <Box style={{ flex: 1, minWidth: 220 }}>
          <Flex justify="between" align="baseline" mb="2">
            <Text size="2" weight="medium">Protection</Text>
            <Text size="2" color="gray" style={{ fontFamily: MONO_FONT }}>{Math.round(liveRadius)} m</Text>
          </Flex>
          <Skeleton loading={loading}>
            <Slider
              value={[liveRadius]}
              min={range.min}
              max={range.max}
              step={range.step}
              disabled={disabled}
              onValueChange={([value]) => setLiveRadius(value)}
              onValueCommit={([value]) => onRadiusCommit(value)}
            />
          </Skeleton>
        </Box>
        <Box style={{ textAlign: 'right', flexShrink: 0 }}>
          <Text as="p" size="1" color="gray">Reported accuracy</Text>
          <Text as="p" size="4" weight="bold" style={{ fontFamily: MONO_FONT }}>{accuracyMeters} m</Text>
        </Box>
      </Flex>

      <Box>
        <Flex justify="between" align="baseline" mb="2">
          <Text size="2" weight="medium">Cache location for</Text>
          <Text size="2" color="gray" style={{ fontFamily: MONO_FONT }}>{liveCacheMinutes} minutes</Text>
        </Flex>
        <Skeleton loading={loading}>
          <Slider
            value={[liveCacheMinutes]}
            min={0}
            max={120}
            step={5}
            disabled={disabled}
            onValueChange={([value]) => setLiveCacheMinutes(value)}
            onValueCommit={([value]) => onCacheMinutesCommit(value)}
          />
        </Skeleton>
      </Box>
    </Flex>
  );
}
