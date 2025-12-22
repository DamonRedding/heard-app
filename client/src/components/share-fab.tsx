import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Plus, Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function ShareFAB() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();

  // Detect if we're in the Find Churches flow
  const isChurchProfilePage = location.startsWith("/churches/") && location !== "/churches";
  const isChurchListPage = location === "/churches";
  const isExploreFlow = isChurchProfilePage || isChurchListPage;

  // Hide FAB on mobile when not applicable, or when already on submit page
  if (!isMobile || location === "/submit") return null;

  const handleClick = () => {
    if (isExploreFlow) {
      // Dispatch custom event to trigger rating modal on churches pages
      window.dispatchEvent(new CustomEvent("open-church-rating-modal"));
    } else {
      setLocation("/submit");
    }
  };

  // Determine FAB label based on context
  const getFabContent = () => {
    if (isChurchProfilePage) {
      return { icon: Star, label: "Rate This Church", testId: "fab-rate-church", ariaLabel: "Rate this church" };
    } else if (isChurchListPage) {
      return { icon: Star, label: "Rate a Church", testId: "fab-rate-church", ariaLabel: "Rate a church" };
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
      onClick={handleClick}
      className="fixed z-[9999] flex items-center gap-2 h-12 px-4 rounded-full bg-primary text-primary-foreground font-medium shadow-lg hover-elevate active-elevate-2 border border-primary-border"
      data-testid={fabContent.testId}
      aria-label={fabContent.ariaLabel}
      style={{
        position: 'fixed',
        bottom: '5rem',
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
