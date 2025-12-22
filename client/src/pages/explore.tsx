import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, Hash, Users, Clock, ChevronRight } from "lucide-react";
import type { Submission, Category } from "@shared/schema";

interface SubmissionsResponse {
  submissions: Submission[];
  total: number;
  hasMore: boolean;
}

export default function Explore() {
  const { data: submissionsData, isLoading: loadingSubmissions } = useQuery<SubmissionsResponse>({
    queryKey: ["/api/submissions"],
  });

  const { data: categories, isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isLoading = loadingSubmissions || loadingCategories;
  const submissions = submissionsData?.submissions ?? [];

  const getCategoryStats = () => {
    if (!submissions.length || !categories) return [];
    
    const stats = categories.map(category => {
      const count = submissions.filter(s => s.category === category.name).length;
      return { ...category, count };
    }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
    
    return stats;
  };

  const getTopSubmissions = () => {
    if (!submissions.length) return [];
    return [...submissions]
      .sort((a, b) => (b.condemnCount + b.absolveCount) - (a.condemnCount + a.absolveCount))
      .slice(0, 5);
  };

  const getRecentSubmissions = () => {
    if (!submissions.length) return [];
    return [...submissions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  };

  const categoryStats = getCategoryStats();
  const topSubmissions = getTopSubmissions();
  const recentSubmissions = getRecentSubmissions();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-explore">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Explore</h1>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Categories</h2>
            </div>
            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoryStats.map(category => (
                  <Link key={category.id} href={`/search?category=${encodeURIComponent(category.name)}`}>
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer gap-1.5 px-3 py-1.5"
                      data-testid={`badge-category-${category.id}`}
                    >
                      {category.name}
                      <span className="text-muted-foreground">({category.count})</span>
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Most Discussed</h2>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : topSubmissions.length > 0 ? (
              <div className="space-y-3">
                {topSubmissions.map((submission, index) => (
                  <Link key={submission.id} href={`/?highlight=${submission.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-top-submission-${submission.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{submission.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{submission.category}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {submission.condemnCount + submission.absolveCount} votes
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No submissions yet</p>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Recent Stories</h2>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : recentSubmissions.length > 0 ? (
              <div className="space-y-3">
                {recentSubmissions.map(submission => (
                  <Link key={submission.id} href={`/?highlight=${submission.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-recent-submission-${submission.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{submission.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{submission.category}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(submission.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No submissions yet</p>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Community Stats</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {submissionsData?.total ?? submissions.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Stories Shared</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {submissions.reduce((acc, s) => acc + s.condemnCount + s.absolveCount, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Votes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {categories?.length ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
