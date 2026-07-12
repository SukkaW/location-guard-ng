import useSWRMutation from 'swr/mutation';
import { asMutationFetcher } from './swr-bridge-middleware';
import { revalidateAllStoredValues } from './use-stored-value';

export function useEmptyCachedPos() {
  return useSWRMutation(
    'location-guard-action-empty-cache',
    asMutationFetcher<void, 'location-guard-action-empty-cache'>((bridge) => bridge.emptyCachedPos())
  );
}

export function useResetConfig() {
  return useSWRMutation(
    'location-guard-action-reset-config',
    asMutationFetcher<void, 'location-guard-action-reset-config'>(async (bridge) => {
      await bridge.resetConfig();
      await revalidateAllStoredValues();
    })
  );
}
