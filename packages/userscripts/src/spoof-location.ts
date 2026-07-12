import { randomInt } from 'foxts/random-int';
import { getStoredValueAsync, setStoredValueAsync } from './storage';

import { PlanarLaplace } from './laplace';
import type { MutableGeolocationPosition } from 'location-guard-types';
import { isMobileDevice } from './utils';
import { getEffectiveLevel } from './site-levels';
import { debugLog } from './debug';
import { FakeGeolocationCoordinates, FakeGeolocationPosition } from './position';

// eslint-disable-next-line @typescript-eslint/unbound-method -- cache original function and will be called with proper this
const watchPosition = navigator.geolocation.watchPosition;
// eslint-disable-next-line @typescript-eslint/unbound-method -- cache original function and will be called with proper this
const getCurrentPosition = navigator.geolocation.getCurrentPosition;
// eslint-disable-next-line @typescript-eslint/unbound-method -- cache original function and will be called with proper this
const clearWatch = navigator.geolocation.clearWatch;

async function callGeoCb(cb: PositionCallback, pos: MutableGeolocationPosition, checkAllowed: boolean): Promise<void>;
async function callGeoCb(cb: PositionErrorCallback | null | undefined, error: GeolocationPositionError, checkAllowed: boolean): Promise<void>;
async function callGeoCb(cb: PositionCallback | PositionErrorCallback | null | undefined, arg: any, checkAllowed: boolean): Promise<void> {
  if (!cb) {
    debugLog('page provided no callback, dropping', arg);
    return;
  }
  if (checkAllowed && !(await isWatchAllowed())) {
    debugLog('real watch callback suppressed (privacy protection became active after the watch was installed)', arg);
    return;
  }
  debugLog('invoking page callback with', arg);
  cb(arg);
}

export function spoofLocation(): void {
  // We replace geolocation methods with our own.
  // getCurrentPosition will be called by the content script (not by the page)
  // so we dont need to keep it at all.

  navigator.geolocation.getCurrentPosition = async function (positionCb, positionOnError, options) {
    // call getNoisyPosition on the content-script
    // call cb1 on success, cb2 on failure
    debugLog('page called getCurrentPosition', { options });
    const res = await getNoisyPosition(options);
    if (res.success) {
      callGeoCb(positionCb, res.position, false);
    } else {
      callGeoCb(positionOnError, res.position, false);
    }
    // callCb(res.success ? positionCb : positionOnError, res.position, false);
  };

  /** store all watchPosition method's handle id */
  const handlers = new Map<number, number>();

  navigator.geolocation.watchPosition = function (cb1, cb2, options) {
    // We need to return a handler synchronously, but decide whether we'll use the real watchPosition or not
    // asynchronously. So we create our own handler, and we'll associate it with the real one later.
    const handler = Math.floor(Math.random() * 10000);

    debugLog('page called watchPosition', { options, handler });

    (async () => {
      if (await isWatchAllowed()) {
        // We're allowed to call the real watchPosition (note: remember the handler)
        debugLog('watchPosition: paused or level is "real", installing a real watch for handler', handler);
        handlers.set(
          handler,
          watchPosition.apply(navigator.geolocation, [
            position => callGeoCb(cb1, position, true), // ignore the call if privacy protection
            error => callGeoCb(cb2, error, true), // becomes active later!
            options
          ])
        );
      } else {
        // Not allowed, we don't install a real watch, just return the position once
        debugLog('watchPosition: privacy protection active (or in iframe), falling back to a single getCurrentPosition');
        this.getCurrentPosition(cb1, cb2, options);
      }
    })();
    return handler;
  };

  navigator.geolocation.clearWatch = function (handler) {
    debugLog('page called clearWatch', { handler, hasRealWatch: handlers.has(handler) });
    if (handlers.has(handler)) {
      clearWatch.apply(navigator.geolocation, [handlers.get(handler)!]);
      handlers.delete(handler);
    }
  };
}

const inFrame = window !== window.top;

async function isWatchAllowed() {
  // Returns true if using the real watch is allowed. Only if paused or level == 'real'.
  // Also don't allow in iframes (to simplify the code).
  const level = await getEffectiveLevel(window.location.hostname);
  const paused = await getStoredValueAsync('paused');

  return !inFrame && (paused || level === 'real');
}

interface NoisyPositionResultSuccess {
  success: true,
  position: MutableGeolocationPosition
}

interface NoisyPositionResultFailure {
  success: false,
  position: GeolocationPositionError
}

