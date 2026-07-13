'use client';

import { useMemo, useRef, useState } from 'react';
import { Map as MapGL, Marker, Source, Layer, NavigationControl, AttributionControl } from '@vis.gl/react-maplibre';
import type { MapLayerMouseEvent, MarkerDragEvent, ViewStateChangeEvent } from '@vis.gl/react-maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { MapPinIcon } from 'lucide-react';
import { useComponentWillReceiveUpdate } from 'foxact/use-component-will-receive-update';
import styles from './privacy-map-preview.module.css';

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
  layers: [
    { id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }
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
  /** Real-world radius in meters — projected onto the map as an actual geographic circle. */
  accuracyRadius?: number,
  protectionRadius?: number,
  editable?: boolean,
  onPositionChange?: (pos: LatLng) => void,
  height?: number,
  /** Opaque key (e.g. the active tab) this preview remembers its zoom level under. */
  zoomKey: string,
  /** Zoom to use the first time `zoomKey` is seen — ignored once the user has zoomed on it. */
  initialZoom?: number
}

export function PrivacyMapPreview({ center, accuracyRadius, protectionRadius, editable = false, onPositionChange, height = 460, zoomKey, initialZoom = 13 }: PrivacyMapPreviewProps) {
  // Per-`zoomKey` remembered zoom, updated on every zoom end (user gesture or programmatic).
  const zoomByKeyRef = useRef(new Map<string, number>());
  const [longitude, setLongitude] = useState(center.longitude);
  const [latitude, setLatitude] = useState(center.latitude);
  const [zoom, setZoom] = useState(initialZoom);

  // Re-center (fixedPos/real position resolving async) and restore this tab's remembered
  // zoom (or `initialZoom` on first visit) whenever the coordinate or the active tab changes.
  // Safe to always re-apply the remembered zoom here, even when only the coordinate moved:
  // `zoomByKeyRef` is kept live by `onZoomEnd` below, so it already equals the current zoom
  // unless the tab actually just changed.
  useComponentWillReceiveUpdate(() => {
    setLongitude(center.longitude);
    setLatitude(center.latitude);
    setZoom(zoomByKeyRef.current.get(zoomKey) ?? initialZoom);
  }, [center.latitude, center.longitude, zoomKey]);

  const accuracyCircle = useMemo(
    () => (accuracyRadius === undefined ? null : circlePolygon(center.longitude, center.latitude, accuracyRadius)),
    [center.latitude, center.longitude, accuracyRadius]
  );
  const protectionCircle = useMemo(
    () => (protectionRadius === undefined ? null : circlePolygon(center.longitude, center.latitude, protectionRadius)),
    [center.latitude, center.longitude, protectionRadius]
  );
  const showLegend = accuracyRadius !== undefined || protectionRadius !== undefined;

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.mapContainer} style={{ height }}>
        <MapGL
          longitude={longitude}
          latitude={latitude}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          mapStyle={OSM_RASTER_STYLE}
          attributionControl={false}
          onMove={(event: ViewStateChangeEvent) => {
            setLongitude(event.viewState.longitude);
            setLatitude(event.viewState.latitude);
            setZoom(event.viewState.zoom);
          }}
          onZoomEnd={(event: ViewStateChangeEvent) => zoomByKeyRef.current.set(zoomKey, event.viewState.zoom)}
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

          {accuracyCircle && (
            <Source id="accuracy-circle" type="geojson" data={accuracyCircle}>
              <Layer id="accuracy-circle-fill" type="fill" paint={{ 'fill-color': '#0090ff', 'fill-opacity': 0.28 }} />
              <Layer id="accuracy-circle-line" type="line" paint={{ 'line-color': '#0090ff', 'line-width': 2, 'line-opacity': 0.9 }} />
            </Source>
          )}
          {protectionCircle && (
            <Source id="protection-circle" type="geojson" data={protectionCircle}>
              <Layer id="protection-circle-fill" type="fill" paint={{ 'fill-color': '#e5484d', 'fill-opacity': 0.38 }} />
              <Layer id="protection-circle-line" type="line" paint={{ 'line-color': '#e5484d', 'line-width': 2, 'line-opacity': 0.9 }} />
            </Source>
          )}

          <Marker
            longitude={center.longitude}
            latitude={center.latitude}
            draggable={editable}
            onDragEnd={(event: MarkerDragEvent) => {
              onPositionChange?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
            }}
          >
            <MapPinIcon
              size={28}
              color="var(--accent-9)"
              fill="var(--accent-9)"
              strokeWidth={1.5}
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))' }}
            />
          </Marker>
        </MapGL>
      </div>
      {showLegend && (
        <div className={styles.legend}>
          {protectionRadius !== undefined && (
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#e5484d' }} />
              {' '}Device Report Accuracy Area
            </span>
          )}
          {accuracyRadius !== undefined && (
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#0090ff' }} />
              {' '}Script Protection Area
            </span>
          )}
        </div>
      )}
    </div>
  );
}
