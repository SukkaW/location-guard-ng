import { HostnameTrie } from 'hntrie';
import type { Level, SiteLevelEntry } from 'location-guard-types';
import { getStoredValueAsync, setStoredValueAsync } from './storage';
import { identity } from 'foxts/identity';

const levelToString = identity<Level>;
const levelFromString = identity<string, Level>;

// The serialized trie can be rewritten from another tab (e.g. the config page),
// so memoize on the raw string instead of deserializing once and going stale.
let memoSerialized: string | null = null;
let memoTrie: HostnameTrie<Level> | null = null;

async function getSiteLevelTrie(): Promise<HostnameTrie<Level>> {
  const serialized = await getStoredValueAsync('siteLevels');
  if (memoTrie === null || serialized !== memoSerialized) {
    memoTrie = serialized
      ? HostnameTrie.deserialize<Level>(serialized, levelFromString)
      : new HostnameTrie<Level>();
    memoSerialized = serialized;
  }
  return memoTrie;
}

/** Per-site level if overridden (directly or inherited from a parent subdomain entry), otherwise the default level. Does NOT consider "paused". */
export async function getEffectiveLevel(hostname: string): Promise<Level> {
  const defaultLevel = await getStoredValueAsync('defaultLevel');
  if (!hostname) return defaultLevel;
  return (await getSiteLevelTrie()).match(hostname) ?? defaultLevel;
}

export interface SiteOverride {
  level: Level,
  includeSubdomain: boolean
}

/**
 * The override stored for exactly this page, ignoring inherited parent
 * entries. Exact overrides live at the full hostname; subdomain overrides
 * live at `subdomainScope` (the registrable domain, e.g. "strava.com" while
 * on www.strava.com).
 */
export async function getSiteOverride(hostname: string, subdomainScope: string = hostname): Promise<SiteOverride | null> {
  const trie = await getSiteLevelTrie();
  if (trie.has(hostname)) {
    return { level: trie.match(hostname)!, includeSubdomain: false };
  }
  // full-hostname subdomain entry first (more specific; also covers entries
  // saved while the scope probe fell back to the full hostname)
  if (trie.hasSubdomain(hostname)) {
    return { level: trie.match(hostname)!, includeSubdomain: true };
  }
  if (subdomainScope !== hostname && trie.hasSubdomain(subdomainScope)) {
    return { level: trie.match(subdomainScope)!, includeSubdomain: true };
  }
  return null;
}

/** Set (or remove, with `level: null`) the override for a page; subdomain overrides are stored at `subdomainScope` */
export async function setSiteLevel(hostname: string, level: Level | null, includeSubdomain: boolean, subdomainScope: string = hostname): Promise<void> {
  if (!hostname) return;

  const trie = await getSiteLevelTrie();
  trie.remove(hostname);
  trie.removeSubdomain(hostname);
  trie.removeSubdomain(subdomainScope);

  if (level !== null) {
    // Like upstream Location Guard, only store an override that changes the
    // effective level; picking what the site already resolves to (inherited
    // from a parent entry or the default level) keeps the trie minimal.
    const targetKey = includeSubdomain ? subdomainScope : hostname;
    const inherited = (trie.match(targetKey)) ?? await getStoredValueAsync('defaultLevel');
    if (level !== inherited) {
      if (includeSubdomain) {
        trie.addSubdomain(subdomainScope, level);
      } else {
        trie.add(hostname, level);
      }
    }
  }

  const serialized = trie.serialize(levelToString);
  memoSerialized = serialized;
  memoTrie = trie;
  await setStoredValueAsync('siteLevels', serialized);
}

/** All stored overrides, for the config UI */
export async function dumpSiteLevels(): Promise<SiteLevelEntry[]> {
  const entries: SiteLevelEntry[] = [];
  (await getSiteLevelTrie()).dump((hostname, includeSubdomain, level) => {
    entries.push({ hostname, includeSubdomain, level });
  });
  return entries;
}
