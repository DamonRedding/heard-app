import { useState, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChurchRatingModal } from "@/components/church-rating-modal";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Star, 
  Users, 
  MessageSquare,
  Heart,
  TrendingUp,
  Shield,
  Sprout,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import type { ChurchRating, Submission } from "@shared/schema";

interface ChurchProfile {
  name: string;
  location: string | null;
  denomination: string | null;
  googlePlaceId: string | null;
  totalRatings: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number; percentage: number }[];
  categoryBreakdown: {
    belonging: { average: number; count: number };
    leadership: { average: number; count: number };
    conflict: { average: number; count: number };
    growth: { average: number; count: number };
  };
  isControversial: boolean;
  ratingVariance: number;
}

interface RatingsResponse {
  ratings: ChurchRating[];
  total: number;
  hasMore: boolean;
}

interface StoriesResponse {
  stories: Submission[];
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function CategoryCard({ 
  title, 
  icon: Icon, 
  average, 
  count 
}: { 
  title: string; 
  icon: typeof Heart; 
  average: number; 
  count: number;
}) {
  const getColorClass = (avg: number) => {
    if (avg >= 4) return "text-green-600 dark:text-green-400";
    if (avg >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${getColorClass(average)}`}>
            {average > 0 ? average.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">/ 5</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {count} {count === 1 ? "rating" : "ratings"}
        </p>
      </CardContent>
    </Card>
  );
}

function RatingCard({ rating }: { rating: ChurchRating }) {
  const getRecommendLabel = (scale: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      would_strongly_recommend: { text: "Strongly Recommend", color: "text-green-600 dark:text-green-400" },
      probably_would: { text: "Would Recommend", color: "text-green-500 dark:text-green-300" },
      uncertain: { text: "Uncertain", color: "text-yellow-600 dark:text-yellow-400" },
      probably_would_not: { text: "Would Not Recommend", color: "text-orange-500 dark:text-orange-400" },
      would_actively_discourage: { text: "Strongly Discourage", color: "text-red-600 dark:text-red-400" },
    };
    return labels[scale] || { text: scale, color: "text-muted-foreground" };
  };

  const recommend = getRecommendLabel(rating.recommendScale);
  const timeAgo = new Date(rating.createdAt).toLocaleDateString();

  return (
    <Card data-testid={`card-rating-${rating.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={recommend.color}>
              {recommend.text}
            </Badge>
            {rating.denomination && (
              <Badge variant="outline" className="text-xs">
                {rating.denomination}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </div>
        </div>
        
        {rating.belongingComment && (
          <p className="text-sm text-muted-foreground mb-3 italic">
            "{rating.belongingComment}"
          </p>
        )}
        
        {rating.additionalComment && (
          <p className="text-sm mb-3">
            {rating.additionalComment}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-muted-foreground" />
            <span>Belonging: {rating.belongingScale.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span>Leadership: {rating.leadershipScale.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <span>Conflict: {rating.conflictHandling.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Sprout className="h-3 w-3 text-muted-foreground" />
            <span>Growth: {rating.growthScale.replace(/_/g, " ")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StoryCard({ story }: { story: Submission }) {
  const timeAgo = new Date(story.createdAt).toLocaleDateString();

  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`card-story-${story.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="font-medium line-clamp-2">{story.title || "Untitled"}</h3>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {story.category.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {story.content}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          <span>{story.commentCount} comments</span>
          <span>{story.meTooCount} related</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChurchProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsSortBy, setRatingsSortBy] = useState<"newest" | "oldest">("newest");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<ChurchProfile>({
    queryKey: [`/api/churches/profile/${slug}`],
    enabled: !!slug,
  });

  const ratingsQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(ratingsPage));
    params.set("sortBy", ratingsSortBy);
    return `/api/churches/${slug}/ratings?${params.toString()}`;
  }, [slug, ratingsPage, ratingsSortBy]);

  const { data: ratingsData, isLoading: ratingsLoading } = useQuery<RatingsResponse>({
    queryKey: [ratingsQueryUrl],
    enabled: !!slug && activeTab === "ratings",
  });

  const { data: storiesData, isLoading: storiesLoading } = useQuery<StoriesResponse>({
    queryKey: [`/api/churches/${slug}/stories`],
    enabled: !!slug && activeTab === "stories",
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10" />
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen" data-testid="container-error-state">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/churches">
              <Button variant="ghost" size="icon" data-testid="button-back-error">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="text-error-title">Church Not Found</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-error-subtitle">This church profile doesn't exist.</p>
            </div>
          </div>
          <Card data-testid="card-error">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2" data-testid="text-error-message">Church not found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We couldn't find this church in our database. It may not have been rated yet.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/churches">
                  <Button data-testid="button-browse-churches">
                    Browse Churches
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-start gap-4 mb-6">
          <Link href="/churches">
            <Button variant="ghost" size="icon" data-testid="button-back-profile">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-church-name">
              {profile.name}
            </h1>
            {profile.location && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                <span data-testid="text-church-location">{profile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-2">
                <RatingStars rating={profile.averageRating} />
                <span className="text-xl font-semibold" data-testid="text-average-rating">
                  {profile.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({profile.totalRatings} {profile.totalRatings === 1 ? "rating" : "ratings"})
                </span>
              </div>
              {profile.isControversial && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-controversial">
                  <MessageSquare className="h-3 w-3" />
                  Varied Experiences
                </Badge>
              )}
              {profile.denomination && (
                <Badge variant="outline">{profile.denomination}</Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="ratings" data-testid="tab-ratings">Ratings</TabsTrigger>
            <TabsTrigger value="stories" data-testid="tab-stories">Stories</TabsTrigger>
            <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.ratingDistribution.map((item) => (
                    <div key={item.rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm font-medium">{item.rating}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                      <Progress 
                        value={item.percentage} 
                        className="flex-1 h-3"
                        data-testid={`progress-rating-${item.rating}`}
                      />
                      <div className="w-16 text-right">
                        <span className="text-sm text-muted-foreground">
                          {item.count} ({Math.round(item.percentage)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Category Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CategoryCard 
                  title="Belonging" 
                  icon={Heart} 
                  average={profile.categoryBreakdown.belonging.average}
                  count={profile.categoryBreakdown.belonging.count}
                />
                <CategoryCard 
                  title="Leadership" 
                  icon={Shield} 
                  average={profile.categoryBreakdown.leadership.average}
                  count={profile.categoryBreakdown.leadership.count}
                />
                <CategoryCard 
                  title="Conflict Handling" 
                  icon={MessageSquare} 
                  average={profile.categoryBreakdown.conflict.average}
                  count={profile.categoryBreakdown.conflict.count}
                />
                <CategoryCard 
                  title="Growth" 
                  icon={Sprout} 
                  average={profile.categoryBreakdown.growth.average}
                  count={profile.categoryBreakdown.growth.count}
                />
              </div>
              {profile.isControversial && (
                <Card className="mt-4 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Varied Experiences
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        This church has a high variance in ratings, indicating significantly different experiences among visitors.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-center">
              <Button size="lg" onClick={() => setRatingModalOpen(true)} data-testid="button-rate-church">
                <Star className="h-4 w-4 mr-2" />
                Rate This Church
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ratings" className="space-y-4">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <p className="text-sm text-muted-foreground" data-testid="text-total-ratings">
                {ratingsData?.total || 0} total ratings
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant={ratingsSortBy === "newest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setRatingsSortBy("newest"); setRatingsPage(1); }}
                  data-testid="button-sort-newest"
                >
                  Newest
                </Button>
                <Button 
                  variant={ratingsSortBy === "oldest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setRatingsSortBy("oldest"); setRatingsPage(1); }}
                  data-testid="button-sort-oldest"
                >
                  Oldest
                </Button>
              </div>
            </div>

            {ratingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : ratingsData?.ratings && ratingsData.ratings.length > 0 ? (
              <>
                <div className="space-y-4">
                  {ratingsData.ratings.map((rating) => (
                    <RatingCard key={rating.id} rating={rating} />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRatingsPage(p => Math.max(1, p - 1))}
                    disabled={ratingsPage <= 1}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground" data-testid="text-page-number">
                    Page {ratingsPage}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRatingsPage(p => p + 1)}
                    disabled={!ratingsData.hasMore}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">No ratings yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Be the first to rate this church.
                  </p>
                  <Button onClick={() => setRatingModalOpen(true)} data-testid="button-rate-first">
                    <Star className="h-4 w-4 mr-2" />
                    Rate This Church
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stories" className="space-y-4">
            {storiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : storiesData?.stories && storiesData.stories.length > 0 ? (
              <div className="space-y-4">
                {storiesData.stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">No stories yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    No experiences have been shared about this church yet.
                  </p>
                  <Link href="/submit">
                    <Button data-testid="button-share-story">
                      Share Your Experience
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-10 w-10 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">{profile.name}</h3>
                    {profile.location && (
                      <p className="text-sm text-muted-foreground">{profile.location}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Denomination</p>
                    <p className="font-medium">{profile.denomination || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ratings</p>
                    <p className="font-medium">{profile.totalRatings}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{profile.averageRating.toFixed(1)}</p>
                      <RatingStars rating={profile.averageRating} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-muted-foreground">Unclaimed</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <Button variant="outline" className="w-full" data-testid="button-claim-church">
                    <Building2 className="h-4 w-4 mr-2" />
                    Claim This Church
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Church leaders can claim their profile to respond to feedback
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ChurchRatingModal 
        open={ratingModalOpen} 
        onClose={() => setRatingModalOpen(false)}
        defaultChurchName={profile.name}
      />
    </div>
  );
}
