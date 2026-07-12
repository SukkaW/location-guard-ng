import { getEffectiveLevel } from '../site-levels';
import { openSiteLevelPicker } from './site-level-picker';
import { gm } from '../gm';
import { isDebugEnabled, toggleDebugEnabled } from '../debug';

function createUpdatableMenuCommand(getCaption: () => Promise<string> | string, onClick: () => void): () => Promise<void> {
  let menuId: unknown;

  return async function refresh(): Promise<void> {
    if (typeof gm.registerMenuCommand !== 'function') return;

    const prevId = menuId;
    // A caption update needs the old entry gone: either the manager honors id
    // reuse (replaces in place), or we unregister the old entry afterwards.
    // When the manager gave us no id (sentinel true) or has no unregister,
    // keep the stale caption instead of stacking duplicate entries.
    if (prevId === true) return;
    if (prevId !== undefined && typeof gm.unregisterMenuCommand !== 'function') return;

    const newId = await gm.registerMenuCommand(
      await getCaption(),
      onClick,
      prevId === undefined ? undefined : { id: prevId }
    // the GM4 spec types registerMenuCommand as void; a manager that returns
    // no id still registered the command, remember that with a sentinel
    ) ?? true;

    if (prevId !== undefined && newId !== prevId && typeof gm.unregisterMenuCommand === 'function') {
      // the manager ignored the reused id and created a fresh entry, drop the old one
      await gm.unregisterMenuCommand(prevId);
    }

    menuId = newId;
  };
}

const refreshSiteLevelMenu = createUpdatableMenuCommand(
  async () => `Set level for this site (currently: ${await getEffectiveLevel(window.location.hostname)})`,
  () => {
    void openSiteLevelPicker(() => {
      registerSiteLevelMenuCommand();
    });
  }
);

export function registerSiteLevelMenuCommand(): void {
  if (!window.location.hostname) return;
  void refreshSiteLevelMenu();
}

const refreshDebugMenu = createUpdatableMenuCommand(
  () => (isDebugEnabled() ? 'Disable debug logging' : 'Enable debug logging'),
  () => {
    void toggleDebugEnabled().then(refreshDebugMenu);
  }
);

export function registerDebugMenuCommand(): void {
  void refreshDebugMenu();
}

/** Refresh menu captions when another tab (e.g. the config page) changes relevant settings */
export function refreshMenusOnRemoteChange(): void {
  if (typeof gm.addValueChangeListener !== 'function') return;

  for (const key of ['siteLevels', 'defaultLevel']) {
    gm.addValueChangeListener(key, (_name, _oldValue, _newValue, remote) => {
      // local changes are already handled by the picker's onSaved callback
      if (remote) {
        registerSiteLevelMenuCommand();
      }
    });
  }

  gm.addValueChangeListener('debug', (_name, _oldValue, _newValue, remote) => {
    // local toggles already refresh the caption in the menu command itself
    if (remote) {
      registerDebugMenuCommand();
    }
  });
}
