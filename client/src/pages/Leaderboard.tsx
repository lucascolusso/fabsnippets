import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import type { Snippet, CodeCategory } from "@/lib/types";
import { getCategoryDisplayName } from "@/lib/utils";

function ContributorCard({ contributors }: { contributors: [string, number][] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Contributors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {contributors.map(([author, count], index) => (
            <div key={author} className="flex justify-between items-center text-xs">
              <span>
                {index + 1}.{" "}
                <Link href={`/profile/${author}`} className="hover:text-primary hover:underline">
                  {author}
                </Link>
              </span>
              <span className="text-muted-foreground">
                {count} snippet{count === 1 ? "" : "s"}
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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Most liked snippets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {snippets.map((snippet, index) => (
            <div key={snippet.id} className="flex justify-between items-start">
              <div className="flex flex-col space-y-0.5">
                <span className="text-xs">
                  {index + 1}.{" "}
                  <Link href={`/snippet/${snippet.id}`} className="hover:text-primary hover:underline">
                    {snippet.title}
                  </Link>
                </span>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(snippet.categories) ? snippet.categories : []).map((category: string) => (
                    <span key={category} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10">
                      {getCategoryDisplayName(category as CodeCategory)}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  by{" "}
                  <Link href={`/profile/${snippet.authorUsername}`} className="hover:text-primary hover:underline">
                    {snippet.authorUsername}
                  </Link>
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground ml-4">
                {snippet.votes} like{snippet.votes === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MostCommentedCard({ snippets }: { snippets: Snippet[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Most discussed snippets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {snippets.map((snippet, index) => (
            <div key={snippet.id} className="flex justify-between items-start">
              <div className="flex flex-col space-y-0.5">
                <span className="text-xs">
                  {index + 1}.{" "}
                  <Link href={`/snippet/${snippet.id}`} className="hover:text-primary hover:underline">
                    {snippet.title}
                  </Link>
                </span>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(snippet.categories) ? snippet.categories : []).map((category: string) => (
                    <span key={category} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10">
                      {getCategoryDisplayName(category as CodeCategory)}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  by{" "}
                  <Link href={`/profile/${snippet.authorUsername}`} className="hover:text-primary hover:underline">
                    {snippet.authorUsername}
                  </Link>
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground ml-4">
                {snippet.commentCount} comment{snippet.commentCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Leaderboard() {
  const { data: snippets } = useQuery<Snippet[]>({
    queryKey: ["/api/leaderboard"],
  });

  const topContributors = snippets?.reduce((acc, snippet) => {
    acc[snippet.authorUsername] = (acc[snippet.authorUsername] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedContributors = Object.entries(topContributors || {})
    .sort(([, a], [, b]) => b - a);

  const topVoted = [...(snippets || [])]
    .filter(snippet => snippet.votes > 0)
    .sort((a, b) => b.votes - a.votes);

  const mostCommented = [...(snippets || [])]
    .filter(snippet => snippet.commentCount != null && snippet.commentCount > 0)
    .sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Leaderboard</h1>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ContributorCard contributors={sortedContributors} />
        <TopVotedCard snippets={topVoted} />
        <MostCommentedCard snippets={mostCommented} />
      </div>
    </div>
  );
}
