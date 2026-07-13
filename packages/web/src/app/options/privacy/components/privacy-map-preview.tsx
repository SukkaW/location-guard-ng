'use client';

import { useMemo } from 'react';
import { Map as MapGL, Marker, Source, Layer, NavigationControl, AttributionControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MarkerDragEvent } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import styles from './privacy-map-preview.module.css';
import { Flex, Box } from '@radix-ui/themes';

import 'maplibre-gl/dist/maplibre-gl.css';

// No vector-tile host/API key on hand, so this is a plain raster style pointing at OSM —
// the same tile source the old Leaflet version used.
const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      // OSM's tile server only has tiles up to z19 and 400s on anything past that — this
      // (not the layer's maxzoom below, which only clamps paint visibility, not fetching)
      // is what tells MapLibre to stop requesting deeper tiles and over-zoom the z19 one.
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
    }
  },
  // No maxzoom here: the layer's maxzoom is an *exclusive* cutoff (hidden at zoom >= maxzoom),
  // which would blank the layer out right at the Map's own maxZoom={19}. The source's
  // maxzoom above already stops tile fetching / over-zooms the last tile past z19.
  layers: [
    { id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0 }
  ]
};

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
          mapStyle={OSM_RASTER_STYLE}
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
