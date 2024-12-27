import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { ThumbsUp } from "lucide-react";
import type { Snippet } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface SnippetCardProps {
  snippet: Snippet;
}

export function SnippetCard({ snippet }: SnippetCardProps) {
  const queryClient = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/snippets/${snippet.id}/vote`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/snippets'] });
      toast({
        title: "Vote recorded",
        description: "Thanks for voting!"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">
          {snippet.authorWebsite ? (
            <a
              href={snippet.authorWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {snippet.authorName}
            </a>
          ) : (
            snippet.authorName
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(snippet.createdAt).toLocaleDateString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => voteMutation.mutate()}
            disabled={voteMutation.isPending}
          >
            <ThumbsUp className="h-3 w-3 mr-1" />
            {snippet.votes}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-primary/10">
            {snippet.category}
          </span>
          <CodeEditor
            value={snippet.code}
            onChange={() => {}}
            readOnly
          />
        </div>
      </CardContent>
    </Card>
  );
}