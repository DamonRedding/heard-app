import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, ChevronDown, Send, Loader2, Reply, X, ThumbsUp, ThumbsDown, ArrowUpDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Comment } from "@shared/schema";

interface CommentsSectionProps {
  submissionId: string;
}

interface CommentWithScore extends Comment {
  wilsonScore: number;
}

interface CommentsResponse {
  comments: CommentWithScore[];
}

interface CommentWithReplies extends CommentWithScore {
  replies: CommentWithScore[];
}

type SortOption = "wilson" | "newest" | "oldest";

function organizeComments(comments: CommentWithScore[], sortBy: SortOption): CommentWithReplies[] {
  const topLevel: CommentWithReplies[] = [];
  const repliesMap = new Map<string, CommentWithScore[]>();

  for (const comment of comments) {
    if (comment.parentId) {
      const replies = repliesMap.get(comment.parentId) || [];
      replies.push(comment);
      repliesMap.set(comment.parentId, replies);
    } else {
      topLevel.push({ ...comment, replies: [] });
    }
  }

  for (const comment of topLevel) {
    const replies = repliesMap.get(comment.id) || [];
    if (sortBy === "wilson") {
      replies.sort((a, b) => b.wilsonScore - a.wilsonScore);
    } else if (sortBy === "newest") {
      replies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    comment.replies = replies;
  }

  return topLevel;
}

function CommentVoteButton({
  commentId,
  type,
  count,
  isActive,
  onVote,
  isPending,
}: {
  commentId: string;
  type: "upvote" | "downvote";
  count: number;
  isActive: boolean;
  onVote: (commentId: string, voteType: "upvote" | "downvote") => void;
  isPending: boolean;
}) {
  const Icon = type === "upvote" ? ThumbsUp : ThumbsDown;
  const colorClass = type === "upvote" 
    ? (isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground") 
    : (isActive ? "text-orange-500 dark:text-orange-400" : "text-muted-foreground");

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 px-2 gap-1 ${colorClass}`}
      onClick={() => onVote(commentId, type)}
      disabled={isPending}
      data-testid={`button-${type}-${commentId}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs">{count}</span>
    </Button>
  );
}

function CommentItem({
  comment,
  submissionId,
  isReply = false,
  onReply,
  onVote,
  isPending,
  userVotes,
}: {
  comment: CommentWithScore;
  submissionId: string;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
  onVote: (commentId: string, voteType: "upvote" | "downvote") => void;
  isPending: boolean;
  userVotes: Record<string, "upvote" | "downvote" | null>;
}) {
  const currentVote = userVotes[comment.id] || null;

  return (
    <div
      className={`p-3 rounded-lg bg-muted/50 space-y-2 ${isReply ? "ml-6 border-l-2 border-muted" : ""}`}
      data-testid={`comment-${comment.id}`}
    >
      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <CommentVoteButton
            commentId={comment.id}
            type="upvote"
            count={comment.upvoteCount}
            isActive={currentVote === "upvote"}
            onVote={onVote}
            isPending={isPending}
          />
          <CommentVoteButton
            commentId={comment.id}
            type="downvote"
            count={comment.downvoteCount}
            isActive={currentVote === "downvote"}
            onVote={onVote}
            isPending={isPending}
          />
          <span className="text-xs text-muted-foreground ml-2">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        {!isReply && onReply && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => onReply(comment.id)}
            data-testid={`button-reply-${comment.id}`}
          >
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        )}
      </div>
    </div>
  );
}

export function CommentsSection({ submissionId }: CommentsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("wilson");
  const [userVotes, setUserVotes] = useState<Record<string, "upvote" | "downvote" | null>>({});
  const { toast } = useToast();

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: ['/api/submissions', submissionId, 'comments', sortBy],
    queryFn: async () => {
      const res = await fetch(`/api/submissions/${submissionId}/comments?sortBy=${sortBy}`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json();
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/comments`, { 
        content,
        parentId: parentId || undefined,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      if (variables.parentId) {
        setReplyContent("");
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
      queryClient.invalidateQueries({ queryKey: ['/api/submissions', submissionId, 'comments'] });
      toast({
        title: variables.parentId ? "Reply added" : "Comment added",
        description: "Your comment has been posted.",
      });
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Unable to post your comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ commentId, voteType }: { commentId: string; voteType: "upvote" | "downvote" }) => {
      const response = await apiRequest("POST", `/api/comments/${commentId}/vote`, { voteType });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setUserVotes(prev => ({
        ...prev,
        [variables.commentId]: data.action === "removed" ? null : variables.voteType,
      }));
      queryClient.invalidateQueries({ queryKey: ['/api/submissions', submissionId, 'comments'] });
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Unable to record your vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (newComment.trim().length === 0) return;
    createCommentMutation.mutate({ content: newComment.trim() });
  };

  const handleReplySubmit = (parentId: string) => {
    if (replyContent.trim().length === 0) return;
    createCommentMutation.mutate({ content: replyContent.trim(), parentId });
  };

  const handleVote = (commentId: string, voteType: "upvote" | "downvote") => {
    voteMutation.mutate({ commentId, voteType });
  };

  const organizedComments = data?.comments ? organizeComments(data.comments, sortBy) : [];
  const totalCount = data?.comments?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          data-testid={`button-comments-toggle-${submissionId}`}
        >
          <MessageCircle className="h-4 w-4" />
          <span>Comments</span>
          {totalCount > 0 && (
            <span className="text-xs ml-1">({totalCount})</span>
          )}
          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-4 border-t mt-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Share your thoughts anonymously..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
              data-testid={`input-comment-${submissionId}`}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {newComment.length}/500
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={newComment.trim().length === 0 || createCommentMutation.isPending}
              data-testid={`button-submit-comment-${submissionId}`}
            >
              {createCommentMutation.isPending && !replyingTo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Post
                </>
              )}
            </Button>
          </div>

          {totalCount > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] h-8" data-testid="select-sort-comments">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wilson">Best</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 mt-4">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading comments...
              </div>
            ) : organizedComments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No comments yet. Be the first to share your thoughts.
              </div>
            ) : (
              organizedComments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <CommentItem
                    comment={comment}
                    submissionId={submissionId}
                    onReply={(id) => setReplyingTo(replyingTo === id ? null : id)}
                    onVote={handleVote}
                    isPending={voteMutation.isPending}
                    userVotes={userVotes}
                  />
                  
                  {replyingTo === comment.id && (
                    <div className="ml-6 space-y-2 p-3 rounded-lg bg-muted/30 border-l-2 border-primary/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Replying to comment</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent("");
                          }}
                          data-testid={`button-cancel-reply-${comment.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[60px] resize-none"
                        maxLength={500}
                        data-testid={`input-reply-${comment.id}`}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {replyContent.length}/500
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={replyContent.trim().length === 0 || createCommentMutation.isPending}
                          data-testid={`button-submit-reply-${comment.id}`}
                        >
                          {createCommentMutation.isPending && replyingTo === comment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Reply
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {comment.replies.length > 0 && (
                    <div className="space-y-2">
                      {comment.replies.map((reply) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          submissionId={submissionId}
                          isReply
                          onVote={handleVote}
                          isPending={voteMutation.isPending}
                          userVotes={userVotes}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
