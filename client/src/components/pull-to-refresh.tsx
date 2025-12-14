import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const RESISTANCE = 2.5;
const DIRECTION_LOCK_THRESHOLD = 10;

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className,
  disabled = false 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const directionLockedRef = useRef<"down" | "up" | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    startYRef.current = e.touches[0].clientY;
    directionLockedRef.current = null;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (directionLockedRef.current === null && Math.abs(diff) > DIRECTION_LOCK_THRESHOLD) {
      directionLockedRef.current = diff > 0 ? "down" : "up";
    }
    
    if (directionLockedRef.current === "up") {
      setPullDistance(0);
      setIsPulling(false);
      return;
    }
    
    if (container.scrollTop <= 0 && diff > 0 && directionLockedRef.current === "down") {
      setIsPulling(true);
      const distance = Math.min(diff / RESISTANCE, PULL_THRESHOLD * 1.5);
      setPullDistance(distance);
    } else {
      if (isPulling && diff <= 0) {
        setPullDistance(0);
        setIsPulling(false);
      }
    }
  }, [disabled, isRefreshing, isPulling]);

  const handleTouchEnd = useCallback(async () => {
    directionLockedRef.current = null;
    
    if (!isPulling || disabled) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    setIsPulling(false);

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh, disabled]);

  const handleTouchCancel = useCallback(() => {
    directionLockedRef.current = null;
    setIsPulling(false);
    setPullDistance(0);
  }, []);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = progress * 360;
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity duration-200",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: Math.max(pullDistance - 40, 8),
          zIndex: 10,
        }}
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-md border",
          isRefreshing && "animate-pulse"
        )}>
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
              opacity: progress
            }}
          />
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
