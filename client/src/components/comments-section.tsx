import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, ChevronDown, Send, Loader2, Reply, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Comment } from "@shared/schema";

interface CommentsSectionProps {
  submissionId: string;
}

interface CommentsResponse {
  comments: Comment[];
}

interface CommentWithReplies extends Comment {
  replies: Comment[];
}

function organizeComments(comments: Comment[]): CommentWithReplies[] {
  const topLevel: CommentWithReplies[] = [];
  const repliesMap = new Map<string, Comment[]>();

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
    comment.replies = repliesMap.get(comment.id) || [];
  }

  return topLevel;
}

function CommentItem({
  comment,
  submissionId,
  isReply = false,
  onReply,
}: {
  comment: Comment;
  submissionId: string;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
}) {
  return (
    <div
      className={`p-3 rounded-lg bg-muted/50 space-y-2 ${isReply ? "ml-6 border-l-2 border-muted" : ""}`}
      data-testid={`comment-${comment.id}`}
    >
      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </p>
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
  const { toast } = useToast();

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: [`/api/submissions/${submissionId}/comments`],
    enabled: isOpen,
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
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}/comments`] });
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

  const handleSubmit = () => {
    if (newComment.trim().length === 0) return;
    createCommentMutation.mutate({ content: newComment.trim() });
  };

  const handleReplySubmit = (parentId: string) => {
    if (replyContent.trim().length === 0) return;
    createCommentMutation.mutate({ content: replyContent.trim(), parentId });
  };

  const organizedComments = data?.comments ? organizeComments(data.comments) : [];
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
