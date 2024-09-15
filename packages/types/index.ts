export interface Position {
  latitude: number,
  longitude: number
}

export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export interface MutableGeolocationPosition {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationPosition/coords) */
  coords: MutableGeolocationCoords,
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationPosition/timestamp) */
  timestamp: EpochTimeStamp
}

export type MutableGeolocationCoords = Omit<Writable<GeolocationCoordinates>, 'toJSON'>;

export type Level = 'fixed' | 'real' | NoisyLevel;
export type NoisyLevel = 'low' | 'medium' | 'high';

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

declare global {
  interface Window {
    $recipage?: {
      ready: boolean
    },
    $locationGuard?: $LocationGuard
  }
}

export interface PositionXY {
  x: number,
  y: number
}

export interface PlanarLaplaceLike {
  rad_of_deg(ang: number): number,
  deg_of_rad(ang: number): number,
  getLatLon({ x, y }: PositionXY): Position,
  getCartesian({ longitude, latitude }: Position): PositionXY,
  LambertW(x: number): number,
  inverseCumulativeGamma(epsilon: number, z: number): number,
  addVectorToPos(pos: Position, distance: number, angle: number): Position,
  addPolarNoise(epsilon: number, pos: Position): Position,
  alphaDeltaAccuracy(epsilon: number, delta: number): number,
  expectedError(epsilon: number): number,
  addPolarNoiseCartesian(epsilon: number, pos: Position | PositionXY): Position,
  addNoise(epsilon: number, pos: Position): Position,
  earth_radius: number
}

export interface $LocationGuard {
  ready: true,
  PlanarLaplace: PlanarLaplaceLike,
  epsilon: number,
  emptyCachedPos: () => Promise<void>,
  setValue<K extends keyof StoredValues>(key: K, value: StoredValues[K]): Promise<void>,
  getValue<K extends keyof StoredValues>(key: K): Promise<StoredValues[K]>,
  resetConfig: () => Promise<void>
}
