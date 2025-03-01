import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorUsername: string;
  authorWebsite?: string;
}

interface CommentsProps {
  snippetId: number;
}

export function Comments({ snippetId }: CommentsProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/snippets/${snippetId}/comments`],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/snippets/${snippetId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/snippets/${snippetId}/comments`] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post comment",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  return (
    <Card className="text-sm bg-[#252728]">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Comments</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-2">
        {user && (
          <form onSubmit={handleSubmit} className="mb-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              className="mb-2 text-xs min-h-[60px] resize-none"
            />
            <Button 
              type="submit" 
              disabled={addCommentMutation.isPending || !newComment.trim()}
              size="sm"
              className="text-xs"
            >
              {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-xs">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <Link 
                    href={`/profile/${comment.authorUsername}`}
                    className="font-medium text-xs underline hover:text-primary transition-colors"
                  >
                    {comment.authorUsername}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}