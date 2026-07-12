import type { Middleware, SWRHook } from 'swr';
import type { MutationFetcher } from 'swr/mutation';
import { nullthrow } from 'foxts/guard';
import type { $LocationGuard } from 'location-guard-types';
import { getLocationGuardBridge } from './location-guard-bridge';
import { debugError, debugLog } from './debug-log';
import { BRIDGE_KEY, REAL_POSITION_KEY } from './swr-keys';

async function requireBridge(): Promise<$LocationGuard> {
  return nullthrow(await getLocationGuardBridge(), 'Location Guard userscript bridge is not available.');
}

/**
 * Wraps a fetcher so it receives the resolved bridge as its first argument instead of
 * each call site repeating the "is the bridge available" check, and logs the call under
 * `label` so a failed read/write shows up clearly in the console.
 *
 * Only `bridgeMiddleware` below should call this. `useSWRMutation` is implemented as
 * `withMiddleware(useSWR, mutation)` (see swr/dist/_internal), which merges the calling
 * component's local `use` config with the *global* `SWRConfig` `use` array before
 * delegating to the real `useSWR` — so `bridgeMiddleware`, registered globally, wraps
 * `useSWRMutation` fetchers too. Wrapping a mutation fetcher here a second time shifts
 * every positional argument by one and silently breaks `{ arg }` destructuring.
 */
function withBridge<T, A extends unknown[]>(label: string, fn: (bridge: $LocationGuard, ...args: A) => Promise<T>) {
  return async (...args: A): Promise<T> => {
    const bridge = await requireBridge();
    debugLog(label, 'started', args);
    try {
      const result = await fn(bridge, ...args);
      debugLog(label, 'succeeded', result);
      return result;
    } catch (error) {
      debugError(label, 'failed', error);
      throw error;
    }
  };
}

/**
 * Global SWR middleware (registered via `<SWRConfig value={{ use: [bridgeMiddleware] }}>`):
 * applies `withBridge` to every `useSWR`/`useSWRMutation` fetcher automatically (both are
 * covered — see the note on `withBridge` above), so hooks like `useStoredValue`/
 * `useSetStoredValue` author plain `(bridge, ...) => ...` fetchers and never call
 * `withBridge` themselves. Skips the bridge probe itself (`useLocationGuardBridge`, keyed
 * by `BRIDGE_KEY`), since that hook's whole purpose is to report "no bridge" as valid data
 * rather than an error. Also skips `REAL_POSITION_KEY` (`useRealPosition`), which calls
 * `navigator.geolocation` directly and has nothing to do with the userscript bridge.
 */
export const bridgeMiddleware: Middleware = (useSWRNext: SWRHook) => (key, fetcher, config) => {
  if (!fetcher || key === BRIDGE_KEY || key === REAL_POSITION_KEY) {
    return useSWRNext(key, fetcher, config);
  }
  const label = `swr:${JSON.stringify(key)}`;
  const wrapped = withBridge(label, fetcher as unknown as (bridge: $LocationGuard, ...args: unknown[]) => Promise<unknown>);
  return useSWRNext(key, wrapped as typeof fetcher, config);
};

/**
 * `useSWRMutation`'s own overloads require a fetcher shaped `(key, { arg }) => ...`,
 * matching the SWR key type — they have no way to express "the global middleware injects
 * an extra leading argument". Use this at each `useSWRMutation` call site to author the
 * fetcher as `(bridge, key, { arg }) => ...` (as `bridgeMiddleware` actually calls it at
 * runtime) while still satisfying the compiler.
 */
export function asMutationFetcher<Data, SWRKey extends string | readonly unknown[], ExtraArg = never>(
  fn: (bridge: $LocationGuard, key: SWRKey, options: { arg: ExtraArg }) => Promise<Data>
): MutationFetcher<Data, SWRKey, ExtraArg> {
  // The whole point of this helper is telling TypeScript something it can't verify
  // structurally: that `bridgeMiddleware` injects `bridge` as an extra runtime argument
  // `useSWRMutation`'s own types don't model. `unknown` is required so `fn`'s literal
  // parameter types don't leak into the asserted result.
  // eslint-disable-next-line sukka/type/no-force-cast-via-top-type -- intentional, see above
  return fn as unknown as MutationFetcher<Data, SWRKey, ExtraArg>;
}
