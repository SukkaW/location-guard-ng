import { PlanarLaplace } from '../laplace';
import { DEFAULT_VALUE, getStoredValueAsync, setStoredValueAsync, type StoredValues } from '../storage';

declare global {
  interface Window {
    $recipage?: {
      ready: boolean
    },
    $locationGuard?: $LocationGuard
  }
}

interface $LocationGuard {
  ready: true,
  PlanarLaplace: typeof PlanarLaplace,
  epsilon: number,
  emptyCachedPos: () => Promise<void>,
  setValue<K extends keyof StoredValues>(key: K, value: StoredValues[K]): Promise<void>,
  getValue<K extends keyof StoredValues>(key: K): Promise<StoredValues[K]>,
  resetConfig: () => Promise<void>
}

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
  // const container = document.getElementById('location-guard-config-gui');
  // if (container) {
  //   if ('$recipage' in window && window.$recipage?.ready) {
  //     render(container);
  //   } else {
  //     window.addEventListener(
  //       'recipage-ready',
  //       () => { render(container); },
  //       { once: true }
  //     );
  //   }
  // }
};
