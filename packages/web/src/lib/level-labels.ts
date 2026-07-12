import type { Level, NoisyLevel } from 'location-guard-types';

export const LEVEL_LABELS: Record<Level, string> = {
  high: 'High noise',
  medium: 'Medium noise',
  low: 'Low noise',
  fixed: 'Use fixed location',
  real: 'Use real location'
};

export const DOMAIN_LEVEL_LABELS: Record<Level, string> = {
  high: 'High noise',
  medium: 'Medium noise',
  low: 'Low noise',
  fixed: 'Fixed location',
  real: 'Real location'
};

export const NOISY_LEVEL_RANGE: Record<NoisyLevel, { min: number, max: number, step: number }> = {
  low: { min: 50, max: 300, step: 10 },
  medium: { min: 200, max: 1000, step: 25 },
  high: { min: 500, max: 3000, step: 50 }
};
