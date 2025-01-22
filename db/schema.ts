import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const snippets = pgTable("snippets", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  code: text("code").notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  authorWebsite: text("author_website"),
  imagePath: text("image_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  votes: integer("votes").default(0).notNull()
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  snippetId: integer("snippet_id").notNull().references(() => snippets.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const userRelations = relations(users, ({ many }) => ({
  snippets: many(snippets),
  votes: many(votes)
}));

export const snippetsRelations = relations(snippets, ({ one, many }) => ({
  author: one(users, {
    fields: [snippets.authorId],
    references: [users.id],
  }),
  votes: many(votes)
}));

export const votesRelations = relations(votes, ({ one }) => ({
  snippet: one(snippets, {
    fields: [votes.snippetId],
    references: [snippets.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertSnippetSchema = createInsertSchema(snippets);
export const selectSnippetSchema = createSelectSchema(snippets);

export const insertVoteSchema = createInsertSchema(votes);
export const selectVoteSchema = createSelectSchema(votes);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;

export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;