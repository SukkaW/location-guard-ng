'use client';

import { useMemo } from 'react';
import { Map as MapGL, Marker, Source, Layer, NavigationControl, AttributionControl, useMap } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MarkerDragEvent } from 'react-map-gl/maplibre';
import { LocateFixedIcon } from 'lucide-react';
import styles from './privacy-map-preview.module.css';
import { Flex, Box } from '@radix-ui/themes';

import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** A GeoJSON polygon approximating a circle of `radiusMeters` around a point (equirectangular — plenty accurate at the few-km radii used here). */
function circlePolygon(longitude: number, latitude: number, radiusMeters: number, steps = 64) {
  const distanceX = radiusMeters / (111320 * Math.cos(latitude * Math.PI / 180));
  const distanceY = radiusMeters / 110540;
  const coordinates: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coordinates.push([longitude + distanceX * Math.cos(theta), latitude + distanceY * Math.sin(theta)]);
  }
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coordinates] }
  };
}

export interface LatLng {
  latitude: number,
  longitude: number
}

interface PrivacyMapPreviewProps {
  center: LatLng,
  /** Zoom for the very first paint only — the map owns its own zoom/pan after that (see PrivacyLevelTabs, which repositions it imperatively via useMap()). */
  initialZoom?: number,
  /** Real-world radius in meters — projected onto the map as an actual geographic circle. */
  realAccuracyRadius?: number,
  accuracyRadius?: number,
  protectionRadius?: number,
  editable?: boolean,
  onPositionChange?: (pos: LatLng) => void,
  height?: number,
  shouldRenderPin?: boolean
}

function RecenterButton({ center }: { center: LatLng }) {
  const mapRef = useMap();
  return (
    <button
      type="button"
      className={styles.recenterButton}
      aria-label="Re-center map"
      onClick={() => mapRef.privacy_map?.flyTo({ center: [center.longitude, center.latitude] })}
    >
      <LocateFixedIcon size={15} />
    </button>
  );
}

export function PrivacyMapPreview({ center, initialZoom = 13, realAccuracyRadius, accuracyRadius, protectionRadius, editable = false, onPositionChange, height = 460, shouldRenderPin = true }: PrivacyMapPreviewProps) {
  const realAccuracyCircle = useMemo(
    () => (realAccuracyRadius === undefined ? null : circlePolygon(center.longitude, center.latitude, realAccuracyRadius)),
    [center.latitude, center.longitude, realAccuracyRadius]
  );
  const accuracyCircle = useMemo(
    () => (accuracyRadius === undefined ? null : circlePolygon(center.longitude, center.latitude, accuracyRadius)),
    [center.latitude, center.longitude, accuracyRadius]
  );
  const protectionCircle = useMemo(
    () => (protectionRadius === undefined ? null : circlePolygon(center.longitude, center.latitude, protectionRadius)),
    [center.latitude, center.longitude, protectionRadius]
  );
  const showLegend = realAccuracyRadius !== undefined || accuracyRadius !== undefined || protectionRadius !== undefined;

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.mapContainer} style={{ height }}>
        <MapGL
          id="privacy_map"
          initialViewState={{ longitude: center.longitude, latitude: center.latitude, zoom: initialZoom }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          attributionControl={false}
          onClick={
            editable
              ? (event: MapLayerMouseEvent) => {
                onPositionChange?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
              }
              : undefined
          }
        >
          <NavigationControl position="top-left" showCompass={false} />
          <RecenterButton center={center} />
          <AttributionControl position="bottom-right" compact />

          {protectionCircle && (
            <Source id="protection-circle" type="geojson" data={protectionCircle}>
              <Layer id="protection-circle-fill" type="fill" paint={{ 'fill-color': '#e5484d', 'fill-opacity': 0.38 }} />
              <Layer id="protection-circle-line" type="line" paint={{ 'line-color': '#e5484d', 'line-width': 2, 'line-opacity': 0.9 }} />
            </Source>
          )}
          {accuracyCircle && (
            <Source id="accuracy-circle" type="geojson" data={accuracyCircle}>
              <Layer id="accuracy-circle-fill" type="fill" paint={{ 'fill-color': '#0090ff', 'fill-opacity': 0.28 }} />
              <Layer id="accuracy-circle-line" type="line" paint={{ 'line-color': '#0090ff', 'line-width': 2, 'line-opacity': 0.9 }} />
            </Source>
          )}
          {realAccuracyCircle && (
            <Source id="real-accuracy-circle" type="geojson" data={realAccuracyCircle}>
              <Layer id="real-accuracy-circle-fill" type="fill" paint={{ 'fill-color': '#30a46c', 'fill-opacity': 0.28 }} />
              <Layer id="real-accuracy-circle-line" type="line" paint={{ 'line-color': '#30a46c', 'line-width': 2, 'line-opacity': 0.9 }} />
            </Source>
          )}

          <Marker
            style={{ display: shouldRenderPin ? 'block' : 'none' }}
            longitude={center.longitude}
            latitude={center.latitude}
            draggable={editable}
            onDragEnd={(event: MarkerDragEvent) => {
              onPositionChange?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
            }}
          />
        </MapGL>
      </div>
      {showLegend && (
        <Flex className={styles.legend} direction="column" gap="1">
          {realAccuracyRadius !== undefined && (
            <Box className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#30a46c' }} />
              {' '}Real Device Location Accuracy
            </Box>
          )}
          {protectionRadius !== undefined && (
            <Box className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#e5484d' }} />
              {' '}Illustrative Reported Accuracy
            </Box>
          )}
          {accuracyRadius !== undefined && (
            <Box className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#0090ff' }} />
              {' '}Script Noise Possible Displacement
            </Box>
          )}
        </Flex>
      )}
    </div>
  );
}
