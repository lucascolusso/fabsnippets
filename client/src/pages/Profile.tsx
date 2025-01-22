import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SnippetCard } from "@/components/SnippetCard";
import type { Snippet, User } from "@/lib/types";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface ProfileData {
  snippets: Snippet[];
  leaderboards: Array<{
    category: string;
    position: number | null;
  }>;
}

interface ProfileFormData {
  username: string;
  email?: string;
  website?: string;
}

export function Profile() {
  const [, params] = useRoute("/profile/:name");
  const authorName = params?.name ?? "";
  const { user: currentUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery<ProfileData>({
    queryKey: [`/api/authors/${authorName}`],
    enabled: !!authorName
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: ProfileFormData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/authors/${authorName}`] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
      });
    },
  });

  const form = useForm<ProfileFormData>({
    defaultValues: {
      username: currentUser?.username || "",
      email: currentUser?.email || "",
      website: currentUser?.website || "",
    },
  });

  if (!data) return null;

  const isOwnProfile = currentUser?.username === authorName;
  const topPositions = data.leaderboards
    .filter(board => board.position !== null && board.position <= 10)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  async function onSubmit(formData: ProfileFormData) {
    updateProfileMutation.mutate(formData);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <>
                  <h1 className="text-2xl font-bold mb-2">{authorName}</h1>
                  {currentUser?.website && (
                    <a 
                      href={currentUser.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                    >
                      Visit website <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-4"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </>
              )}
            </div>
            {topPositions.length > 0 && !isEditing && (
              <div>
                <CardTitle className="mb-4">Leaderboard Positions</CardTitle>
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
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Submitted Snippets</h2>
      <div className="space-y-4">
        {data.snippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>
    </div>
  );
}

export default Profile;