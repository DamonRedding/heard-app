import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function ShareFAB() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  if (!isMobile) return null;

  const handleClick = () => {
    setLocation("/submit");
  };

  // Extended FAB following Material Design best practices:
  // - Icon + text label for clear context
  // - Pill shape (rounded-full) for recognizable FAB styling
  // - 48px minimum touch target height for accessibility
  // - Icon on left, text on right per industry standard
  // - Short, action-oriented label
  return createPortal(
    <button
      onClick={handleClick}
      className="fixed z-[9999] flex items-center gap-2 h-12 px-4 rounded-full bg-primary text-primary-foreground font-medium shadow-lg hover-elevate active-elevate-2 border border-primary-border"
      data-testid="fab-share"
      aria-label="Share your story"
      style={{
        position: 'fixed',
        bottom: '5rem',
        right: '1rem',
      }}
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm">Post Story</span>
    </button>,
    document.body
  );
}
