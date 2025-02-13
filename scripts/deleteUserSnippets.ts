
import { db } from "../db/index.js";
import { votes, snippets, users } from "../db/schema.js";
import { eq } from "drizzle-orm";

async function deleteUserSnippets(username: string) {
  console.log(`Starting deletion of snippets for user: ${username}`);
  try {
    // First get the user ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      console.error(`User ${username} not found`);
      process.exit(1);
    }

    // Delete all votes for user's snippets first due to foreign key constraint
    const userSnippets = await db
      .select()
      .from(snippets)
      .where(eq(snippets.authorId, user.id));
    
    for (const snippet of userSnippets) {
      await db.delete(votes).where(eq(votes.snippetId, snippet.id));
    }
    
    // Then delete all snippets
    const result = await db.delete(snippets).where(eq(snippets.authorId, user.id));
    console.log(`Deleted snippets for user ${username}`);
  } catch (error) {
    console.error("Error deleting snippets:", error);
    process.exit(1);
  }
}

deleteUserSnippets("lucascolusso")
  .catch(console.error)
  .finally(() => process.exit(0));
