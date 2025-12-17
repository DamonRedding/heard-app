import { useState, useEffect, useRef, useCallback } from "react";

interface ScrollDirectionOptions {
  threshold?: number;
  initialVisible?: boolean;
}

interface ScrollDirectionState {
  isVisible: boolean;
  scrollDirection: "up" | "down" | null;
  scrollY: number;
}

export function useScrollDirection(options: ScrollDirectionOptions = {}): ScrollDirectionState {
  const { threshold = 80, initialVisible = true } = options;
  
  const [state, setState] = useState<ScrollDirectionState>({
    isVisible: initialVisible,
    scrollDirection: null,
    scrollY: 0,
  });
  
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollState = useCallback(() => {
    const scrollY = window.scrollY;
    const delta = scrollY - lastScrollY.current;
    
    if (scrollY < threshold) {
      setState({
        isVisible: true,
        scrollDirection: null,
        scrollY,
      });
      lastScrollY.current = scrollY;
      return;
    }
    
    if (Math.abs(delta) < 10) {
      return;
    }
    
    if (delta > 0 && scrollY > threshold) {
      setState({
        isVisible: false,
        scrollDirection: "down",
        scrollY,
      });
    } else if (delta < 0) {
      setState({
        isVisible: true,
        scrollDirection: "up",
        scrollY,
      });
    }
    
    lastScrollY.current = scrollY;
  }, [threshold]);

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
    };
  }, [updateScrollState]);

  return state;
}
