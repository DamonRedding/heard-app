import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/feedback-button";
import { ChurchRatingModal } from "@/components/church-rating-modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PenLine, Shield, Home, Star, Church, Search, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLogoExperienceState } from "@/hooks/use-logo-experience";
import { cn } from "@/lib/utils";

export function Header() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const { displayMode, isTransitioning, setHoverExpand } = useLogoExperienceState();

  if (isMobile) {
    return null;
  }

  const isLetterMark = displayMode === "lettermark";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/" data-testid="link-home">
              <div 
                className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1.5 cursor-pointer"
                onMouseEnter={() => isLetterMark && setHoverExpand(true)}
                onMouseLeave={() => setHoverExpand(false)}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300 ease-out overflow-hidden",
                    isTransitioning && "opacity-90"
                  )}
                >
                  <h1 
                    className={cn(
                      "font-bold tracking-tight text-foreground transition-all duration-300",
                      isLetterMark ? "text-2xl" : "text-xl"
                    )}
                    aria-label={isLetterMark ? "Heard (showing H)" : "Heard"}
                  >
                    {isLetterMark ? "H" : "Heard"}
                  </h1>
                  <div
                    className={cn(
                      "flex items-center gap-2 transition-all duration-300 ease-out",
                      isLetterMark 
                        ? "max-w-0 opacity-0 overflow-hidden" 
                        : "max-w-[300px] opacity-100"
                    )}
                  >
                    <span className="text-muted-foreground font-normal">|</span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Anonymous Church Experiences</span>
                  </div>
                </div>
              </div>
            </Link>
          </TooltipTrigger>
          {isLetterMark && (
            <TooltipContent side="bottom">
              <p>Heard - Anonymous Church Experiences</p>
            </TooltipContent>
          )}
        </Tooltip>

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

          <Link href="/churches">
            <Button
              variant={location === "/churches" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="link-churches"
            >
              <Church className="h-4 w-4" />
              <span>Churches</span>
            </Button>
          </Link>

          <Link href="/search">
            <Button
              variant={location === "/search" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="link-search"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </Link>

          <Link href="/settings">
            <Button
              variant={location === "/settings" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="link-settings"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
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

          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setRatingModalOpen(true)}
            data-testid="button-rate-church"
          >
            <Star className="h-4 w-4" />
            <span>Rate</span>
          </Button>

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
        </nav>
      </div>

      <ChurchRatingModal
        open={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
      />
    </header>
  );
}
