import { Link, useLocation } from "wouter";
import { Home, Building2, Search, Settings } from "lucide-react";
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
  { icon: Building2, label: "Churches", href: "/churches", testId: "mobile-nav-churches" },
  { icon: Search, label: "Search", href: "/search", testId: "mobile-nav-search" },
  { icon: Settings, label: "Settings", href: "/settings", testId: "mobile-nav-settings" },
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
                    "relative flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-xl transition-all duration-200",
                    isActive 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover-elevate active-elevate-2"
                  )}
                  style={isActive ? {
                    boxShadow: '0 0 12px 2px hsl(var(--primary) / 0.15)'
                  } : undefined}
                  data-testid={item.testId}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e) => {
                    if (isActive && item.href === "/") {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "text-primary scale-110"
                  )} />
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span 
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
    </nav>
  );
}
