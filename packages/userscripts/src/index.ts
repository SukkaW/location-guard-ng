/// <reference types="greasemonkey" />

import 'typed-query-selector';

import { spoofLocation } from './spoof-location';
import { renderConfigUI } from './ui';
import { registerSiteLevelMenuCommand, registerDebugMenuCommand, refreshMenusOnRemoteChange } from './ui/menu';
import { initDebug } from './debug';
import { isConfigPageOrigin } from './config-page';

if (isConfigPageOrigin()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderConfigUI);
  } else {
    renderConfigUI();
  }
} else {
  // Never install the faking patches on our own config page — it needs the browser's
  // real, unpatched geolocation to show genuine reported accuracy.
  registerSiteLevelMenuCommand();
  spoofLocation();
}

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
