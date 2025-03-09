import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { Copy, ThumbsUp, CheckCircle2, Image, Edit2, Trash2, MessageSquare, ImageOff } from "lucide-react";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
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
import SnippetImage from "./SnippetImage";

interface SnippetCardProps {
  snippet: Snippet;
}

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
  const [showImage, setShowImage] = useState(false);
  const [imageError, setImageError] = useState(false);
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
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
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
                    className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/10"
                  >
                    {category}
                  </span>
                ))}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isAuthor && (
                  <>
                    <Button variant="outline" size="icon" className="h-8 w-8">
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
                      <div className="flex flex-wrap gap-1">
                        {['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery'].map((category) => (
                          <Button
                            key={category}
                            type="button"
                            size="sm"
                            variant={field.value.includes(category as CodeCategory) ? "default" : "outline"}
                            className="h-6 text-xs"
                            onClick={() => {
                              const currentCategories = [...field.value];
                              if (currentCategories.includes(category as CodeCategory)) {
                                field.onChange(currentCategories.filter(c => c !== category));
                              } else {
                                field.onChange([...currentCategories, category as CodeCategory]);
                              }
                            }}
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
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
                        <CodeEditor {...field} className="code-snippet-editor" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex gap-1">
                  <Button type="submit" disabled={updateMutation.isPending} className="h-8 text-xs">
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-8 text-xs">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              <ScrollArea className="h-[180px]">
                <div className="mt-1 p-1 code-snippet-wrapper">
                  <CodeEditor
                    value={snippet.code}
                    onChange={() => { }}
                    readOnly
                    className="code-snippet-editor"
                  />
                </div>
              </ScrollArea>
              
              {/* Image indicator button if image is attached */}
              {snippet.imagePath && !imageError && (
                <div className="flex justify-end mt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowImage(true)}
                    className="text-xs h-7 px-2"
                  >
                    <Image className="h-3 w-3 mr-1" />
                    <span>View Image</span>
                  </Button>
                </div>
              )}
            </>
          )}
          
          {/* Image Dialog */}
          <Dialog open={showImage} onOpenChange={setShowImage}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{snippet.title}</DialogTitle>
                <DialogDescription>
                  Image visualization for this snippet
                </DialogDescription>
              </DialogHeader>
              {snippet.imagePath && (
                <SnippetImage 
                  src={`/uploads/${snippet.imagePath}`} 
                  onError={handleImageError}
                  className="mt-2"
                />
              )}
              <DialogFooter className="sm:justify-start">
                <Button type="button" variant="secondary" onClick={() => setShowImage(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex flex-wrap items-center w-full gap-1 pt-0.5">
            <div className="w-full flex justify-between text-muted-foreground text-xs mb-1 pb-1 border-b border-[#65686C]" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
              <span>{snippet.votes} {snippet.votes === 1 ? 'like' : 'likes'}</span>
              <span>{snippet.commentCount || 0} {(snippet.commentCount || 0) === 1 ? 'comment' : 'comments'}</span>
            </div>
            <div className="grid grid-cols-3 w-full gap-1">
              <Button
                variant="ghost"
                onClick={() => voteMutation.mutate()}
                disabled={voteMutation.isPending}
                className={cn(
                  "h-8 px-2 flex items-center justify-center gap-1 text-[10px]",
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
                  className="h-8 text-xs px-2 flex items-center justify-center"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>Comment</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 text-xs px-2 flex items-center justify-center"
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