import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoteButtons } from "@/components/vote-buttons";
import { EmojiReactions } from "@/components/emoji-reactions";
import { FlagModal } from "@/components/flag-modal";
import { CommentsSection } from "@/components/comments-section";
import { useIsMobile } from "@/hooks/use-mobile";
import { CATEGORIES, TIMEFRAMES, type Submission, type VoteType, type FlagReason } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Users, Heart, Phone, ExternalLink, ChevronDown, ChevronUp, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SubmissionCardProps {
  submission: Submission;
  onVote: (submissionId: string, voteType: VoteType) => void;
  onFlag: (submissionId: string, reason: FlagReason) => Promise<void>;
  onMeToo: (submissionId: string) => void;
  onReact?: (submissionId: string, reactionType: string) => void;
  isVoting?: boolean;
  isMeTooing?: boolean;
  isReacting?: boolean;
  defaultExpanded?: boolean;
  reactions?: Record<string, number>;
  isHighlighted?: boolean;
}

const TRUNCATE_LENGTH = 200;

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

const CRISIS_RESOURCES = [
  {
    name: "RAINN National Sexual Assault Hotline",
    phone: "1-800-656-4673",
    url: "https://www.rainn.org",
  },
  {
    name: "National Domestic Violence Hotline",
    phone: "1-800-799-7233",
    url: "https://www.thehotline.org",
  },
  {
    name: "Crisis Text Line",
    phone: "Text HOME to 741741",
    url: "https://www.crisistextline.org",
  },
];

function CrisisResourcesBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mb-4" data-testid="crisis-resources-banner">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-toggle-crisis-resources"
      >
        <Heart className="h-3 w-3" />
        <span>Need support? Help is available</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-2 pl-4 border-l-2 border-muted space-y-1.5">
          {CRISIS_RESOURCES.map((resource) => (
            <div key={resource.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{resource.name}:</span>
              <span className="font-medium text-foreground">{resource.phone}</span>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary hover:underline"
                data-testid={`link-resource-${resource.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function shouldShowCrisisResources(category: string): boolean {
  return category === "misconduct" || category === "spiritual_abuse";
}

export function SubmissionCard({
  submission,
  onVote,
  onFlag,
  onMeToo,
  onReact,
  isVoting = false,
  isMeTooing = false,
  isReacting = false,
  defaultExpanded = false,
  reactions = {},
  isHighlighted = false,
}: SubmissionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isMobile = useIsMobile();
  
  const isTruncated = submission.content.length > TRUNCATE_LENGTH;
  const contentPreview = isExpanded || !isTruncated
    ? submission.content
    : submission.content.slice(0, TRUNCATE_LENGTH) + "...";

  const handleToggleExpand = () => {
    if (isTruncated) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-lg",
        isHighlighted && "ring-2 ring-absolve ring-offset-4 ring-offset-background"
      )}
      data-testid={`submission-card-${submission.id}`}
      data-highlighted={isHighlighted ? "true" : undefined}
    >
      <CardHeader className="flex flex-col gap-2 pb-3 space-y-0">
        <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <Badge
            variant="outline"
            className={cn("font-medium", getCategoryColor(submission.category))}
            data-testid={`badge-category-${submission.id}`}
          >
            {getCategoryLabel(submission.category)}
          </Badge>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span 
              className="flex items-center gap-1"
              data-testid={`text-timeframe-${submission.id}`}
            >
              <Calendar className="h-3 w-3" />
              <span>Occurred {getTimeframeLabel(submission.timeframe).toLowerCase()}</span>
            </span>
            <span className="text-muted-foreground/40">|</span>
            <span 
              className="flex items-center gap-1"
              data-testid={`text-submitted-${submission.id}`}
            >
              <Clock className="h-3 w-3" />
              <span>Submitted {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}</span>
            </span>
          </div>
        </div>
        {submission.title && (
          <h3 
            className="text-lg font-semibold leading-tight mt-1"
            data-testid={`text-title-${submission.id}`}
          >
            {submission.title}
          </h3>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        {shouldShowCrisisResources(submission.category) && <CrisisResourcesBanner />}
        <div 
          className={cn(
            "cursor-pointer",
            isTruncated && "hover:bg-accent/5 rounded-md transition-colors -mx-2 px-2 -my-1 py-1"
          )}
          onClick={handleToggleExpand}
          role={isTruncated ? "button" : undefined}
          tabIndex={isTruncated ? 0 : undefined}
          onKeyDown={(e) => {
            if (isTruncated && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleToggleExpand();
            }
          }}
          data-testid={`content-area-${submission.id}`}
        >
          <p
            className="font-serif text-base leading-relaxed whitespace-pre-wrap break-words"
            data-testid={`text-content-${submission.id}`}
          >
            {contentPreview}
          </p>
          {isTruncated && (
            <button
              type="button"
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              data-testid={`button-toggle-expand-${submission.id}`}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Read more
                </>
              )}
            </button>
          )}
        </div>
        {submission.denomination && (
          <p className="mt-3 text-sm text-muted-foreground">
            Denomination: <span className="font-medium">{submission.denomination}</span>
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-0">
        {isMobile ? (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
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
            </div>
            <div className="flex items-center justify-between">
              <EmojiReactions
                submissionId={submission.id}
                reactions={reactions}
                onReact={(reactionType) => onReact?.(submission.id, reactionType)}
                isReacting={isReacting}
              />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-primary min-h-[44px] px-3"
                onClick={() => onMeToo(submission.id)}
                disabled={isMeTooing}
                data-testid={`button-metoo-${submission.id}`}
              >
                <Users className="h-4 w-4" />
                <span>Me Too</span>
                {submission.meTooCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0" data-testid={`text-metoo-count-${submission.id}`}>
                    {submission.meTooCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <VoteButtons
                submissionId={submission.id}
                condemnCount={submission.condemnCount}
                absolveCount={submission.absolveCount}
                onVote={(voteType) => onVote(submission.id, voteType)}
                isVoting={isVoting}
              />
              <div className="h-5 w-px bg-border mx-1" />
              <EmojiReactions
                submissionId={submission.id}
                reactions={reactions}
                onReact={(reactionType) => onReact?.(submission.id, reactionType)}
                isReacting={isReacting}
              />
              <div className="h-5 w-px bg-border mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-primary"
                onClick={() => onMeToo(submission.id)}
                disabled={isMeTooing}
                data-testid={`button-metoo-${submission.id}`}
              >
                <Users className="h-4 w-4" />
                <span>Me Too</span>
                {submission.meTooCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0" data-testid={`text-metoo-count-${submission.id}`}>
                    {submission.meTooCount}
                  </Badge>
                )}
              </Button>
            </div>
            <FlagModal
              submissionId={submission.id}
              onFlag={(reason) => onFlag(submission.id, reason)}
            />
          </div>
        )}
        <CommentsSection submissionId={submission.id} />
      </CardFooter>
    </Card>
  );
}

export function SubmissionCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-col gap-2 pb-3 space-y-0">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="h-6 w-24 rounded-full bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
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
