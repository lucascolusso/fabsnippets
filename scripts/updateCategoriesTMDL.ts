
import { db } from "../db/index.js";
import { snippets } from "../db/schema.js";
import { sql } from "drizzle-orm";

async function updateCategories() {
  console.log("Starting category update...");
  try {
    await db.update(snippets)
      .set({ category: 'TMDL' });
    
    console.log("All categories updated to TMDL successfully");
  } catch (error) {
    console.error("Error updating categories:", error);
    process.exit(1);
  }
}

updateCategories()
  .catch(console.error)
  .finally(() => process.exit(0));
