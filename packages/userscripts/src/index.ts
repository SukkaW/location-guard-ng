import 'typed-query-selector';
import { spoofLocation } from './spoof-location';
import { renderConfigUI } from './ui';
import { registerSiteLevelMenuCommand, registerDebugMenuCommand, refreshMenusOnRemoteChange } from './ui/menu';
import { initDebug } from './debug';

spoofLocation();

registerSiteLevelMenuCommand();
// the debug menu caption needs the cached flag, so register after init
void initDebug().then(registerDebugMenuCommand);
refreshMenusOnRemoteChange();

if ('registerMenuCommand' in GM && typeof GM.registerMenuCommand === 'function') {
  GM.registerMenuCommand(
    'Configuration',
    () => {
      const a = document.createElement('a');
      a.href = 'https://location-guard-ng.skk.moe/options';
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  );
}

if (
  window.location.host === 'localhost:3000'
  || window.location.host === 'location-guard-ng.skk.moe'
) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderConfigUI);
  } else {
    renderConfigUI();
  }
}
