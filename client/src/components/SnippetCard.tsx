import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { Copy, ThumbsUp } from "lucide-react";
import { Link } from "wouter";
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
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{snippet.title}</h2>
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-primary/10">
              {snippet.category}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Submitted by</span>
            <Link href={`/profile/${snippet.authorName}`} className="hover:underline">
              {snippet.authorName}
            </Link>
            <span>on {new Date(snippet.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
}