import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Users, MessageCircle, ThumbsUp, ThumbsDown, ArrowRight, ArrowLeft, Mail, BookOpen, Loader2, Calendar, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { CATEGORIES, type Submission, type Category } from "@shared/schema";

interface EngagementFlowProps {
  submittedSubmission: Submission;
  onComplete: () => void;
}

interface CommunityStats {
  totalSubmissions: number;
  totalEngagements: number;
  recentEngagementsThisMonth: number;
}

const emailFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  notifyOnEngagement: z.boolean(),
  weeklyDigest: z.boolean(),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

function RelatedPostCard({ 
  submission, 
  onVote,
  isEngaged 
}: { 
  submission: Submission; 
  onVote: (id: string) => void;
  isEngaged: boolean;
}) {
  const categoryLabel = getCategoryLabel(submission.category);
  const timeAgo = formatDistanceToNow(new Date(submission.createdAt), { addSuffix: false });
  const contentPreview = submission.content.length > 120 
    ? `"${submission.content.slice(0, 120)}..."` 
    : `"${submission.content}"`;

  const handleVote = () => {
    if (!isEngaged) {
      onVote(submission.id);
    }
  };

  return (
    <Card 
      className={`transition-opacity duration-300 ${isEngaged ? 'opacity-60' : 'hover-elevate'}`} 
      data-testid={`related-post-${submission.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{categoryLabel}</span>
            {submission.denomination && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{submission.denomination}</span>
              </>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {timeAgo} ago
          </p>
        </div>

        <p className="font-serif text-sm leading-relaxed" data-testid={`related-content-${submission.id}`}>
          {contentPreview}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            {submission.absolveCount}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="h-3.5 w-3.5" />
            {submission.condemnCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {submission.meTooCount}
          </span>
        </div>

        <Button 
          size="lg"
          variant={isEngaged ? "secondary" : "default"}
          onClick={handleVote}
          disabled={isEngaged}
          className={`w-full gap-2 h-11 ${isEngaged ? 'bg-absolve/20 text-absolve border-absolve/30 hover:bg-absolve/20' : ''}`}
          data-testid={`button-hear-${submission.id}`}
        >
          {isEngaged ? (
            <>
              <Check className="h-4 w-4" />
              Heard!
            </>
          ) : (
            <>
              <ThumbsUp className="h-4 w-4" />
              I Hear You
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function getEngagementMessage(count: number): { text: string; emoji: string } {
  if (count === 0) {
    return { text: "Read stories and show support", emoji: "" };
  } else if (count === 1) {
    return { text: `Engaged with ${count} story`, emoji: "Nice work!" };
  } else if (count === 2) {
    return { text: `Engaged with ${count} stories`, emoji: "Keep going!" };
  } else {
    return { text: `Engaged with ${count} stories`, emoji: "You're amazing!" };
  }
}

export function EngagementFlow({ submittedSubmission, onComplete }: EngagementFlowProps) {
  const [step, setStep] = useState(1);
  const [engagedIds, setEngagedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const engagedCount = engagedIds.size;

  const { data: stats, isLoading: statsLoading } = useQuery<CommunityStats>({
    queryKey: ["/api/community/stats"],
  });

  const { data: relatedData, isLoading: relatedLoading } = useQuery<{ submissions: Submission[] }>({
    queryKey: ["/api/submissions/related", submittedSubmission.category, submittedSubmission.denomination],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: submittedSubmission.category,
        excludeId: submittedSubmission.id,
        limit: "5",
      });
      if (submittedSubmission.denomination) {
        params.set("denomination", submittedSubmission.denomination);
      }
      const response = await fetch(`/api/submissions/related?${params}`);
      return response.json();
    },
    enabled: step >= 2,
  });

  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return apiRequest("POST", `/api/submissions/${submissionId}/metoo`, {});
    },
    onSuccess: (_, submissionId) => {
      setEngagedIds(prev => new Set([...prev, submissionId]));
      queryClient.invalidateQueries({ 
        queryKey: ["/api/submissions/related", submittedSubmission.category, submittedSubmission.denomination] 
      });
      toast({
        description: (
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-absolve" />
            They'll see your support!
          </span>
        ),
        duration: 2000,
      });
    },
  });

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
      notifyOnEngagement: true,
      weeklyDigest: false,
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (data: EmailFormValues) => {
      return apiRequest("POST", "/api/email-subscribers", {
        email: data.email,
        submissionId: submittedSubmission.id,
        notifyOnEngagement: data.notifyOnEngagement ? 1 : 0,
        weeklyDigest: data.weeklyDigest ? 1 : 0,
        category: submittedSubmission.category,
        denomination: submittedSubmission.denomination,
      });
    },
    onSuccess: () => {
      toast({
        title: "Subscribed",
        description: "We'll keep you updated when your story resonates with others.",
      });
      onComplete();
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleVote = (submissionId: string) => {
    if (!engagedIds.has(submissionId)) {
      voteMutation.mutate(submissionId);
    }
  };

  const handleEmailSubmit = async (data: EmailFormValues) => {
    await emailMutation.mutateAsync(data);
  };

  const handleSkipEmail = () => {
    onComplete();
  };

  if (step === 1) {
    return (
      <Card className="border-absolve/30 bg-absolve/5" data-testid="engagement-step-1">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-absolve" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Your story has been shared anonymously</h3>
            <p className="text-muted-foreground max-w-md">
              Thank you for your courage. You're not alone.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 text-sm">
            {statsLoading ? (
              <>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-48" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                  <Users className="h-4 w-4 text-primary" />
                  <span data-testid="text-total-submissions">
                    <strong>{stats?.totalSubmissions || 0}</strong> others have shared their church experiences
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span data-testid="text-monthly-engagements">
                    <strong>{stats?.recentEngagementsThisMonth || 0}</strong> people found support this month
                  </span>
                </div>
              </>
            )}
          </div>

          <Button 
            size="lg" 
            className="mt-4 gap-2" 
            onClick={() => setStep(2)}
            data-testid="button-continue-step-1"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    const relatedPosts = relatedData?.submissions || [];
    const hasRelatedPosts = relatedPosts.length > 0;
    const remainingPosts = relatedPosts.filter(p => !engagedIds.has(p.id)).length;
    const engagementMsg = getEngagementMessage(engagedCount);

    return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px] min-h-[600px]" data-testid="engagement-step-2">
        <div className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center justify-between h-[50px]">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5" 
            onClick={() => setStep(1)}
            data-testid="button-back-step-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground font-medium">Step 2 of 3</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setStep(3)}
            data-testid="button-skip-step-2"
          >
            Skip
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold leading-tight">
              While you're here, others need to hear from you too.
            </h2>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Stories from people like you:</span>
            </div>
          </div>

          {relatedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-11 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : hasRelatedPosts ? (
            <>
              <div className="space-y-3" data-testid="related-posts-list">
                {relatedPosts.map((post) => (
                  <RelatedPostCard 
                    key={post.id} 
                    submission={post} 
                    onVote={handleVote}
                    isEngaged={engagedIds.has(post.id)}
                  />
                ))}
              </div>

              {remainingPosts > 0 && relatedPosts.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  [Scroll for {remainingPosts} more {remainingPosts === 1 ? 'story' : 'stories'}...]
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No similar stories found yet. You're helping build this community!</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center italic pt-2">
            "They shared their pain just like you did. Show them they're heard."
          </p>

          <Button 
            variant="outline"
            className="w-full h-11"
            asChild
          >
            <a href="/" data-testid="button-see-more">
              See More Stories
            </a>
          </Button>
        </div>

        <div className="sticky bottom-0 z-50 bg-background border-t px-4 py-4 space-y-3">
          <p 
            className={`text-sm text-center flex items-center justify-center gap-2 ${engagedCount > 0 ? 'text-absolve font-medium' : 'text-muted-foreground'}`}
            data-testid="text-engagement-status"
          >
            {engagementMsg.text}
            {engagedCount > 0 && (
              <>
                <span>•</span>
                <span>{engagementMsg.emoji}</span>
                <Check className="h-4 w-4" />
              </>
            )}
          </p>
          
          <Button 
            className={`w-full h-11 ${engagedCount > 0 ? 'animate-pulse-subtle' : ''}`}
            variant={engagedCount > 0 ? "default" : "outline"}
            onClick={() => setStep(3)}
            data-testid="button-continue-step-2"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <Card data-testid="engagement-step-3">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl">We'll let you know when your story resonates with others</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Get notified when someone shows support for your story (optional).
          </p>
        </CardHeader>
        <CardContent>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your@email.com" 
                        type="email"
                        {...field} 
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 pt-2">
                <FormField
                  control={emailForm.control}
                  name="notifyOnEngagement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-notify-engagement"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Notify me when someone engages with my story
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="weeklyDigest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-weekly-digest"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Weekly digest of new stories I might relate to
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex-1"
                  onClick={handleSkipEmail}
                  data-testid="button-maybe-later"
                >
                  Maybe Later
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={emailMutation.isPending}
                  data-testid="button-get-updates"
                >
                  {emailMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Get Updates
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return null;
}
