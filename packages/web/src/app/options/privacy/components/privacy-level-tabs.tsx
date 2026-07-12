'use client';

import type React from 'react';
import { useState } from 'react';
import type { NoisyLevel, StoredValues } from 'location-guard-types';
import { Flex, Skeleton, Tabs, Text } from '@radix-ui/themes';
import { NOISY_LEVEL_RANGE } from '@/lib/level-labels';
import { useStoredValue, useSetStoredValue } from '@/lib/use-stored-value';
import { NoisyLevelControls } from './noisy-level-controls';
import type { LatLng } from './privacy-map-preview';
import { PrivacyMapPreview } from './privacy-map-preview';
import { useRealPosition } from './use-real-position';
import { clamp } from 'foxts/clamp';

const MONO_FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

type LevelTab = NoisyLevel | 'fixed' | 'real';
type Levels = StoredValues['levels'];

// Mirrors storage.ts's DEFAULT_VALUE.fixedPos — used only as the map's initial center
// while the real stored value is still loading over the bridge.
const DEFAULT_FIXED_POS: LatLng = { latitude: -4.448784, longitude: -171.24832 };

function formatCoords(latitude: number, longitude: number) {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
}

function formatRealPositionStatus(realPos: LatLng & { accuracy: number } | undefined, realPosError: Error | undefined) {
  if (realPosError) return `Location unavailable: ${realPosError.message}`;
  if (!realPos) return '00.0000° N, 000.0000° E';
  return `${formatCoords(realPos.latitude, realPos.longitude)} — reported accuracy ±${Math.round(realPos.accuracy)} m`;
}

function getMapVisualization(levelTab: LevelTab, levels: Levels | undefined, realAccuracy: number | undefined) {
  if (levelTab === 'fixed') {
    return {};
  }
  if (levelTab === 'real') {
    // No noise applied: the halo is the device's own genuine reported accuracy, not an estimate.
    return realAccuracy === undefined ? {} : { protectionRadius: realAccuracy };
  }
  if (!levels) {
    return {};
  }
  const { radius } = levels[levelTab];
  return { accuracyRadius: radius, protectionRadius: radius * 0.42 };
}

// Web Mercator meters-per-pixel at zoom 0, latitude 0 (Leaflet's default CRS, 256px tiles).
const WORLD_METERS_PER_PIXEL_AT_EQUATOR = 156543.03392;
// How large the noise-radius circle should read on screen, regardless of its real size.
// Kept modest on purpose — leaves enough surrounding map visible that the preview doesn't
// read as an extreme close-up.
const DESIRED_CIRCLE_PIXEL_RADIUS = 72;

const PRECISE_ZOOM = 17;
const MIN_ZOOM = 3;
const MAX_ZOOM = 17;

