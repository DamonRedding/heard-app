import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { posthog } from "@/lib/posthog";
import { cn } from "@/lib/utils";
import { SmilePlus } from "lucide-react";

interface EmojiReaction {
  emoji: string;
  label: string;
  color: string;
}

const REACTIONS: EmojiReaction[] = [
  { emoji: "heart", label: "Love", color: "text-red-500" },
  { emoji: "care", label: "Care", color: "text-orange-400" },
  { emoji: "haha", label: "Haha", color: "text-yellow-500" },
  { emoji: "wow", label: "Wow", color: "text-yellow-500" },
  { emoji: "sad", label: "Sad", color: "text-yellow-500" },
  { emoji: "angry", label: "Angry", color: "text-orange-600" },
];

function EmojiIcon({ emoji, instanceId }: { emoji: string; instanceId: string }) {
  switch (emoji) {
    case "heart":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-red-500" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      );
    case "care":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <defs>
            <linearGradient id={`careGrad-${instanceId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d"/>
              <stop offset="100%" stopColor="#f97316"/>
            </linearGradient>
          </defs>
          <path fill={`url(#careGrad-${instanceId})`} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      );
    case "haha":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-yellow-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path fill="#000" d="M7 14c.78 2.34 2.72 4 5 4s4.22-1.66 5-4H7z"/>
          <circle cx="8" cy="10" r="1" fill="#000"/>
          <circle cx="16" cy="10" r="1" fill="#000"/>
        </svg>
      );
    case "wow":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-yellow-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="8" cy="9" r="1.5" fill="#000"/>
          <circle cx="16" cy="9" r="1.5" fill="#000"/>
          <ellipse cx="12" cy="16" rx="2" ry="2.5" fill="#000"/>
        </svg>
      );
    case "sad":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-yellow-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="8" cy="10" r="1" fill="#000"/>
          <circle cx="16" cy="10" r="1" fill="#000"/>
          <path fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" d="M8 16c1-1.5 2.5-2 4-2s3 .5 4 2"/>
        </svg>
      );
    case "angry":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-orange-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="8" cy="11" r="1" fill="#000"/>
          <circle cx="16" cy="11" r="1" fill="#000"/>
          <path fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" d="M8 16c1-1.5 2.5-2 4-2s3 .5 4 2"/>
          <path fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" d="M6 8l3 1M18 8l-3 1"/>
        </svg>
      );
    default:
      return null;
  }
}

function SmallEmojiIcon({ emoji, instanceId }: { emoji: string; instanceId: string }) {
  switch (emoji) {
    case "heart":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-red-500" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      );
    case "care":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <defs>
            <linearGradient id={`careGradSmall-${instanceId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d"/>
              <stop offset="100%" stopColor="#f97316"/>
            </linearGradient>
          </defs>
          <path fill={`url(#careGradSmall-${instanceId})`} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      );
    case "haha":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-yellow-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path fill="#000" d="M7 14c.78 2.34 2.72 4 5 4s4.22-1.66 5-4H7z"/>
          <circle cx="8" cy="10" r="1" fill="#000"/>
          <circle cx="16" cy="10" r="1" fill="#000"/>
        </svg>
      );
    case "wow":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-yellow-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="8" cy="9" r="1.5" fill="#000"/>
          <circle cx="16" cy="9" r="1.5" fill="#000"/>
          <ellipse cx="12" cy="16" rx="2" ry="2.5" fill="#000"/>
        </svg>
      );
    case "sad":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-yellow-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="8" cy="10" r="1" fill="#000"/>
          <circle cx="16" cy="10" r="1" fill="#000"/>
          <path fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" d="M8 16c1-1.5 2.5-2 4-2s3 .5 4 2"/>
        </svg>
      );
    case "angry":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-orange-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="8" cy="11" r="1" fill="#000"/>
          <circle cx="16" cy="11" r="1" fill="#000"/>
          <path fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" d="M8 16c1-1.5 2.5-2 4-2s3 .5 4 2"/>
          <path fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" d="M6 8l3 1M18 8l-3 1"/>
        </svg>
      );
    default:
      return null;
  }
}

interface EmojiReactionsProps {
  submissionId: string;
  reactions: Record<string, number>;
  onReact: (reactionType: string) => void;
  isReacting?: boolean;
}

const REACTION_STORAGE_KEY = "sanctuary-reactions";

