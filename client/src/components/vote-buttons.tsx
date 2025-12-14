import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { VoteType } from "@shared/schema";

interface VoteButtonsProps {
  submissionId: string;
  condemnCount: number;
  absolveCount: number;
  onVote: (voteType: VoteType) => void;
  isVoting?: boolean;
}

const VOTE_STORAGE_KEY = "sanctuary-votes";

function getStoredVotes(): Record<string, VoteType> {
  try {
    const stored = localStorage.getItem(VOTE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredVote(submissionId: string, voteType: VoteType | null) {
  const votes = getStoredVotes();
  if (voteType === null) {
    delete votes[submissionId];
  } else {
    votes[submissionId] = voteType;
  }
  localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(votes));
}

export function VoteButtons({
  submissionId,
  condemnCount,
  absolveCount,
  onVote,
  isVoting = false,
}: VoteButtonsProps) {
  const [currentVote, setCurrentVote] = useState<VoteType | null>(null);
  const [animatingButton, setAnimatingButton] = useState<VoteType | null>(null);
  const [animatingCount, setAnimatingCount] = useState<VoteType | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const votes = getStoredVotes();
    if (votes[submissionId]) {
      setCurrentVote(votes[submissionId]);
    }
  }, [submissionId]);

  const handleVote = (voteType: VoteType) => {
    if (isVoting) return;
    
    const newVote = currentVote === voteType ? null : voteType;
    setCurrentVote(newVote);
    setStoredVote(submissionId, newVote);
    
    setAnimatingButton(voteType);
    setAnimatingCount(voteType);
    
    setTimeout(() => setAnimatingButton(null), 150);
    setTimeout(() => setAnimatingCount(null), 300);
    
    onVote(voteType);
  };

  const displayDownvoteCount = condemnCount;
  const displayUpvoteCount = absolveCount;

  return (
    <div className="flex items-center gap-2" data-testid={`vote-buttons-${submissionId}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote("absolve")}
        disabled={isVoting}
        className={cn(
          "gap-1.5 transition-all border",
          isMobile && "min-h-[44px] min-w-[60px] px-3",
          currentVote === "absolve" 
            ? "bg-upvote text-upvote-foreground border-upvote" 
            : "hover:bg-upvote/10 hover:text-upvote hover:border-upvote/50",
          animatingButton === "absolve" && "animate-vote-pop"
        )}
        data-testid={`button-upvote-${submissionId}`}
        aria-label="I understand this experience"
      >
        <ThumbsUp className={cn(
          isMobile ? "h-5 w-5" : "h-4 w-4",
          currentVote === "absolve" && "fill-current"
        )} />
        <span
          className={cn(
            "tabular-nums min-w-[1rem] text-center",
            animatingCount === "absolve" && "animate-count-tick"
          )}
          data-testid={`text-upvote-count-${submissionId}`}
        >
          {displayUpvoteCount}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote("condemn")}
        disabled={isVoting}
        className={cn(
          "gap-1.5 transition-all border",
          isMobile && "min-h-[44px] min-w-[60px] px-3",
          currentVote === "condemn" 
            ? "bg-downvote text-downvote-foreground border-downvote" 
            : "hover:bg-downvote/10 hover:text-downvote hover:border-downvote/50",
          animatingButton === "condemn" && "animate-vote-pop"
        )}
        data-testid={`button-downvote-${submissionId}`}
        aria-label="This is not okay"
      >
        <ThumbsDown className={cn(
          isMobile ? "h-5 w-5" : "h-4 w-4",
          currentVote === "condemn" && "fill-current"
        )} />
        <span
          className={cn(
            "tabular-nums min-w-[1rem] text-center",
            animatingCount === "condemn" && "animate-count-tick"
          )}
          data-testid={`text-downvote-count-${submissionId}`}
        >
          {displayDownvoteCount}
        </span>
      </Button>
    </div>
  );
}
