import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet } from "@/lib/types";

export function Home() {
  const { data: snippets, isLoading } = useQuery<Snippet[]>({
    queryKey: ['/api/snippets']
  });

  return (
    <div className="container mx-auto py-8 px-4">
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-full h-[400px] animate-pulse bg-secondary rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {snippets?.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} />
          ))}
        </div>
      )}
    </div>
  );
}