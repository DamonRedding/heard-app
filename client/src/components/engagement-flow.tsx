import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Users, 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  ArrowRight, 
  Mail, 
  Loader2, 
  Calendar, 
  Check,
  Sparkles,
  Heart,
  Eye,
  Bell,
  Gift
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { posthog } from "@/lib/posthog";
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

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = ((currentStep) / totalSteps) * 100;
  
  const stepLabels = [
    { label: "Submitted", icon: CheckCircle2 },
    { label: "Connect", icon: Heart },
    { label: "Stay Updated", icon: Bell }
  ];
  
  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div className="flex justify-between text-xs text-muted-foreground">
        {stepLabels.map((step, i) => {
          const StepIcon = step.icon;
          const isComplete = i + 1 < currentStep;
          const isCurrent = i + 1 === currentStep;
          
          return (
            <div 
              key={i} 
              className={`flex items-center gap-1.5 transition-colors ${
                isComplete ? 'text-absolve' : isCurrent ? 'text-foreground font-medium' : ''
              }`}
            >
              <StepIcon className={`h-3.5 w-3.5 ${isComplete ? 'text-absolve' : ''}`} />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          );
        })}
      </div>
      <Progress value={progress} className="h-2" />
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
  const preview = submission.content.length > 100 
    ? `"${submission.content.slice(0, 100)}..."` 
    : `"${submission.content}"`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`transition-all duration-300 ${isEngaged ? 'border-absolve/50 bg-absolve/5' : 'hover-elevate'}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {categoryLabel}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {timeAgo} ago
            </span>
          </div>
          
          <p className="font-serif text-sm leading-relaxed line-clamp-3">
            {preview}
          </p>
          
          <Button 
            className={`w-full gap-2 transition-all ${isEngaged ? 'bg-absolve hover:bg-absolve/90' : ''}`}
            variant={isEngaged ? "default" : "outline"}
            onClick={onEngage}
            disabled={isEngaged || isLoading}
            data-testid={`button-hear-${submission.id}`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEngaged ? (
              <>
                <Check className="h-4 w-4" />
                You Heard Them
              </>
            ) : (
              <>
                <Heart className="h-4 w-4" />
                I Hear You
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function EngagementFlow({ submittedSubmission, onComplete }: EngagementFlowProps) {
  const [step, setStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(true);
  const [engagedIds, setEngagedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const engagedCount = engagedIds.size;
  const totalSteps = 3;

  useEffect(() => {
    const timer = setTimeout(() => setShowCelebration(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    posthog.capture('post_submit_screen_viewed', {
      step,
      step_name: step === 1 ? 'confirmation' : step === 2 ? 'quick_engage' : 'email_capture',
      submission_id: submittedSubmission.id,
      category: submittedSubmission.category,
    });
  }, [step, submittedSubmission.id, submittedSubmission.category]);

  const { data: stats } = useQuery<CommunityStats>({
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
    enabled: step >= 2,
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
      posthog.capture('email subscribed', {
        submission_id: submittedSubmission.id,
        notify_on_engagement: data.notifyOnEngagement,
        weekly_digest: data.weeklyDigest,
        category: submittedSubmission.category,
      });
      
      toast({
        description: (
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-absolve" />
            You're all set! We'll keep you updated.
          </span>
        ),
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
      posthog.capture('post_submit_i_hear_you_tapped', {
        submission_id: submittedSubmission.id,
        voted_submission_id: submissionId,
        category: submittedSubmission.category,
        engagement_count: engagedCount + 1,
      });
      voteMutation.mutate(submissionId);
    }
  };

  const handleEmailSubmit = async (data: EmailFormValues) => {
    await emailMutation.mutateAsync(data);
  };

  const handleSkipEmail = () => {
    posthog.capture('email subscription skipped', {
      submission_id: submittedSubmission.id,
      category: submittedSubmission.category,
    });
    onComplete();
  };

  const categoryLabel = getCategoryLabel(submittedSubmission.category);
  const storyPreview = submittedSubmission.content.length > 80 
    ? submittedSubmission.content.slice(0, 80) + "..." 
    : submittedSubmission.content;

  if (step === 1) {
    return (
      <div ref={containerRef} className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-8 relative">
        <CelebrationOverlay show={showCelebration} />
        
        <motion.div 
          className="w-full max-w-lg space-y-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          data-testid="engagement-step-1"
        >
          <StepIndicator currentStep={1} totalSteps={totalSteps} />
          
          <Card className="border-absolve/30 overflow-hidden">
            <div className="bg-gradient-to-r from-absolve/10 to-primary/5 p-6 text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-absolve/20">
                  <Sparkles className="h-8 w-8 text-absolve" />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <h2 className="text-2xl font-semibold">Your Voice Has Been Heard</h2>
                <p className="text-muted-foreground">
                  Thank you for your courage in sharing.
                </p>
              </motion.div>
            </div>
            
            <CardContent className="p-6 space-y-6">
              <motion.div 
                className="bg-muted/50 rounded-lg p-4 space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{categoryLabel}</Badge>
                  <span className="text-xs text-muted-foreground">Just now</span>
                </div>
                <p className="font-serif text-sm italic text-muted-foreground">
                  "{storyPreview}"
                </p>
              </motion.div>

              <motion.div 
                className="flex items-center justify-center gap-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-primary">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{stats?.totalSubmissions || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Stories shared</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-absolve">
                    <Heart className="h-4 w-4" />
                    <span className="font-semibold">{stats?.recentEngagementsThisMonth || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Supported this month</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button 
                  size="lg" 
                  className="w-full gap-2 animate-pulse-subtle" 
                  onClick={() => setStep(2)}
                  data-testid="button-continue-step-1"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Takes less than 30 seconds
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (step === 2) {
    const relatedPosts = relatedData?.submissions?.slice(0, 3) || [];
    const hasRelatedPosts = relatedPosts.length > 0;

    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-start px-4 py-8" data-testid="engagement-step-2">
        <div className="w-full max-w-lg space-y-6">
          <StepIndicator currentStep={2} totalSteps={totalSteps} />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h2 className="text-xl font-semibold">One Tap Makes a Difference</h2>
            <p className="text-sm text-muted-foreground">
              Show these people they're not alone. It only takes a second.
            </p>
          </motion.div>

          {relatedLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : relatedError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  Your story is live and ready to be seen.
                </p>
                <p className="text-xs text-muted-foreground">
                  Continue to stay connected with your community.
                </p>
              </CardContent>
            </Card>
          ) : hasRelatedPosts ? (
            <div className="space-y-4">
              <AnimatePresence>
                {relatedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <QuickEngageCard 
                      submission={post} 
                      onEngage={() => handleVote(post.id)}
                      isEngaged={engagedIds.has(post.id)}
                      isLoading={loadingId === post.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  You're among the first in this category. Your story will help others feel less alone.
                </p>
              </CardContent>
            </Card>
          )}

          {engagedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-absolve/10 border border-absolve/20 rounded-lg p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-absolve font-medium">
                <Check className="h-5 w-5" />
                <span>You supported {engagedCount} {engagedCount === 1 ? 'person' : 'people'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Every tap shows someone they matter
              </p>
            </motion.div>
          )}

          <div className="space-y-3 pt-4">
            <Button 
              className="w-full gap-2"
              onClick={() => setStep(3)}
              data-testid="button-continue-step-2"
            >
              {engagedCount > 0 ? "Continue" : "Skip for now"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-8" data-testid="engagement-step-3">
        <motion.div 
          className="w-full max-w-lg space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <StepIndicator currentStep={3} totalSteps={totalSteps} />
          
          <Card>
            <CardHeader className="text-center pb-4">
              <motion.div 
                className="flex justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                  <Gift className="h-7 w-7 text-primary" />
                </div>
              </motion.div>
              <CardTitle className="text-xl">Get Notified When Your Story Resonates</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Be the first to know when someone connects with what you shared.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-absolve/20 shrink-0">
                  <Eye className="h-5 w-5 text-absolve" />
                </div>
                <div>
                  <p className="font-medium text-sm">Your story is now live</p>
                  <p className="text-xs text-muted-foreground">
                    Others can already see and support your experience
                  </p>
                </div>
              </div>

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

                  <div className="space-y-3">
                    <FormField
                      control={emailForm.control}
                      name="notifyOnEngagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 rounded-lg bg-muted/30 hover-elevate">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-notify-engagement"
                            />
                          </FormControl>
                          <div className="space-y-0.5 leading-none">
                            <FormLabel className="cursor-pointer font-normal">
                              Let me know when someone supports my story
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emailForm.control}
                      name="weeklyDigest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 rounded-lg bg-muted/30 hover-elevate">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-weekly-digest"
                            />
                          </FormControl>
                          <div className="space-y-0.5 leading-none">
                            <FormLabel className="cursor-pointer font-normal">
                              Weekly stories I might relate to
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
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
                      className="w-full text-muted-foreground"
                      onClick={handleSkipEmail}
                      data-testid="button-maybe-later"
                    >
                      Maybe later
                    </Button>
                  </div>
                </form>
              </Form>
              
              <p className="text-xs text-center text-muted-foreground">
                Your email stays private. Unsubscribe anytime.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return null;
}
