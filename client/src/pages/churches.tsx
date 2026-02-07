import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChurchRatingModal } from "@/components/church-rating-modal";
import { 
  ArrowLeft, 
  Church, 
  MapPin, 
  Users, 
  Star, 
  ChevronRight, 
  Search, 
  X,
  SlidersHorizontal,
  TrendingUp,
  MessageSquare,
  Clock
} from "lucide-react";
import { DENOMINATIONS } from "@shared/schema";

interface RatedChurch {
  name: string;
  location: string | null;
  ratingCount: number;
  googlePlaceId: string | null;
  denomination: string | null;
  latestRatingAt: string;
  averageRating?: number;
  isControversial?: boolean;
}

interface ChurchesResponse {
  churches: RatedChurch[];
  total: number;
  hasMore: boolean;
}

type SortOption = "most_rated" | "highest_rated" | "most_controversial" | "recently_rated";

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof TrendingUp }[] = [
  { value: "most_rated", label: "Most Rated", icon: Users },
  { value: "highest_rated", label: "Highest Rated", icon: Star },
  { value: "most_controversial", label: "Most Controversial", icon: MessageSquare },
  { value: "recently_rated", label: "Recently Rated", icon: Clock },
];

const MIN_RATING_OPTIONS = [
  { value: "", label: "Any Rating" },
  { value: "3.0", label: "3.0+" },
  { value: "3.5", label: "3.5+" },
  { value: "4.0", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
];

function generateSlug(name: string, location: string | null): string {
  const parts = [name];
  if (location) {
    const locationParts = location.split(',').slice(0, 2).map(p => p.trim());
    parts.push(...locationParts);
  }
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function FilterChip({ 
  label, 
  onRemove,
  testId
}: { 
  label: string; 
  onRemove: () => void;
  testId?: string;
}) {
  return (
    <Badge 
      variant="secondary" 
      className="gap-1 cursor-pointer"
      onClick={onRemove}
      data-testid={testId}
    >
      {label}
      <X className="h-3 w-3" />
    </Badge>
  );
}

export default function Churches() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [denomination, setDenomination] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("most_rated");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  // Listen for FAB click event to open rating modal
  useEffect(() => {
    const handleOpenRatingModal = () => {
      setRatingModalOpen(true);
    };
    
    window.addEventListener("open-church-rating-modal", handleOpenRatingModal);
    return () => {
      window.removeEventListener("open-church-rating-modal", handleOpenRatingModal);
    };
  }, []);

  // Debounce search input with proper cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Build query URL with params
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (denomination) params.set("denomination", denomination);
    if (minRating && minRating !== "any") params.set("minRating", minRating);
    if (sortBy !== "most_rated") params.set("sortBy", sortBy);
    if (page > 1) params.set("page", String(page));
    params.set("limit", "20");
    const paramStr = params.toString();
    return paramStr ? `/api/churches?${paramStr}` : "/api/churches";
  }, [debouncedSearch, denomination, minRating, sortBy, page]);

  const hasFilters = debouncedSearch || denomination || minRating || sortBy !== "most_rated";

  const { data, isLoading, isFetching } = useQuery<ChurchesResponse>({
    queryKey: [queryUrl],
  });

  const churches = data?.churches ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  // Active filters for chips
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];
  if (debouncedSearch) {
    activeFilters.push({
      key: "search",
      label: `Search: "${debouncedSearch}"`,
      onRemove: () => { setSearchQuery(""); setDebouncedSearch(""); },
    });
  }
  if (denomination) {
    activeFilters.push({
      key: "denomination",
      label: denomination,
      onRemove: () => setDenomination(""),
    });
  }
  if (minRating) {
    activeFilters.push({
      key: "minRating",
      label: `${minRating}+ stars`,
      onRemove: () => setMinRating(""),
    });
  }

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setDenomination("");
    setMinRating("");
    setSortBy("most_rated");
    setPage(1);
  };

  return (
    <div className="min-h-screen safe-area-inset-top">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-churches">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Find Churches</h1>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total} churches rated by the community` : "Browse churches with community ratings"}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              data-testid="input-search-churches"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1"
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>

            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setPage(1); }}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground"
                data-testid="button-clear-filters"
              >
                Clear all
              </Button>
            )}
          </div>

          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Denomination</label>
                    <Select value={denomination} onValueChange={(v) => { setDenomination(v === "all" ? "" : v); setPage(1); }}>
                      <SelectTrigger data-testid="select-denomination">
                        <SelectValue placeholder="All denominations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All denominations</SelectItem>
                        {DENOMINATIONS.map((denom) => (
                          <SelectItem key={denom} value={denom}>
                            {denom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
                    <Select value={minRating} onValueChange={(v) => { setMinRating(v); setPage(1); }}>
                      <SelectTrigger data-testid="select-min-rating">
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {MIN_RATING_OPTIONS.map((option) => (
                          <SelectItem key={option.value || "any"} value={option.value || "any"}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilters.map((filter) => (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  onRemove={filter.onRemove}
                  testId={`chip-filter-${filter.key}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Church className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {hasFilters ? "Results" : "Recently Rated"}
                </h2>
              </div>
              <Badge variant="secondary">
                {isFetching ? "Loading..." : `${churches.length} of ${total}`}
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : churches.length > 0 ? (
              <>
                <div className="space-y-3">
                  {churches.map((church, index) => {
                    const slug = generateSlug(church.name, church.location);
                    return (
                      <Link key={`${church.googlePlaceId || church.name}-${index}`} href={`/churches/${slug}`}>
                        <Card 
                          className="hover-elevate cursor-pointer"
                          data-testid={`card-church-${index}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Church className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-base truncate">{church.name}</h3>
                                {church.location && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{church.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  {church.averageRating !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <RatingStars rating={church.averageRating} />
                                      <span className="text-sm font-medium">
                                        {church.averageRating.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-sm">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                      {church.ratingCount} {church.ratingCount === 1 ? 'rating' : 'ratings'}
                                    </span>
                                  </div>
                                  {church.denomination && (
                                    <Badge variant="outline" className="text-xs">
                                      {church.denomination}
                                    </Badge>
                                  )}
                                  {church.isControversial && (
                                    <Badge variant="secondary" className="text-xs gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      Varied
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-6">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => p + 1)}
                      disabled={isFetching}
                      data-testid="button-load-more"
                    >
                      {isFetching ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Church className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">
                    {hasFilters ? "No churches match your filters" : "No churches rated yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasFilters 
                      ? "Try adjusting your filters or search query."
                      : "Be the first to rate a church and help others in the community."
                    }
                  </p>
                  {hasFilters ? (
                    <Button onClick={clearAllFilters} data-testid="button-clear-filters-empty">
                      Clear Filters
                    </Button>
                  ) : (
                    <Button onClick={() => setRatingModalOpen(true)} data-testid="button-rate-first-church">
                      <Star className="h-4 w-4 mr-2" />
                      Rate a Church
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>

      <ChurchRatingModal 
        open={ratingModalOpen} 
        onClose={() => setRatingModalOpen(false)}
      />
    </div>
  );
}
