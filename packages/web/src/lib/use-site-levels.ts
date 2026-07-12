import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { $LocationGuard, Level, SiteLevelEntry } from 'location-guard-types';
import { asMutationFetcher } from './swr-bridge-middleware';
import { SITE_LEVELS_KEY } from './swr-keys';

/** Lists every per-site override (GM-backed hostname trie), via SWR. */
export function useSiteLevels() {
  return useSWR(SITE_LEVELS_KEY, (bridge: $LocationGuard) => bridge.dumpSiteLevels());
}

interface SetSiteLevelArg {
  hostname: string,
  level: Level | null,
  includeSubdomain: boolean
}

/** Adds, edits, or removes (`level: null`) a per-site override, then refreshes the list. */
export function useSetSiteLevel() {
  return useSWRMutation(
    SITE_LEVELS_KEY,
    asMutationFetcher<SiteLevelEntry[], typeof SITE_LEVELS_KEY, SetSiteLevelArg>(
      async (bridge, _key, { arg }) => {
        await bridge.setSiteLevel(arg.hostname, arg.level, arg.includeSubdomain);
        return bridge.dumpSiteLevels();
      }
    ),
    { populateCache: true, revalidate: false }
  );
}
