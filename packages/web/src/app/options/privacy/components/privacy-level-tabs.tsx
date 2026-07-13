'use client';

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { NoisyLevel, StoredValues } from 'location-guard-types';
import { Flex, Skeleton, Tabs, Text } from '@radix-ui/themes';
import { MapProvider, useMap } from 'react-map-gl/maplibre';

import { NOISY_LEVEL_RANGE } from '@/lib/level-labels';
import { useStoredValue, useSetStoredValue } from '@/lib/use-stored-value';
import { NoisyLevelControls } from './noisy-level-controls';
import type { LatLng } from './privacy-map-preview';
import { PrivacyMapPreview } from './privacy-map-preview';
import { preloadRealPosition, useRealPosition } from './use-real-position';
import { clamp } from 'foxts/clamp';
import { useSingleton } from 'foxact/use-singleton';
import { waitFor } from 'foxts/wait-for';

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
    // No noise applied: the halo is the device's own genuine reported accuracy, not an
    // estimate — same circle (green, "Real Location Accuracy Area") as on the noisy tabs.
    return realAccuracy === undefined ? {} : { realAccuracyRadius: realAccuracy };
  }
  // Low/Medium/High: show the real device accuracy alongside the two noise-derived
  // circles, so it's clear how the noise range compares to the actual GPS reading.
  const realAccuracyRadius = realAccuracy === undefined ? {} : { realAccuracyRadius: realAccuracy };
  if (!levels) {
    return realAccuracyRadius;
  }
  const { radius } = levels[levelTab];
  return { ...realAccuracyRadius, accuracyRadius: radius, protectionRadius: radius * 0.42 };
}

function getMapCenter(levelTab: LevelTab, fixedPos: LatLng | undefined, realPos: LatLng | undefined) {
  return (levelTab !== 'fixed' && realPos) ? realPos : (fixedPos ?? DEFAULT_FIXED_POS);
}

// Web Mercator meters-per-pixel at zoom 0, latitude 0 (Leaflet's default CRS, 256px tiles).
const WORLD_METERS_PER_PIXEL_AT_EQUATOR = 156543.03392;
// How large the noise-radius circle should read on screen, regardless of its real size.
// Kept modest on purpose — leaves enough surrounding map visible that the preview doesn't
// read as an extreme close-up.
const DESIRED_CIRCLE_PIXEL_RADIUS = 72;

const PRECISE_ZOOM = 18;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

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

export function PrivacyLevelTabs(props: PrivacyLevelTabsProps) {
  return (
    <MapProvider>
      <PrivacyLevelTabsInner {...props} />
    </MapProvider>
  );
}

preloadRealPosition();

