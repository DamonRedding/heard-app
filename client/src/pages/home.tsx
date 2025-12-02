import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SubmissionCard, SubmissionCardSkeleton } from "@/components/submission-card";
import { CategoryFilter } from "@/components/category-filter";
import { PenLine, RefreshCw, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Submission, Category, VoteType, FlagReason } from "@shared/schema";

interface SubmissionsResponse {
  submissions: Submission[];
  hasMore: boolean;
  total: number;
}

interface CategoryCountsResponse {
  counts: Record<string, number>;
}

function buildSubmissionsUrl(category: Category | null, page: number): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("page", page.toString());
  return `/api/submissions?${params.toString()}`;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [page, setPage] = useState(1);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const { toast } = useToast();

  const submissionsUrl = buildSubmissionsUrl(selectedCategory, page);

  const { data, isLoading, isFetching, refetch } = useQuery<SubmissionsResponse>({
    queryKey: [submissionsUrl],
  });

  const { data: countsData } = useQuery<CategoryCountsResponse>({
    queryKey: ["/api/categories/counts"],
  });

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

  useEffect(() => {
    setPage(1);
    setAllSubmissions([]);
  }, [selectedCategory]);

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

  const flagMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: FlagReason }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/flag`, { reason });
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
    onError: () => {
      toast({
        title: "Report failed",
        description: "Unable to submit your report. Please try again.",
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Recent Submissions</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categoryCounts={countsData?.counts}
          />
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
                  isVoting={voteMutation.isPending}
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