function getStoredReactions(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(REACTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredReaction(submissionId: string, userReactions: string[]) {
  const allReactions = getStoredReactions();
  if (userReactions.length === 0) {
    delete allReactions[submissionId];
  } else {
    allReactions[submissionId] = userReactions;
  }
  localStorage.setItem(REACTION_STORAGE_KEY, JSON.stringify(allReactions));
}

export function EmojiReactions({
  submissionId,
  reactions: propReactions = {},
  onReact,
  isReacting = false,
}: EmojiReactionsProps) {
  const instanceId = useId();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [animatingReaction, setAnimatingReaction] = useState<string | null>(null);
  const [optimisticAdjustments, setOptimisticAdjustments] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored = getStoredReactions();
    if (stored[submissionId]) {
      setUserReactions(stored[submissionId]);
    } else {
      setUserReactions([]);
    }
    setOptimisticAdjustments({});
  }, [submissionId]);

  useEffect(() => {
    setOptimisticAdjustments({});
  }, [propReactions]);

  const displayReactions: Record<string, number> = { ...propReactions };
  for (const [emoji, adjustment] of Object.entries(optimisticAdjustments)) {
    displayReactions[emoji] = (displayReactions[emoji] || 0) + adjustment;
    if (displayReactions[emoji] <= 0) {
      delete displayReactions[emoji];
    }
  }

  const handleReact = (reactionType: string) => {
    if (isReacting) return;

    const wasReacted = userReactions.includes(reactionType);
    const action = wasReacted ? 'removed' : 'added';
    
    posthog.capture('reaction added', {
      submission_id: submissionId,
      reaction_type: reactionType,
      action: action,
      total_user_reactions: wasReacted ? userReactions.length - 1 : userReactions.length + 1,
    });
    
    let newUserReactions: string[];
    
    if (wasReacted) {
      newUserReactions = userReactions.filter((r) => r !== reactionType);
      setOptimisticAdjustments(prev => ({
        ...prev,
        [reactionType]: (prev[reactionType] || 0) - 1
      }));
    } else {
      newUserReactions = [...userReactions, reactionType];
      setOptimisticAdjustments(prev => ({
        ...prev,
        [reactionType]: (prev[reactionType] || 0) + 1
      }));
    }
    
    setUserReactions(newUserReactions);
    setStoredReaction(submissionId, newUserReactions);
    
    setAnimatingReaction(reactionType);
    setTimeout(() => setAnimatingReaction(null), 300);
    
    onReact(reactionType);
    setIsOpen(false);
  };

  const totalReactions = Object.values(displayReactions).reduce((a, b) => a + b, 0);
  const topReactions = Object.entries(displayReactions)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="flex items-center gap-1" data-testid={`emoji-reactions-${submissionId}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 text-muted-foreground hover:text-foreground",
              isMobile ? "min-h-[44px] min-w-[44px] px-2" : "h-8 px-2"
            )}
            disabled={isReacting}
            data-testid={`button-add-reaction-${submissionId}`}
            aria-label="Add reaction"
          >
            <SmilePlus className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
            {totalReactions > 0 && (
              <span 
                className="text-xs tabular-nums"
                data-testid={`text-reaction-total-${submissionId}`}
              >
                {totalReactions}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2" 
          align="start"
          data-testid={`reaction-picker-${submissionId}`}
        >
          <div className="flex gap-1">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReact(reaction.emoji)}
                className={cn(
                  "rounded-lg transition-all",
                  isMobile ? "p-3 min-h-[44px] min-w-[44px]" : "p-2",
                  "hover:bg-accent hover:scale-125",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  userReactions.includes(reaction.emoji) && "bg-accent/50",
                  animatingReaction === reaction.emoji && "animate-reaction-pop"
                )}
                data-testid={`button-reaction-${reaction.emoji}-${submissionId}`}
                aria-label={reaction.label}
                title={reaction.label}
              >
                <EmojiIcon emoji={reaction.emoji} instanceId={instanceId} />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {topReactions.length > 0 && (
        <div className="flex items-center -space-x-1" data-testid={`reaction-chips-${submissionId}`}>
          {topReactions.map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={cn(
                "flex items-center justify-center rounded-full transition-transform",
                isMobile ? "h-10 w-10" : "h-6 w-6",
                "hover:scale-110 hover:z-10",
                userReactions.includes(emoji) && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}
              data-testid={`reaction-chip-${emoji}-${submissionId}`}
              aria-label={`${count} ${REACTIONS.find((r) => r.emoji === emoji)?.label || emoji} reactions`}
            >
              <SmallEmojiIcon emoji={emoji} instanceId={instanceId} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
