import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const categories: CodeCategory[] = ['TMDL', 'DAX', 'SQL', 'Python'];

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState<CodeCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { data: snippets, isLoading } = useQuery<Snippet[]>({
    queryKey: ['/api/snippets', searchTerm],
    queryFn: async () => {
      const response = await fetch(`/api/snippets${searchTerm ? `?search=${searchTerm}` : ''}`);
      return response.json();
    }
  });

  const filteredSnippets = snippets?.filter(snippet => 
    selectedCategory === 'all' ? true : snippet.category === selectedCategory
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="space-y-4 mb-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search snippets, contributors, or categories..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === 'all' ? "ghost" : "outline"}
          onClick={() => setSelectedCategory('all')}
          className={cn(
            "whitespace-nowrap",
            selectedCategory === 'all' && "border-2 border-white font-bold"
          )}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "ghost" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "whitespace-nowrap",
              selectedCategory === category && "border-2 border-white font-bold"
            )}
          >
            {category}
          </Button>
        ))}
        </div>
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