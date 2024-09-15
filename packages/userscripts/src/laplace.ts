// Planar Laplace mechanism, based on Marco's demo
//
// This class just implements the mechanism, does no budget management or
// selection of epsilon
//

import type { Position, PositionXY, PlanarLaplaceLike } from 'location-guard-types';

// constructor
export const PlanarLaplace: PlanarLaplaceLike = {
  /** convert an angle in radians to degrees and viceversa */
  rad_of_deg(this: void, ang: number) {
    return ang * Math.PI / 180;
  },
  deg_of_rad(this: void, ang: number) {
    return ang * 180 / Math.PI;
  },

  /**
   * Mercator projection
   * https://wiki.openstreetmap.org/wiki/Mercator
   * https://en.wikipedia.org/wiki/Mercator_projection
   *
   * getLatLon and getCartesianPosition are inverse functions
   * They are used to transfer { x: ..., y: ... } and { latitude: ..., longitude: ... } into one another
   */
  getLatLon(this: void, { x, y }: PositionXY): Position {
    const rLon = x / PlanarLaplace.earth_radius;
    const rLat = 2 * (Math.atan(Math.exp(y / PlanarLaplace.earth_radius))) - Math.PI / 2;
    // convert to degrees
    return {
      latitude: PlanarLaplace.deg_of_rad(rLat),
      longitude: PlanarLaplace.deg_of_rad(rLon)
    };
  },

  getCartesian(this: void, { longitude, latitude }: Position): PositionXY {
    // latitude and longitude are converted in radiants
    return {
      x: PlanarLaplace.earth_radius * PlanarLaplace.rad_of_deg(longitude),
      y: PlanarLaplace.earth_radius * Math.log(Math.tan(Math.PI / 4 + PlanarLaplace.rad_of_deg(latitude) / 2))
    };
  },

  /** LamberW function on branch -1 (http://en.wikipedia.org/wiki/Lambert_W_function) */
  LambertW(this: void, x: number) {
    // min_diff decides when the while loop should stop
    const min_diff = 1e-10;
    if (x === -1 / Math.E) {
      return -1;
    }

    if (x < 0 && x > -1 / Math.E) {
      let q = Math.log(-x);
      let p = 1;
      while (Math.abs(p - q) > min_diff) {
        p = (q * q + x / Math.exp(q)) / (q + 1);
        q = (p * p + x / Math.exp(p)) / (p + 1);
      }
      // This line decides the precision of the float number that would be returned
      return (Math.round(1_000_000 * q) / 1_000_000);
    }
    if (x === 0) { return 0; }
    // TODO why do you need this if branch?

    return 0;
  },

  /** This is the inverse cumulative polar laplacian distribution function. */
  inverseCumulativeGamma(this: void, epsilon: number, z: number) {
    const x = (z - 1) / Math.E;
    return -(PlanarLaplace.LambertW(x) + 1) / epsilon;
  },

  /**
   * returns alpha such that the noisy pos is within alpha from the real pos with
   * probability at least delta
   * (comes directly from the inverse cumulative of the gamma distribution)
   */
  alphaDeltaAccuracy(this: void, epsilon: number, delta: number) {
    return PlanarLaplace.inverseCumulativeGamma(epsilon, delta);
  },

  // returns the average distance between the real and the noisy pos
  //
  expectedError(this: void, epsilon: number) {
    return 2 / epsilon;
  },

  addPolarNoise(this: void, epsilon: number, pos: Position): Position {
    // random number in [0, 2*PI)
    const theta = Math.random() * Math.PI * 2;
    // random variable in [0,1)
    const z = Math.random();
    const r = PlanarLaplace.inverseCumulativeGamma(epsilon, z);

    return PlanarLaplace.addVectorToPos(pos, r, theta);
  },

  addPolarNoiseCartesian(this: void, epsilon: number, pos: Position | PositionXY): Position {
    let x: number, y: number;
    if ('latitude' in pos) {
      const tmp = PlanarLaplace.getCartesian(pos);
      x = tmp.x;
      y = tmp.y;
    } else {
      x = pos.x;
      y = pos.y;
    }

    // random number in [0, 2*PI)
    const theta = Math.random() * Math.PI * 2;
    // random variable in [0,1)
    const z = Math.random();
    const r = PlanarLaplace.inverseCumulativeGamma(epsilon, z);

    return PlanarLaplace.getLatLon({
      x: x + r * Math.cos(theta),
      y: y + r * Math.sin(theta)
    });
  },

  /** http://www.movable-type.co.uk/scripts/latlong.html */
  addVectorToPos(
    this: void,
    { latitude, longitude }: Position,
    distance: number,
    angle: number
  ): Position {
    const ang_distance = distance / PlanarLaplace.earth_radius;
    const lat1 = PlanarLaplace.rad_of_deg(latitude);
    const lon1 = PlanarLaplace.rad_of_deg(longitude);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(ang_distance)
      + Math.cos(lat1) * Math.sin(ang_distance) * Math.cos(angle)
    );
    let lon2 = lon1 + Math.atan2(
      Math.sin(angle) * Math.sin(ang_distance) * Math.cos(lat1),
      Math.cos(ang_distance) - Math.sin(lat1) * Math.sin(lat2)
    );
    // eslint-disable-next-line @stylistic/js/no-mixed-operators -- copy other's formula
    lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // normalise to -180..+180
    return {
      latitude: PlanarLaplace.deg_of_rad(lat2),
      longitude: PlanarLaplace.deg_of_rad(lon2)
    };
  },

  /** This function generates the position of a point with Laplacian noise */
  addNoise(this: void, epsilon: number, pos: Position): Position {
    // TODO: use latlon.js
    return PlanarLaplace.addPolarNoise(epsilon, pos);
  },

  earth_radius: 6_378_137 // const, in meters
};
