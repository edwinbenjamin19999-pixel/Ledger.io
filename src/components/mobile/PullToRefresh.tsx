import { useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
}

/**
 * Lättviktig pull-to-refresh för mobilskärmar.
 * Fungerar via touch-events, kräver att containerns scrollTop === 0.
 */
export const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 70,
}: PullToRefreshProps) => {
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Dampen
      setPull(Math.min(delta * 0.5, 100));
    }
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= threshold && !refreshing) {
      setRefreshing(true);
      haptic("light");
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const showSpinner = refreshing || pull > 8;
  const rotation = refreshing ? 0 : Math.min(pull * 4, 360);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="h-full overflow-y-auto"
      style={{ overscrollBehavior: "contain" }}
    >
      {showSpinner && (
        <div
          className="flex items-center justify-center"
          style={{
            height: refreshing ? 48 : Math.min(pull, 60),
            transition: refreshing ? "height 0.2s" : "none",
          }}
        >
          <div
            className="w-[24px] h-[24px] rounded-full border-2 border-[#0B4F6C] border-t-transparent"
            style={{
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
              transform: refreshing ? undefined : `rotate(${rotation}deg)`,
              opacity: refreshing ? 1 : Math.min(pull / threshold, 1),
            }}
          />
        </div>
      )}
      <div
        style={{
          transform: !refreshing && pull > 0 ? `translateY(${pull * 0.2}px)` : undefined,
          transition: pull === 0 ? "transform 0.2s" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};
