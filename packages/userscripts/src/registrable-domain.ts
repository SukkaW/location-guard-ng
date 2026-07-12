const PROBE_COOKIE_NAME = '__location_guard_ng_psl_probe';
import { isProbablyIp } from 'foxts/is-probably-ip';

// document.cookie on purpose: probing MUST be synchronous (set-read-delete in
// one tick so the probe never rides a real request), and the async Cookie
// Store API is Chromium-only anyway
/* eslint-disable sukka/unicorn/no-document-cookie -- see above */
function canSetCookieOnDomain(domain: string): boolean {
  document.cookie = `${PROBE_COOKIE_NAME}=1; domain=.${domain}; path=/; SameSite=Lax`;
  if (document.cookie.includes(`${PROBE_COOKIE_NAME}=1`)) {
    document.cookie = `${PROBE_COOKIE_NAME}=; domain=.${domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return true;
  }
  return false;
}
/* eslint-enable sukka/unicorn/no-document-cookie */

let cachedResult: string | null = null;

/**
 * The registrable domain (eTLD+1) of the CURRENT page, e.g. "strava.com" on
 * www.strava.com, but "user.github.io" on user.github.io.
 *
 * There is no web API exposing the Public Suffix List, but the cookie jar
 * enforces it: a cookie whose domain= is a public suffix is silently
 * rejected. So the shortest suffix that accepts a cookie is the registrable
 * domain — always in sync with the browser's own PSL, zero bundle bytes.
 *
 * Falls back to the full hostname when probing is impossible (IP literals,
 * single-label hosts, cookies blocked, sandboxed iframes).
 */
export function getRegistrableDomain(): string {
  if (cachedResult !== null) return cachedResult;

  const { hostname } = window.location;

  cachedResult = hostname;

  if (
    hostname.includes('.')
    && !isProbablyIp(hostname)
  ) {
    try {
      const labels = hostname.split('.');
      // the shortest candidate has two labels: a bare TLD is always a public suffix
      for (let i = labels.length - 2; i >= 0; i--) {
        const candidate = labels.slice(i).join('.');
        if (canSetCookieOnDomain(candidate)) {
          cachedResult = candidate;
          break;
        }
      }
    } catch {
      // document.cookie can throw in sandboxed iframes; keep the hostname fallback
    }
  }

  return cachedResult;
}
