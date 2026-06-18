const pageCache = new Map<string, unknown>();
const CACHE_PREFIX = "ledgeros_page_cache:";
const CACHE_TTL_MS = 5 * 60 * 1000;

type StoredPageCache<T> = {
  savedAt: number;
  value: T;
};

export function getPageCache<T>(key: string) {
  const memoryValue = pageCache.get(key) as T | undefined;

  if (memoryValue !== undefined) {
    return memoryValue;
  }

  try {
    const rawValue = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);

    if (!rawValue) {
      return undefined;
    }

    const stored = JSON.parse(rawValue) as StoredPageCache<T>;

    if (Date.now() - stored.savedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return undefined;
    }

    pageCache.set(key, stored.value);

    return stored.value;
  } catch {
    return undefined;
  }
}

export function setPageCache<T>(key: string, value: T) {
  pageCache.set(key, value);

  try {
    window.localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({
        savedAt: Date.now(),
        value,
      } satisfies StoredPageCache<T>),
    );
  } catch {
    // Keep the page usable even when localStorage is blocked or full.
  }
}
