import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Plus, Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export function ShareFAB() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();

  // Detect if we're on a church profile page (individual church, not list)
  const isChurchProfilePage = location.startsWith("/churches/") && location !== "/churches";
  const isChurchListPage = location === "/churches";

  // Hide FAB on mobile when not applicable, or when already on submit page
  // Also hide on church list page since it has its own "Rate a Church" button in empty state
  if (!isMobile || location === "/submit" || isChurchListPage) return null;

  const handleClick = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      // Haptics not available on web
    }
    if (isChurchProfilePage) {
      // Dispatch custom event to trigger rating modal on church profile page
      window.dispatchEvent(new CustomEvent("open-church-rating-modal"));
    } else {
      setLocation("/submit");
    }
  };

  // Determine FAB label based on context
  const getFabContent = () => {
    if (isChurchProfilePage) {
      return { icon: Star, label: "Rate This Church", testId: "fab-rate-church", ariaLabel: "Rate this church" };
    } else {
      return { icon: Plus, label: "Post Story", testId: "fab-share", ariaLabel: "Post your story" };
    }
  };

  const fabContent = getFabContent();
  const IconComponent = fabContent.icon;

  // Extended FAB following Material Design best practices:
  // - Icon + text label for clear context
  // - Pill shape (rounded-full) for recognizable FAB styling
  // - 48px minimum touch target height for accessibility
  // - Icon on left, text on right per industry standard
  // - Short, action-oriented label
  // - Bottom-center placement for hand-agnostic accessibility (inclusive for left/right-handed users)
  return createPortal(
    <button
      id={fabContent.testId}
      onClick={handleClick}
      className="fixed z-[9999] flex items-center gap-2 h-12 px-4 rounded-full bg-primary text-primary-foreground font-medium shadow-lg hover-elevate active-elevate-2 border border-primary-border"
      data-testid={fabContent.testId}
      aria-label={fabContent.ariaLabel}
      style={{
        position: 'fixed',
        bottom: 'calc(5.25rem + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <IconComponent className="h-5 w-5" />
      <span className="text-sm">{fabContent.label}</span>
    </button>,
    document.body
  );
}
