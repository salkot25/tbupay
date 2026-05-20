export const routeLoaders = {
  cashflow: () => import("../pages/Cashflow"),
  service: () => import("../pages/ServiceHub"),
  profile: () => import("../pages/Profile"),
  adminVerifikasi: () => import("../pages/AdminVerifikasi"),
  adminUsers: () => import("../pages/AdminUserManagement"),
};

const prefetched = new Set();

export function prefetchRoute(routeKey) {
  const loader = routeLoaders[routeKey];
  if (!loader || prefetched.has(routeKey)) return;

  prefetched.add(routeKey);
  loader().catch(() => {
    // Allow retry if prefetch fails (e.g. transient network issue).
    prefetched.delete(routeKey);
  });
}

export function prefetchHomeLikelyRoutes() {
  scheduleIdlePrefetch(() => {
    prefetchRoute("cashflow");
    prefetchRoute("service");
  });
}

export function prefetchAdminLikelyRoutes() {
  scheduleIdlePrefetch(() => {
    prefetchRoute("cashflow");
    prefetchRoute("service");
    prefetchRoute("adminVerifikasi");
    prefetchRoute("adminUsers");
  });
}

function scheduleIdlePrefetch(run) {
  if (typeof window === "undefined") {
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1200 });
  } else {
    window.setTimeout(run, 250);
  }
}