/** Zoom level at which a circle of `radiusMeters` (at `latitude`) renders at `DESIRED_CIRCLE_PIXEL_RADIUS`. */
function zoomForRadius(radiusMeters: number, latitude: number): number {
  const metersPerPixelAtZoom0 = WORLD_METERS_PER_PIXEL_AT_EQUATOR * Math.cos(latitude * Math.PI / 180);
  const zoom = Math.log2(metersPerPixelAtZoom0 * DESIRED_CIRCLE_PIXEL_RADIUS / radiusMeters);
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

// The first-visit-only zoom for a tab — bigger noise radii (e.g. High) zoom out further
// than smaller ones (Low), so each tab's circle reads at roughly the same on-screen size.
function getInitialZoom(levelTab: LevelTab, levels: Levels | undefined, realAccuracy: number | undefined, latitude: number): number {
  if (levelTab === 'fixed') return PRECISE_ZOOM;
  if (levelTab === 'real') return realAccuracy === undefined ? PRECISE_ZOOM : zoomForRadius(realAccuracy, latitude);
  if (!levels) return PRECISE_ZOOM;
  return zoomForRadius(levels[levelTab].radius, latitude);
}

interface PrivacyLevelTabsProps {
  fixedInfo: React.ReactNode,
  realInfo: React.ReactNode,
  noisyInfo: React.ReactNode,
  pageHeader: React.ReactNode
}

export function PrivacyLevelTabs({ fixedInfo, realInfo, noisyInfo, pageHeader }: PrivacyLevelTabsProps) {
  const [levelTab, setLevelTab] = useState<LevelTab>('low');

  const { data: levels, isLoading: levelsLoading, error: levelsError } = useStoredValue('levels');
  const { trigger: setLevels, isMutating: levelsMutating } = useSetStoredValue('levels');
  const { data: fixedPos, isLoading: fixedPosLoading } = useStoredValue('fixedPos');
  const { trigger: setFixedPos } = useSetStoredValue('fixedPos');

  // Real position is needed for every tab except "Fixed" (which is a user-chosen point,
  // not derived from the device's actual location) — Low/Medium/High noise is added on
  // top of the real position, so their preview should center on it too, not on fixedPos.
  const { data: realPos, error: realPosError, isLoading: realPosLoading } = useRealPosition(levelTab !== 'fixed');

  const commitLevel = (level: NoisyLevel, patch: Partial<{ radius: number, cacheTime: number }>) => {
    if (!levels) return;
    void setLevels({ ...levels, [level]: { ...levels[level], ...patch } });
  };

  const mapVisualization = getMapVisualization(levelTab, levels, realPos?.accuracy);
  const controlsDisabled = levelsMutating || !!levelsError;
  const mapCenter = levelTab !== 'fixed' && realPos ? realPos : (fixedPos ?? DEFAULT_FIXED_POS);
  const initialZoom = getInitialZoom(levelTab, levels, realPos?.accuracy, mapCenter.latitude);

  return (
    <Flex direction="column" gap="5">
      {pageHeader}
      <Tabs.Root
        value={levelTab}
        onValueChange={(value) => {
          setLevelTab(value as LevelTab);
        }}
      >
        <Tabs.List>
          <Tabs.Trigger value="low">Low noise</Tabs.Trigger>
          <Tabs.Trigger value="medium">Medium noise</Tabs.Trigger>
          <Tabs.Trigger value="high">High noise</Tabs.Trigger>
          <Tabs.Trigger value="fixed">Fixed location</Tabs.Trigger>
          <Tabs.Trigger value="real">Real location</Tabs.Trigger>
        </Tabs.List>

        {(['low', 'medium', 'high'] as const).map((level) => (
          <Tabs.Content key={level} value={level}>
            <Flex direction="column" gap="4" py="4">{noisyInfo}</Flex>
            <NoisyLevelControls
              radius={levels?.[level].radius}
              cacheMinutes={levels?.[level].cacheTime}
              range={NOISY_LEVEL_RANGE[level]}
              loading={levelsLoading}
              disabled={controlsDisabled}
              onRadiusCommit={(radius) => commitLevel(level, { radius })}
              onCacheMinutesCommit={(cacheTime) => commitLevel(level, { cacheTime })}
            />
          </Tabs.Content>
        ))}

        <Tabs.Content value="fixed">
          <Flex direction="column" gap="4" py="4">{fixedInfo}</Flex>
        </Tabs.Content>

        <Tabs.Content value="real">
          <Flex direction="column" gap="4" py="4">{realInfo}</Flex>
        </Tabs.Content>
      </Tabs.Root>

      <PrivacyMapPreview
        center={mapCenter}
        editable={levelTab === 'fixed'}
        onPositionChange={levelTab === 'fixed' ? (pos) => { void setFixedPos(pos); } : undefined}
        zoomKey={levelTab}
        initialZoom={initialZoom}
        {...mapVisualization}
      />

      {levelTab === 'fixed' && (
        <Skeleton loading={fixedPosLoading}>
          <Text size="2" color="gray" style={{ fontFamily: MONO_FONT }}>
            {fixedPos ? formatCoords(fixedPos.latitude, fixedPos.longitude) : '00.0000° N, 000.0000° E'}
          </Text>
        </Skeleton>
      )}

      {levelTab === 'real' && (
        <Skeleton loading={realPosLoading}>
          <Text size="2" color={realPosError ? 'red' : 'gray'} style={{ fontFamily: MONO_FONT }}>
            {formatRealPositionStatus(realPos, realPosError)}
          </Text>
        </Skeleton>
      )}
    </Flex>
  );
}
