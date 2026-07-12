import type { MutableGeolocationPosition, Writable } from 'location-guard-types';

// Mimic native GeolocationCoordinates/GeolocationPosition closely enough that
// pages can't tell the difference in normal use: same fields, the spec'ed
// toJSON() (shipped in Chromium 126+, sites do call it), and the native
// Symbol.toStringTag. Unlike the native ones our fields are plain writable
// instance properties, so the noise pipeline can mutate them.

export class FakeGeolocationCoordinates implements Writable<GeolocationCoordinates> {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;

  constructor(init: Omit<Writable<GeolocationCoordinates>, 'toJSON'>) {
    this.latitude = init.latitude;
    this.longitude = init.longitude;
    this.accuracy = init.accuracy;
    this.altitude = init.altitude;
    this.altitudeAccuracy = init.altitudeAccuracy;
    this.heading = init.heading;
    this.speed = init.speed;
  }

  readonly [Symbol.toStringTag] = 'GeolocationCoordinates';

  toJSON() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      altitude: this.altitude,
      accuracy: this.accuracy,
      altitudeAccuracy: this.altitudeAccuracy,
      heading: this.heading,
      speed: this.speed
    };
  }
}

export class FakeGeolocationPosition implements MutableGeolocationPosition {
  coords: FakeGeolocationCoordinates;
  timestamp: number;

  constructor(coords: Omit<Writable<GeolocationCoordinates>, 'toJSON'>, timestamp: number) {
    // also re-hydrates cached positions, which lose their prototype in GM storage
    this.coords = coords instanceof FakeGeolocationCoordinates ? coords : new FakeGeolocationCoordinates(coords);
    this.timestamp = timestamp;
  }

  readonly [Symbol.toStringTag] = 'GeolocationPosition';

  toJSON() {
    return {
      coords: this.coords.toJSON(),
      timestamp: this.timestamp
    };
  }
}
