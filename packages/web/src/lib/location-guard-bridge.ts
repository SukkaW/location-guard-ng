import { waitFor } from 'foxts/wait-for';
import type { $LocationGuard } from 'location-guard-types';
import { debugError, debugLog } from './debug-log';

// The userscript defines `window.$locationGuard` asynchronously (after its own
// GM.getValue calls resolve), so it may not exist yet on first render, or ever
// (e.g. this page opened directly, without the userscript installed).
// Poll for it once per page load instead of relying on load-order/event timing.
let bridgePromise: Promise<$LocationGuard | null> | null = null;

export function getLocationGuardBridge(): Promise<$LocationGuard | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  bridgePromise ??= (async () => {
    debugLog('waiting for window.$locationGuard…');
    try {
      const bridge = await waitFor(
        () => (window.$locationGuard?.ready ? window.$locationGuard : null),
        100,
        AbortSignal.timeout(4000)
      );
      debugLog('bridge ready', bridge);
      return bridge;
    } catch (error) {
      debugError('bridge not detected within timeout', {
        // Not `undefined` and not `.ready`? This is the shape mismatch to look at first.
        currentValue: window.$locationGuard,
        error
      });
      return null;
    }
  })();

  return bridgePromise;
}
