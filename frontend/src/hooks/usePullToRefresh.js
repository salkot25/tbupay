import { useMemo, useRef, useState } from "react";

export default function usePullToRefresh({
  onRefresh,
  threshold = 72,
  disabled = false,
}) {
  const startYRef = useRef(null);
  const canPullRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  const reset = () => {
    startYRef.current = null;
    canPullRef.current = false;
    setPullDistance(0);
  };

  const onTouchStart = (e) => {
    if (disabled) return;
    if (window.scrollY > 0) return;
    const firstTouch = e.touches?.[0];
    if (!firstTouch) return;
    startYRef.current = firstTouch.clientY;
    canPullRef.current = true;
  };

  const onTouchMove = (e) => {
    if (disabled) return;
    if (!canPullRef.current || startYRef.current == null) return;

    const currentY = e.touches?.[0]?.clientY;
    if (typeof currentY !== "number") return;

    const delta = currentY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    // Dampen movement for smoother feel.
    const dampened = Math.min(120, Math.round(delta * 0.45));
    setPullDistance(dampened);
  };

  const onTouchEnd = async () => {
    if (disabled) {
      reset();
      return;
    }

    const shouldRefresh = pullDistance >= threshold;
    reset();

    if (shouldRefresh && typeof onRefresh === "function") {
      await onRefresh();
    }
  };

  const bind = useMemo(
    () => ({
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    }),
    [disabled, pullDistance, threshold],
  );

  return {
    pullDistance,
    showPullHint: pullDistance > 0,
    isReady: pullDistance >= threshold,
    bind,
  };
}
