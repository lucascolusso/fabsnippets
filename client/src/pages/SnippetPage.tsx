
import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet } from "@/lib/types";
import { useRoute } from "wouter";

export function SnippetPage() {
  const [, params] = useRoute<{ id: string }>("/snippet/:id");
  const snippetId = parseInt(params?.id || "0");

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
      {snippet.imagePath && (
        <div className="mt-8">
          <img src={`/api/uploads/${snippet.imagePath}`} alt="Snippet visualization" className="w-full rounded-lg shadow-lg" />
        </div>
      )}
    </div>
  );
}
