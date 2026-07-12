import { getStoredValueAsync, setStoredValueAsync } from './storage';
import { gm } from './gm';
import { noop } from 'foxts/noop';

let debugEnabled = false;

// A bound console.log instead of a wrapper function: the function invoked at
// the call site IS the native console.log, so devtools attributes each log
// line to the actual caller (spoof-location.ts etc.) instead of this module.
// Swapped between noop and the bound logger whenever the switch flips; ESM
// live bindings keep every importer pointing at the current value.
// eslint-disable-next-line import-x/no-mutable-exports -- reassignment is the mechanism, see above
export let debugLog: (...args: unknown[]) => void = noop;

function syncDebugLog(): void {
  // eslint-disable-next-line no-console -- the whole point of the user-opted-in debug switch
  debugLog = debugEnabled ? console.log.bind(console, '[Location Guard NG]') : noop;
}

export async function initDebug(): Promise<void> {
  debugEnabled = await getStoredValueAsync('debug');
  syncDebugLog();

  if (typeof gm.addValueChangeListener === 'function') {
    gm.addValueChangeListener('debug', (_name, _oldValue, newValue, remote) => {
      if (remote) {
        debugEnabled = newValue === true;
        syncDebugLog();
      }
    });
  }
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export async function toggleDebugEnabled(): Promise<boolean> {
  debugEnabled = !(await getStoredValueAsync('debug'));
  syncDebugLog();
  await setStoredValueAsync('debug', debugEnabled);
  return debugEnabled;
}
