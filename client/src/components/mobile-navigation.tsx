import { Link, useLocation } from "wouter";
import { Home, PenLine, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileNavItem {
  icon: typeof Home;
  label: string;
  href: string;
  testId: string;
}

const navItems: MobileNavItem[] = [
  { icon: Home, label: "Feed", href: "/", testId: "mobile-nav-feed" },
  { icon: PenLine, label: "Share", href: "/submit", testId: "mobile-nav-share" },
  { icon: Info, label: "About", href: "/about", testId: "mobile-nav-about" },
];

export function MobileNavigation() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t"
      role="navigation"
      aria-label="Mobile navigation"
      data-testid="mobile-navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-lg transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover-elevate active-elevate-2"
                )}
                data-testid={item.testId}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

interface FloatingActionButtonProps {
  onClick?: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  
  if (!isMobile || location === "/submit") return null;

  return (
    <Link href="/submit">
      <button
        onClick={onClick}
        className="fixed bottom-20 right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover-elevate active-elevate-2 transition-transform active:scale-95"
        data-testid="fab-share-experience"
        aria-label="Share your experience"
      >
        <PenLine className="h-6 w-6" />
      </button>
    </Link>
  );
}
