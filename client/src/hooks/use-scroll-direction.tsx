import { useState, useEffect, useRef, useCallback } from "react";

interface ScrollDirectionOptions {
  threshold?: number;
  autoRevealDelay?: number;
}

interface ScrollDirectionState {
  isVisible: boolean;
  scrollDirection: "up" | "down" | null;
  scrollY: number;
}

export function useScrollDirection(options: ScrollDirectionOptions = {}): ScrollDirectionState {
  const { threshold = 80, autoRevealDelay = 500 } = options;
  
  const [state, setState] = useState<ScrollDirectionState>({
    isVisible: true,
    scrollDirection: null,
    scrollY: 0,
  });
  
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const scrollStopTimer = useRef<NodeJS.Timeout | null>(null);
  const isHiddenRef = useRef(false);

  const clearScrollStopTimer = useCallback(() => {
    if (scrollStopTimer.current) {
      clearTimeout(scrollStopTimer.current);
      scrollStopTimer.current = null;
    }
  }, []);

  const updateScrollState = useCallback(() => {
    const scrollY = window.scrollY;
    const delta = scrollY - lastScrollY.current;
    
    clearScrollStopTimer();
    
    if (scrollY < threshold) {
      isHiddenRef.current = false;
      setState({
        isVisible: true,
        scrollDirection: null,
        scrollY,
      });
      lastScrollY.current = scrollY;
      return;
    }
    
    if (Math.abs(delta) >= 10) {
      if (delta > 0 && scrollY > threshold) {
        isHiddenRef.current = true;
        setState({
          isVisible: false,
          scrollDirection: "down",
          scrollY,
        });
      } else if (delta < 0) {
        isHiddenRef.current = false;
        setState({
          isVisible: true,
          scrollDirection: "up",
          scrollY,
        });
      }
      lastScrollY.current = scrollY;
    }
    
    if (isHiddenRef.current) {
      scrollStopTimer.current = setTimeout(() => {
        isHiddenRef.current = false;
        setState(prev => ({
          ...prev,
          isVisible: true,
        }));
      }, autoRevealDelay);
    }
  }, [threshold, autoRevealDelay, clearScrollStopTimer]);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          updateScrollState();
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearScrollStopTimer();
    };
  }, [updateScrollState, clearScrollStopTimer]);

  return state;
}
