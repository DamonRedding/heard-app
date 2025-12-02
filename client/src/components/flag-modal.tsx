import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flag, Loader2 } from "lucide-react";
import type { FlagReason } from "@shared/schema";

const FLAG_REASONS: { value: FlagReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam", description: "Promotional or unrelated content" },
  { value: "fake", label: "Misinformation", description: "Fabricated or misleading story" },
  { value: "harmful", label: "Harmful / Abusive", description: "Dangerous, threatening, or abusive content" },
  { value: "other", label: "Other", description: "Another concern not listed above" },
];

interface FlagModalProps {
  submissionId: string;
  onFlag: (reason: FlagReason) => Promise<void>;
  isFlagged?: boolean;
}

export function FlagModal({ submissionId, onFlag, isFlagged = false }: FlagModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FlagReason>("spam");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(isFlagged);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onFlag(selectedReason);
      setHasSubmitted(true);
      setOpen(false);
    } catch (error) {
      console.error("Failed to submit flag:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="gap-1.5 text-flag opacity-60"
            data-testid={`button-flagged-${submissionId}`}
          >
            <Flag className="h-4 w-4 fill-current" />
            <span className="hidden sm:inline">Reported</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>You've reported this post</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-flag"
          data-testid={`button-flag-${submissionId}`}
          title="Report inappropriate content"
        >
          <Flag className="h-4 w-4" />
          <span className="hidden sm:inline">Report</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this post</DialogTitle>
          <DialogDescription>
            Tell us why you're reporting this. All reports are private and reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedReason}
          onValueChange={(value) => setSelectedReason(value as FlagReason)}
          className="gap-4 py-4"
        >
          {FLAG_REASONS.map((reason) => (
            <div key={reason.value} className="flex items-start space-x-3">
              <RadioGroupItem
                value={reason.value}
                id={reason.value}
                data-testid={`radio-reason-${reason.value}`}
              />
              <Label
                htmlFor={reason.value}
                className="flex flex-col gap-1 cursor-pointer"
              >
                <span className="font-medium">{reason.label}</span>
                <span className="text-sm text-muted-foreground">
                  {reason.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter className="flex-col gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground text-center sm:text-left sm:flex-1">
            False reports may be reviewed.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="button-submit-flag"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
