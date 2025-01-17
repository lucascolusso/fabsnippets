
import { db } from "../db/index.js";
import { votes, snippets } from "../db/schema.js";

async function clearDatabase() {
  console.log("Starting database clear...");
  try {
    // Delete all votes first due to foreign key constraint
    await db.delete(votes);
    console.log("Votes table cleared");
    
    // Then delete all snippets
    await db.delete(snippets);
    console.log("Snippets table cleared");
    
    console.log("Database cleared successfully");
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }
}

clearDatabase()
  .catch(console.error)
  .finally(() => process.exit(0));
