import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import { Comments } from "@/components/Comments";
import type { Snippet } from "@/lib/types";
import { useRoute, Link } from "wouter";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";

export function SnippetPage() {
  const [, params] = useRoute<{ id: string }>("/snippet/:id");
  const snippetId = parseInt(params?.id || "0");

  // Fetch snippet data
  const { data: snippet, isLoading, error, isError } = useQuery<Snippet>({
    queryKey: [`/api/snippets/${snippetId}`],
    queryFn: async () => {
      const response = await fetch(`/api/snippets/${snippetId}`);
      if (!response.ok) {
        const errorData = await response.text();
        try {
          const jsonError = JSON.parse(errorData);
          throw new Error(jsonError.message || 'Failed to fetch snippet');
        } catch {
          throw new Error(errorData || 'Failed to fetch snippet');
        }
      }
      return response.json() as Promise<Snippet>;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: 1, // Only retry once to avoid flooding with requests
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-[800px] space-y-8">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" className="mr-2" asChild>
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="w-full h-[200px] rounded-lg" />
        <Skeleton className="w-full h-[300px] rounded-lg" />
        <Skeleton className="w-full h-[200px] rounded-lg" />
      </div>
    );
  }

  // Error state
  if (isError || !snippet) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-[800px]">
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Snippet Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error instanceof Error 
                  ? error.message 
                  : "This snippet could not be found or has been deleted."}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[800px]">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" className="mr-2" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>
      
      <SnippetCard snippet={snippet} />
      
      <div className="mt-8">
        <Comments snippetId={snippetId} />
      </div>
    </div>
  );
}