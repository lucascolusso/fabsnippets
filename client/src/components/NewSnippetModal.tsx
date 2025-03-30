/**
 * NewSnippetModal Component
 * 
 * This component provides a modal dialog for users to create and submit new code snippets.
 * 
 * Architecture Overview:
 * ---------------------
 * The component follows a form-based architecture with the following key aspects:
 * 
 * 1. Data Flow:
 *    - User input → form validation (Zod) → API request (JSON) → server processing → database storage
 * 
 * 2. State Management:
 *    - Local component state: Manages modal visibility and category selector state
 *    - Form state: Handled by react-hook-form with Zod schema validation
 *    - Server state: Managed by React Query for mutations and cache invalidation
 * 
 * 3. UI Components:
 *    - Uses shadcn/ui components for consistent styling and accessibility
 *    - Custom CodeEditor component for syntax highlighting and code input
 *    - Multi-select category system with badges for visual feedback
 * 
 * 4. API Integration:
 *    - Submits form data as JSON to '/api/snippets' endpoint
 *    - Uses credentials: 'include' for authentication
 *    - Implements proper error handling with user feedback via toast notifications
 * 
 * Form Submission Process:
 * -----------------------
 * 1. User fills out the form (title, code, categories)
 * 2. On submit, form data is validated against the Zod schema
 * 3. Valid data is sent as JSON to the server via a POST request
 * 4. On success: 
 *    - The snippets query cache is invalidated to refresh the list
 *    - The modal is closed
 *    - The form is reset
 *    - A success toast is displayed
 * 5. On error:
 *    - An error toast is displayed with the error message
 *    - The form remains open for correction
 * 
 * Future Enhancement Considerations:
 * ---------------------------------
 * - If adding file attachments, use FormData instead of JSON and multipart/form-data content type
 * - For more complex forms, consider breaking into sub-components or multi-step wizard
 * - For offline support, consider adding optimistic updates and background sync
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import type { CodeCategory } from "@/lib/types";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, getCategoryDisplayName } from "@/lib/utils";

/**
 * Available code categories for snippet classification
 * When adding a new category:
 * 1. Add it to this array
 * 2. Update the CodeCategory type in lib/types.ts
 * 3. Update the validation schema below
 * 4. Add display name mapping in utils.ts getCategoryDisplayName function
 */
const categories: CodeCategory[] = ['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery', 'C#'];

/**
 * Form validation schema using Zod
 * Defines validation rules and error messages for the snippet creation form
 */
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  code: z.string().min(1, "Code is required"),
  categories: z.array(z.enum(['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery', 'C#']))
    .min(1, "Select at least one category")
});

/**
 * Type representing the form values derived from the Zod schema
 */
type FormValues = z.infer<typeof formSchema>;

export function NewSnippetModal() {
  // Local state for modal and category selector visibility
  const [open, setOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState(false);
  
  // React Query client for cache management
  const queryClient = useQueryClient();

  /**
   * Form initialization with react-hook-form
   * Uses Zod resolver for validation and sets default empty values
   */
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      code: '',
      categories: []
    }
  });

  /**
   * Mutation hook for submitting new snippets
   * Handles the API request, success and error states
   */
  const mutation = useMutation({
    // API request function
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: values.title,
          code: values.code,
          categories: values.categories
        }),
        credentials: 'include' // Includes auth cookies for authentication
      });
      
      // Handle non-OK responses
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create snippet');
      }
      
      return res.json();
    },
    
    // Success handler
    onSuccess: () => {
      // Invalidate and refetch snippets list to show the new item
      queryClient.invalidateQueries({ queryKey: ['/api/snippets'] });
      
      // Reset UI state
      setOpen(false);
      form.reset();
      
      // Notify user
      toast({
        title: "Success",
        description: "Your code snippet has been shared!"
      });
    },
    
    // Error handler
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger button to open the modal */}
      <DialogTrigger asChild>
        <Button className="h-10 text-base">Submit</Button>
      </DialogTrigger>
      
      {/* Modal content */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Submit Snippet</DialogTitle>
        </DialogHeader>
        
        {/* Snippet submission form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-3">
            {/* Title field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter a descriptive title..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categories field with multi-select */}
            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <Popover open={openCategories} onOpenChange={setOpenCategories}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCategories}
                          className="w-full justify-between h-10 text-base"
                        >
                          {field.value.length > 0
                            ? `${field.value.length} categories selected`
                            : "Select categories..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    
                    {/* Category selection dropdown */}
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search categories..." />
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {categories.map((category) => (
                            <CommandItem
                              key={category}
                              value={category}
                              onSelect={() => {
                                // Toggle category selection
                                const currentValue = field.value || [];
                                const newValue = currentValue.includes(category)
                                  ? currentValue.filter((val) => val !== category)
                                  : [...currentValue, category];
                                field.onChange(newValue);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value?.includes(category) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {getCategoryDisplayName(category)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Selected categories as removable badges */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.value?.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="cursor-pointer text-sm py-1.5 px-2.5"
                        onClick={() => {
                          field.onChange(field.value.filter((val) => val !== category));
                        }}
                      >
                        {getCategoryDisplayName(category)} ×
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code editor field */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <CodeEditor {...field} className="min-h-[200px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit button */}
            <Button type="submit" disabled={mutation.isPending} className="w-full h-10 text-base">
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}