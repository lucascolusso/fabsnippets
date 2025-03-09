
import { db } from "../db/index.js";
import { snippets } from "../db/schema.js";

/**
 * Removes all image paths from the snippets table
 */
async function removeImagePaths() {
  try {
    console.log("Starting to remove all image paths from snippets...");
    
    const result = await db.execute(`
      UPDATE snippets
      SET image_path = NULL
      WHERE image_path IS NOT NULL
    `);
    
    console.log("Successfully removed all image paths from snippets table");
    console.log(`Updated ${result.rowCount} records`);
    
    return { success: true, updatedCount: result.rowCount };
  } catch (error) {
    console.error("Error removing image paths:", error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running remove image paths script directly...");
  removeImagePaths()
    .then((result) => {
      console.log(`Successfully removed image paths from ${result.updatedCount} snippets`);
      process.exit(0);
    })
    .catch(error => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { removeImagePaths };
