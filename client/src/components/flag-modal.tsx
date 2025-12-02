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
import { Flag, Loader2 } from "lucide-react";
import type { FlagReason } from "@shared/schema";

const FLAG_REASONS: { value: FlagReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam", description: "Promotional or unrelated content" },
  { value: "fake", label: "Fake", description: "Fabricated or misleading story" },
  { value: "harmful", label: "Harmful", description: "Dangerous or threatening content" },
  { value: "other", label: "Other", description: "Another reason not listed" },
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
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="text-flag opacity-60"
        data-testid={`button-flagged-${submissionId}`}
      >
        <Flag className="h-4 w-4 fill-current" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-flag"
          data-testid={`button-flag-${submissionId}`}
        >
          <Flag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this submission</DialogTitle>
          <DialogDescription>
            Help us maintain a safe community by reporting content that violates our guidelines.
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
