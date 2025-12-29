import { useState, useCallback, useRef } from "react";

type LogoDisplayMode = "full" | "lettermark";

interface LogoExperienceState {
  displayMode: LogoDisplayMode;
  isTransitioning: boolean;
  setExpanded: (expanded: boolean) => void;
}

export function useLogoExperienceState(): LogoExperienceState {
  const [displayMode, setDisplayMode] = useState<LogoDisplayMode>("lettermark");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setExpanded = useCallback((expanded: boolean) => {
    const newMode = expanded ? "full" : "lettermark";
    if (newMode === displayMode) return;

    setIsTransitioning(true);
    setDisplayMode(newMode);
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [displayMode]);

  return {
    displayMode,
    isTransitioning,
    setExpanded,
  };
}
