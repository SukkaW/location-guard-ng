export function isConfigPageOrigin(): boolean {
  if (window.location.host === 'location-guard-ng.skk.moe') return true;
  if (
    window.location.host === 'localhost:3000'
    && (
      window.location.pathname === '/options'
      || window.location.pathname.startsWith('/options/')
    )
  ) {
    return true;
  }
  return false;
}
