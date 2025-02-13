import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { snippets, votes, users } from "@db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { createBackup, restoreFromBackup } from '../scripts/dbBackup';
import { setupAuth } from './auth';

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
      category VARCHAR(20) NOT NULL,
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


  // Create new snippet with image upload
  app.post("/api/snippets", upload.single('image'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not logged in" });
      }

      const { title, code, category } = req.body;

      // Validate required fields
      if (!title || !code || !category) {
        return res.status(400).json({ 
          message: "Missing required fields", 
          details: {
            title: !title ? "Title is required" : null,
            code: !code ? "Code is required" : null,
            category: !category ? "Category is required" : null
          }
        });
      }

      const imagePath = req.file?.filename;

      const [newSnippet] = await db.insert(snippets).values({
        title,
        code,
        category,
        authorId: req.user.id,
        imagePath
      }).returning();

      // Fetch the complete snippet with author information
      const [snippetWithAuthor] = await db
        .select({
          id: snippets.id,
          title: snippets.title,
          code: snippets.code,
          category: snippets.category,
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
      const query = db
        .select({
          ...snippets,
          authorUsername: users.username,
          authorWebsite: users.website
        })
        .from(snippets)
        .leftJoin(users, eq(snippets.authorId, users.id))
        .orderBy(desc(snippets.createdAt));

      const allSnippets = await query;

      if (search) {
        const searchTerm = search.toString().toLowerCase();
        const filtered = allSnippets.filter(snippet => 
          snippet.title.toLowerCase().includes(searchTerm) ||
          snippet.code.toLowerCase().includes(searchTerm) ||
          snippet.authorUsername.toLowerCase().includes(searchTerm) ||
          snippet.category.toLowerCase().includes(searchTerm)
        );
        return res.json(filtered);
      }

      res.json(allSnippets);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching snippets' });
    }
  });

  // Vote for a snippet
  app.post("/api/snippets/:id/vote", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    const ipAddress = req.ip;

    try {
      // Get user ID if authenticated
      const userId = req.isAuthenticated() ? req.user.id : null;

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

  // Get single snippet
  app.get("/api/snippets/:id", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    try {
      const [snippet] = await db
        .select({
          ...snippets,
          authorUsername: users.username,
          authorWebsite: users.website
        })
        .from(snippets)
        .where(eq(snippets.id, snippetId))
        .leftJoin(users, eq(snippets.authorId, users.id))
        .limit(1);

      if (!snippet) {
        return res.status(404).json({ message: "Snippet not found" });
      }

      res.json(snippet);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching snippet' });
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
          category: snippets.category,
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

      if (category && typeof category === 'string') {
        const filteredSnippets = await query.where(eq(snippets.category, category));
        return res.json(filteredSnippets);
      }

      const allSnippets = await query;
      res.json(allSnippets);
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
          category: snippets.category,
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
            : await query.where(eq(snippets.category, category));

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
      if (snippet.authorId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to edit this snippet" });
      }

      const { title, code, category } = req.body;
      const updateData: Partial<typeof snippets.$inferInsert> = {
        title,
        code,
        category,
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
          category: snippets.category,
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

  return httpServer;
}