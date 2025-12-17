import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedbackButton } from "@/components/feedback-button";
import { PenLine, Info, Shield, Home } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";

export function Header() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { isVisible } = useScrollDirection({ threshold: 80 });

  return (
    <header 
      className={cn(
        "top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        isMobile 
          ? "fixed transition-transform duration-300 ease-in-out will-change-transform" 
          : "sticky"
      )}
      style={isMobile ? {
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
      } : undefined}
      data-testid="header"
    >
      <div className={cn(
        "container mx-auto flex items-center justify-between gap-4 px-4",
        isMobile ? "h-14" : "h-16"
      )}>
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1.5 cursor-pointer">
            <h1 className={cn(
              "font-bold tracking-tight text-foreground",
              isMobile ? "text-lg" : "text-xl"
            )}>Heard</h1>
            <span className="text-muted-foreground font-normal">|</span>
            <span className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {isMobile ? "Anonymous Experiences" : "Anonymous Church Experiences"}
            </span>
          </div>
        </Link>

        {!isMobile && (
          <nav className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant={location === "/" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="link-feed"
                onClick={(e) => {
                  if (location === "/") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                <Home className="h-4 w-4" />
                <span>Feed</span>
              </Button>
            </Link>
            
            <Link href="/submit">
              <Button
                variant={location === "/submit" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="link-submit"
              >
                <PenLine className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </Link>

            <Link href="/about">
              <Button
                variant={location === "/about" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="link-about"
              >
                <Info className="h-4 w-4" />
                <span>About</span>
              </Button>
            </Link>

            <Link href="/admin">
              <Button
                variant={location === "/admin" ? "secondary" : "ghost"}
                size="icon"
                data-testid="link-admin"
              >
                <Shield className="h-4 w-4" />
              </Button>
            </Link>

            <FeedbackButton />
            <ThemeToggle />
          </nav>
        )}
      </div>
    </header>
  );
}
