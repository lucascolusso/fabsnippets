import { db } from "../db/index.js";
import { snippets } from "../db/schema.js";
import { eq, isNull } from "drizzle-orm";

async function updateTMDLCategories() {
  console.log("Starting TMDL categories update...");
  try {
    // Find snippets with TMDL category
    const tmdlSnippets = await db.select()
      .from(snippets)
      .where(eq(snippets.category, 'TMDL'));
    
    console.log(`Found ${tmdlSnippets.length} snippets with TMDL category`);

    // Update each snippet's categories field
    for (const snippet of tmdlSnippets) {
      let categories;
      try {
        // Try to parse existing categories if any
        categories = snippet.categories ? JSON.parse(snippet.categories) : [];
      } catch {
        categories = [];
      }

      // Add TMDL if not already present
      if (!categories.includes('TMDL')) {
        categories.push('TMDL');
      }

      // Update the snippet
      await db.update(snippets)
        .set({ categories: JSON.stringify(categories) })
        .where(eq(snippets.id, snippet.id));
      
      console.log(`Updated categories for snippet ID: ${snippet.id}`);
    }
    
    console.log("Categories update completed successfully");
  } catch (error) {
    console.error("Error updating categories:", error);
    process.exit(1);
  }
}

updateTMDLCategories()
  .catch(console.error)
  .finally(() => process.exit(0));
