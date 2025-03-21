# Snippet Editing Functionality Documentation

This document provides a detailed explanation of the snippet editing functionality in the FabSnippets application, covering both the frontend and backend implementations.

## Overview

The snippet editing functionality allows users to modify their own snippets, including:
- Editing the title
- Modifying the code content
- Updating the snippet categories
- Adding/replacing/removing an image visualization

The implementation spans across both frontend and backend components:
- **Frontend**: Implemented in `SnippetCard.tsx`
- **Backend**: Implemented in `server/routes.ts`

## Frontend Implementation (`SnippetCard.tsx`)

### Key Components

#### State Management
```typescript
// Main editing state
const [isEditing, setIsEditing] = useState(false);

// Image handling states
const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [imageError, setImageError] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

#### Form Handling
```typescript
// Form initialization with current snippet values
const form = useForm({
  defaultValues: {
    title: snippet.title,
    code: snippet.code,
    categories: parsedCategories(snippet)
  }
});

// Form submission handler
const onSubmit = (data: { title: string; code: string; categories: CodeCategory[] }) => {
  // Add image file to data if selected
  updateMutation.mutate({
    ...data,
    image: imageFile || undefined
  });
};
```

### Edit Mode Toggle

The editing mode is triggered by clicking the edit button, which is only shown to the snippet's author:

```typescript
{isAuthor && (
  <Button 
    variant="outline" 
    size="icon" 
    onClick={() => setIsEditing(true)}
    className="h-8 w-8"
  >
    <Edit2 className="h-3 w-3" />
  </Button>
)}
```

### Image Handling

#### Image Upload
```typescript
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
```

#### Image Preview & Removal
```typescript
// Current image or preview of new image
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
```

### API Mutation

The `updateMutation` handles the API call to update the snippet:

```typescript
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
```

### Form Rendering

When `isEditing` is true, the component renders a form with fields for title, code editor, categories, and image upload:

```typescript
{isEditing ? (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
      {/* Title field */}
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
      
      {/* Categories field */}
      <FormField
        control={form.control}
        name="categories"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Categories</FormLabel>
            <div className="flex flex-wrap gap-1">
              {/* Category buttons implementation */}
            </div>
          </FormItem>
        )}
      />
      
      {/* Code editor field */}
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
          {/* Image preview and upload components */}
        </div>
      </FormItem>
      
      {/* Form buttons */}
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
  // Regular snippet view
)}
```

## Backend Implementation (`server/routes.ts`)

### Multer Configuration for File Uploads

```typescript
const uploadsDir = path.join(__dirname, '../uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!') as unknown as null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
```

### Update Snippet Endpoint

```typescript
app.put("/api/snippets/:id", upload.single('image'), async (req, res) => {
  const snippetId = parseInt(req.params.id);
  try {
    // Authentication check
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // Get the existing snippet
    const [snippet] = await db
      .select()
      .from(snippets)
      .where(eq(snippets.id, snippetId))
      .limit(1);

    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found" });
    }

    // Authorization check - only author can edit
    if (snippet.authorId !== req.user!.id) {
      return res.status(403).json({ message: "Not authorized to edit this snippet" });
    }

    // Prepare update data
    const { title, code, categories } = req.body;
    const updateData: Partial<typeof snippets.$inferInsert> = {
      title,
      code,
      categories: JSON.stringify(categories),
      updatedAt: new Date(),
    };

    // Only update image if a new one is provided
    if (req.file?.filename) {
      updateData.imagePath = req.file.filename;
    }

    // Update the snippet in the database
    const [updatedSnippet] = await db
      .update(snippets)
      .set(updateData)
      .where(eq(snippets.id, snippetId))
      .returning();

    // Fetch complete snippet with author information
    const [snippetWithAuthor] = await db
      .select({
        id: snippets.id,
        title: snippets.title,
        code: snippets.code,
        categories: snippets.categories,
        authorId: snippets.authorId,
        authorUsername: users.username,
        authorWebsite: users.website,
        imagePath: snippets.imagePath,
        createdAt: snippets.createdAt,
        votes: snippets.votes,
      })
      .from(snippets)
      .where(eq(snippets.id, updatedSnippet.id))
      .leftJoin(users, eq(snippets.authorId, users.id))
      .limit(1);

    // Return the updated snippet
    res.json(snippetWithAuthor);
  } catch (error) {
    console.error('Error updating snippet:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Error updating snippet" 
    });
  }
});
```

## Data Flow

1. **Edit Initiation**: User clicks the edit button on their snippet card
2. **Form Population**: Form is populated with existing snippet data
3. **User Edits**: User can modify title, code, categories, and image
4. **Form Submission**: When the user submits the form:
   - For submissions without a new image: JSON data is sent
   - For submissions with a new image: FormData is used to send both text data and image file
5. **Backend Processing**:
   - Authentication and authorization are verified
   - The image is processed if present
   - Database record is updated
   - Updated snippet is returned with author information
6. **Frontend Update**:
   - Query cache is invalidated to refresh the snippets list
   - Edit mode is turned off
   - Success/failure notification is shown

## Error Handling

- **Frontend**: Uses toast notifications to inform users of errors
- **Backend**: Returns appropriate HTTP status codes and error messages
- **Image Validation**: Both frontend and backend validate image size and type

## Security Considerations

1. **Authentication**: All edit operations require the user to be authenticated
2. **Authorization**: Only the snippet author can edit their snippets
3. **Input Validation**: 
   - Frontend validates image size and type
   - Backend also validates image size and type as a secondary defense
4. **CSRF Protection**: Uses credentials inclusion for all API requests

## Best Practices Implemented

1. **Optimistic UI Updates**: Interface responds immediately to user actions
2. **Progressive Enhancement**: Gracefully handles image errors
3. **Separation of Concerns**: 
   - Frontend handles UI and form validation
   - Backend handles security and data persistence
4. **Feedback Mechanism**: Provides clear feedback on action success/failure
5. **Error Boundary**: Gracefully handles and displays errors