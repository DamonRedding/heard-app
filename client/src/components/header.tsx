import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/feedback-button";
import { ChurchRatingModal } from "@/components/church-rating-modal";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PenLine, Shield, Home, Star, Church, Search, Settings, MoreHorizontal, MessageSquareText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLogoExperienceState } from "@/hooks/use-logo-experience";
import { cn } from "@/lib/utils";

export function Header() {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const { displayMode, isTransitioning, setExpanded } = useLogoExperienceState();

  if (isMobile) {
    return null;
  }

  const isLetterMark = displayMode === "lettermark";
  const isSecondaryActive = location === "/settings" || location === "/admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/" data-testid="link-home">
              <div 
                className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1.5 cursor-pointer"
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
                onClick={() => setExpanded(!isLetterMark ? false : true)}
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

        <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="nav-feed"
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
              variant={location === "/churches" || location.startsWith("/churches/") ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="nav-churches"
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
              data-testid="nav-search"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </Link>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/submit">
                <Button
                  variant={location === "/submit" ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  data-testid="nav-share"
                >
                  <PenLine className="h-4 w-4" />
                  <span>Share Story</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Share your anonymous church experience</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setRatingModalOpen(true)}
                data-testid="nav-rate"
              >
                <Star className="h-4 w-4" />
                <span>Rate</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rate a church anonymously</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isSecondaryActive ? "secondary" : "ghost"}
                size="icon"
                data-testid="nav-more"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setLocation("/settings")}
                className={cn(location === "/settings" && "bg-secondary")}
                data-testid="nav-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLocation("/admin")}
                className={cn(location === "/admin" && "bg-secondary")}
                data-testid="nav-admin"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
