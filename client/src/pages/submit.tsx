import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { SubmissionForm } from "@/components/submission-form";
import { EngagementFlow } from "@/components/engagement-flow";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertSubmission, Submission } from "@shared/schema";

export default function Submit() {
  const [submittedSubmission, setSubmittedSubmission] = useState<Submission | null>(null);
  const [showEngagementFlow, setShowEngagementFlow] = useState(false);
  const [flowCompleted, setFlowCompleted] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const submitMutation = useMutation({
    mutationFn: async (values: InsertSubmission) => {
      const response = await apiRequest("POST", "/api/submissions", values);
      return response.json();
    },
    onSuccess: (data: Submission) => {
      setSubmittedSubmission(data);
      setShowEngagementFlow(true);
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/submissions")
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories/counts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message || "Unable to submit your experience. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (values: InsertSubmission) => {
    await submitMutation.mutateAsync(values);
  };

  const handleEngagementComplete = () => {
    setFlowCompleted(true);
    setShowEngagementFlow(false);
  };

  if (showEngagementFlow && submittedSubmission) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <EngagementFlow 
            submittedSubmission={submittedSubmission}
            onComplete={handleEngagementComplete}
          />
        </div>
      </div>
    );
  }

  if (flowCompleted) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12 space-y-6">
            <h2 className="text-2xl font-semibold">Thank you for being part of our community</h2>
            <p className="text-muted-foreground">
              Your story is now part of the healing. Together, we're building accountability.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link href="/">
                <Button variant="default" className="gap-2" data-testid="button-view-feed">
                  <Home className="h-4 w-4" />
                  View the Feed
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSubmittedSubmission(null);
                  setFlowCompleted(false);
                }}
                data-testid="button-share-another"
              >
                Share Another Story
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Share Your Experience</h1>
            <p className="text-sm text-muted-foreground">
              Your submission is completely anonymous
            </p>
          </div>
        </div>

        <SubmissionForm
          onSubmit={handleSubmit}
          isSubmitting={submitMutation.isPending}
          isSuccess={false}
        />
      </div>
    </div>
  );
}
