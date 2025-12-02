import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, ChevronDown, Send, Loader2 } from "lucide-react";
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

export function CommentsSection({ submissionId }: CommentsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: [`/api/submissions/${submissionId}/comments`],
    enabled: isOpen,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}/comments`] });
      toast({
        title: "Comment added",
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
    createCommentMutation.mutate(newComment.trim());
  };

  const commentCount = data?.comments?.length || 0;

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
          {commentCount > 0 && (
            <span className="text-xs ml-1">({commentCount})</span>
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
              {createCommentMutation.isPending ? (
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
            ) : commentCount === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No comments yet. Be the first to share your thoughts.
              </div>
            ) : (
              data?.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-lg bg-muted/50 space-y-1"
                  data-testid={`comment-${comment.id}`}
                >
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
