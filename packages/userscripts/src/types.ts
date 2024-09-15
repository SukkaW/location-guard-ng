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