async function getNoisyPosition(opt: PositionOptions | undefined): Promise<NoisyPositionResultSuccess | NoisyPositionResultFailure> {
  const level = await getEffectiveLevel(window.location.hostname);
  const paused = await getStoredValueAsync('paused');

  debugLog('getNoisyPosition', { level, paused, hostname: window.location.hostname });

  if (!paused && level === 'fixed') {
    const fixedPos = await getStoredValueAsync('fixedPos');

    const noisy = new FakeGeolocationPosition({
      latitude: fixedPos.latitude,
      longitude: fixedPos.longitude,
      accuracy: 10,
      altitude: isMobileDevice() ? randomInt(10, 100) : null,
      altitudeAccuracy: isMobileDevice() ? 10 : null,
      heading: isMobileDevice() ? randomInt(0, 360) : null,
      speed: null
    }, Date.now());
    debugLog('returning fixed position without calling the real geolocation API', noisy);
    return { success: true, position: noisy };
  }

  return new Promise(resolve => {
    // we call getCurrentPosition here in the content script, instead of
    // inside the page, because the content-script/page communication is not secure
    //
    debugLog('calling the real getCurrentPosition');
    getCurrentPosition.apply(navigator.geolocation, [
      async function (position) {
        debugLog('real position received from the browser', position, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        const noisy = await addNoise(clonePosition(position));
        resolve({ success: true, position: noisy });
      },
      function (error) {
        // native error properties live on the prototype and often display as
        // an empty object, so log code/message explicitly
        debugLog('error received from the browser', error, { code: error.code, message: error.message });
        // the native error is read-only and same-context, safe to hand to the page as-is
        resolve({ success: false, position: error });
      },
      opt
    ]);
  });
}

// GeolocationPosition/GeolocationCoordinates expose everything as read-only
// accessors on the prototype, so generic clone helpers either pass the native
// object through untouched (mutating it then throws in strict mode) or
// produce an empty object. Copy field by field into our mutable fake.
function clonePosition(position: GeolocationPosition): FakeGeolocationPosition {
  const { coords } = position;
  return new FakeGeolocationPosition({
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    heading: coords.heading,
    speed: coords.speed
  }, position.timestamp);
}

// gets position, returs noisy version based on the privacy options
//
async function addNoise(position: MutableGeolocationPosition) {
  const paused = await getStoredValueAsync('paused');
  const level = await getEffectiveLevel(window.location.hostname);

  if (paused || level === 'real') {
    // do nothing, use real location
  } else if (level === 'fixed') {
    const fixedPos = await getStoredValueAsync('fixedPos');

    position.coords = new FakeGeolocationCoordinates({
      latitude: fixedPos.latitude,
      longitude: fixedPos.longitude,
      accuracy: 10,
      altitude: isMobileDevice() ? randomInt(10, 100) : null,
      altitudeAccuracy: isMobileDevice() ? 10 : null,
      heading: isMobileDevice() ? randomInt(0, 360) : null,
      speed: null
    });
  } else {
    const cachedPos = await getStoredValueAsync('cachedPos');
    const storedEpsilon = await getStoredValueAsync('epsilon');
    const levels = await getStoredValueAsync('levels');

    const cached = cachedPos[level];
    if (cached && (Date.now() - cached.epoch) / 60000 < cached.cacheTime) {
      // GM storage strips the prototype, re-wrap so toJSON() etc. survive the cache
      position = new FakeGeolocationPosition(cached.position.coords, cached.position.timestamp);
      debugLog('using cached noisy position', position);
    } else {
      // add noise
      const epsilon = storedEpsilon / levels[level].radius;

      const noisy = PlanarLaplace.addNoise(epsilon, position.coords);

      position.coords.latitude = noisy.latitude;
      position.coords.longitude = noisy.longitude;

      // update accuracy
      if (
        position.coords.accuracy
        && await getStoredValueAsync('updateAccuracy')
      ) {
        position.coords.accuracy += Math.round(PlanarLaplace.alphaDeltaAccuracy(epsilon, .9));
      }

      // don't know how to add noise to those, so we set to null (they're most likely null anyway)
      position.coords.altitude = null;
      position.coords.altitudeAccuracy = null;
      position.coords.heading = null;
      position.coords.speed = null;

      // cache
      cachedPos[level] = { epoch: Date.now(), position, cacheTime: levels[level].cacheTime };
      await setStoredValueAsync('cachedPos', cachedPos);

      debugLog('noisy position generated and cached', position.coords);
    }
  }

  // return noisy position
  return position;
}
