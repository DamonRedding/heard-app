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

  return createPortal(
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-[9999] flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover-elevate active-elevate-2"
      data-testid="fab-share"
      aria-label="Share a story"
      style={{
        position: 'fixed',
        bottom: '5rem',
        right: '1rem',
      }}
    >
      <Plus className="h-6 w-6" />
    </button>,
    document.body
  );
}