function PrivacyLevelTabsInner({ fixedInfo, realInfo, noisyInfo, pageHeader }: PrivacyLevelTabsProps) {
  const [levelTab, setLevelTab] = useState<LevelTab>('low');

  const mapRef = useMap();

  const { data: levels, isLoading: levelsLoading, error: levelsError } = useStoredValue('levels');
  const { trigger: setLevels, isMutating: levelsMutating } = useSetStoredValue('levels');
  const { trigger: setFixedPos } = useSetStoredValue('fixedPos');

  // These two `onSuccess` hooks are the *only* place fixedPos/realPos ever move the
  // camera outside of a tab switch (handled explicitly in handleTabChange below) — no
  // need to reactively watch a derived `mapCenter` for changes, since we already know
  // exactly which two events can move it. `onSuccess` fires only for this hook's own
  // fetch/revalidation, never for a sibling mutation's `populateCache` (e.g. dragging
  // the marker), so this can't fight the user's own edits — see useStoredValue's docs.
  const lastFixedPosCenterRef = useRef<LatLng | null>(null);
  // to avoid race condition, we wait for map to mount after we load stored value
  const { data: fixedPos, isLoading: fixedPosLoading } = useStoredValue(
    mapRef.privacy_map ? 'fixedPos' : null,
    {
      async onSuccess(pos) {
        if (levelTab !== 'fixed') return;

        const map = await waitFor(() => mapRef.privacy_map, 20);

        if (lastFixedPosCenterRef.current?.latitude === pos.latitude && lastFixedPosCenterRef.current.longitude === pos.longitude) return;
        // This is effectively the map's first real paint for this tab (until now it's
        // been sitting at initialViewState's fallback), so apply the correct zoom for
        // `pos`'s latitude too, not just its center.
        // 'fixed' ignores the realAccuracy param entirely, so there's no need to (and,
        // being declared below, no way to cleanly) reference `realPos` here.
        map.jumpTo({ center: [pos.longitude, pos.latitude], zoom: getInitialZoom('fixed', levels, undefined, pos.latitude) });
        lastFixedPosCenterRef.current = pos;
      }
    }
  );

  // Real position is needed for every tab except "Fixed" (which is a user-chosen point,
  // not derived from the device's actual location) — Low/Medium/High noise is added on
  // top of the real position, so their preview should center on it too, not on fixedPos.
  const lastRealPosCenterRef = useRef<LatLng | null>(null);
  // to avoid race condition, we wait for map to mount after we load stored value
  // but we still preload the real position on page load, so we can render as soon as map mounts
  const { data: realPos, error: realPosError, isLoading: realPosLoading } = useRealPosition(
    !!mapRef.privacy_map,
    {
      async onSuccess(pos) {
        if (levelTab === 'fixed') return;

        const map = await waitFor(() => mapRef.privacy_map, 20);

        if (lastRealPosCenterRef.current?.latitude === pos.latitude && lastRealPosCenterRef.current.longitude === pos.longitude) return;
        // Same as fixedPos's onSuccess above — this is the first time we know the real
        // center, so recompute zoom for `pos`'s latitude/accuracy instead of leaving
        // whatever initialViewState guessed from the fallback center.
        map.jumpTo({ center: [pos.longitude, pos.latitude], zoom: getInitialZoom(levelTab, levels, pos.accuracy, pos.latitude) });
        lastRealPosCenterRef.current = pos;
      }
    }
  );

  const commitLevel = (level: NoisyLevel, patch: Partial<{ radius: number, cacheTime: number }>) => {
    if (!levels) return;
    setLevels({ ...levels, [level]: { ...levels[level], ...patch } });
  };

  const mapVisualization = getMapVisualization(levelTab, levels, realPos?.accuracy);
  const controlsDisabled = levelsMutating || !!levelsError;
  const mapCenter = getMapCenter(levelTab, fixedPos, realPos);
  const initialZoom = getInitialZoom(levelTab, levels, realPos?.accuracy, mapCenter.latitude);

  // The map is uncontrolled (see PrivacyMapPreview) — instead of feeding it center/zoom as
  // props every render, we drive its camera imperatively via the shared `useMap()` handle,
  // only at the moments that actually warrant moving it: a tab switch (here) or fixedPos/
  // realPos resolving asynchronously (the two `onSuccess` hooks above).
  const zoomByTabRef = useSingleton(() => new Map<LevelTab, number>());

  const handleTabChange = useCallback((nextTab: LevelTab) => {
    if (mapRef.privacy_map) {
      // Remember the tab we're leaving at whatever zoom the user left it at.
      zoomByTabRef.current.set(levelTab, mapRef.privacy_map.getZoom());

      const nextCenter = getMapCenter(nextTab, fixedPos, realPos);
      const nextZoom = zoomByTabRef.current.get(nextTab) ?? getInitialZoom(nextTab, levels, realPos?.accuracy, nextCenter.latitude);

      mapRef.privacy_map.flyTo({ center: [nextCenter.longitude, nextCenter.latitude], zoom: nextZoom });
    }
    setLevelTab(nextTab);
  }, [fixedPos, levelTab, levels, mapRef.privacy_map, realPos, zoomByTabRef]);

  return (
    <Flex direction="column" gap="5">
      {pageHeader}
      <Tabs.Root
        value={levelTab}
        onValueChange={(value) => handleTabChange(value as LevelTab)}
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
        initialZoom={initialZoom}
        shouldRenderPin={levelTab === 'fixed'}
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
