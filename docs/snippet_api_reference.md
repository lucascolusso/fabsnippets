# Snippet API Reference

This document provides a reference for all API endpoints related to snippet management in the FabSnippets application.

## Authentication

All creation, modification, and deletion operations require authentication. Include credentials in your requests:

```javascript
fetch('/api/snippets', {
  credentials: 'include'
  // other options...
})
```

## Endpoints

### List Snippets

Retrieves a list of all snippets, optionally filtered by category.

**URL**: `/api/snippets`  
**Method**: `GET`  
**Authentication**: Optional  
**Query Parameters**:
- `category` (optional): Filter by category (e.g., `/api/snippets?category=SQL`)

**Success Response**:
```json
[
  {
    "id": 123,
    "title": "SQL Join Example",
    "code": "SELECT * FROM users u JOIN orders o ON u.id = o.user_id",
    "categories": ["SQL"],
    "authorId": 456,
    "authorUsername": "johndoe",
    "authorWebsite": "https://example.com",
    "createdAt": "2023-03-15T12:30:45Z",
    "votes": 5,
    "commentCount": 2
  },
  // ...more snippets
]
```

### Get Single Snippet

Retrieves a single snippet by ID.

**URL**: `/api/snippets/:id`  
**Method**: `GET`  
**Authentication**: Optional  
**Parameters**:
- `id`: Snippet ID (URL parameter)

**Success Response**:
```json
{
  "id": 123,
  "title": "SQL Join Example",
  "code": "SELECT * FROM users u JOIN orders o ON u.id = o.user_id",
  "categories": ["SQL"],
  "authorId": 456,
  "authorUsername": "johndoe",
  "authorWebsite": "https://example.com",
  "createdAt": "2023-03-15T12:30:45Z",
  "votes": 5,
  "comments": [
    {
      "id": 789,
      "content": "Great snippet, thanks!",
      "createdAt": "2023-03-16T09:15:30Z",
      "authorId": 101,
      "authorUsername": "alice"
    }
    // ...more comments
  ]
}
```

### Create Snippet

Creates a new snippet.

**URL**: `/api/snippets`  
**Method**: `POST`  
**Authentication**: Required  
**Content-Type**: `application/json`  
**Request Body**:
```json
{
  "title": "My New Snippet",
  "code": "console.log('Hello World');",
  "categories": ["JavaScript"]
}
```

**Success Response**:
```json
{
  "id": 124,
  "title": "My New Snippet",
  "code": "console.log('Hello World');",
  "categories": ["JavaScript"],
  "authorId": 456,
  "authorUsername": "johndoe",
  "createdAt": "2023-03-17T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Not logged in

### Update Snippet

Updates an existing snippet.

**URL**: `/api/snippets/:id`  
**Method**: `PUT`  
**Authentication**: Required (must be snippet author)  
**Content-Type**: `application/json`  
**Parameters**:
- `id`: Snippet ID (URL parameter)

**Request Body**:
```json
{
  "title": "Updated Snippet Title",
  "code": "const newCode = 'Updated code';",
  "categories": ["JavaScript", "Node.js"]
}
```

**Success Response**:
```json
{
  "id": 124,
  "title": "Updated Snippet Title",
  "code": "const newCode = 'Updated code';",
  "categories": ["JavaScript", "Node.js"],
  "authorId": 456,
  "authorUsername": "johndoe",
  "createdAt": "2023-03-17T10:00:00Z",
  "updatedAt": "2023-03-17T11:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Not logged in
- `403 Forbidden`: Not the snippet author
- `404 Not Found`: Snippet does not exist

### Delete Snippet

Deletes a snippet.

**URL**: `/api/snippets/:id`  
**Method**: `DELETE`  
**Authentication**: Required (must be snippet author or admin)  
**Parameters**:
- `id`: Snippet ID (URL parameter)

**Success Response**:
```json
{
  "message": "Snippet deleted successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Not logged in
- `403 Forbidden`: Not the snippet author or admin
- `404 Not Found`: Snippet does not exist

### Vote on Snippet

Adds or removes a vote for a snippet.

**URL**: `/api/snippets/:id/vote`  
**Method**: `POST`  
**Authentication**: Required  
**Parameters**:
- `id`: Snippet ID (URL parameter)

**Success Response**:
```json
{
  "votes": 6,
  "userVoted": true
}
```

**Error Responses**:
- `401 Unauthorized`: Not logged in
- `404 Not Found`: Snippet does not exist

### Get User's Vote Status

Checks if the current user has voted for a specific snippet.

**URL**: `/api/snippets/:id/vote-status`  
**Method**: `GET`  
**Authentication**: Required  
**Parameters**:
- `id`: Snippet ID (URL parameter)

**Success Response**:
```json
{
  "voted": true
}
```

**Error Responses**:
- `401 Unauthorized`: Not logged in
- `404 Not Found`: Snippet does not exist

### Add Comment

Adds a comment to a snippet.

**URL**: `/api/snippets/:id/comments`  
**Method**: `POST`  
**Authentication**: Required  
**Content-Type**: `application/json`  
**Parameters**:
- `id`: Snippet ID (URL parameter)

**Request Body**:
```json
{
  "content": "This is a great snippet! Thanks for sharing."
}
```

**Success Response**:
```json
{
  "id": 790,
  "content": "This is a great snippet! Thanks for sharing.",
  "createdAt": "2023-03-18T14:20:10Z",
  "authorId": 456,
  "authorUsername": "johndoe"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Not logged in
- `404 Not Found`: Snippet does not exist

## Error Format

All API error responses follow this format:

```json
{
  "message": "Error message describing what went wrong",
  "errors": [
    "Detailed error 1",
    "Detailed error 2"
  ]
}
```

The `errors` array is optional and only included for validation errors with multiple specific issues.

## Data Structures

### Snippet

```typescript
interface Snippet {
  id: number;
  title: string;
  code: string;
  categories: string[];  
  authorId: number;
  authorUsername: string;  
  authorWebsite?: string;
  createdAt: string;
  votes: number;
  commentCount: number;
}
```

### Comment

```typescript
interface Comment {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorUsername: string;
  authorWebsite?: string;
}
```