import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const isMobile = useIsMobile();
  const { isVisible } = useScrollDirection({ threshold: 80 });

  if (!isMobile) {
    return null;
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "transition-transform duration-300 ease-in-out will-change-transform"
      )}
      style={{
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
      }}
      data-testid="mobile-header"
    >
      <div className="flex h-14 items-center justify-center px-4">
        <Link href="/" data-testid="mobile-link-home">
          <div className="flex items-center gap-2 hover-elevate rounded-md px-3 py-1.5 cursor-pointer">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Heard</h1>
            <span className="text-muted-foreground font-normal text-sm">|</span>
            <span className="text-xs text-muted-foreground">Anonymous Experiences</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
