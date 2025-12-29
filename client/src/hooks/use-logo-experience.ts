import { useState, useEffect, useCallback, useRef } from "react";
import { useFeedPersonalization } from "./use-feed-personalization";

type LogoDisplayMode = "full" | "lettermark";

interface LogoExperienceState {
  displayMode: LogoDisplayMode;
  isTransitioning: boolean;
  manuallyExpanded: boolean;
  toggleExpanded: () => void;
  setHoverExpand: (hovering: boolean) => void;
}

const SCROLL_THRESHOLD = 120;
const MIN_DWELL_TIME = 5000;
const INITIAL_SHOW_FULL_DURATION = 10000;

export function useLogoExperienceState(): LogoExperienceState {
  const { getPersonalizationLevel, totalEngagements } = useFeedPersonalization();
  const personalizationLevel = getPersonalizationLevel();
  
  const [displayMode, setDisplayMode] = useState<LogoDisplayMode>("full");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [lastToggleTime, setLastToggleTime] = useState(Date.now());
  const [hasPassedInitialPhase, setHasPassedInitialPhase] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isNewUser = personalizationLevel.level === "new";
  const isEngagedUser = totalEngagements >= 3;

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPassedInitialPhase(true);
    }, INITIAL_SHOW_FULL_DURATION);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getAutoMode = useCallback((): LogoDisplayMode => {
    if (isNewUser && !hasPassedInitialPhase) {
      return "full";
    } else if (scrollPosition < SCROLL_THRESHOLD) {
      return "full";
    }
    return "lettermark";
  }, [isNewUser, hasPassedInitialPhase, scrollPosition]);

  useEffect(() => {
    if (isHovering) {
      if (displayMode !== "full") {
        setIsTransitioning(true);
        setDisplayMode("full");
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }
      return;
    }

    if (manuallyExpanded) {
      return;
    }

    const now = Date.now();
    const timeSinceLastToggle = now - lastToggleTime;
    
    if (timeSinceLastToggle < MIN_DWELL_TIME) {
      return;
    }

    const newMode = getAutoMode();

    if (newMode !== displayMode) {
      setIsTransitioning(true);
      setDisplayMode(newMode);
      setLastToggleTime(now);
      
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  }, [
    scrollPosition,
    hasPassedInitialPhase,
    isNewUser,
    isEngagedUser,
    manuallyExpanded,
    isHovering,
    displayMode,
    lastToggleTime,
    getAutoMode,
  ]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsTransitioning(true);
    setManuallyExpanded(true);
    setDisplayMode((prev) => (prev === "full" ? "lettermark" : "full"));
    setLastToggleTime(Date.now());
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  const setHoverExpand = useCallback((hovering: boolean) => {
    setIsHovering(hovering);
    if (!hovering) {
      setLastToggleTime(Date.now());
    }
  }, []);

  return {
    displayMode,
    isTransitioning,
    manuallyExpanded,
    toggleExpanded,
    setHoverExpand,
  };
}
