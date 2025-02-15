import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import type { Snippet } from "@/lib/types";

function ContributorCard({ contributors }: { contributors: [string, number][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Contributors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {contributors.map(([author, count], index) => (
            <div key={author} className="flex justify-between items-center">
              <span>
                {index + 1}.{" "}
                <Link href={`/profile/${author}`} className="hover:text-primary hover:underline">
                  {author}
                </Link>
              </span>
              <span className="text-muted-foreground">
                {count} snippet{count === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopVotedCard({ snippets }: { snippets: Snippet[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Voted Snippets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {snippets.map((snippet, index) => {
            // Parse the categories JSON string into an array
            const categories = JSON.parse(snippet.categories || '[]');
            return (
              <div key={snippet.id} className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span>
                    {index + 1}.{" "}
                    <Link href={`/snippet/${snippet.id}`} className="hover:text-primary hover:underline">
                      {snippet.title}
                    </Link>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    by{" "}
                    <Link href={`/profile/${snippet.authorUsername}`} className="hover:text-primary hover:underline">
                      {snippet.authorUsername}
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {categories.map((category: string) => (
                      <span key={category} className="text-xs px-2 py-1 rounded bg-primary/10">
                        {category}
                      </span>
                    ))}
                  </div>
                  <span className="text-muted-foreground">
                    {snippet.votes} vote{snippet.votes === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function Leaderboard() {
  const { data: snippets } = useQuery<Snippet[]>({
    queryKey: ['/api/leaderboard'],
  });

  const topContributors = snippets?.reduce((acc, snippet) => {
    acc[snippet.authorUsername] = (acc[snippet.authorUsername] || 0) + 1;
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
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <ContributorCard contributors={sortedContributors} />
        <TopVotedCard snippets={topVoted} />
      </div>
    </div>
  );
}