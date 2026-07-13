'use client';

import { REAL_POSITION_KEY } from '@/lib/swr-keys';
import useSWRImmutable from 'swr/immutable';
import { preload } from 'swr';
import type { SWRConfiguration } from 'swr';

export interface RealPosition {
  latitude: number,
  longitude: number,
  accuracy: number
}

function fetchRealPosition(): Promise<RealPosition> {
  return new Promise((resolve, reject) => {
    // If this browser has no Geolocation API, the call below throws synchronously,
    // which the Promise executor turns into a rejection — no manual guard needed.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => reject(new Error(error.message)),
      { enableHighAccuracy: false, maximumAge: 60000 }
    );
  });
}

/**
 * Calls `navigator.geolocation` directly (not through the userscript bridge) — the
 * userscript never installs its faking patches on this app's own origin, so it's the
 * only way to show the device's genuine reported accuracy on the "Real location" tab.
 * Gated by `enabled` so switching to that tab, not loading the page, triggers the
 * browser's permission prompt.
 */
export function useRealPosition(enabled: boolean, options?: SWRConfiguration<RealPosition>) {
  return useSWRImmutable(enabled ? REAL_POSITION_KEY : null, fetchRealPosition, options);
}

export function preloadRealPosition() {
  return preload(REAL_POSITION_KEY, fetchRealPosition);
}
