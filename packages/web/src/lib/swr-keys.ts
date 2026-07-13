import type { StoredValues } from 'location-guard-types';

const STORED_VALUE_KEY_PREFIX = 'location-guard-value';
export const SITE_LEVELS_KEY = 'location-guard-site-levels';
export const BRIDGE_KEY = 'location-guard-bridge';
export const REAL_POSITION_KEY = 'location-guard-real-position';

export function storedValueKey<K extends keyof StoredValues>(key: K | null) {
  if (key === null) return null;
  return [STORED_VALUE_KEY_PREFIX, key] as const;
}

export function isStoredValueKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === STORED_VALUE_KEY_PREFIX;
}
