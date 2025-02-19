import express, { type Express, Request } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { snippets, votes, users, comments } from "@db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { createBackup, restoreFromBackup } from '../scripts/dbBackup';
import { setupAuth } from './auth';

// Extend Express Request type to include user property
declare module 'express' {
  interface Request {
    user?: {
      id: number;
      username: string;
      email?: string;
      website?: string;
    };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');

// Initialize directories
async function initializeDirectories() {
  try {
    await fsPromises.access(uploadsDir);
  } catch {
    await fsPromises.mkdir(uploadsDir, { recursive: true });
  }
}

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

export function registerRoutes(app: Express): Server {
  // Initialize directories before setting up routes
  initializeDirectories().catch(console.error);

  // Setup authentication
  setupAuth(app);

  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));

  const httpServer = createServer(app);

  // Create tables if they don't exist
  db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      code TEXT NOT NULL,
      category TEXT,
      categories TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id),
      image_path TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      votes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      snippet_id INTEGER NOT NULL REFERENCES snippets(id),
      user_id INTEGER,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(snippet_id, user_id, ip_address)
    );

    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        snippetId INTEGER NOT NULL REFERENCES snippets(id),
        authorId INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Backup Management Routes
  app.get("/api/backups", async (_req, res) => {
    try {
      const backupDir = path.join(__dirname, '../backups');

      // Ensure backup directory exists
      try {
        await fsPromises.access(backupDir);
      } catch {
        await fsPromises.mkdir(backupDir, { recursive: true });
        return res.json([]); // Return empty array if directory was just created
      }

      const files = await fsPromises.readdir(backupDir);
      const backupFiles = await Promise.all(
        files
          .filter(file => file.startsWith('backup-') && file.endsWith('.zip'))
          .map(async (filename) => {
            const filePath = path.join(backupDir, filename);
            const stats = await fsPromises.stat(filePath);
            return {
              filename,
              timestamp: new Date(stats.birthtime).toISOString(),
              size: stats.size
            };
          })
      );

      // Sort by timestamp descending (most recent first)
      backupFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      res.json(backupFiles);
    } catch (error) {
      console.error('Error listing backups:', error);
      res.status(500).json({ message: 'Failed to list backups' });
    }
  });

  app.post("/api/backups", async (_req, res) => {
    try {
      console.log('Starting backup creation...');
      const backupPath = await createBackup();
      console.log('Backup created successfully at:', backupPath);
      res.json({ message: 'Backup created successfully', path: backupPath });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ 
        message: 'Failed to create backup',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/backups/restore/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const backupDir = path.join(__dirname, '../backups');
      const backupPath = path.join(backupDir, filename);

      // Security check: ensure the file exists and is within backups directory
      await fsPromises.access(backupPath);

      await restoreFromBackup(backupPath);
      res.json({ message: 'Database restored successfully' });
    } catch (error) {
      console.error('Error restoring backup:', error);
      res.status(500).json({ 
        message: 'Failed to restore backup',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/backups/download/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const backupDir = path.join(__dirname, '../backups');
      const filePath = path.join(backupDir, filename);

      // Security check: ensure the file exists and is within backups directory
      await fsPromises.access(filePath);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      // Create read stream and pipe to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading backup:', error);
      res.status(500).json({ 
        message: 'Failed to download backup',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });


  app.post("/api/snippets", upload.single('image'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not logged in" });
      }

      const { title, code, categories } = req.body;

      // Basic validation
      const validationErrors = {};
      if (!title) validationErrors.title = "Title is required";
      if (!code) validationErrors.code = "Code is required";
      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        validationErrors.categories = "At least one category is required";
      }

      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: validationErrors
        });
      }

      const imagePath = req.file?.filename;

      // Store categories as JSON string
      const [newSnippet] = await db.insert(snippets).values({
        title,
        code,
        category: Array.isArray(categories) ? categories[0] : null, // Store first category in old field
        categories: JSON.stringify(categories), // Store all categories as JSON
        authorId: req.user!.id,
        imagePath,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Fetch the complete snippet with author information
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
        .where(eq(snippets.id, newSnippet.id))
        .leftJoin(users, eq(snippets.authorId, users.id))
        .limit(1);

      res.json(snippetWithAuthor);
    } catch (error) {
      console.error('Error creating snippet:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error creating snippet"
      });
    }
  });

  // Get all snippets with search
  app.get("/api/snippets", async (req, res) => {
    const { search } = req.query;
    try {
      const snippetsWithComments = await db
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
          commentCount: sql<number>`COUNT(DISTINCT ${comments.id})::integer`,
        })
        .from(snippets)
        .leftJoin(users, eq(snippets.authorId, users.id))
        .leftJoin(comments, eq(snippets.id, comments.snippetId))
        .groupBy(
          snippets.id,
          snippets.title,
          snippets.code,
          snippets.categories,
          snippets.authorId,
          users.username,
          users.website,
          snippets.imagePath,
          snippets.createdAt,
          snippets.votes
        )
        .orderBy(desc(snippets.createdAt));

      const allSnippets = await snippetsWithComments;

      if (search) {
        const searchTerm = search.toString().toLowerCase();
        const filtered = allSnippets.filter(snippet => {
          const title = snippet.title?.toLowerCase() || '';
          const code = snippet.code?.toLowerCase() || '';
          const author = snippet.authorUsername?.toLowerCase() || '';
          let categories: string[] = [];

          try {
            // Handle both string and array formats for categories
            if (typeof snippet.categories === 'string') {
              categories = JSON.parse(snippet.categories);
            } else if (Array.isArray(snippet.categories)) {
              categories = snippet.categories;
            }
          } catch (e) {
            console.error('Error parsing categories:', e);
            categories = [];
          }

          const categoriesString = categories.join(' ').toLowerCase();

          return title.includes(searchTerm) ||
                 code.includes(searchTerm) ||
                 author.includes(searchTerm) ||
                 categoriesString.includes(searchTerm);
        });
        return res.json(filtered);
      }

      res.json(allSnippets);
    } catch (error) {
      console.error('Error fetching snippets:', error);
      res.status(500).json({ message: 'Error fetching snippets' });
    }
  });

  // Get single snippet
  app.get("/api/snippets/:id", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    try {
      const [snippet] = await db
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
          commentCount: sql<number>`COUNT(DISTINCT ${comments.id})::integer`,
        })
        .from(snippets)
        .where(eq(snippets.id, snippetId))
        .leftJoin(users, eq(snippets.authorId, users.id))
        .leftJoin(comments, eq(snippets.id, comments.snippetId))
        .groupBy(
          snippets.id,
          snippets.title,
          snippets.code,
          snippets.categories,
          snippets.authorId,
          users.username,
          users.website,
          snippets.imagePath,
          snippets.createdAt,
          snippets.votes
        )
        .limit(1);

      if (!snippet) {
        return res.status(404).json({ message: "Snippet not found" });
      }

      res.json(snippet);
    } catch (error) {
      console.error('Error fetching snippet:', error);
      res.status(500).json({ message: 'Error fetching snippet' });
    }
  });

  // Vote for a snippet
  app.post("/api/snippets/:id/vote", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    const ipAddress = req.ip;

    try {
      // Get user ID if authenticated
      const userId = req.isAuthenticated() ? req.user!.id : null;

      // Check if already voted based on either user ID or IP, for this specific snippet
      const existingVote = await db.query.votes.findFirst({
        where: (votes) => {
          const conditions = [eq(votes.snippetId, snippetId)];
          if (userId) {
            conditions.push(eq(votes.userId, userId));
          } else {
            conditions.push(eq(votes.ipAddress, ipAddress));
          }
          return and(...conditions);
        }
      });

      if (existingVote) {
        return res.status(400).json({ message: "You have already voted for this snippet" });
      }

      await db.transaction(async (tx) => {
        // Insert the vote with either userId or ipAddress
        await tx.insert(votes).values({
          snippetId,
          userId: userId || undefined,
          ipAddress: userId ? undefined : ipAddress
        });

        // Increment the votes count
        await tx
          .update(snippets)
          .set({ votes: sql`${snippets.votes} + 1` })
          .where(eq(snippets.id, snippetId));
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error recording vote:', error);
      res.status(500).json({ 
        message: error instanceof Error 
          ? error.message 
          : 'Error recording vote. Please try again.'
      });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    const { category } = req.query;
    try {
      const query = db
        .select({
          id: snippets.id,
          title: snippets.title,
          code: snippets.code,
          categories: snippets.categories,
          category: snippets.category, // Include both for backward compatibility
          authorId: snippets.authorId,
          authorUsername: users.username,
          authorWebsite: users.website,
          imagePath: snippets.imagePath,
          createdAt: snippets.createdAt,
          votes: snippets.votes,
        })
        .from(snippets)
        .leftJoin(users, eq(snippets.authorId, users.id))
        .orderBy(desc(snippets.votes));

      let results = await query;

      // Transform categories to ensure consistent array format
      results = results.map(snippet => ({
        ...snippet,
        categories: (() => {
          try {
            if (snippet.categories) {
              // If it's already a JSON string, parse it
              if (typeof snippet.categories === 'string') {
                return JSON.parse(snippet.categories);
              }
              // If it's already an array, use it
              if (Array.isArray(snippet.categories)) {
                return snippet.categories;
              }
            }
            // Fallback to legacy category field if exists
            return snippet.category ? [snippet.category] : [];
          } catch (e) {
            console.error('Error parsing categories for snippet:', snippet.id, e);
            // Fallback to single category if parsing fails
            return snippet.category ? [snippet.category] : [];
          }
        })()
      }));

      if (category && typeof category === 'string') {
        const filteredSnippets = results.filter(snippet => 
          snippet.categories.includes(category.toUpperCase())
        );
        return res.json(filteredSnippets);
      }

      res.json(results);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'Error fetching leaderboard' });
    }
  });

  // Get author details and snippets
  app.get("/api/authors/:name", async (req, res) => {
    const authorName = req.params.name;
    try {
      // First get the author's user record
      const [author] = await db
        .select()
        .from(users)
        .where(eq(users.username, authorName))
        .limit(1);

      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }

      // Get all snippets by the author
      const authorSnippets = await db
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
        .leftJoin(users, eq(snippets.authorId, users.id))
        .where(eq(snippets.authorId, author.id))
        .orderBy(desc(snippets.createdAt));

      // Calculate leaderboard positions
      const categories = ['TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery', 'all'];
      const leaderboards = await Promise.all(
        categories.map(async (category) => {
          const query = db
            .select({
              id: snippets.id,
              authorId: snippets.authorId,
              votes: snippets.votes,
            })
            .from(snippets)
            .orderBy(desc(snippets.votes));

          const board = category === 'all'
            ? await query
            : await query.where(eq(snippets.categories, category));

          const position = board.findIndex(s => s.authorId === author.id) + 1;
          return { category, position: position || null };
        })
      );

      res.json({ snippets: authorSnippets, leaderboards });
    } catch (error) {
      console.error('Error fetching author details:', error);
      res.status(500).json({ message: 'Error fetching author details' });
    }
  });

  // Update snippet
  app.put("/api/snippets/:id", upload.single('image'), async (req, res) => {
    const snippetId = parseInt(req.params.id);
    try {
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

      // Check if user is the author
      if (snippet.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to edit this snippet" });
      }

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

      res.json(snippetWithAuthor);
    } catch (error) {
      console.error('Error updating snippet:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error updating snippet" 
      });
    }
  });

  // Delete snippet
  app.delete("/api/snippets/:id", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    try {
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

      // Check if user is the author
      if (snippet.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this snippet" });
      }

      // Delete the snippet
      await db.delete(snippets).where(eq(snippets.id, snippetId));

      res.json({ message: "Snippet deleted successfully" });
    } catch (error) {
      console.error('Error deleting snippet:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error deleting snippet" 
      });
    }
  });

  // Get comments for a snippet
  app.get("/api/snippets/:id/comments", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    try {
      const snippetComments = await db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          authorId: comments.authorId,
          authorUsername: users.username,
          authorWebsite: users.website,
        })
        .from(comments)
        .where(eq(comments.snippetId, snippetId))
        .leftJoin(users, eq(comments.authorId, users.id))
        .orderBy(desc(comments.createdAt));

      res.json(snippetComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Error fetching comments' });
    }
  });

  // Add a new comment
  app.post("/api/snippets/:id/comments", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    const { content } = req.body;

    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Must be logged in to comment" });
      }

      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      // Create the comment
      const [newComment] = await db
        .insert(comments)
        .values({
          content,
          snippetId,
          authorId: req.user!.id,
          createdAt: new Date(),
        })
        .returning();

      // Fetch the complete comment with author information
      const [commentWithAuthor] = await db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          authorId: comments.authorId,
          authorUsername: users.username,
          authorWebsite: users.website,
        })
        .from(comments)
        .where(eq(comments.id, newComment.id))
        .leftJoin(users, eq(comments.authorId, users.id))
        .limit(1);

      res.status(201).json(commentWithAuthor);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error creating comment" 
      });
    }
  });

  return httpServer;
}