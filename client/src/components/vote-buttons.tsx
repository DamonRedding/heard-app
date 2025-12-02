import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const displayCondemnCount = condemnCount;
  const displayAbsolveCount = absolveCount;

  return (
    <div className="flex items-center gap-3" data-testid="vote-buttons">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote("condemn")}
        disabled={isVoting}
        className={cn(
          "gap-2 transition-all border",
          currentVote === "condemn" 
            ? "bg-condemn text-condemn-foreground border-condemn" 
            : "hover:bg-condemn/10 hover:text-condemn hover:border-condemn/50",
          animatingButton === "condemn" && "animate-vote-pop"
        )}
        data-testid="button-condemn"
        aria-label="Condemn this behavior"
      >
        <span className="text-base" role="img" aria-hidden="true">😠</span>
        <span
          className={cn(
            "tabular-nums min-w-[1.5rem] text-center",
            animatingCount === "condemn" && "animate-count-tick"
          )}
        >
          {displayCondemnCount}
        </span>
        <span className="hidden sm:inline">Condemn</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote("absolve")}
        disabled={isVoting}
        className={cn(
          "gap-2 transition-all border",
          currentVote === "absolve" 
            ? "bg-absolve text-absolve-foreground border-absolve" 
            : "hover:bg-absolve/10 hover:text-absolve hover:border-absolve/50",
          animatingButton === "absolve" && "animate-vote-pop"
        )}
        data-testid="button-absolve"
        aria-label="Absolve this behavior"
      >
        <span className="text-base" role="img" aria-hidden="true">🤷</span>
        <span
          className={cn(
            "tabular-nums min-w-[1.5rem] text-center",
            animatingCount === "absolve" && "animate-count-tick"
          )}
        >
          {displayAbsolveCount}
        </span>
        <span className="hidden sm:inline">Absolve</span>
      </Button>
    </div>
  );
}
