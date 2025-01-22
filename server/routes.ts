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
      // Generate a unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (_req, file, cb) => {
    // Only accept images
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
  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));

  const httpServer = createServer(app);

  // Create tables if they don't exist
  db.execute(sql`
    CREATE TABLE IF NOT EXISTS snippets (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      code TEXT NOT NULL,
      category VARCHAR(20) NOT NULL,
      author_name VARCHAR(100) NOT NULL,
      author_website TEXT,
      image_path TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      votes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      snippet_id INTEGER NOT NULL REFERENCES snippets(id),
      ip_address VARCHAR(45) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Create new snippet with image upload
  app.post("/api/snippets", upload.single('image'), async (req, res) => {
    try {
      const { title, code, category, authorName, authorWebsite } = req.body;
      const imagePath = req.file?.filename;

      const [newSnippet] = await db.insert(snippets).values({
        title,
        code,
        category,
        authorName,
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

  // Vote for a snippet
  app.post("/api/snippets/:id/vote", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    const ipAddress = req.ip;

    try {
      // Check if already voted
      const existingVote = await db.query.votes.findFirst({
        where: eq(votes.snippetId, snippetId)
      });

      if (existingVote) {
        return res.status(400).json({ message: "Already voted" });
      }

      await db.transaction(async (tx) => {
        // Insert the vote
        await tx.insert(votes).values({
          snippetId: snippetId,
          ipAddress: ipAddress
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

  // Get author details and snippets
  app.get("/api/authors/:name", async (req, res) => {
    const authorName = req.params.name;
    try {
      const authorSnippets = await db
        .select()
        .from(snippets)
        .where(eq(snippets.authorName, authorName))
        .orderBy(desc(snippets.createdAt));

      const categories = ['TMDL', 'DAX', 'SQL', 'Python', 'PowerQuery', 'all'];
      const leaderboards = await Promise.all(
        categories.map(async (category) => {
          const query = db.select().from(snippets);
          const board = category === 'all' 
            ? await query.orderBy(desc(snippets.votes))
            : await query.where(eq(snippets.category, category)).orderBy(desc(snippets.votes));

          const position = board.findIndex(s => s.authorName === authorName) + 1;
          return { category, position: position || null };
        })
      );

      res.json({ snippets: authorSnippets, leaderboards });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching author details' });
    }
  });

  return httpServer;
}