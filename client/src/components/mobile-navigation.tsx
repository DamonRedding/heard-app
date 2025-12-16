import { Link, useLocation } from "wouter";
import { Home, PenLine, Info, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/components/theme-provider";

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
  const { theme, setTheme } = useTheme();

  if (!isMobile) return null;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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
          const isShareButton = item.href === "/submit";
          
          if (isShareButton) {
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className="flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-lg transition-colors bg-primary text-primary-foreground hover-elevate active-elevate-2"
                  data-testid={item.testId}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          }
          
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
                onClick={(e) => {
                  if (isActive && item.href === "/") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
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
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-lg transition-colors text-muted-foreground hover-elevate active-elevate-2"
          data-testid="mobile-nav-theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            Theme
          </span>
        </button>
      </div>
    </nav>
  );
}
