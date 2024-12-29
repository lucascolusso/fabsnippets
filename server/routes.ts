import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { snippets, votes } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Get all snippets
  app.get("/api/snippets", async (req, res) => {
    const allSnippets = await db.query.snippets.findMany({
      orderBy: [desc(snippets.createdAt)]
    });
    res.json(allSnippets);
  });

  // Create new snippet
  app.post("/api/snippets", async (req, res) => {
    const { title, code, category, authorName, authorWebsite } = req.body;
    const newSnippet = await db.insert(snippets).values({
      title,
      code,
      category,
      authorName,
      authorWebsite,
    }).returning();
    res.json(newSnippet[0]);
  });

  // Vote for a snippet
  app.post("/api/snippets/:id/vote", async (req, res) => {
    const snippetId = parseInt(req.params.id);
    const ipAddress = req.ip;

    // Check if already voted
    const existingVote = await db.query.votes.findFirst({
      where: eq(votes.snippetId, snippetId),
      columns: { ipAddress: true }
    });

    if (existingVote) {
      return res.status(400).json({ message: "Already voted" });
    }

    await db.transaction(async (tx) => {
      // Insert the vote
      await tx.insert(votes).values({ snippetId, ipAddress });

      // Increment the votes count using sql template literal
      await tx
        .update(snippets)
        .set({ votes: sql`${snippets.votes} + 1` })
        .where(eq(snippets.id, snippetId));
    });

    res.json({ success: true });
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    const { category } = req.query;
    let query = db.select().from(snippets);

    if (category) {
      query = query.where(eq(snippets.category, category as string));
    }

    const leaderboard = await query.orderBy(desc(snippets.votes));
    res.json(leaderboard);
  });

  app.get("/api/authors/:name", async (req, res) => {
    const authorName = req.params.name;
    const authorSnippets = await db.select().from(snippets)
      .where(eq(snippets.authorName, authorName))
      .orderBy(desc(snippets.createdAt));

    const leaderboards = await Promise.all(['TMDL', 'DAX', 'SQL', 'Python', 'all'].map(async (category) => {
      let query = db.select().from(snippets);
      if (category !== 'all') {
        query = query.where(eq(snippets.category, category));
      }
      const board = await query.orderBy(desc(snippets.votes));
      const position = board.findIndex(s => s.authorName === authorName) + 1;
      return { category, position: position || null };
    }));

    res.json({ snippets: authorSnippets, leaderboards });
  });

  return httpServer;
}