/**
 * SnippetCard Component
 * 
 * This component renders a code snippet card in the FabSnippets application.
 * It provides functionality to view, edit, and delete snippets, as well as
 * vote on them.
 * 
 * Key features:
 * - Display snippet title, author, code, and metadata
 * - Edit snippet content (for snippet authors only)
 * - Vote on snippets
 * - Delete snippets (for snippet authors only)
 * - Copy code to clipboard
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { Copy, ThumbsUp, CheckCircle2, Edit2, Trash2, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { getCategoryDisplayName } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

interface SnippetCardProps {
  snippet: Snippet;
}

/**
 * Parses categories from a snippet object
 * 
 * This utility function handles different formats of category data
 * that may be present in a snippet object, including legacy formats.
 * 
 * @param snippet - The snippet object to extract categories from
 * @returns An array of CodeCategory types
 */
const parsedCategories = (snippet: Snippet): CodeCategory[] => {
  try {
    // If categories property exists and is an array, return it
    if (snippet.categories && Array.isArray(snippet.categories)) {
      return snippet.categories;
    }
    
    // Handle legacy format where categories might be a string
    const categoriesValue = (snippet as any).categories;
    if (typeof categoriesValue === 'string' && categoriesValue.trim()) {
      try {
        const parsed = JSON.parse(categoriesValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If parsing fails, return empty array
        return [];
      }
    }
    
    // Handle legacy format where there might be a single category
    if ((snippet as any).category) {
      return [(snippet as any).category as CodeCategory];
    }
    
    // Default to empty array if no categories found
    return [];
  } catch (e) {
    console.error('Error parsing categories:', e);
    return [];
  }
};

export function SnippetCard({ snippet }: SnippetCardProps) {
  const queryClient = useQueryClient();
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user } = useUser();
  const [hasLiked, setHasLiked] = useState(false);

  // Add vote status check query
  const { data: voteStatus } = useQuery({
    queryKey: [`/api/snippets/${snippet.id}/vote-status`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/snippets/${snippet.id}/vote-status`, {
          credentials: "include",
        });
        if (!res.ok) return { hasVoted: false };
        return res.json();
      } catch (e) {
        return { hasVoted: false };
      }
    },
    enabled: !!user, // Only run if user is logged in
  });

  // Update hasLiked when vote status changes
  useEffect(() => {
    if (voteStatus?.hasVoted) {
      setHasLiked(true);
    }
  }, [voteStatus]);

  const form = useForm({
    defaultValues: {
      title: snippet.title,
      code: snippet.code,
      categories: parsedCategories(snippet)
    }
  });

  /**
   * Update Mutation
   * 
   * This mutation handles the API call to update a snippet.
   * 
   * Key features:
   * - Handles errors with toast notifications
   * - Updates query cache on success
   * - Exits edit mode on successful update
   */
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
      setHasLiked(true);
      toast({
        title: "Vote recorded",
        description: "Thanks for voting!",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("already voted")) {
        setHasLiked(true);
      }
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

  /**
   * Handle Cancel Edit
   * 
   * Cancels the editing process and resets all related state.
   * - Exits edit mode
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  /**
   * Form Submission Handler
   * 
   * Processes the form submission for snippet editing.
   * - Takes form data (title, code, categories)
   * - Triggers the update mutation to save changes
   * 
   * @param data - The form data containing snippet details
   */
  const onSubmit = (data: { title: string; code: string; categories: CodeCategory[] }) => {
    updateMutation.mutate(data);
  };

  const isAuthor = user?.id === snippet.authorId;

  return (
    <>
      <Card className="w-full shadow-md rounded-xl comments-card bg-[#252728] border-0">
        <CardContent className="p-3 space-y-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex flex-col gap-0.5">
              <Link href={`/snippet/${snippet.id}`} className="hover:text-primary hover:underline">
                <h2 className="text-sm font-semibold">{snippet.title}</h2>
              </Link>
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <span>Submitted by</span>
                <Link href={`/profile/${snippet.authorUsername}`} className="underline">
                  {snippet.authorUsername}
                </Link>
                <span>on {new Date(snippet.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-1 flex-wrap">
                {parsedCategories(snippet).map((category, index) => (
                  <span
                    key={`${category}-${index}`}
                    className="inline-block px-1.5 py-0.5 text-xs font-semibold rounded bg-primary/10"
                  >
                    {getCategoryDisplayName(category)}
                  </span>
                ))}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isAuthor && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setIsEditing(true)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive hover:text-destructive h-8 w-8"
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
                      <FormLabel className="text-sm">Title</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-sm h-8" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Categories</FormLabel>
                      <div className="flex flex-wrap gap-1">
                        {['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery'].map((category) => (
                          <Button
                            key={category}
                            type="button"
                            size="sm"
                            variant={field.value.includes(category as CodeCategory) ? "default" : "outline"}
                            className="h-7 text-sm"
                            onClick={() => {
                              const currentCategories = [...field.value];
                              if (currentCategories.includes(category as CodeCategory)) {
                                field.onChange(currentCategories.filter(c => c !== category));
                              } else {
                                field.onChange([...currentCategories, category as CodeCategory]);
                              }
                            }}
                          >
                            {getCategoryDisplayName(category as CodeCategory)}
                          </Button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                {/* 
                  Code Input Field 
                  
                  This FormField renders the code editor for snippet editing. 
                  Important styling notes:
                  - The wrapping div with fixed height (160px) creates a consistent editor size
                  - The CodeEditor component uses h-full to fill this container completely
                  - This approach ensures the editor maintains exactly 160px height regardless of content
                */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Code</FormLabel>
                      <FormControl>
                        {/* Fixed height container (160px) for the code editor */}
                        <div style={{ height: "160px" }} className="code-editor-container">
                          <CodeEditor {...field} className="code-snippet-editor h-full" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-1">
                  <Button type="submit" disabled={updateMutation.isPending} className="h-9 text-sm">
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit} className="h-9 text-sm">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              {/* 
                Read-only Code Display
                
                This section displays the snippet code in read-only mode:
                - Uses ScrollArea with fixed height (180px) to ensure consistent display and allow scrolling
                - The code-snippet-wrapper provides positioning context for the copy button
                - The CodeEditor component is set to readOnly mode which applies different styling
              */}
              <ScrollArea className="h-[180px]">
                <div className="mt-1 p-1 code-snippet-wrapper relative">
                  <CodeEditor
                    value={snippet.code}
                    onChange={() => { }}
                    readOnly
                    className="code-snippet-editor"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="absolute bottom-2 right-2 h-9 w-9 p-2 bg-background/70 hover:bg-background backdrop-blur-sm rounded-full"
                  >
                    {isCopied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </ScrollArea>
            </>
          )}
          
          <div className="flex flex-wrap items-center w-full gap-1 pt-0.5">
            <div className="w-full flex justify-between text-muted-foreground text-sm mb-1 pb-1 border-b border-[#65686C]" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
              <span>{snippet.votes} {snippet.votes === 1 ? 'like' : 'likes'}</span>
              {!window.location.pathname.includes('/snippet/') ? (
                <Link href={`/snippet/${snippet.id}`} className="hover:text-primary hover:underline cursor-pointer">
                  {snippet.commentCount || 0} {(snippet.commentCount || 0) === 1 ? 'comment' : 'comments'}
                </Link>
              ) : (
                <span>{snippet.commentCount || 0} {(snippet.commentCount || 0) === 1 ? 'comment' : 'comments'}</span>
              )}
            </div>
            <div className="grid w-full gap-1 grid-cols-2">
              <Button
                variant="ghost"
                onClick={() => voteMutation.mutate()}
                disabled={voteMutation.isPending}
                className={cn(
                  "h-9 px-2 flex items-center justify-center gap-1 text-sm",
                  hasLiked && "font-bold text-primary"
                )}
              >
                <ThumbsUp className={cn("h-3 w-3", hasLiked && "fill-current")} />
                <span>Like</span>
              </Button>
              {!window.location.pathname.includes('/snippet/') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = `/snippet/${snippet.id}`}
                  className="h-9 text-sm px-2 flex items-center justify-center"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>Comment</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete your snippet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90 h-9 text-sm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}