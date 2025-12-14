import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedbackButton } from "@/components/feedback-button";
import { PenLine, Info, Shield, Home } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Header() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">H</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Heard</h1>
              <p className="text-xs text-muted-foreground">Anonymous Church Experiences</p>
            </div>
          </div>
        </Link>

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
      </div>
    </header>
  );
}
