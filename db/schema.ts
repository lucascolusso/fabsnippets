import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const snippets = pgTable("snippets", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  code: text("code").notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  authorWebsite: text("author_website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  votes: integer("votes").default(0).notNull()
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  snippetId: integer("snippet_id").notNull().references(() => snippets.id),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const snippetsRelations = relations(snippets, ({ many }) => ({
  votes: many(votes)
}));

export const votesRelations = relations(votes, ({ one }) => ({
  snippet: one(snippets, {
    fields: [votes.snippetId],
    references: [snippets.id],
  }),
}));

export const insertSnippetSchema = createInsertSchema(snippets);
export const selectSnippetSchema = createSelectSchema(snippets);

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
export type Vote = typeof votes.$inferSelect;