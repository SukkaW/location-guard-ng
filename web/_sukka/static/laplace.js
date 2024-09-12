// Planar Laplace mechanism, based on Marco's demo
//
// This class just implements the mechanism, does no budget management or
// selection of epsilon
//

// constructor
function PlanarLaplace() {
  // fake class
}

PlanarLaplace.earth_radius = 6_378_137; // const, in meters

// convert an angle in radians to degrees and viceversa
PlanarLaplace.prototype.rad_of_deg = function (ang) { return ang * Math.PI / 180; }; ;
PlanarLaplace.prototype.deg_of_rad = function (ang) { return ang * 180 / Math.PI; }; ;

// Mercator projection
// https://wiki.openstreetmap.org/wiki/Mercator
// https://en.wikipedia.org/wiki/Mercator_projection

// getLatLon and getCartesianPosition are inverse functions
// They are used to transfer { x: ..., y: ... } and { latitude: ..., longitude: ... } into one another
PlanarLaplace.prototype.getLatLon = function (cart) {
  const rLon = cart.x / PlanarLaplace.earth_radius;
  const rLat = 2 * (Math.atan(Math.exp(cart.y / PlanarLaplace.earth_radius))) - Math.PI / 2;
  // convert to degrees
  return {
    latitude: this.deg_of_rad(rLat),
    longitude: this.deg_of_rad(rLon)
  };
};

PlanarLaplace.prototype.getCartesian = function (ll) {
  // latitude and longitude are converted in radiants
  return {
    x: PlanarLaplace.earth_radius * this.rad_of_deg(ll.longitude),
    y: PlanarLaplace.earth_radius * Math.log(Math.tan(Math.PI / 4 + this.rad_of_deg(ll.latitude) / 2))
  };
};

// LamberW function on branch -1 (http://en.wikipedia.org/wiki/Lambert_W_function)
PlanarLaplace.prototype.LambertW = function (x) {
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
};

// This is the inverse cumulative polar laplacian distribution function.
PlanarLaplace.prototype.inverseCumulativeGamma = function (epsilon, z) {
  const x = (z - 1) / Math.E;
  return -(this.LambertW(x) + 1) / epsilon;
};

// returns alpha such that the noisy pos is within alpha from the real pos with
// probability at least delta
// (comes directly from the inverse cumulative of the gamma distribution)
//
PlanarLaplace.prototype.alphaDeltaAccuracy = function (epsilon, delta) {
  return this.inverseCumulativeGamma(epsilon, delta);
};

// returns the average distance between the real and the noisy pos
//
PlanarLaplace.prototype.expectedError = function (epsilon) {
  return 2 / epsilon;
};

PlanarLaplace.prototype.addPolarNoise = function (epsilon, pos) {
  // random number in [0, 2*PI)
  const theta = Math.random() * Math.PI * 2;
  // random variable in [0,1)
  const z = Math.random();
  const r = this.inverseCumulativeGamma(epsilon, z);

  return this.addVectorToPos(pos, r, theta);
};

PlanarLaplace.prototype.addPolarNoiseCartesian = function (epsilon, pos) {
  if ('latitude' in pos) pos = this.getCartesian(pos);

  // random number in [0, 2*PI)
  const theta = Math.random() * Math.PI * 2;
  // random variable in [0,1)
  const z = Math.random();
  const r = this.inverseCumulativeGamma(epsilon, z);

  return this.getLatLon({
    x: pos.x + r * Math.cos(theta),
    y: pos.y + r * Math.sin(theta)
  });
};

// http://www.movable-type.co.uk/scripts/latlong.html
PlanarLaplace.prototype.addVectorToPos = function (pos, distance, angle) {
  const ang_distance = distance / PlanarLaplace.earth_radius;
  const lat1 = this.rad_of_deg(pos.latitude);
  const lon1 = this.rad_of_deg(pos.longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang_distance)
    + Math.cos(lat1) * Math.sin(ang_distance) * Math.cos(angle)
  );
  let lon2 = lon1
    + Math.atan2(
      Math.sin(angle) * Math.sin(ang_distance) * Math.cos(lat1),
      Math.cos(ang_distance) - Math.sin(lat1) * Math.sin(lat2)
    );
  // eslint-disable-next-line @stylistic/js/no-mixed-operators -- formula
  lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // normalise to -180..+180
  return {
    latitude: this.deg_of_rad(lat2),
    longitude: this.deg_of_rad(lon2)
  };
};

// This function generates the position of a point with Laplacian noise
//
PlanarLaplace.prototype.addNoise = function (epsilon, pos) {
  // TODO: use latlon.js
  return this.addPolarNoise(epsilon, pos);
};

window.PlanarLaplace = new PlanarLaplace();
