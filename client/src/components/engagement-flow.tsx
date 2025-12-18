import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Users, 
  Loader2, 
  Calendar, 
  Check,
  Sparkles,
  Heart,
  Bell,
  Lock,
  Shield
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { posthog } from "@/lib/posthog";
import { formatDistanceToNow } from "date-fns";
import { CATEGORIES, type Submission } from "@shared/schema";

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

function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ['#4CAF7A', '#C9A227', '#0D5C63', '#E8774D', '#F5F1E8'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: `${x}%` }}
      initial={{ y: -20, opacity: 1, scale: 0 }}
      animate={{ 
        y: 300, 
        opacity: [1, 1, 0],
        scale: [0, 1, 1],
        rotate: [0, 360, 720],
        x: [0, (Math.random() - 0.5) * 100]
      }}
      transition={{ 
        duration: 2,
        delay,
        ease: "easeOut"
      }}
    />
  );
}

function CelebrationOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    x: Math.random() * 100
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map(p => (
        <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
      ))}
    </div>
  );
}

function QuickEngageCard({ 
  submission, 
  onEngage,
  isEngaged,
  isLoading 
}: { 
  submission: Submission; 
  onEngage: () => void;
  isEngaged: boolean;
  isLoading: boolean;
}) {
  const categoryLabel = getCategoryLabel(submission.category);
  const timeAgo = formatDistanceToNow(new Date(submission.createdAt), { addSuffix: false });
  const preview = submission.content.length > 80 
    ? `"${submission.content.slice(0, 80)}..."` 
    : `"${submission.content}"`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`p-3 rounded-lg border transition-all ${isEngaged ? 'border-absolve/50 bg-absolve/5' : 'hover-elevate'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs shrink-0">
                {categoryLabel}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {timeAgo}
              </span>
            </div>
            <p className="font-serif text-xs leading-relaxed line-clamp-2 text-muted-foreground">
              {preview}
            </p>
          </div>
          <Button 
            size="sm"
            className={`shrink-0 gap-1.5 ${isEngaged ? 'bg-absolve hover:bg-absolve/90' : ''}`}
            variant={isEngaged ? "default" : "outline"}
            onClick={onEngage}
            disabled={isEngaged || isLoading}
            data-testid={`button-hear-${submission.id}`}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isEngaged ? (
              <Check className="h-3 w-3" />
            ) : (
              <Heart className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">{isEngaged ? 'Heard' : 'I Hear You'}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function EngagementFlow({ submittedSubmission, onComplete }: EngagementFlowProps) {
  const [showCelebration, setShowCelebration] = useState(true);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [engagedIds, setEngagedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const categoryLabel = getCategoryLabel(submittedSubmission.category);
  const storyPreview = submittedSubmission.content.length > 60
    ? submittedSubmission.content.slice(0, 60) + "..."
    : submittedSubmission.content;

  useEffect(() => {
    const timer = setTimeout(() => setShowCelebration(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    posthog.capture('post_submit_email_displayed', {
      submission_id: submittedSubmission.id,
      category: submittedSubmission.category,
    });
  }, [submittedSubmission.id, submittedSubmission.category]);

  const { data: stats, isLoading: statsLoading } = useQuery<CommunityStats>({
    queryKey: ["/api/community/stats"],
  });

  const { data: relatedData, isLoading: relatedLoading, isError: relatedError } = useQuery<{ submissions: Submission[] }>({
    queryKey: ["/api/submissions/related", submittedSubmission.category, submittedSubmission.denomination],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: submittedSubmission.category,
        excludeId: submittedSubmission.id,
        limit: "3",
      });
      if (submittedSubmission.denomination) {
        params.set("denomination", submittedSubmission.denomination);
      }
      const response = await fetch(`/api/submissions/related?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch related stories');
      }
      return response.json();
    },
    enabled: emailSubmitted,
    retry: 1,
  });

  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      setLoadingId(submissionId);
      return apiRequest("POST", `/api/submissions/${submissionId}/metoo`, {});
    },
    onSuccess: (_, submissionId) => {
      setEngagedIds(prev => new Set(Array.from(prev).concat(submissionId)));
      setLoadingId(null);
      queryClient.invalidateQueries({ 
        queryKey: ["/api/submissions/related", submittedSubmission.category, submittedSubmission.denomination] 
      });
      posthog.capture('post_submit_i_hear_you_tapped', {
        submission_id: submittedSubmission.id,
        voted_submission_id: submissionId,
        category: submittedSubmission.category,
      });
    },
    onError: () => {
      setLoadingId(null);
    }
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
    onSuccess: (_, data) => {
      posthog.capture('email_submitted', {
        submission_id: submittedSubmission.id,
        notify_on_engagement: data.notifyOnEngagement,
        weekly_digest: data.weeklyDigest,
        category: submittedSubmission.category,
      });
      
      toast({
        description: (
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-absolve" />
            You're all set! We'll notify you when your story resonates.
          </span>
        ),
      });
      setEmailSubmitted(true);
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEmailSubmit = (data: EmailFormValues) => {
    emailMutation.mutate(data);
  };

  const handleSkipEmail = () => {
    posthog.capture('email_skipped', {
      submission_id: submittedSubmission.id,
      category: submittedSubmission.category,
    });
    setEmailSubmitted(true);
  };

  const handleFinish = () => {
    posthog.capture('post_submit_flow_completed', {
      submission_id: submittedSubmission.id,
      email_provided: emailMutation.isSuccess,
      stories_engaged: engagedIds.size,
    });
    onComplete();
  };

  const relatedPosts = relatedData?.submissions?.slice(0, 3) || [];
  const hasRelatedPosts = relatedPosts.length > 0 && !relatedError;

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-start px-4 py-6" data-testid="engagement-flow">
      <motion.div 
        className="w-full max-w-md space-y-5 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CelebrationOverlay show={showCelebration} />
        
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-absolve/20 to-primary/10 p-5 text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-background shadow-md mb-3"
              >
                <Sparkles className="h-7 w-7 text-absolve" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-1">Your Voice Has Been Heard</h2>
                <p className="text-sm text-muted-foreground">
                  Your story is now live and helping others feel less alone.
                </p>
              </motion.div>
            </div>
            
            <motion.div 
              className="p-4 border-b bg-muted/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-absolve shrink-0" />
                <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
                <span className="text-xs text-muted-foreground">Just now</span>
              </div>
              <p className="font-serif text-sm italic text-muted-foreground line-clamp-2">
                "{storyPreview}"
              </p>
            </motion.div>

            <motion.div 
              className="flex items-center justify-center gap-4 py-3 px-4 border-b text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5 text-primary" />
                {statsLoading ? (
                  <Skeleton className="h-4 w-8" />
                ) : (
                  <span className="font-medium">{stats?.totalSubmissions || 0}</span>
                )}
                <span className="text-muted-foreground">stories shared</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-xs">
                <Heart className="h-3.5 w-3.5 text-absolve" />
                {statsLoading ? (
                  <Skeleton className="h-4 w-6" />
                ) : (
                  <span className="font-medium">{stats?.recentEngagementsThisMonth || 0}</span>
                )}
                <span className="text-muted-foreground">supported this month</span>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {!emailSubmitted ? (
                <motion.div
                  key="email-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-5"
                >
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-base mb-1">Get Notified When Your Story Resonates</h3>
                    <p className="text-xs text-muted-foreground">
                      Be the first to know when someone connects with your experience.
                    </p>
                  </div>

                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                      <FormField
                        control={emailForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="your@email.com" 
                                  type="email"
                                  className="pr-10"
                                  {...field} 
                                  data-testid="input-email"
                                />
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <FormField
                          control={emailForm.control}
                          name="notifyOnEngagement"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-notify-engagement"
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-normal cursor-pointer">
                                Notify me when someone supports my story
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailForm.control}
                          name="weeklyDigest"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-weekly-digest"
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-normal cursor-pointer">
                                Weekly stories I might relate to
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <Button 
                          type="submit"
                          className="w-full gap-2"
                          disabled={emailMutation.isPending}
                          data-testid="button-get-updates"
                        >
                          {emailMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4" />
                              Keep Me Updated
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          className="w-full text-muted-foreground text-xs"
                          onClick={handleSkipEmail}
                          data-testid="button-skip-email"
                        >
                          Skip for now
                        </Button>
                      </div>
                    </form>
                  </Form>
                  
                  <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Your email stays private. Unsubscribe anytime.</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="post-email"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 space-y-4"
                >
                  {emailMutation.isSuccess && (
                    <div className="bg-absolve/10 border border-absolve/20 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-absolve text-sm font-medium">
                        <Check className="h-4 w-4" />
                        <span>You're all set!</span>
                      </div>
                    </div>
                  )}

                  {hasRelatedPosts && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-sm font-medium">While you're here...</p>
                        <p className="text-xs text-muted-foreground">Show others they're not alone</p>
                      </div>
                      
                      {relatedLoading ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {relatedPosts.slice(0, 2).map((post) => (
                            <QuickEngageCard 
                              key={post.id}
                              submission={post} 
                              onEngage={() => voteMutation.mutate(post.id)}
                              isEngaged={engagedIds.has(post.id)}
                              isLoading={loadingId === post.id}
                            />
                          ))}
                        </div>
                      )}
                      
                      {engagedIds.size > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center text-xs text-muted-foreground"
                        >
                          You supported {engagedIds.size} {engagedIds.size === 1 ? 'person' : 'people'}
                        </motion.div>
                      )}
                    </div>
                  )}

                  <Button 
                    className="w-full"
                    onClick={handleFinish}
                    data-testid="button-finish"
                  >
                    View All Stories
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
