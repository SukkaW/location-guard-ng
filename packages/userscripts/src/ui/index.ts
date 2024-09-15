import { PlanarLaplace } from '../laplace';
import type { $LocationGuard, StoredValues } from 'location-guard-types';
import { DEFAULT_VALUE, getStoredValueAsync, setStoredValueAsync } from '../storage';

export const renderConfigUI = async () => {
  const $locationGuard: $LocationGuard = {
    ready: true,
    PlanarLaplace,
    epsilon: await getStoredValueAsync('epsilon'),
    emptyCachedPos() {
      return setStoredValueAsync('cachedPos', {});
    },
    setValue: setStoredValueAsync,
    getValue: getStoredValueAsync,
    async resetConfig() {
      const keys = Object.keys(DEFAULT_VALUE) as Array<keyof StoredValues>;
      await Promise.all(keys.map(key => setStoredValueAsync(key, DEFAULT_VALUE[key])));
    }
  };

  Object.defineProperty(unsafeWindow, '$locationGuard', {
    value: $locationGuard,
    enumerable: true,
    writable: false
  });
  unsafeWindow.dispatchEvent(new CustomEvent('location-guard-config-ui-ready'));
};
