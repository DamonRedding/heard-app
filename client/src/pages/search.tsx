import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmissionCard, SubmissionCardSkeleton } from "@/components/submission-card";
import { Search, X, Clock, TrendingUp, Flame } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CATEGORIES, DENOMINATIONS, type Category, type Submission, type VoteType, type FlagReason } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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

type SortType = "hot" | "new";

const RECENT_SEARCHES_KEY = "heard-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  const searches = getRecentSearches();
  const filtered = searches.filter((s) => s.toLowerCase() !== query.toLowerCase());
  const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDenomination, setSelectedDenomination] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>("hot");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, number>>>({});
  const [isSearchActive, setIsSearchActive] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const hasActiveSearch = isSearchActive;

  const buildSearchUrl = useCallback(() => {
    if (!hasActiveSearch) return null;
    const params = new URLSearchParams();
    if (submittedQuery.trim()) params.set("search", submittedQuery.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedDenomination) params.set("denomination", selectedDenomination);
    params.set("page", "1");
    params.set("sort", sortType);
    return `/api/submissions?${params.toString()}`;
  }, [submittedQuery, selectedCategory, selectedDenomination, sortType, hasActiveSearch]);

  const searchUrl = buildSearchUrl();

  const { data, isLoading } = useQuery<SubmissionsResponse>({
    queryKey: [searchUrl],
    enabled: !!searchUrl,
  });

  const { data: countsData } = useQuery<CategoryCountsResponse>({
    queryKey: ["/api/categories/counts"],
  });

  useEffect(() => {
    if (data?.submissions) {
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
  }, [data]);

  const voteMutation = useMutation({
    mutationFn: async ({ submissionId, voteType }: { submissionId: string; voteType: VoteType }) => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/vote`, { voteType });
      return res.json();
    },
    onSuccess: () => {
      if (searchUrl) {
        queryClient.invalidateQueries({ queryKey: [searchUrl] });
      }
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: FlagReason }) => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/flag`, { reason });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to flag submission");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ submissionId, reactionType }: { submissionId: string; reactionType: string }) => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/react`, { reactionType });
      return res.json();
    },
    onSuccess: (data, variables) => {
      setReactionsMap((prev) => ({
        ...prev,
        [variables.submissionId]: data.reactions,
      }));
    },
  });

  const meTooMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/metoo`);
      return res.json();
    },
    onSuccess: () => {
      if (searchUrl) {
        queryClient.invalidateQueries({ queryKey: [searchUrl] });
      }
    },
  });

  const handleVote = (submissionId: string, voteType: VoteType) => {
    voteMutation.mutate({ submissionId, voteType });
  };

  const handleFlag = (submissionId: string, reason: FlagReason) => {
    flagMutation.mutate({ submissionId, reason });
  };

  const handleReact = (submissionId: string, reactionType: string) => {
    reactionMutation.mutate({ submissionId, reactionType });
  };

  const handleMeToo = (submissionId: string) => {
    meTooMutation.mutate(submissionId);
  };

  const handleSearch = (query: string) => {
    setSubmittedQuery(query);
    if (query.trim()) {
      saveRecentSearch(query);
      setRecentSearches(getRecentSearches());
    }
    setIsSearchActive(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleCategoryBrowse = (category: Category) => {
    setSelectedCategory(category);
    setSubmittedQuery("");
    setIsSearchActive(true);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSubmittedQuery("");
    setSelectedCategory(null);
    setSelectedDenomination(null);
    setIsSearchActive(false);
  };

  const handleClearRecentSearches = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const getResultsLabel = () => {
    if (submittedQuery.trim() && selectedCategory) {
      return `"${submittedQuery.trim()}" in ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`;
    }
    if (submittedQuery.trim()) {
      return `"${submittedQuery.trim()}"`;
    }
    if (selectedCategory) {
      return CATEGORIES.find(c => c.value === selectedCategory)?.label || "Category";
    }
    return "all";
  };

  return (
    <div className="min-h-screen pb-20">
      {isMobile && (
        <div 
          className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b"
          data-testid="search-sticky-header"
        >
          <div className="flex items-center justify-center px-4 py-3 border-b border-border/50">
            <Link href="/" data-testid="search-logo">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Heard</h1>
            </Link>
          </div>
          
          <div className="px-4 py-2 space-y-2">
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search experiences, churches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10"
                data-testid="input-search"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  data-testid="button-clear-input"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </form>

            {hasActiveSearch && (
              <div className="flex-1 flex items-center rounded-lg border bg-muted/30 p-0.5" role="tablist" aria-label="Sort results">
                <Button
                  variant={sortType === "hot" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortType("hot")}
                  className="flex-1 gap-1.5 h-9 text-sm"
                  role="tab"
                  aria-selected={sortType === "hot"}
                  data-testid="search-sort-hot"
                >
                  <Flame className="h-4 w-4" />
                  Top
                </Button>
                <Button
                  variant={sortType === "new" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortType("new")}
                  className="flex-1 gap-1.5 h-9 text-sm"
                  role="tab"
                  aria-selected={sortType === "new"}
                  data-testid="search-sort-new"
                >
                  <Clock className="h-4 w-4" />
                  Latest
                </Button>
              </div>
            )}
          </div>

          {hasActiveSearch && (
            <div className="px-4 pb-3 space-y-2 border-t border-border/50 pt-2">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedCategory === null ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all py-1.5 px-3",
                    selectedCategory === null && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setSelectedCategory(null)}
                  data-testid="search-category-all"
                >
                  All
                </Badge>
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant={selectedCategory === cat.value ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all py-1.5 px-3",
                      selectedCategory === cat.value && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => setSelectedCategory(cat.value)}
                    data-testid={`search-category-${cat.value}`}
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
              <Select
                value={selectedDenomination || "all"}
                onValueChange={(value) => setSelectedDenomination(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full h-9" data-testid="search-denomination">
                  <SelectValue placeholder="All Denominations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Denominations</SelectItem>
                  {DENOMINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="w-full text-muted-foreground"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear search & filters
              </Button>
            </div>
          )}
        </div>
      )}

      <main className="container mx-auto px-4 py-4 sm:py-6">
        {!hasActiveSearch ? (
          <div className="space-y-6">
            {recentSearches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearRecentSearches}
                    className="text-xs text-muted-foreground h-7"
                    data-testid="button-clear-recent"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(query)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover-elevate active-elevate-2"
                      data-testid={`recent-search-${index}`}
                    >
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{query}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Browse by Category
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <Card
                    key={cat.value}
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => handleCategoryBrowse(cat.value)}
                    data-testid={`browse-category-${cat.value}`}
                  >
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{cat.label}</p>
                      {countsData?.counts[cat.value] !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {countsData.counts[cat.value]} experiences
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Searching..." : `${data?.total || 0} results for ${getResultsLabel()}`}
            </p>

            {isLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <SubmissionCardSkeleton key={i} />
                ))}
              </div>
            ) : data?.submissions && data.submissions.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {data.submissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    onVote={(submissionId, voteType) => handleVote(submissionId, voteType)}
                    onFlag={async (submissionId, reason) => { handleFlag(submissionId, reason); }}
                    reactions={reactionsMap[submission.id] || {}}
                    onReact={(reactionType) => handleReact(submission.id, reactionType)}
                    onMeToo={() => handleMeToo(submission.id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try different keywords or browse categories
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
