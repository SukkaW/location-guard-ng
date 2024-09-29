const pattern = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
let isMobile: boolean | null = null;

export const isMobileDevice = () => {
  if (isMobile !== null) return isMobile;
  if (typeof window === 'undefined') return false;
  isMobile = pattern.test(window.navigator.userAgent);
  return isMobile;
};

export function randomInt(from: number, to: number): number {
  return Math.floor(Math.random() * (to - from + 1)) + from;
}
