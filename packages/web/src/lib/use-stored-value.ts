import useSWR, { mutate } from 'swr';
import type { SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { $LocationGuard, StoredValues } from 'location-guard-types';
import { getLocationGuardBridge } from './location-guard-bridge';
import { asMutationFetcher } from './swr-bridge-middleware';
import { isStoredValueKey, storedValueKey, SITE_LEVELS_KEY, BRIDGE_KEY } from './swr-keys';

/**
 * Reads a single StoredValues field from the userscript bridge (GM.getValue), via SWR.
 * The fetcher takes `bridge` as its first argument — `bridgeMiddleware` (registered
 * globally in AppSWRConfig) resolves it and throws before this ever runs if it's missing.
 * `options` (e.g. `onSuccess`) is only ever invoked by this hook's own fetch/revalidation —
 * a sibling `useSetStoredValue` mutation's `populateCache` updates `data` without going
 * through it, so it's safe to use `onSuccess` for "this value just loaded" side effects.
 */
export function useStoredValue<K extends keyof StoredValues>(key: K | null, options?: SWRConfiguration<StoredValues[K]>) {
  return useSWR(storedValueKey(key), (bridge: $LocationGuard) => bridge.getValue(key!), options);
}

/**
 * Writes a single StoredValues field through the userscript bridge (GM.setValue), via SWR
 * mutation. Like `useStoredValue` above, `bridgeMiddleware` (global, via AppSWRConfig)
 * resolves `bridge` — `useSWRMutation` is built on top of `useSWR` internally, so it's
 * covered by the same global middleware and must NOT also be wrapped with `withBridge`
 * here (that double-wraps and shifts `{ arg }` out of place).
 */
export function useSetStoredValue<K extends keyof StoredValues>(key: K) {
  return useSWRMutation(
    storedValueKey(key),
    asMutationFetcher<StoredValues[K], NonNullable<ReturnType<typeof storedValueKey<K>>>, StoredValues[K]>(
      async (bridge, _key, { arg }) => {
        await bridge.setValue(key, arg);
        return arg;
      }
    ),
    { populateCache: true, revalidate: false }
  );
}

/** Reactive status of the userscript bridge itself, for connectivity banners. */
export function useLocationGuardBridge() {
  return useSWR(BRIDGE_KEY, getLocationGuardBridge, {
    revalidateOnFocus: false,
    revalidateIfStale: false
  });
}

/** Re-fetches every known StoredValues field and the site-levels list, e.g. after a bulk reset. */
export function revalidateAllStoredValues() {
  return mutate((key) => isStoredValueKey(key) || key === SITE_LEVELS_KEY);
}
