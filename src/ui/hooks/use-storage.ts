import { useSyncExternalStore, useCallback } from 'react';
import { noop } from 'foxact/noop';
import { useLayoutEffect } from 'foxact/use-isomorphic-layout-effect';
import { noSSRError } from 'foxact/no-ssr';
import { DEFAULT_VALUE, type StoredValues } from '../../storage';

type NotUndefined<T> = T extends undefined ? never : T;

// eslint-disable-next-line @typescript-eslint/naming-convention -- global GM API
declare function GM_addValueChangeListener<T, K extends keyof T>(key: K, cb: (key: K, oldValue: T[K], newValue: T[K], remote: boolean) => void): number;
// eslint-disable-next-line @typescript-eslint/naming-convention -- global GM API
declare function GM_removeValueChangeListener(id: number): void;

// This type utility is only used for workaround https://github.com/microsoft/TypeScript/issues/37663
const isFunction = (x: unknown): x is Function => typeof x === 'function';

const getServerSnapshotWithoutServerValue = () => {
  throw noSSRError('useLocalStorage cannot be used on the server without a serverValue');
};

export function createStorage<T extends object>(defaultValue?: T) {
  const setStorageItem = typeof window === 'undefined'
    ? noop
    : <K extends keyof T>(key: K, value: T[K]) => {
      try {
        GM_setValue(key as string, value as any);
      } catch {
        console.warn('[foxact/use-gm-storage] Failed to set value, it might be blocked');
      }
    };

  const removeStorageItem = typeof window === 'undefined'
    ? noop
    : <K extends keyof T>(key: K) => {
      try {
        GM_deleteValue(key as string);
      } catch {
        console.warn('[foxact/use-gm-storage] Failed to remove value, it might be blocked');
      }
    };

  const getStorageItem = <K extends keyof T>(key: K) => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      if (defaultValue != null && key in defaultValue) {
        return GM_getValue(key as string, defaultValue[key]);
      }

      return GM_getValue(key as string);
    } catch {
      console.warn('[foxact/use-gm-storage] Failed to get value, it might be blocked');
      return null;
    }
  };

  const useSetStorage = <K extends keyof T>(key: K) => useCallback(
    (v: T[K] | null) => {
      try {
        if (v === null) {
          removeStorageItem(key);
        } else {
          setStorageItem(key, v);
        }
      } catch (e) {
        console.warn(e);
      }
    },
    [key]
  );

  // ssr compatible
  function useStorage<K extends keyof T>(
    key: K,
    serverValue: NotUndefined<T[K]>,
  ): readonly [T[K], React.Dispatch<React.SetStateAction<T[K] | null>>];
  // client-render only
  function useStorage<K extends keyof T>(
    key: K,
    serverValue?: undefined,
  ): readonly [T[K] | null, React.Dispatch<React.SetStateAction<T[K] | null>>];
  function useStorage<K extends keyof T>(
    key: K,
    serverValue?: NotUndefined<T[K]>
  ): readonly [T[K] | null, React.Dispatch<React.SetStateAction<T[K] | null>>] | readonly [T[K], React.Dispatch<React.SetStateAction<T[K] | null>>] {
    const subscribeToSpecificKeyOfLocalStorage = useCallback((callback: () => void) => {
      if (typeof window === 'undefined') {
        return noop;
      }

      const handle = GM_addValueChangeListener<T, K>(key, () => {
        callback();
      });

      return () => {
        GM_removeValueChangeListener(handle);
      };
    }, [key]);

    const getClientSnapshot = () => getStorageItem(key);

    const $serverValue = serverValue === undefined
      ? defaultValue?.[key]
      : serverValue;

    // If the serverValue is provided, we pass it to useSES' getServerSnapshot, which will be used during SSR
    // If the serverValue is not provided, we don't pass it to useSES, which will cause useSES to opt-in client-side rendering
    const getServerSnapshot = $serverValue === undefined
      ? getServerSnapshotWithoutServerValue
      : () => $serverValue;

    const store = useSyncExternalStore(
      subscribeToSpecificKeyOfLocalStorage,
      getClientSnapshot,
      getServerSnapshot
    );

    const setState = useCallback<React.Dispatch<React.SetStateAction<T[K] | null>>>(
      (v) => {
        try {
          const nextState = isFunction(v)
            ? v(store ?? null)
            : v;

          if (nextState === null) {
            removeStorageItem(key);
          } else {
            setStorageItem(key, nextState);
          }
        } catch (e) {
          console.warn(e);
        }
      },
      [key, store]
    );

    useLayoutEffect(() => {
      if (
        getStorageItem(key) === null
        && $serverValue !== undefined
      ) {
        setStorageItem(key, $serverValue);
      }
    }, [key, $serverValue]);

    const finalValue: T[K] | null = store === null
      // storage doesn't have value
      ? ($serverValue === undefined
        // no default value provided
        ? null
        : $serverValue satisfies T[K])
      // storage has value
      : store satisfies T;

    return [finalValue, setState] as const;
  }

  return {
    useStorage,
    useSetStorage
  };
}

const { useStorage, useSetStorage } = createStorage<StoredValues>(DEFAULT_VALUE);
export { useStorage, useSetStorage };
