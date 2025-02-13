import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./CodeEditor";
import { Copy, ThumbsUp, CheckCircle2, Image, Edit2, Trash2 } from "lucide-react";
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
    if (!snippet.categories) {
      // Fallback to single category if categories field is not present
      return snippet.category ? [snippet.category] : [];
    }
    const parsed = JSON.parse(snippet.categories);
    return Array.isArray(parsed) ? parsed : [];
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
    <Card className="w-full shadow-md">
      <CardContent className="p-2 space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 flex-wrap">
            <Link href={`/snippet/${snippet.id}`} className="hover:text-primary hover:underline">
              <h2 className="text-base font-semibold">{snippet.title}</h2>
            </Link>
            <div className="flex gap-1 flex-wrap">
              {parsedCategories(snippet).map((category, index) => (
                <span
                  key={`${category}-${index}`}
                  className="inline-block px-1 py-0.5 text-[10px] font-semibold rounded bg-primary/10"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isAuthor && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {isCopied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categories</FormLabel>
                    <Select onValueChange={field.onChange} multiple value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select categories" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Prompt">Prompt</SelectItem>
                        <SelectItem value="TMDL">TMDL</SelectItem>
                        <SelectItem value="DAX">DAX</SelectItem>
                        <SelectItem value="SQL">SQL</SelectItem>
                        <SelectItem value="Python">Python</SelectItem>
                        <SelectItem value="PowerQuery">PowerQuery</SelectItem>
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
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <CodeEditor {...field} className="text-[11px] h-full font-mono" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <ScrollArea className="h-[200px]">
            <div>
              <CodeEditor
                value={snippet.code}
                onChange={() => { }}
                readOnly
                className="text-[11px] h-full font-mono"
              />
            </div>
          </ScrollArea>
        )}

        <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <span>Submitted by</span>
            <Link href={`/profile/${snippet.authorUsername}`} className="underline">
              {snippet.authorUsername}
            </Link>
            <span>on {new Date(snippet.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            {snippet.imagePath && !imageError && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImage(true)}
                >
                  <Image className="h-3 w-3" />
                </Button>
                <Dialog open={showImage} onOpenChange={setShowImage}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Visualization for {snippet.title}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-hidden">
                      <img
                        src={`/uploads/${snippet.imagePath}`}
                        alt="Snippet visualization"
                        className="w-full object-contain"
                        onError={handleImageError}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => voteMutation.mutate()}
              disabled={voteMutation.isPending}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              {snippet.votes}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}