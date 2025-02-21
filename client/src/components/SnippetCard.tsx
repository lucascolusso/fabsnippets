import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { Copy, ThumbsUp, CheckCircle2, Image, Edit2, Trash2, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/use-user";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface SnippetCardProps {
  snippet: Snippet;
}

const parsedCategories = (snippet: Snippet): CodeCategory[] => {
  try {
    // If categories is null, undefined, or empty string
    if (!snippet.categories) {
      // Try to fall back to single category if it exists
      return snippet.category ? [snippet.category as CodeCategory] : [];
    }
    // If categories is already an array
    if (Array.isArray(snippet.categories)) {
      return snippet.categories;
    }
    // If categories is a string, try to parse it
    if (typeof snippet.categories === 'string' && snippet.categories.trim()) {
      const parsed = JSON.parse(snippet.categories);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (e) {
    console.error('Error parsing categories:', e);
    // Fallback to single category if parsing fails
    return snippet.category ? [snippet.category as CodeCategory] : [];
  }
};

export function SnippetCard({ snippet }: SnippetCardProps) {
  const queryClient = useQueryClient();
  const [isCopied, setIsCopied] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user } = useUser();

  const form = useForm({
    defaultValues: {
      title: snippet.title,
      code: snippet.code,
      categories: parsedCategories(snippet)
    }
  });

  const handleImageError = () => {
    setImageError(true);
    toast({
      title: "Image Error",
      description: "Could not load the image",
      variant: "destructive"
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; code: string; categories: CodeCategory[] }) => {
      const res = await fetch(`/api/snippets/${snippet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/snippets"] });
      setIsEditing(false);
      toast({
        title: "Snippet updated",
        description: "Your changes have been saved."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const voteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/snippets/${snippet.id}/vote`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        try {
          const errorData = JSON.parse(error);
          throw new Error(errorData.message);
        } catch {
          throw new Error('Failed to record vote');
        }
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/snippets"] });
      toast({
        title: "Vote recorded",
        description: "Thanks for voting!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: error.message.includes("already voted") ? "Already voted" : "Couldn't vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/snippets/${snippet.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/snippets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/authors/${snippet.authorUsername}`] });
      toast({
        title: "Snippet deleted",
        description: "Your snippet has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setIsCopied(true);
      toast({
        title: "Copied!",
        description: "Code snippet copied to clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: { title: string; code: string; categories: CodeCategory[] }) => {
    updateMutation.mutate(data);
  };

  const isAuthor = user?.id === snippet.authorId;

  return (
    <>
      <Card className="w-full shadow-md">
        <CardContent className="p-1 space-y-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex flex-col gap-0.5">
              <Link href={`/snippet/${snippet.id}`} className="hover:text-primary hover:underline">
                <h2 className="text-sm font-semibold">{snippet.title}</h2>
              </Link>
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <span>Submitted by</span>
                <Link href={`/profile/${snippet.authorUsername}`} className="underline">
                  {snippet.authorUsername}
                </Link>
                <span>on {new Date(snippet.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 flex-wrap">
                {parsedCategories(snippet).map((category, index) => (
                  <span
                    key={`${category}-${index}`}
                    className="inline-block px-0.5 py-0.5 text-[8px] font-semibold rounded bg-primary/10"
                  >
                    {category}
                  </span>
                ))}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isAuthor && (
                  <>
                    <Button variant="outline" size="icon" className="h-6 w-6">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive hover:text-destructive h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Title</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-xs h-7" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Categories</FormLabel>
                      <Select onValueChange={field.onChange} multiple value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select categories" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Prompt" className="text-xs">Prompt</SelectItem>
                          <SelectItem value="TMDL" className="text-xs">TMDL</SelectItem>
                          <SelectItem value="DAX" className="text-xs">DAX</SelectItem>
                          <SelectItem value="SQL" className="text-xs">SQL</SelectItem>
                          <SelectItem value="Python" className="text-xs">Python</SelectItem>
                          <SelectItem value="PowerQuery" className="text-xs">PowerQuery</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Code</FormLabel>
                      <FormControl>
                        <CodeEditor {...field} className="text-[10px] h-full font-mono" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex gap-1">
                  <Button type="submit" disabled={updateMutation.isPending} className="h-6 text-xs">
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-6 text-xs">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <ScrollArea className="h-[180px]">
              <div>
                <CodeEditor
                  value={snippet.code}
                  onChange={() => { }}
                  readOnly
                  className="text-[10px] h-full font-mono"
                />
              </div>
            </ScrollArea>
          )}

          <div className="flex flex-wrap items-center w-full gap-1 pt-0.5">
            <div className="grid grid-cols-3 w-full gap-1">
              <Button
                variant="outline"
                onClick={() => voteMutation.mutate()}
                disabled={voteMutation.isPending}
                className="h-6 px-2 flex items-center justify-center gap-1 text-[10px]"
              >
                <ThumbsUp className="h-3 w-3" />
                <span>Like {snippet.votes}</span>
              </Button>
              {!window.location.pathname.includes('/snippet/') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = `/snippet/${snippet.id}`}
                  className="h-6 text-xs px-2 flex items-center justify-center"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>Comment {snippet.commentCount || 0}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-6 text-xs px-2 flex items-center justify-center"
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. This will permanently delete your snippet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90 h-7 text-xs"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}