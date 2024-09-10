import type { MutableGeolocationPosition, Position } from './types';

type Level = 'fixed' | 'real' | NoisyLevel;
type NoisyLevel = 'low' | 'medium' | 'high';

export interface StoredValues {
  defaultLevel: Level,
  /** settings per level */
  levels: Record<NoisyLevel, {
    radius: number,
    cacheTime: number
  }>,
  updateAccuracy: boolean,
  epsilon: number,
  cachedPos: Partial<Record<Level, {
    epoch: number,
    cacheTime: number,
    position: MutableGeolocationPosition
  }>>,
  paused: boolean,
  fixedPos: Position
}

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