import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmissionCard, SubmissionCardSkeleton } from "@/components/submission-card";
import { CategoryFilter } from "@/components/category-filter";
import { PenLine, RefreshCw, Loader2, Search, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Submission, Category, VoteType, FlagReason } from "@shared/schema";
import { DENOMINATIONS } from "@shared/schema";

interface SubmissionsResponse {
  submissions: Submission[];
  hasMore: boolean;
  total: number;
}

interface CategoryCountsResponse {
  counts: Record<string, number>;
}

function buildSubmissionsUrl(
  category: Category | null, 
  page: number, 
  search: string,
  denomination: string | null
): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  if (denomination) params.set("denomination", denomination);
  params.set("page", page.toString());
  return `/api/submissions?${params.toString()}`;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDenomination, setSelectedDenomination] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const submissionsUrl = buildSubmissionsUrl(selectedCategory, page, debouncedSearch, selectedDenomination);

  const { data, isLoading, isFetching, refetch } = useQuery<SubmissionsResponse>({
    queryKey: [submissionsUrl],
  });

  const { data: countsData } = useQuery<CategoryCountsResponse>({
    queryKey: ["/api/categories/counts"],
  });

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedDenomination, debouncedSearch]);

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
    }
  }, [data, page]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedDenomination(null);
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  };

  const hasFilters = selectedCategory || selectedDenomination || debouncedSearch;

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

  const handleVote = useCallback(
    (submissionId: string, voteType: VoteType) => {
      voteMutation.mutate({ submissionId, voteType });
    },
    [voteMutation]
  );

  const handleFlag = useCallback(
    async (submissionId: string, reason: FlagReason) => {
      await flagMutation.mutateAsync({ submissionId, reason });
    },
    [flagMutation]
  );

  const handleMeToo = useCallback(
    (submissionId: string) => {
      meTooMutation.mutate({ submissionId });
    },
    [meTooMutation]
  );

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen">
      <section className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Anonymous Church Experiences
            </h1>
            <p className="text-lg text-muted-foreground">
              A safe space to share what you've witnessed or experienced. Your voice matters.
            </p>
            <Link href="/submit">
              <Button size="lg" className="gap-2 mt-4" data-testid="button-share-experience-hero">
                <PenLine className="h-5 w-5" />
                Share Your Experience
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
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
            <Select
              value={selectedDenomination || "all"}
              onValueChange={(value) => setSelectedDenomination(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-denomination-filter">
                <SelectValue placeholder="All Denominations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Denominations</SelectItem>
                {DENOMINATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                {hasFilters ? "Filtered Results" : "Recent Submissions"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categoryCounts={countsData?.counts}
            />
          </div>
        </div>

        <div className="space-y-6">
          {isLoading && page === 1 ? (
            Array.from({ length: 5 }).map((_, i) => <SubmissionCardSkeleton key={i} />)
          ) : allSubmissions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-4">
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
                  isVoting={voteMutation.isPending}
                  isMeTooing={meTooMutation.isPending}
                />
              ))}

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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
