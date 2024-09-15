import type { StoredValues } from 'location-guard-types';

export const DEFAULT_VALUE: StoredValues = {
  defaultLevel: 'fixed',
  paused: false,
  cachedPos: {},
  fixedPos: {
    latitude: -4.448784,
    longitude: -171.24832
  },
  updateAccuracy: true,
  epsilon: 2,
  levels: {
    low: {
      radius: 200,
      cacheTime: 10
    },
    medium: {
      radius: 500,
      cacheTime: 30
    },
    high: {
      radius: 2000,
      cacheTime: 60
    }
  }
  // domainLevel: {} // TODO: per domain level
};

export function getStoredValueAsync<T extends keyof StoredValues>(key: T, providedDefaultValue?: StoredValues[T]): Promise<StoredValues[T]> {
  return GM.getValue(key, providedDefaultValue ?? DEFAULT_VALUE[key]);
}

export function setStoredValueAsync<T extends keyof StoredValues>(key: T, value: StoredValues[T]): Promise<void> {
  return GM.setValue(key, value as any);
}

export function getStoredValueSync<T extends keyof StoredValues>(key: T, providedDefaultValue?: StoredValues[T]): StoredValues[T] {
  return GM_getValue(key, providedDefaultValue ?? DEFAULT_VALUE[key]);
}
export function setStoredValueSync<T extends keyof StoredValues>(key: T, value: StoredValues[T]): void {
  return GM_setValue(key, value as any);
}
