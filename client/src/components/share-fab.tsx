import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Plus, Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function ShareFAB() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();

  // Detect if we're viewing a specific church profile (not just the list)
  const isChurchProfilePage = location.startsWith("/churches/") && location !== "/churches";

  // Hide FAB on mobile when not applicable, or when already on submit page
  if (!isMobile || location === "/submit") return null;

  const handleClick = () => {
    if (isChurchProfilePage) {
      // Dispatch custom event to trigger rating modal on church profile page
      window.dispatchEvent(new CustomEvent("open-church-rating-modal"));
    } else {
      setLocation("/submit");
    }
  };

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
      data-testid={isChurchProfilePage ? "fab-rate-church" : "fab-share"}
      aria-label={isChurchProfilePage ? "Rate this church" : "Post your story"}
      style={{
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {isChurchProfilePage ? (
        <>
          <Star className="h-5 w-5" />
          <span className="text-sm">Rate This Church</span>
        </>
      ) : (
        <>
          <Plus className="h-5 w-5" />
          <span className="text-sm">Post Story</span>
        </>
      )}
    </button>,
    document.body
  );
}
