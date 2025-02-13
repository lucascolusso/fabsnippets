import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const categories: CodeCategory[] = ['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery'];

export function Home() {
  const [selectedCategories, setSelectedCategories] = useState<Set<CodeCategory>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { data: snippets, isLoading } = useQuery<Snippet[]>({
    queryKey: ['/api/snippets', searchTerm],
    queryFn: async () => {
      const response = await fetch(`/api/snippets${searchTerm ? `?search=${searchTerm}` : ''}`);
      return response.json();
    }
  });

  const toggleCategory = (category: CodeCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const clearCategories = () => {
    setSelectedCategories(new Set());
  };

  const filteredSnippets = snippets?.filter(snippet => 
    selectedCategories.size === 0 ? true : selectedCategories.has(snippet.category)
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      <div className="space-y-3 mb-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search snippet titles and code, contributors, or categories..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 justify-center">
          <Button
            variant={selectedCategories.size === 0 ? "ghost" : "outline"}
            onClick={clearCategories}
            className={cn(
              "whitespace-nowrap text-xs py-1 px-2 h-auto",
              selectedCategories.size === 0 && "border border-primary font-medium"
            )}
          >
            All Categories
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategories.has(category) ? "ghost" : "outline"}
              onClick={() => toggleCategory(category)}
              className={cn(
                "whitespace-nowrap text-xs py-1 px-2 h-auto",
                selectedCategories.has(category) && "border border-primary font-medium"
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