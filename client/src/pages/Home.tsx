import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const categories: CodeCategory[] = ['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery'];

export function Home() {
  const [selectedCategories, setSelectedCategories] = useState<Set<CodeCategory>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { toast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const { data: snippets, isLoading, error } = useQuery<Snippet[]>({
    queryKey: ['/api/snippets', debouncedSearch],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/snippets${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''}`);
        if (!response.ok) {
          throw new Error('Failed to fetch snippets');
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }
        // Ensure categories are properly parsed for each snippet
        return data.map(snippet => ({
          ...snippet,
          categories: Array.isArray(snippet.categories) 
            ? snippet.categories 
            : typeof snippet.categories === 'string'
              ? JSON.parse(snippet.categories)
              : []
        }));
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: "Error",
          description: "Failed to fetch search results. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
    refetchOnWindowFocus: false,
  });

  const toggleCategory = useCallback((category: CodeCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  const filteredSnippets = snippets?.filter(snippet => {
    if (selectedCategories.size === 0) return true;

    // Parse categories if it's a string
    let snippetCategories: string[] = [];
    try {
      if (typeof snippet.categories === 'string') {
        snippetCategories = JSON.parse(snippet.categories);
      } else if (Array.isArray(snippet.categories)) {
        snippetCategories = snippet.categories;
      }
    } catch (e) {
      console.error('Error parsing categories:', e);
      return false;
    }

    // Check if any selected category exists in the snippet's categories
    return Array.from(selectedCategories).some(selectedCategory => 
      snippetCategories.includes(selectedCategory)
    );
  }) ?? [];

  // Split categories into two groups - first line and second line
  const firstLineCategories = categories.slice(0, categories.indexOf('DAX') + 1); // Up to and including DAX
  const secondLineCategories = categories.slice(categories.indexOf('DAX') + 1); // After DAX

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      <div className="space-y-1 mb-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search snippet titles and code, contributors, or categories..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-[#333334]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* First line of categories with "All" button */}
        <div className="flex gap-1 overflow-x-auto pb-1 justify-center">
          <Button
            variant={selectedCategories.size === 0 ? "ghost" : "outline"}
            onClick={clearCategories}
            className={cn(
              "whitespace-nowrap text-xs py-1 px-2 h-auto",
              selectedCategories.size === 0 && "border border-primary font-medium"
            )}
          >
            All
          </Button>
          {firstLineCategories.map((category) => (
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

        {/* Second line of categories */}
        <div className="flex gap-1 overflow-x-auto pb-1 justify-center">
          {secondLineCategories.map((category) => (
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

      {error ? (
        <div className="text-center py-8 text-muted-foreground">
          Failed to load snippets. Please try again later.
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-full h-[400px] animate-pulse bg-secondary rounded-lg" />
          ))}
        </div>
      ) : filteredSnippets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No snippets found{searchTerm ? ` for "${searchTerm}"` : ''}.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSnippets.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} />
          ))}
        </div>
      )}
    </div>
  );
}