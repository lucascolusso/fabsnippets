import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { Copy, ThumbsUp, CheckCircle2, Image, Edit2, Trash2, MessageSquare, ImageOff } from "lucide-react";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Snippet, CodeCategory } from "@/lib/types";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: async (data: { title: string; code: string; categories: CodeCategory[]; image?: File }) => {
      // Use FormData if there's an image to upload
      if (data.image) {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('code', data.code);
        
        // Categories need to be added as individual items
        data.categories.forEach(category => {
          formData.append('categories[]', category);
        });
        
        // Add the image file
        formData.append('image', data.image);
        
        const res = await fetch(`/api/snippets/${snippet.id}`, {
          method: "PUT",
          credentials: "include",
          body: formData
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      } else {
        // If no image, use JSON as before
        const res = await fetch(`/api/snippets/${snippet.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }
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

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file is an image and size is reasonable
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setImageFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle removing the image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Reset image state when editing is cancelled
  const handleCancelEdit = () => {
    setIsEditing(false);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: { title: string; code: string; categories: CodeCategory[] }) => {
    // Add image file to data if selected
    updateMutation.mutate({
      ...data,
      image: imageFile || undefined
    });
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
                    {category}
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
                      <FormLabel className="text-sm">Code</FormLabel>
                      <FormControl>
                        <CodeEditor {...field} className="code-snippet-editor" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Image upload section */}
                <FormItem className="mt-2">
                  <FormLabel className="text-sm">Image</FormLabel>
                  <div className="space-y-2">
                    {/* Current image or preview of new image */}
                    {(imagePreview || (!imageError && snippet.imagePath && !imageFile)) && (
                      <div className="relative w-full max-h-[200px] overflow-hidden rounded-md border">
                        <img
                          src={imagePreview || (snippet.imagePath && `/uploads/${snippet.imagePath}`)}
                          alt="Snippet visualization"
                          className="w-full object-contain"
                          style={{ maxHeight: "200px" }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 rounded-full p-0"
                          onClick={handleRemoveImage}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Image upload button */}
                    {!imagePreview && (!snippet.imagePath || imageError || imageFile === null) && (
                      <div className="flex items-center gap-2">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*"
                          className="text-sm h-9"
                        />
                        <div className="text-sm text-muted-foreground">
                          Upload an image visualization (max 5MB)
                        </div>
                      </div>
                    )}
                  </div>
                </FormItem>
                
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
              
              {/* We now have the image button in the action bar */}
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
                  src={snippet.imagePath} 
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
            <div className={cn("grid w-full gap-1", 
              snippet.imagePath && !imageError ? "grid-cols-3" : "grid-cols-2")}>
              {snippet.imagePath && !imageError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImage(true)}
                  className="h-8 text-xs px-2 flex items-center justify-center"
                >
                  <Image className="h-3 w-3 mr-1" />
                  <span>View image</span>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => voteMutation.mutate()}
                disabled={voteMutation.isPending}
                className={cn(
                  "h-8 px-2 flex items-center justify-center gap-1 text-xs",
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