import { getStoredValueAsync, setStoredValueAsync } from './storage';

import { PlanarLaplace } from './laplace';
import { klona } from 'klona/lite';
import type { MutableGeolocationCoords, MutableGeolocationPosition } from './types';

// eslint-disable-next-line @typescript-eslint/unbound-method -- cache original function and will be called with proper this
const watchPosition = navigator.geolocation.watchPosition;
// eslint-disable-next-line @typescript-eslint/unbound-method -- cache original function and will be called with proper this
const getCurrentPosition = navigator.geolocation.getCurrentPosition;
// eslint-disable-next-line @typescript-eslint/unbound-method -- cache original function and will be called with proper this
const clearWatch = navigator.geolocation.clearWatch;

async function callGeoCb(cb: PositionCallback, pos: MutableGeolocationPosition, checkAllowed: boolean): Promise<void>;
async function callGeoCb(cb: PositionErrorCallback | null | undefined, error: GeolocationPositionError, checkAllowed: boolean): Promise<void>;
async function callGeoCb(cb: PositionCallback | PositionErrorCallback | null | undefined, arg: any, checkAllowed: boolean): Promise<void> {
  if (
    cb
    && (!checkAllowed || await isWatchAllowed(false))
  ) {
    cb(arg);
  }
}

export const spoofLocation = (): void => {
  // We replace geolocation methods with our own.
  // getCurrentPosition will be called by the content script (not by the page)
  // so we dont need to keep it at all.

  navigator.geolocation.getCurrentPosition = async function (positionCb, positionOnError, options) {
    // call getNoisyPosition on the content-script
    // call cb1 on success, cb2 on failure
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

    (async () => {
      if (await isWatchAllowed(true)) {
        // We're allowed to call the real watchPosition (note: remember the handler)
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
        this.getCurrentPosition(cb1, cb2, options);
      }
    })();
    return handler;
  };

  navigator.geolocation.clearWatch = function (handler) {
    if (handlers.has(handler)) {
      clearWatch.apply(navigator.geolocation, [handlers.get(handler)!]);
      handlers.delete(handler);
    }
  };
};

const inFrame = window !== window.top;

async function isWatchAllowed(defaultAllowed = false) {
  // Returns true if using the real watch is allowed. Only if paused or level == 'real'.
  // Also don't allow in iframes (to simplify the code).
  const level = await getStoredValueAsync('defaultLevel'); // TODO: per domain level
  const paused = await getStoredValueAsync('paused', defaultAllowed);

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
  // const st = await Browser.storage.get();

  // if level == 'fixed' and fixedPosNoAPI == true, then we return the
  // fixed position without calling the geolocation API at all.
  //
  // const domain = window.location.hostname;
  // TODO: per domain level
  const level = await getStoredValueAsync('defaultLevel');
  const paused = await getStoredValueAsync('paused');

  if (!paused && level === 'fixed') {
    const fixedPos = await getStoredValueAsync('fixedPos');

    const noisy = {
      coords: {
        latitude: fixedPos.latitude,
        longitude: fixedPos.longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    } satisfies MutableGeolocationPosition;
    return { success: true, position: noisy };
  }

  return new Promise(resolve => {
    // we call getCurrentPosition here in the content script, instead of
    // inside the page, because the content-script/page communication is not secure
    //
    getCurrentPosition.apply(navigator.geolocation, [
      async function (position) {
        // clone, modifying/sending the native object returns error
        const noisy = await addNoise(klona(position) as MutableGeolocationPosition);
        resolve({ success: true, position: noisy });
      },
      function (error) {
        resolve({ success: false, position: klona(error) }); // clone, sending the native object returns error
      },
      opt
    ]);
  });
}

// gets position, returs noisy version based on the privacy options
//
async function addNoise(position: MutableGeolocationPosition) {
  const paused = await getStoredValueAsync('paused');
  // TODO: per domain level
  const level = await getStoredValueAsync('defaultLevel');

  if (paused || level === 'real') {
    // do nothing, use real location
  } else if (level === 'fixed') {
    const fixedPos = await getStoredValueAsync('fixedPos');

    position.coords = {
      latitude: fixedPos.latitude,
      longitude: fixedPos.longitude,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    } as MutableGeolocationCoords;
  } else {
    const cachedPos = await getStoredValueAsync('cachedPos');
    const storedEpsilon = await getStoredValueAsync('epsilon');
    const levels = await getStoredValueAsync('levels');

    if ('level' in cachedPos && cachedPos[level] && (Date.now() - cachedPos[level].epoch) / 60000 < cachedPos[level].cacheTime) {
      position = cachedPos[level].position;
      console.log('using cached', position);
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

      console.log('noisy coords', position.coords);
    }
  }

  // return noisy position
  return position;
}
