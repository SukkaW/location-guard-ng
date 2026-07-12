const pattern = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
let isMobile: boolean | null = null;

export function isMobileDevice() {
  if (isMobile !== null) return isMobile;
  if (typeof window === 'undefined') return false;
  isMobile = pattern.test(window.navigator.userAgent);
  return isMobile;
}
