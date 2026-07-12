import { getEffectiveLevel } from '../site-levels';
import { openSiteLevelPicker } from './site-level-picker';

// None of these are part of the GM4 spec / @types/greasemonkey, so they are
// feature-detected at runtime. registerMenuCommand's options object
// (Tampermonkey 4.20+) lets us reuse the previous id so a caption update
// replaces the entry in place, keeping its menu position; managers that
// ignore it get the unregister + re-register fallback below.
// (method-shorthand signatures on purpose: bivariance keeps the GM object
// assignable to this partial view)
interface GMExtra {
  // third param is a union because GM4 typings declare it as accessKey?: string;
  // the union + method-shorthand bivariance keeps GM assignable to this view
  registerMenuCommand(caption: string, onClick: () => void, optionsOrAccessKey?: string | { id: unknown }): unknown,
  unregisterMenuCommand(id: unknown): unknown,
  addValueChangeListener(name: string, cb: (name: string, oldValue: unknown, newValue: unknown, remote: boolean) => void): unknown
}

const gm: Partial<GMExtra> = GM;

let siteMenuId: unknown;

export async function registerSiteLevelMenuCommand(): Promise<void> {
  if (typeof gm.registerMenuCommand !== 'function') return;
  const { hostname } = window.location;
  if (!hostname) return;

  const prevId = siteMenuId;
  // A caption update needs the old entry gone: either the manager honors id
  // reuse (replaces in place), or we unregister the old entry afterwards.
  // When the manager gave us no id (sentinel true) or has no unregister,
  // keep the stale caption instead of stacking duplicate entries.
  if (prevId === true) return;
  if (prevId !== undefined && typeof gm.unregisterMenuCommand !== 'function') return;

  const level = await getEffectiveLevel(hostname);
  const newId = await gm.registerMenuCommand(
    `Set level for this site (currently: ${level})`,
    () => {
      void openSiteLevelPicker(() => {
        void registerSiteLevelMenuCommand();
      });
    },
    prevId === undefined ? undefined : { id: prevId }
  // the GM4 spec types registerMenuCommand as void; a manager that returns
  // no id still registered the command, remember that with a sentinel
  ) ?? true;

  if (prevId !== undefined && newId !== prevId && typeof gm.unregisterMenuCommand === 'function') {
    // the manager ignored the reused id and created a fresh entry, drop the old one
    await gm.unregisterMenuCommand(prevId);
  }

  siteMenuId = newId;
}

/** Refresh the menu caption when another tab (e.g. the config page) changes relevant settings */
export function refreshSiteLevelMenuOnRemoteChange(): void {
  if (typeof gm.addValueChangeListener !== 'function') return;

  for (const key of ['siteLevels', 'defaultLevel']) {
    gm.addValueChangeListener(key, (_name, _oldValue, _newValue, remote) => {
      // local changes are already handled by the picker's onSaved callback
      if (remote) {
        void registerSiteLevelMenuCommand();
      }
    });
  }
}
