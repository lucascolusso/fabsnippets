import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { ThumbsUp, Copy, CheckCircle2 } from "lucide-react";
import type { Snippet } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface SnippetCardProps {
  snippet: Snippet;
}

export function SnippetCard({ snippet }: SnippetCardProps) {
  const queryClient = useQueryClient();
  const [isCopied, setIsCopied] = useState(false);

  const voteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/snippets/${snippet.id}/vote`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.text();
        // Check if it's the already voted error
        if (error.includes("Already voted")) {
          throw new Error("Thanks for your enthusiasm! You've already voted for this snippet.");
        }
        throw new Error(error);
      }
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
        title: "Couldn't vote",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setIsCopied(true);
      toast({
        title: "Copied!",
        description: "Code snippet copied to clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code to clipboard",
        variant: "destructive"
      });
    }
  };

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
          <div className="flex items-center justify-between">
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-primary/10">
              {snippet.category}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2"
            >
              {isCopied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
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