import { Link } from "wouter";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function ShareFAB() {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Link href="/submit">
      <button
        className="fixed bottom-20 right-4 z-[60] flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover-elevate active-elevate-2 transition-transform"
        data-testid="fab-share"
        aria-label="Share a story"
      >
        <Plus className="h-6 w-6" />
      </button>
    </Link>
  );
}
