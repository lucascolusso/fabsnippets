import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import { Comments } from "@/components/Comments"; // Added import
import type { Snippet } from "@/lib/types";
import { useRoute } from "wouter";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export function SnippetPage() {
  const [, params] = useRoute<{ id: string }>("/snippet/:id");
  const snippetId = parseInt(params?.id || "0");
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    toast({
      title: "Image Error",
      description: "Could not load the image",
      variant: "destructive"
    });
  };

  const { data: snippet } = useQuery<Snippet>({
    queryKey: [`/api/snippets/${snippetId}`],
    queryFn: async () => {
      const response = await fetch(`/api/snippets/${snippetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch snippet');
      }
      return response.json();
    },
  });

  if (!snippet) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <SnippetCard snippet={snippet} />
      {snippet.imagePath && !imageError && (
        <div className="mt-8">
          <img 
            src={`/uploads/${snippet.imagePath}`} 
            alt="Snippet visualization" 
            className="w-full rounded-lg shadow-lg object-contain max-h-[60vh]"
            onError={handleImageError}
          />
        </div>
      )}
      <div className="mt-8"> {/* Added div to wrap Comments */}
        <Comments snippetId={snippetId} />
      </div>
    </div>
  );
}