declare global {
  interface Window {
    $recipage?: {
      ready: boolean
    }
  }
}

export const renderConfigUI = () => {
  const container = document.getElementById('location-guard-config-gui');
  if (container) {
    if ('$recipage' in window && window.$recipage?.ready) {
      render(container);
    } else {
      window.addEventListener(
        'recipage-ready',
        () => { render(container); },
        { once: true }
      );
    }
  }
};
