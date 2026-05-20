const CACHE_PREFIX = "tbu_pay_cache_v1";

const ACTION_CONFIG = {
  getTransactions: { ttlMs: 2 * 60 * 1000, mergeById: "id_transaksi" },
  getTickets: { ttlMs: 60 * 1000, mergeById: "id_tiket" },
  getNews: { ttlMs: 2 * 60 * 1000, mergeById: "id_berita" },
  getNewsReplies: { ttlMs: 45 * 1000, mergeById: "id_balasan" },
  getUsers: { ttlMs: 5 * 60 * 1000 },
  getTransactionCategories: { ttlMs: 10 * 60 * 1000 },
};

const stableParams = (params = {}) => {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      if (value === undefined || value === null || value === "") return acc;
      acc[key] = value;
      return acc;
    }, {});
  return JSON.stringify(sorted);
};

const getStorageKey = (action, params = {}) =>
  `${CACHE_PREFIX}:${action}:${stableParams(params)}`;

const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / storage access failures.
  }
};

export const getActionCacheConfig = (action) => ACTION_CONFIG[action] || null;

export const readCacheEntry = (action, params = {}) => {
  const key = getStorageKey(action, params);
  return safeRead(key);
};

export const writeCacheEntry = (action, params = {}, response) => {
  const key = getStorageKey(action, params);
  safeWrite(key, {
    cachedAt: Date.now(),
    response,
  });
};

export const isFresh = (entry, ttlMs) => {
  if (!entry || !entry.cachedAt || !ttlMs) return false;
  return Date.now() - entry.cachedAt <= ttlMs;
};

const mergeListById = (cachedList, freshList, idField) => {
  const map = new Map();

  (cachedList || []).forEach((item) => {
    const id = item?.[idField];
    if (!id) return;
    map.set(String(id), item);
  });

  (freshList || []).forEach((item) => {
    const id = item?.[idField];
    if (!id) return;
    map.set(String(id), item);
  });

  const merged = Array.from(map.values());

  const sortByDateCandidate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  merged.sort((a, b) => {
    const left = sortByDateCandidate(a?.timestamp || a?.tanggal || 0);
    const right = sortByDateCandidate(b?.timestamp || b?.tanggal || 0);
    return right - left;
  });

  return merged;
};

export const mergeCachedResponse = (action, cachedResponse, freshResponse) => {
  const config = getActionCacheConfig(action);
  if (!config?.mergeById) return freshResponse;

  if (
    cachedResponse?.status !== "success" ||
    freshResponse?.status !== "success" ||
    !Array.isArray(cachedResponse?.data) ||
    !Array.isArray(freshResponse?.data)
  ) {
    return freshResponse;
  }

  return {
    ...freshResponse,
    data: mergeListById(
      cachedResponse.data,
      freshResponse.data,
      config.mergeById,
    ),
  };
};

export const withCacheMeta = (response, source, cachedAt = null) => ({
  ...response,
  _meta: {
    source,
    cachedAt,
  },
});
