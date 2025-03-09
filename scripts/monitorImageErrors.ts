/**
 * Image Error Monitoring Script
 * 
 * This script helps identify and log issues with images in the database,
 * checking for:
 * 1. Database entries that reference non-existent image files
 * 2. Image file format issues
 * 3. Accessibility of images
 */

import { db } from "../db/index.js";
import { snippets } from "../db/schema.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { isNotNull } from "drizzle-orm";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');
const publicUploadsDir = path.join(rootDir, 'public', 'uploads');

interface ImageError {
  snippetId: number;
  snippetTitle: string;
  imagePath: string;
  errorType: 'missing' | 'permission' | 'format' | 'other';
  details: string;
}

async function monitorImageErrors(): Promise<ImageError[]> {
  console.log("Starting image error monitoring...");
  const errors: ImageError[] = [];
  
  try {
    // Check if upload directories exist
    try {
      await fs.access(uploadsDir);
      await fs.access(publicUploadsDir);
    } catch (error) {
      console.error(`Upload directories not accessible: ${error}`);
      return errors;
    }
    
    // Get all snippets with images from the database
    const snippetsWithImages = await db
      .select({
        id: snippets.id,
        title: snippets.title,
        imagePath: snippets.imagePath
      })
      .from(snippets)
      .where(isNotNull(snippets.imagePath));
    
    console.log(`Found ${snippetsWithImages.length} snippets with images in the database`);
    
    // Check each snippet's image
    for (const snippet of snippetsWithImages) {
      if (!snippet.imagePath) continue;

      const filename = snippet.imagePath.includes('/') 
        ? snippet.imagePath.split('/').pop() 
        : snippet.imagePath;
      
      if (!filename) {
        errors.push({
          snippetId: snippet.id,
          snippetTitle: snippet.title,
          imagePath: snippet.imagePath,
          errorType: 'format',
          details: 'Invalid image path format'
        });
        continue;
      }
      
      // Check if file exists in main uploads directory
      const mainFilePath = path.join(uploadsDir, filename);
      let fileExists = false;
      
      try {
        await fs.access(mainFilePath);
        fileExists = true;
      } catch {
        // Check if file exists in public uploads directory
        const publicFilePath = path.join(publicUploadsDir, filename);
        try {
          await fs.access(publicFilePath);
          fileExists = true;
        } catch {
          // File doesn't exist in either location
          errors.push({
            snippetId: snippet.id,
            snippetTitle: snippet.title,
            imagePath: snippet.imagePath,
            errorType: 'missing',
            details: 'Image file not found in either uploads directory'
          });
        }
      }
      
      // If file exists, check if it's readable
      if (fileExists) {
        try {
          const filePath = path.join(uploadsDir, filename);
          const stats = await fs.stat(filePath);
          
          // Check if file is too small (possibly corrupted)
          if (stats.size < 100) {
            errors.push({
              snippetId: snippet.id,
              snippetTitle: snippet.title,
              imagePath: snippet.imagePath,
              errorType: 'format',
              details: 'Image file is suspiciously small (may be corrupted)'
            });
          }
        } catch (error) {
          errors.push({
            snippetId: snippet.id,
            snippetTitle: snippet.title,
            imagePath: snippet.imagePath,
            errorType: 'permission',
            details: `Cannot read file stats: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    }
    
    // Log results
    if (errors.length > 0) {
      console.log(`Found ${errors.length} image errors:`);
      errors.forEach(error => {
        console.log(`Snippet ID ${error.snippetId} (${error.snippetTitle}): ${error.errorType} - ${error.details}`);
      });
    } else {
      console.log("No image errors found");
    }
    
    return errors;
  } catch (error) {
    console.error("Error during image monitoring:", error);
    return errors;
  }
}

// Run the monitoring function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running image error monitoring script directly...");
  monitorImageErrors()
    .then(errors => {
      console.log(`Monitoring completed with ${errors.length} errors found`);
      process.exit(0);
    })
    .catch(error => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { monitorImageErrors };