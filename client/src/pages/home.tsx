import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmissionCard, SubmissionCardSkeleton } from "@/components/submission-card";
import { CategoryFilter } from "@/components/category-filter";
import { MobileFilterSheet } from "@/components/mobile-filter-sheet";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PenLine, RefreshCw, Loader2, Search, X, CheckCircle2, Sparkles, Flame, Clock, User, TrendingUp, ChevronUp } from "lucide-react";
import { EndOfFeed } from "@/components/end-of-feed";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFeedPersonalization } from "@/hooks/use-feed-personalization";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Submission, Category, VoteType, FlagReason } from "@shared/schema";
import { DENOMINATIONS, CATEGORIES } from "@shared/schema";
import { cn } from "@/lib/utils";

type SortType = "hot" | "new";

interface SubmissionsResponse {
  submissions: Submission[];
  hasMore: boolean;
  total: number;
}

interface CategoryCountsResponse {
  counts: Record<string, number>;
}

interface BulkReactionsResponse {
  reactions: Record<string, Record<string, number>>;
}

function buildSubmissionsUrl(
  category: Category | null, 
  page: number, 
  search: string,
  denomination: string | null,
  sort: SortType,
  personalizationParams?: string
): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  if (denomination) params.set("denomination", denomination);
  params.set("page", page.toString());
  params.set("sort", sort);
  
  if (!category && !search && !denomination && personalizationParams) {
    return `/api/submissions/personalized?${params.toString()}&${personalizationParams}`;
  }
  
  return `/api/submissions?${params.toString()}`;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDenomination, setSelectedDenomination] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortType, setSortType] = useState<SortType>("hot");
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [highlightedSubmissionId, setHighlightedSubmissionId] = useState<string | null>(null);
  const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, number>>>({});
  const { toast } = useToast();
  const searchParams = useSearch();
  const isMobile = useIsMobile();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const { trackEngagement, getPersonalizationLevel, getPersonalizationParams, totalEngagements } = useFeedPersonalization();
  const personalizationLevel = getPersonalizationLevel();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const highlight = params.get("highlight");
    const welcome = params.get("welcome");
    
    if (highlight) {
      setHighlightedSubmissionId(highlight);
    }
    if (welcome === "true") {
      setShowWelcomeBanner(true);
    }
    
    if (highlight || welcome) {
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const personalizationParams = getPersonalizationParams();
  const submissionsUrl = buildSubmissionsUrl(selectedCategory, page, debouncedSearch, selectedDenomination, sortType, personalizationParams);

  const { data, isLoading, isFetching, refetch } = useQuery<SubmissionsResponse>({
    queryKey: [submissionsUrl],
  });

  const { data: countsData } = useQuery<CategoryCountsResponse>({
    queryKey: ["/api/categories/counts"],
  });

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedDenomination, debouncedSearch, sortType]);

  useEffect(() => {
    if (data?.submissions) {
      if (page === 1) {
        setAllSubmissions(data.submissions);
      } else {
        setAllSubmissions((prev) => {
          const newIds = new Set(data.submissions.map((s) => s.id));
          const existing = prev.filter((s) => !newIds.has(s.id));
          return [...existing, ...data.submissions];
        });
      }

      const submissionIds = data.submissions.map((s) => s.id);
      if (submissionIds.length > 0) {
        apiRequest("POST", "/api/reactions/bulk", { submissionIds })
          .then((res) => res.json())
          .then((bulkData: BulkReactionsResponse) => {
            setReactionsMap((prev) => ({ ...prev, ...bulkData.reactions }));
          })
          .catch((err) => {
            console.error("Error fetching reactions:", err);
          });
      }
    }
  }, [data, page]);

  useEffect(() => {
    if (!isMobile || !data?.hasMore || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && data?.hasMore && !isFetching) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [isMobile, data?.hasMore, isFetching]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedDenomination(null);
    setSearchQuery("");
    setDebouncedSearch("");
    setSortType("hot");
    setPage(1);
  };

  const hasFilters = selectedCategory || selectedDenomination || debouncedSearch;

  const handleRefresh = useCallback(async () => {
    setPage(1);
    await refetch();
  }, [refetch]);

  const voteMutation = useMutation({
    mutationFn: async ({ submissionId, voteType }: { submissionId: string; voteType: VoteType }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/vote`, { voteType });
      return response.json();
    },
    onSuccess: (responseData) => {
      setAllSubmissions((prev) =>
        prev.map((s) =>
          s.id === responseData.id
            ? { ...s, condemnCount: responseData.condemnCount, absolveCount: responseData.absolveCount }
            : s
        )
      );
    },
    onError: () => {
      toast({
        title: "Vote failed",
        description: "Unable to record your vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const meTooMutation = useMutation({
    mutationFn: async ({ submissionId }: { submissionId: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/metoo`);
      return response.json();
    },
    onSuccess: (responseData) => {
      setAllSubmissions((prev) =>
        prev.map((s) =>
          s.id === responseData.id
            ? { ...s, meTooCount: responseData.meTooCount }
            : s
        )
      );
      if (responseData.action === "added") {
        toast({
          title: "Me Too added",
          description: "Your shared experience has been recorded.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Unable to record your reaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: FlagReason }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/flag`, { reason });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to flag submission");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/submissions")
      });
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe.",
      });
    },
    onError: (error: Error) => {
      const isAlreadyFlagged = error.message.includes("already flagged");
      toast({
        title: isAlreadyFlagged ? "Already reported" : "Report failed",
        description: isAlreadyFlagged 
          ? "You have already reported this submission." 
          : "Unable to submit your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ submissionId, reactionType }: { submissionId: string; reactionType: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/react`, { reactionType });
      return response.json();
    },
    onSuccess: (responseData, { submissionId }) => {
      setReactionsMap((prev) => ({
        ...prev,
        [submissionId]: responseData.reactions,
      }));
    },
    onError: () => {
      toast({
        title: "Reaction failed",
        description: "Unable to record your reaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVote = useCallback(
    (submissionId: string, voteType: VoteType) => {
      const submission = allSubmissions.find(s => s.id === submissionId);
      if (submission) {
        trackEngagement(submission.category, "vote", submission.denomination, submission.content);
      }
      voteMutation.mutate({ submissionId, voteType });
    },
    [voteMutation, allSubmissions, trackEngagement]
  );

  const handleFlag = useCallback(
    async (submissionId: string, reason: FlagReason) => {
      await flagMutation.mutateAsync({ submissionId, reason });
    },
    [flagMutation]
  );

  const handleMeToo = useCallback(
    (submissionId: string) => {
      const submission = allSubmissions.find(s => s.id === submissionId);
      if (submission) {
        trackEngagement(submission.category, "metoo", submission.denomination, submission.content);
      }
      meTooMutation.mutate({ submissionId });
    },
    [meTooMutation, allSubmissions, trackEngagement]
  );

  const handleReact = useCallback(
    (submissionId: string, reactionType: string) => {
      const submission = allSubmissions.find(s => s.id === submissionId);
      if (submission) {
        trackEngagement(submission.category, "reaction", submission.denomination, submission.content);
      }
      reactMutation.mutate({ submissionId, reactionType });
    },
    [reactMutation, allSubmissions, trackEngagement]
  );

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const feedContent = (
    <div className="min-h-screen">
      <section className="bg-primary/5 border-b hidden md:block">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Anonymous Church Experiences
            </h1>
            <p className="text-lg text-muted-foreground">
              A safe space to share what you've witnessed or experienced. Your voice matters.
            </p>
            <Link href="/submit" className="inline-block">
              <Button size="lg" className="gap-2 mt-4" data-testid="button-share-experience-hero">
                <PenLine className="h-5 w-5" />
                Share Your Experience
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {isMobile && (
        <div 
          className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b"
          data-testid="mobile-sticky-tabs"
        >
          <div className="flex items-center justify-center px-4 py-3 border-b border-border/50">
            <Link href="/" data-testid="mobile-logo">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Heard</h1>
            </Link>
          </div>
          <div className="flex items-center px-4 py-2">
            <div className="flex-1 flex items-center rounded-lg border bg-muted/30 p-0.5" role="tablist" aria-label="Sort posts">
              <Button
                variant={sortType === "hot" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortType("hot")}
                className="flex-1 gap-1.5 h-9 text-sm"
                role="tab"
                aria-selected={sortType === "hot"}
                data-testid="button-sort-hot-sticky"
              >
                <Flame className="h-4 w-4" />
                Hot
              </Button>
              <Button
                variant={sortType === "new" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortType("new")}
                className="flex-1 gap-1.5 h-9 text-sm"
                role="tab"
                aria-selected={sortType === "new"}
                data-testid="button-sort-new-sticky"
              >
                <Clock className="h-4 w-4" />
                New
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
            <MobileFilterSheet
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedDenomination={selectedDenomination}
              onDenominationChange={setSelectedDenomination}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categoryCounts={countsData?.counts}
              hasActiveFilters={!!hasFilters}
              onClearFilters={clearFilters}
            />
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground text-xs h-8"
                data-testid="button-clear-filters-mobile"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {showWelcomeBanner && (
        <div className="container mx-auto px-4 pt-4 sm:pt-6">
          <Card className="border-absolve/30 bg-absolve/5" data-testid="welcome-banner">
            <CardContent className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-absolve" />
              </div>
              <div className="flex-1 space-y-0.5 sm:space-y-1">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  Your story is now live
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Thank you for your courage. Your experience is highlighted below.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowWelcomeBanner(false)}
                className="flex-shrink-0"
                data-testid="button-dismiss-banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          {!isMobile && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border bg-muted/30 p-1" role="tablist" aria-label="Sort posts">
                  <Button
                    variant={sortType === "hot" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortType("hot")}
                    className="gap-1.5 min-w-[70px] h-9 text-sm"
                    role="tab"
                    aria-selected={sortType === "hot"}
                    data-testid="button-sort-hot"
                  >
                    <Flame className="h-4 w-4" />
                    Hot
                  </Button>
                  <Button
                    variant={sortType === "new" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortType("new")}
                    className="gap-1.5 min-w-[70px] h-9 text-sm"
                    role="tab"
                    aria-selected={sortType === "new"}
                    data-testid="button-sort-new"
                  >
                    <Clock className="h-4 w-4" />
                    New
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground hidden lg:inline">
                  {sortType === "hot" ? "Trending experiences" : "Latest experiences"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {personalizationLevel.level !== "new" && !hasFilters && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="gap-1.5 cursor-help text-xs"
                        data-testid="badge-personalization"
                      >
                        {personalizationLevel.level === "discovering" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        <span>
                          {personalizationLevel.level === "discovering" ? "Learning" : "For You"}
                        </span>
                        <span className="text-xs opacity-70">
                          {personalizationLevel.percentage}%
                        </span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="font-medium mb-1">{personalizationLevel.description}</p>
                      {personalizationLevel.topCategories.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Top interests: {personalizationLevel.topCategories
                            .map(tc => CATEGORIES.find(c => c.value === tc.category)?.label || tc.category)
                            .join(", ")}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.floor(totalEngagements)} interactions tracked
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  aria-label="Refresh feed"
                  className="h-9 w-9"
                  data-testid="button-refresh"
                >
                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                </Button>
              </div>
            </div>
          )}

          {!isMobile && (
            <>
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categoryCounts={countsData?.counts}
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search experiences, churches, or locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedDenomination || "all"}
                    onValueChange={(value) => setSelectedDenomination(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-denomination-filter">
                      <SelectValue placeholder="All Denominations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Denominations</SelectItem>
                      {DENOMINATIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground whitespace-nowrap"
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {isMobile && hasFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCategory && (
                <Badge variant="secondary" className="gap-0 text-xs min-h-[44px] pl-3 pr-1">
                  <span>{CATEGORIES.find(c => c.value === selectedCategory)?.label}</span>
                  <button 
                    onClick={() => setSelectedCategory(null)} 
                    className="ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center -my-2 -mr-1 rounded-r-md hover-elevate"
                    data-testid="button-clear-category-filter"
                    aria-label="Clear category filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              )}
              {selectedDenomination && (
                <Badge variant="secondary" className="gap-0 text-xs min-h-[44px] pl-3 pr-1">
                  <span>{selectedDenomination}</span>
                  <button 
                    onClick={() => setSelectedDenomination(null)} 
                    className="ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center -my-2 -mr-1 rounded-r-md hover-elevate"
                    data-testid="button-clear-denomination-filter"
                    aria-label="Clear denomination filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              )}
              {debouncedSearch && (
                <Badge variant="secondary" className="gap-0 text-xs min-h-[44px] pl-3 pr-1">
                  <span>"{debouncedSearch}"</span>
                  <button 
                    onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }} 
                    className="ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center -my-2 -mr-1 rounded-r-md hover-elevate"
                    data-testid="button-clear-search-filter"
                    aria-label="Clear search filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground min-h-[44px] px-3"
                data-testid="button-clear-filters-mobile"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6">
          {isLoading && page === 1 ? (
            Array.from({ length: 5 }).map((_, i) => <SubmissionCardSkeleton key={i} />)
          ) : allSubmissions.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-base sm:text-lg text-muted-foreground mb-4">
                No experiences shared yet. Be the first.
              </p>
              <Link href="/submit">
                <Button variant="outline" className="gap-2" data-testid="button-share-experience-empty">
                  <PenLine className="h-4 w-4" />
                  Share Your Experience
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {allSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onVote={handleVote}
                  onFlag={handleFlag}
                  onMeToo={handleMeToo}
                  onReact={handleReact}
                  isVoting={voteMutation.isPending}
                  isMeTooing={meTooMutation.isPending}
                  isReacting={reactMutation.isPending}
                  reactions={reactionsMap[submission.id] || {}}
                  isHighlighted={highlightedSubmissionId === submission.id}
                />
              ))}

              {isMobile ? (
                <div ref={loadMoreRef} className="py-4">
                  {isFetching && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading more...</span>
                    </div>
                  )}
                  {!data?.hasMore && allSubmissions.length > 0 && !isFetching && (
                    <EndOfFeed
                      sortType={sortType}
                      onSwitchSort={setSortType}
                      onRefresh={handleRefresh}
                      isRefreshing={isFetching}
                      totalShown={allSubmissions.length}
                    />
                  )}
                </div>
              ) : (
                <>
                  {data?.hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={isFetching}
                        data-testid="button-load-more"
                      >
                        {isFetching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load More"
                        )}
                      </Button>
                    </div>
                  )}
                  {!data?.hasMore && allSubmissions.length > 0 && !isFetching && (
                    <div className="pt-4">
                      <EndOfFeed
                        sortType={sortType}
                        onSwitchSort={setSortType}
                        onRefresh={handleRefresh}
                        isRefreshing={isFetching}
                        totalShown={allSubmissions.length}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {isMobile && allSubmissions.length > 3 && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-md hover-elevate active-elevate-2"
          data-testid="button-scroll-to-top"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
        {feedContent}
      </PullToRefresh>
    );
  }

  return feedContent;
}
