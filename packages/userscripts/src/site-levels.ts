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

/** The override stored for exactly this hostname, ignoring inherited parent entries */
export async function getSiteOverride(hostname: string): Promise<SiteOverride | null> {
  const trie = await getSiteLevelTrie();
  if (trie.has(hostname)) {
    return { level: trie.match(hostname)!, includeSubdomain: false };
  }
  if (trie.hasSubdomain(hostname)) {
    return { level: trie.match(hostname)!, includeSubdomain: true };
  }
  return null;
}

/** Set (or remove, with `level: null`) the override for a hostname */
export async function setSiteLevel(hostname: string, level: Level | null, includeSubdomain: boolean): Promise<void> {
  if (!hostname) return;

  const trie = await getSiteLevelTrie();
  trie.remove(hostname);
  trie.removeSubdomain(hostname);

  if (level !== null) {
    // Like upstream Location Guard, only store an override that changes the
    // effective level; picking what the site already resolves to (inherited
    // from a parent entry or the default level) keeps the trie minimal.
    const inherited = (trie.match(hostname)) ?? await getStoredValueAsync('defaultLevel');
    if (level !== inherited) {
      if (includeSubdomain) {
        trie.addSubdomain(hostname, level);
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
