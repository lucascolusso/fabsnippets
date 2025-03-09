import { db } from "../db";
import { snippets } from "../db/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { eq, isNotNull } from "drizzle-orm";

// ESM module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * This script checks all snippets for missing image files and fixes the issue
 * by copying an existing image from the uploads folder to match the expected filename.
 */
async function fixMissingImages() {
  console.log("Starting image fix process...");
  
  // Get all snippets with image paths
  const allSnippets = await db.select().from(snippets).where(
    isNotNull(snippets.imagePath)
  );
  
  console.log(`Found ${allSnippets.length} snippets with image paths to check`);
  
  const uploadsDir = path.join(__dirname, "../uploads");
  
  // Get all existing image files in the uploads directory
  const existingFiles = fs.readdirSync(uploadsDir);
  console.log(`Found ${existingFiles.length} files in uploads directory`);
  
  // Check each snippet's image
  let fixedCount = 0;
  let alreadyOkCount = 0;
  
  for (const snippet of allSnippets) {
    if (!snippet.imagePath) continue;
    
    const imageExists = existingFiles.includes(snippet.imagePath);
    
    if (!imageExists) {
      console.log(`Missing image for snippet ID ${snippet.id}: ${snippet.imagePath}`);
      
      // Take first available image as placeholder
      if (existingFiles.length > 0) {
        // Choose the first PNG file available
        const sourcePlaceholder = existingFiles.find(file => file.endsWith('.png')) || existingFiles[0];
        const sourceFilePath = path.join(uploadsDir, sourcePlaceholder);
        const targetFilePath = path.join(uploadsDir, snippet.imagePath);
        
        // Copy the placeholder to match the expected filename
        try {
          fs.copyFileSync(sourceFilePath, targetFilePath);
          console.log(`✅ Fixed: Copied ${sourcePlaceholder} to ${snippet.imagePath}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error fixing image for snippet ${snippet.id}:`, error);
        }
      } else {
        console.error("No placeholder images available in uploads directory");
      }
    } else {
      alreadyOkCount++;
    }
  }
  
  console.log(`
Image fix process completed:
- Total snippets with images: ${allSnippets.length}
- Already OK: ${alreadyOkCount}
- Fixed: ${fixedCount}
  `);
}

// Run the script
fixMissingImages()
  .then(() => {
    console.log("Image fix script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in image fix script:", error);
    process.exit(1);
  });