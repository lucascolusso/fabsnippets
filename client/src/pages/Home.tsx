
import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const categories: CodeCategory[] = ['TMDL', 'DAX', 'SQL', 'Python'];

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState<CodeCategory | 'all'>('all');
  const { data: snippets, isLoading } = useQuery<Snippet[]>({
    queryKey: ['/api/snippets']
  });

  const filteredSnippets = snippets?.filter(snippet => 
    selectedCategory === 'all' ? true : snippet.category === selectedCategory
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === 'all' ? "default" : "outline"}
          onClick={() => setSelectedCategory('all')}
          className="whitespace-nowrap"
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className="whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-full h-[400px] animate-pulse bg-secondary rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSnippets?.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} />
          ))}
        </div>
      )}
    </div>
  );
}
