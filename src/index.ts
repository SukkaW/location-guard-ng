import 'typed-query-selector';
import { spoofLocation } from './spoof-location';
import { renderConfigUI } from './ui';

(() => {
  spoofLocation();

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
})();
