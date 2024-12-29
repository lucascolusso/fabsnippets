
import { useQuery } from "@tanstack/react-query";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet } from "@/lib/types";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface ProfileData {
  snippets: Snippet[];
  leaderboards: Array<{
    category: string;
    position: number | null;
  }>;
}

export function Profile() {
  const [, params] = useRoute("/profile/:name");
  const authorName = params?.name ?? "";
  
  const { data } = useQuery<ProfileData>({
    queryKey: [`/api/authors/${authorName}`],
    enabled: !!authorName
  });

  if (!data) return null;

  const topPositions = data.leaderboards
    .filter(board => board.position !== null && board.position <= 10)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{authorName}</h1>
        {data.snippets[0]?.authorWebsite && (
          <a 
            href={data.snippets[0].authorWebsite} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline inline-flex items-center gap-1"
          >
            Visit website <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {topPositions.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Leaderboard Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPositions.map(({ category, position }) => (
                <div key={category} className="flex justify-between items-center">
                  <Link 
                    href={`/leaderboard?category=${category === 'all' ? '' : category.toLowerCase()}`}
                    className="hover:text-primary"
                  >
                    {category === 'all' ? 'Overall' : category}
                  </Link>
                  <span className="text-muted-foreground">
                    #{position}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold mb-4">Submitted Snippets</h2>
      <div className="space-y-4">
        {data.snippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>
    </div>
  );
}
