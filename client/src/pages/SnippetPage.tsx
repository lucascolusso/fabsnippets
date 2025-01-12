
import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet } from "@/lib/types";
import { useRoute } from "wouter";

export function SnippetPage() {
  const [, params] = useRoute<{ id: string }>("/snippet/:id");
  const snippetId = parseInt(params?.id || "0");

  const { data: snippet } = useQuery<Snippet>({
    queryKey: [`/api/snippets/${snippetId}`],
  });

  if (!snippet) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <SnippetCard snippet={snippet} />
    </div>
  );
}
