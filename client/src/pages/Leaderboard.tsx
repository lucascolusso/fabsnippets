import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type { Snippet, CodeCategory } from "@/lib/types";

const categories: CodeCategory[] = ['TMDL', 'DAX', 'SQL', 'Python'];

export function Leaderboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data: snippets } = useQuery<Snippet[]>({
    queryKey: [`/api/leaderboard${selectedCategory ? `?category=${selectedCategory}` : ''}`]
  });

  const topContributors = snippets?.reduce((acc, snippet) => {
    acc[snippet.authorName] = (acc[snippet.authorName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedContributors = Object.entries(topContributors || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const topVoted = [...(snippets || [])]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <Select onValueChange={setSelectedCategory} value={selectedCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedContributors.map(([author, count], index) => (
                <div key={author} className="flex justify-between items-center">
                  <span>
                    {index + 1}. {author}
                  </span>
                  <span className="text-muted-foreground">
                    {count} snippet{count === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Voted Snippets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topVoted.map((snippet, index) => (
                <div key={snippet.id} className="flex justify-between items-center">
                  <span>
                    {index + 1}. {snippet.authorName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-primary/10">
                      {snippet.category}
                    </span>
                    <span className="text-muted-foreground">
                      {snippet.votes} vote{snippet.votes === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}