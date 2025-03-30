# Snippet Submission Architecture

This document provides a comprehensive overview of the snippet submission process in the FabSnippets application, covering both frontend and backend components.

## System Architecture

The snippet submission process follows a standard client-server architecture with the following components:

```
+----------------+    HTTP POST    +----------------+    SQL INSERT    +----------------+
|                |    JSON Data    |                |                  |                |
|   Frontend     +---------------→ |    Backend     +---------------→ |    Database    |
|  React + Zod   |                 |    Express     |                 |   PostgreSQL   |
|                | ←---------------+                | ←---------------+                |
+----------------+    Response     +----------------+    Data Return  +----------------+
```

## Frontend Implementation

### Key Components

1. **NewSnippetModal.tsx**: Main component handling the form UI and submission
2. **CodeEditor.tsx**: Custom component for code input with syntax styling
3. **Form Validation**: Zod schema validation ensures data integrity

### Data Flow

1. User fills out form (title, code snippets, categories)
2. Form data is validated using Zod schema
3. Valid data is submitted as JSON to the backend
4. Response handling presents success/error feedback to user

### State Management

- **Local State**: UI state like modal visibility
- **Form State**: Handled by react-hook-form
- **Server State**: Managed by React Query (mutations, cache invalidation)

## Backend Implementation

### API Endpoint

The backend exposes a RESTful endpoint at `/api/snippets` that:

1. Authenticates the user using Passport.js/express-session
2. Validates incoming data
3. Stores snippet in PostgreSQL database using Drizzle ORM
4. Returns the created snippet with author information

### Code Structure

```typescript
// POST /api/snippets endpoint in server/routes.ts
app.post("/api/snippets", async (req, res) => {
  // Authentication check
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    // Data validation
    const result = insertSnippetSchema.safeParse({
      ...req.body,
      authorId: req.user.id
    });
    
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: result.error.issues.map(i => i.message)
      });
    }
    
    // Database insertion
    const [newSnippet] = await db
      .insert(snippets)
      .values(result.data)
      .returning();
      
    // Return the snippet with author info
    return res.json({
      ...newSnippet,
      authorUsername: req.user.username
    });
  } catch (error) {
    console.error("Error creating snippet:", error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to create snippet" 
    });
  }
});
```

## Database Schema

Snippet data is stored in the PostgreSQL database using the following schema (defined in `db/schema.ts`):

```typescript
export const snippets = pgTable("snippets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  categories: jsonb("categories").$type<CodeCategory[]>(),
  authorId: integer("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## Authentication Flow

1. User must be logged in to submit snippets
2. Authentication is managed by Passport.js and express-session
3. Session cookies are included in API requests with `credentials: 'include'`
4. User info is attached to request object by Passport middleware

## Error Handling

1. **Frontend Validation**: Zod schema catches invalid data before submission
2. **API Validation**: Server-side validation provides second layer of protection
3. **Database Constraints**: SQL constraints prevent invalid data storage
4. **Error Responses**: Structured error messages guide user to fix input issues
5. **Toast Notifications**: UI feedback for success/failure states

## Adding New Features

When extending the snippet submission system:

1. **New Fields**:
   - Add field to Zod schema in NewSnippetModal.tsx
   - Update form component with new field UI
   - Add field to database schema in db/schema.ts
   - Run database migration to update the database

2. **New Categories**:
   - Add to categories array in NewSnippetModal.tsx
   - Update CodeCategory type in lib/types.ts
   - Add display name mapping in utils.ts

3. **Form Improvements**:
   - Consider breaking large forms into multi-step flows
   - Add field-level validation and real-time feedback
   - Implement autosave for work in progress

## Optimizations & Best Practices

1. **Performance**:
   - Use React Query for efficient cache management
   - Implement debouncing for code input to reduce re-renders

2. **User Experience**:
   - Show loading states during submission
   - Provide clear validation feedback
   - Allow editing of previously submitted snippets

3. **Security**:
   - Validate all user input on both client and server
   - Escape code content to prevent XSS attacks
   - Use authentication for all write operations

4. **Accessibility**:
   - Ensure form fields have proper labels
   - Add aria attributes for screen readers
   - Support keyboard navigation