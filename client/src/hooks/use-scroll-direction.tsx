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
  const { threshold = 80, autoRevealDelay = 400 } = options;
  
  const [state, setState] = useState<ScrollDirectionState>({
    isVisible: true,
    scrollDirection: null,
    scrollY: 0,
  });
  
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const autoRevealTimer = useRef<NodeJS.Timeout | null>(null);

  const clearAutoRevealTimer = useCallback(() => {
    if (autoRevealTimer.current) {
      clearTimeout(autoRevealTimer.current);
      autoRevealTimer.current = null;
    }
  }, []);

  const scheduleAutoReveal = useCallback(() => {
    clearAutoRevealTimer();
    autoRevealTimer.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isVisible: true,
      }));
    }, autoRevealDelay);
  }, [autoRevealDelay, clearAutoRevealTimer]);

  const updateScrollState = useCallback(() => {
    const scrollY = window.scrollY;
    const delta = scrollY - lastScrollY.current;
    
    if (scrollY < threshold) {
      clearAutoRevealTimer();
      setState({
        isVisible: true,
        scrollDirection: null,
        scrollY,
      });
      lastScrollY.current = scrollY;
      return;
    }
    
    if (Math.abs(delta) < 10) {
      lastScrollY.current = scrollY;
      return;
    }
    
    if (delta > 0 && scrollY > threshold) {
      setState({
        isVisible: false,
        scrollDirection: "down",
        scrollY,
      });
      scheduleAutoReveal();
    } else if (delta < 0) {
      clearAutoRevealTimer();
      setState({
        isVisible: true,
        scrollDirection: "up",
        scrollY,
      });
    }
    
    lastScrollY.current = scrollY;
  }, [threshold, scheduleAutoReveal, clearAutoRevealTimer]);

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
      clearAutoRevealTimer();
    };
  }, [updateScrollState, clearAutoRevealTimer]);

  return state;
}
