import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareText, Send, Loader2, CheckCircle2 } from "lucide-react";
import { posthog } from "@/lib/posthog";
import { useToast } from "@/hooks/use-toast";

const SURVEY_ID = "019b1a12-c6bd-0000-f85d-8f5186253654";
const QUESTION_ID = "9325727b-705b-40bb-829a-40021d62e7d7";

interface FeedbackButtonProps {
  variant?: "header" | "inline";
  triggerText?: string;
  className?: string;
}

export function FeedbackButton({ 
  variant = "header", 
  triggerText,
  className 
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    
    try {
      posthog.capture("survey sent", {
        $survey_id: SURVEY_ID,
        $survey_response: feedback.trim(),
        [`$survey_response_${QUESTION_ID}`]: feedback.trim(),
      });

      setIsSubmitted(true);
      
      setTimeout(() => {
        setIsOpen(false);
        setFeedback("");
        setIsSubmitted(false);
        toast({
          title: "Thank you for your feedback",
          description: "Your input helps us improve.",
        });
      }, 1500);
    } catch (error) {
      toast({
        title: "Unable to submit feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [feedback, toast]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      posthog.capture("survey shown", {
        $survey_id: SURVEY_ID,
      });
    } else {
      if (!isSubmitted && feedback.trim()) {
        posthog.capture("survey dismissed", {
          $survey_id: SURVEY_ID,
        });
      }
      setFeedback("");
      setIsSubmitted(false);
    }
  };

  if (variant === "header") {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className={className}
          data-testid="button-feedback"
        >
          <MessageSquareText className="h-4 w-4" />
        </Button>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <CheckCircle2 className="h-12 w-12 text-absolve" />
                <p className="text-lg font-medium">Thank you!</p>
                <p className="text-sm text-muted-foreground text-center">
                  Your feedback helps us make Heard better for everyone.
                </p>
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Share Your Feedback</DialogTitle>
                  <DialogDescription>
                    What can we do to improve our product?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Textarea
                    placeholder="Tell us what's on your mind..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[120px] resize-none"
                    data-testid="textarea-feedback"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      data-testid="button-feedback-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!feedback.trim() || isSubmitting}
                      className="gap-2"
                      data-testid="button-feedback-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Feedback
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsOpen(true)}
      className={`gap-2 text-muted-foreground ${className}`}
      data-testid="button-feedback-inline"
    >
      <MessageSquareText className="h-4 w-4" />
      {triggerText || "Share Feedback"}
    </Button>
  );
}

export function useFeedbackSurvey() {
  const { toast } = useToast();

  const showFeedbackPrompt = useCallback(() => {
    posthog.capture("survey shown", {
      $survey_id: SURVEY_ID,
      trigger: "post_engagement_flow",
    });
  }, []);

  const submitFeedback = useCallback((feedback: string) => {
    if (!feedback.trim()) return;

    posthog.capture("survey sent", {
      $survey_id: SURVEY_ID,
      $survey_response: feedback.trim(),
      [`$survey_response_${QUESTION_ID}`]: feedback.trim(),
    });

    toast({
      title: "Thank you for your feedback",
      description: "Your input helps us improve.",
    });
  }, [toast]);

  return { showFeedbackPrompt, submitFeedback };
}
