import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, MapPin, Users, Star, ChevronRight } from "lucide-react";

interface RatedChurch {
  name: string;
  location: string | null;
  ratingCount: number;
  googlePlaceId: string | null;
  denomination: string | null;
  latestRatingAt: string;
}

interface ChurchesResponse {
  churches: RatedChurch[];
}

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

export default function Churches() {
  const { data, isLoading } = useQuery<ChurchesResponse>({
    queryKey: ["/api/churches"],
  });

  const churches = data?.churches ?? [];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-churches">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Explore Churches</h1>
            <p className="text-sm text-muted-foreground">Browse churches with community ratings</p>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Recently Rated</h2>
              </div>
              <Badge variant="secondary">{churches.length} churches</Badge>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : churches.length > 0 ? (
              <div className="space-y-3">
                {churches.map((church, index) => {
                  const slug = generateSlug(church.name, church.location);
                  return (
                    <Card 
                      key={`${church.googlePlaceId || church.name}-${index}`}
                      className="hover-elevate cursor-pointer"
                      data-testid={`card-church-${index}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
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
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">No churches rated yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Be the first to rate a church and help others in the community.
                  </p>
                  <Link href="/">
                    <Button data-testid="button-rate-first-church">
                      <Star className="h-4 w-4 mr-2" />
                      Rate a Church
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
