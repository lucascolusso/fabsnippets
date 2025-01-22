import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { snippets, votes } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { setupAuth } from "./auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

// Authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Authentication required");
};

export function registerRoutes(app: Express): Server {
  // Set up authentication
  setupAuth(app);

  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));

  const httpServer = createServer(app);

  // Create tables if they don't exist
  db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      password_reset_token TEXT,
      reset_token_expiry TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      code TEXT NOT NULL,
      category VARCHAR(20) NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id),
      author_name VARCHAR(100) NOT NULL,
      author_website TEXT,
      image_path TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      votes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      snippet_id INTEGER NOT NULL REFERENCES snippets(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(snippet_id, user_id)
    );
  `);

  // Create new snippet with image upload (protected route)
  app.post("/api/snippets", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { title, code, category, authorWebsite } = req.body;
      const imagePath = req.file?.filename;

      const [newSnippet] = await db.insert(snippets).values({
        title,
        code,
        category,
        authorId: req.user!.id,
        authorName: req.user!.username,
        authorWebsite,
        imagePath
      }).returning();

      res.json(newSnippet);
    } catch (error) {
      console.error('Error creating snippet:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Error creating snippet'
      });
    }
  });

  // Get all snippets with search
  app.get("/api/snippets", async (req, res) => {
    const { search } = req.query;
    try {
      const query = db.select().from(snippets).orderBy(desc(snippets.createdAt));
      const allSnippets = await query;

      if (search) {
        const searchTerm = search.toString().toLowerCase();
        const filtered = allSnippets.filter(snippet => 
          snippet.title.toLowerCase().includes(searchTerm) ||
          snippet.code.toLowerCase().includes(searchTerm) ||
          snippet.authorName.toLowerCase().includes(searchTerm) ||
          snippet.category.toLowerCase().includes(searchTerm)
        );
        return res.json(filtered);
      }

      res.json(allSnippets);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching snippets' });
    }
  });

  // Vote for a snippet (protected route)
  app.post("/api/snippets/:id/vote", requireAuth, async (req, res) => {
    const snippetId = parseInt(req.params.id);

    try {
      // Check if already voted
      const existingVote = await db.query.votes.findFirst({
        where: eq(votes.snippetId, snippetId),
        with: {
          user: true
        }
      });

      if (existingVote) {
        return res.status(400).json({ message: "Already voted" });
      }

      await db.transaction(async (tx) => {
        // Insert the vote
        await tx.insert(votes).values({
          snippetId,
          userId: req.user!.id
        });

        // Increment the votes count
        await tx
          .update(snippets)
          .set({ votes: sql`${snippets.votes} + 1` })
          .where(eq(snippets.id, snippetId));
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error recording vote' });
    }
  });

  // Get single snippet
  app.get("/api/snippets/:id", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    try {
      const snippet = await db.query.snippets.findFirst({
        where: eq(snippets.id, snippetId)
      });

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
      const query = db.select().from(snippets);

      if (category && typeof category === 'string') {
        const filteredSnippets = await query.where(eq(snippets.category, category));
        return res.json(filteredSnippets);
      }

      const allSnippets = await query.orderBy(desc(snippets.votes));
      res.json(allSnippets);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching leaderboard' });
    }
  });

  return httpServer;
}