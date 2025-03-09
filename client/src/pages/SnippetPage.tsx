import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import { Comments } from "@/components/Comments";
import type { Snippet } from "@/lib/types";
import { useRoute } from "wouter";
import { useState, Suspense, lazy } from "react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load the image component
const SnippetImage = lazy(() => import("@/components/SnippetImage"));

export function SnippetPage() {
  const [, params] = useRoute<{ id: string }>("/snippet/:id");
  const snippetId = parseInt(params?.id || "0");
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    console.log("Failed to load image for snippet ID:", snippetId);
    toast({
      title: "Image Not Available",
      description: "The image for this snippet could not be loaded",
      variant: "destructive"
    });
  };

  const { data: snippet, isLoading } = useQuery<Snippet>({
    queryKey: [`/api/snippets/${snippetId}`],
    queryFn: async () => {
      const response = await fetch(`/api/snippets/${snippetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch snippet');
      }
      return response.json() as Promise<Snippet>;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes (formerly cacheTime)
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-[500px] space-y-8">
        <Skeleton className="w-full h-[200px] rounded-lg" />
        <Skeleton className="w-full h-[300px] rounded-lg" />
        <Skeleton className="w-full h-[200px] rounded-lg" />
      </div>
    );
  }

  if (!snippet) {
    return <div className="container mx-auto py-8">Snippet not found</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[500px]">
      <SnippetCard snippet={snippet} />
      {snippet.imagePath && !imageError && (
        <div className="mt-8">
          <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
            <SnippetImage 
              src={`/uploads/${snippet.imagePath}`}
              onError={handleImageError}
            />
          </Suspense>
        </div>
      )}
      <div className="mt-8">
        <Comments snippetId={snippetId} />
      </div>
    </div>
  );
}