import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoteButtons } from "@/components/vote-buttons";
import { FlagModal } from "@/components/flag-modal";
import { CATEGORIES, TIMEFRAMES, type Submission, type VoteType, type FlagReason } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SubmissionCardProps {
  submission: Submission;
  onVote: (submissionId: string, voteType: VoteType) => void;
  onFlag: (submissionId: string, reason: FlagReason) => Promise<void>;
  isVoting?: boolean;
  expanded?: boolean;
}

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

function getTimeframeLabel(value: string): string {
  return TIMEFRAMES.find((t) => t.value === value)?.label || value;
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "leadership":
      return "bg-primary/10 text-primary border-primary/20";
    case "financial":
      return "bg-gold/10 text-gold-foreground border-gold/20";
    case "culture":
      return "bg-secondary text-secondary-foreground border-secondary";
    case "misconduct":
      return "bg-condemn/10 text-condemn border-condemn/20";
    case "spiritual_abuse":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
}

export function SubmissionCard({
  submission,
  onVote,
  onFlag,
  isVoting = false,
  expanded = false,
}: SubmissionCardProps) {
  const contentPreview = expanded
    ? submission.content
    : submission.content.length > 200
    ? submission.content.slice(0, 200) + "..."
    : submission.content;

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-lg",
        !expanded && "cursor-pointer"
      )}
      data-testid={`submission-card-${submission.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 space-y-0">
        <Badge
          variant="outline"
          className={cn("font-medium", getCategoryColor(submission.category))}
          data-testid={`badge-category-${submission.id}`}
        >
          {getCategoryLabel(submission.category)}
        </Badge>
        <span className="text-sm text-muted-foreground" data-testid={`text-timeframe-${submission.id}`}>
          {getTimeframeLabel(submission.timeframe)}
        </span>
      </CardHeader>

      <CardContent className="pb-4">
        <p
          className="font-serif text-base leading-relaxed whitespace-pre-wrap"
          data-testid={`text-content-${submission.id}`}
        >
          {contentPreview}
        </p>
        {submission.denomination && (
          <p className="mt-3 text-sm text-muted-foreground">
            Denomination: <span className="font-medium">{submission.denomination}</span>
          </p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-4 pt-0 flex-wrap">
        <VoteButtons
          submissionId={submission.id}
          condemnCount={submission.condemnCount}
          absolveCount={submission.absolveCount}
          onVote={(voteType) => onVote(submission.id, voteType)}
          isVoting={isVoting}
        />
        <FlagModal
          submissionId={submission.id}
          onFlag={(reason) => onFlag(submission.id, reason)}
        />
      </CardFooter>
    </Card>
  );
}

export function SubmissionCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 space-y-0">
        <div className="h-6 w-24 rounded-full bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4 pt-0">
        <div className="flex gap-3">
          <div className="h-9 w-28 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-9 rounded-md bg-muted" />
      </CardFooter>
    </Card>
  );
}
