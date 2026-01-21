import { useState, useEffect, useRef } from "react";

interface UseScrollDirectionOptions {
  threshold?: number;
  topThreshold?: number;
}

export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const { threshold = 10, topThreshold = 50 } = options;
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;

      setIsAtTop(currentScrollY < topThreshold);

      if (currentScrollY < topThreshold) {
        setIsVisible(true);
      } else if (scrollDiff > threshold) {
        setIsVisible(false);
      } else if (scrollDiff < -threshold) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold, topThreshold]);

  return { isVisible, isAtTop };
}
