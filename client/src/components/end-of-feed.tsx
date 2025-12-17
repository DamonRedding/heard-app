import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Clock, Flame, Sparkles, CheckCircle2, ArrowUp } from "lucide-react";

type SortType = "hot" | "new";

interface EndOfFeedProps {
  sortType: SortType;
  onSwitchSort: (sort: SortType) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  totalShown: number;
}

export function EndOfFeed({ 
  sortType, 
  onSwitchSort, 
  onRefresh, 
  isRefreshing = false,
  totalShown 
}: EndOfFeedProps) {
  const isHot = sortType === "hot";

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Card className="border-dashed" data-testid="end-of-feed">
      <CardContent className="py-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg" data-testid="end-of-feed-title">
            You're all caught up
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto" data-testid="end-of-feed-description">
            {isHot ? (
              <>You've seen all {totalShown} trending experiences. Check back later for more, or explore the newest submissions.</>
            ) : (
              <>You've seen all {totalShown} experiences. New stories are added regularly by the community.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToTop}
            className="gap-1.5"
            data-testid="button-scroll-to-top"
          >
            <ArrowUp className="h-4 w-4" />
            Back to Top
          </Button>
          
          {isHot ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchSort("new")}
              className="gap-1.5"
              data-testid="button-switch-to-new"
            >
              <Clock className="h-4 w-4" />
              View New
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchSort("hot")}
              className="gap-1.5"
              data-testid="button-switch-to-hot"
            >
              <Flame className="h-4 w-4" />
              View Hot
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
            data-testid="button-end-of-feed-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Link href="/submit">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              data-testid="button-share-story-end-of-feed"
            >
              <Sparkles className="h-4 w-4" />
              Share Your Story
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
