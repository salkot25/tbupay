import { mapAdapterError } from "./errorMapper";
import {
  getActionCacheConfig,
  isFresh,
  mergeCachedResponse,
  readCacheEntry,
  withCacheMeta,
  writeCacheEntry,
} from "./cacheStore";

const BACKEND_BASE_URL = String(import.meta.env.VITE_GAS_URL || "").trim();

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, String(value));
  });
  return query.toString();
};

const parseJson = async (response, action) => {
  try {
    return await response.json();
  } catch (error) {
    return mapAdapterError({ type: "parse", error, action });
  }
};

const request = async ({ method, action, payload, params, options = {} }) => {
  if (!BACKEND_BASE_URL) {
    return mapAdapterError({ type: "config", action });
  }

  const bypassCache = Boolean(options.forceRefresh);
  const cacheConfig = method === "GET" ? getActionCacheConfig(action) : null;
  const cacheEntry = cacheConfig ? readCacheEntry(action, params) : null;

  if (!bypassCache && cacheConfig && isFresh(cacheEntry, cacheConfig.ttlMs)) {
    return withCacheMeta(cacheEntry.response, "cache", cacheEntry.cachedAt);
  }

  try {
    const queryString = toQueryString({ action, ...(params || {}) });
    const url =
      method === "GET"
        ? `${BACKEND_BASE_URL}?${queryString}`
        : BACKEND_BASE_URL;
    const response = await fetch(url, {
      method,
      headers:
        method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body:
        method === "POST"
          ? JSON.stringify({ action, ...(payload || {}) })
          : undefined,
    });

    if (!response.ok) {
      return mapAdapterError({
        type: "http",
        statusCode: response.status,
        action,
      });
    }

    const json = await parseJson(response, action);
    if (json?.status === "error") {
      return mapAdapterError({ type: "backend", action, responseBody: json });
    }

    if (cacheConfig && json?.status === "success") {
      const merged = mergeCachedResponse(action, cacheEntry?.response, json);
      writeCacheEntry(action, params, merged);
      return withCacheMeta(merged, "network", Date.now());
    }

    return json;
  } catch (error) {
    if (cacheEntry?.response) {
      return withCacheMeta(
        cacheEntry.response,
        "cache-fallback",
        cacheEntry.cachedAt,
      );
    }
    return mapAdapterError({ type: "network", error, action });
  }
};

export const backendApiAdapter = {
  async get(action, params = {}, options = {}) {
    return request({ method: "GET", action, params, options });
  },

  async post(action, payload = {}) {
    return request({ method: "POST", action, payload });
  },
};

export { BACKEND_BASE_URL };
