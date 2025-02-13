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
import { cn } from "@/lib/utils";

const categories: CodeCategory[] = ['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery'];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  code: z.string().min(1, "Code is required"),
  categories: z.array(z.enum(['Prompt', 'TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery'])).min(1, "Select at least one category"),
  image: z.instanceof(File).optional()
});

type FormValues = z.infer<typeof formSchema>;

export function NewSnippetModal() {
  const [open, setOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      code: '',
      categories: []
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('code', values.code);
      values.categories.forEach((category, index) => {
        formData.append(`categories[${index}]`, category);
      });
      if (values.image) {
        formData.append('image', values.image);
      }

      const res = await fetch('/api/snippets', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/snippets'] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Your code snippet has been shared!"
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Submit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-base">Submit Snippet</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-3">
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
                          className="w-full justify-between"
                        >
                          {field.value.length > 0
                            ? `${field.value.length} categories selected`
                            : "Select categories..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
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
                              {category}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.value?.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => {
                          field.onChange(field.value.filter((val) => val !== category));
                        }}
                      >
                        {category} ×
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
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
                    <CodeEditor {...field} className="min-h-[200px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Image (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onChange(file);
                          toast({
                            title: "Image selected",
                            description: `Selected ${file.name}`
                          });
                        }
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}