import { db } from "../db/index.js";
import { snippets } from "../db/schema.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { sql, eq, isNotNull } from "drizzle-orm";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');
const publicUploadsDir = path.join(rootDir, 'public', 'uploads');

/**
 * Clean up orphaned images that exist in the uploads directory
 * but are not referenced in the database.
 * 
 * This script ensures consistency between the database and filesystem,
 * preventing storage waste and broken image links.
 */
async function cleanupOrphanedImages() {
  try {
    console.log("Starting orphaned image cleanup...");
    console.log(`Checking uploads directory: ${uploadsDir}`);
    
    // Check if uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch (error) {
      console.error(`Uploads directory does not exist or is not accessible: ${error}`);
      console.log("Creating uploads directory...");
      await fs.mkdir(uploadsDir, { recursive: true });
    }
    
    // Check if public uploads directory exists
    try {
      await fs.access(publicUploadsDir);
    } catch (error) {
      console.error(`Public uploads directory does not exist or is not accessible: ${error}`);
      console.log("Creating public uploads directory...");
      await fs.mkdir(publicUploadsDir, { recursive: true });
    }
    
    // Get all image paths from the database using a type-safe query
    const dbImages = await db.select({ imagePath: snippets.imagePath })
      .from(snippets)
      .where(isNotNull(snippets.imagePath));
    
    // Create a set of all image filenames from the database
    const dbImageFilenames = new Set<string>();
    
    dbImages.forEach(record => {
      if (record.imagePath) {
        // Handle both formats: full filename or just filename
        const filename = record.imagePath.includes('/') 
          ? record.imagePath.split('/').pop() 
          : record.imagePath;
          
        if (filename) {
          dbImageFilenames.add(filename);
        }
      }
    });
    
    console.log(`Found ${dbImageFilenames.size} images referenced in database`);
    
    // Get all files in the main uploads directory
    let mainUploadsFiles: string[] = [];
    try {
      mainUploadsFiles = await fs.readdir(uploadsDir);
      console.log(`Found ${mainUploadsFiles.length} files in main uploads directory`);
    } catch (error) {
      console.error(`Error reading main uploads directory: ${error}`);
      mainUploadsFiles = [];
    }
    
    // Get all files in the public uploads directory
    let publicUploadsFiles: string[] = [];
    try {
      publicUploadsFiles = await fs.readdir(publicUploadsDir);
      console.log(`Found ${publicUploadsFiles.length} files in public uploads directory`);
    } catch (error) {
      console.error(`Error reading public uploads directory: ${error}`);
      publicUploadsFiles = [];
    }
    
    // Find orphaned files in the main uploads directory
    const mainOrphanedFiles = mainUploadsFiles.filter(file => !dbImageFilenames.has(file));
    console.log(`Found ${mainOrphanedFiles.length} orphaned files in main uploads directory`);
    
    // Find orphaned files in the public uploads directory
    const publicOrphanedFiles = publicUploadsFiles.filter(file => !dbImageFilenames.has(file));
    console.log(`Found ${publicOrphanedFiles.length} orphaned files in public uploads directory`);
    
    // Delete orphaned files from main uploads directory
    let mainDeletedCount = 0;
    for (const file of mainOrphanedFiles) {
      try {
        const filePath = path.join(uploadsDir, file);
        const fileStat = await fs.stat(filePath);
        
        // Skip directories and only delete files
        if (fileStat.isDirectory()) {
          console.log(`Skipping directory: ${file}`);
          continue;
        }
        
        // Check if the file was created in the last hour (to avoid deleting newly uploaded files)
        const fileAge = Date.now() - fileStat.birthtimeMs;
        const oneHourInMs = 60 * 60 * 1000;
        
        if (fileAge < oneHourInMs) {
          console.log(`Skipping recently created file (less than 1 hour old): ${file}`);
          continue;
        }
        
        await fs.unlink(filePath);
        mainDeletedCount++;
        console.log(`Deleted orphaned file from main uploads: ${file}`);
      } catch (error) {
        console.error(`Error deleting file ${file} from main uploads: ${error}`);
      }
    }
    
    // Delete orphaned files from public uploads directory
    let publicDeletedCount = 0;
    for (const file of publicOrphanedFiles) {
      try {
        const filePath = path.join(publicUploadsDir, file);
        const fileStat = await fs.stat(filePath);
        
        // Skip directories and only delete files
        if (fileStat.isDirectory()) {
          console.log(`Skipping directory: ${file}`);
          continue;
        }
        
        // Check if the file was created in the last hour (to avoid deleting newly uploaded files)
        const fileAge = Date.now() - fileStat.birthtimeMs;
        const oneHourInMs = 60 * 60 * 1000;
        
        if (fileAge < oneHourInMs) {
          console.log(`Skipping recently created file (less than 1 hour old): ${file}`);
          continue;
        }
        
        await fs.unlink(filePath);
        publicDeletedCount++;
        console.log(`Deleted orphaned file from public uploads: ${file}`);
      } catch (error) {
        console.error(`Error deleting file ${file} from public uploads: ${error}`);
      }
    }
    
    // Check for missing files that exist in the database but not in the uploads directory
    const missingFiles: string[] = [];
    
    for (const filename of dbImageFilenames) {
      const mainFilePath = path.join(uploadsDir, filename);
      const publicFilePath = path.join(publicUploadsDir, filename);
      
      try {
        await fs.access(mainFilePath);
        // File exists in main uploads directory, continue to next file
        continue;
      } catch {
        // File doesn't exist in main uploads, check public directory
        try {
          await fs.access(publicFilePath);
          // File exists in public uploads directory, continue to next file
          continue;
        } catch {
          // File doesn't exist in either directory
          missingFiles.push(filename);
        }
      }
    }
    
    console.log(`Found ${missingFiles.length} files referenced in the database but missing from both upload directories`);
    
    console.log(`Cleanup complete.`);
    console.log(`Deleted ${mainDeletedCount} orphaned files from main uploads directory.`);
    console.log(`Deleted ${publicDeletedCount} orphaned files from public uploads directory.`);
    console.log(`Found ${missingFiles.length} missing files that exist in the database but not on the filesystem.`);
    
    return {
      mainDeletedCount,
      publicDeletedCount,
      missingFiles
    };
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

// Run the cleanup function if this script is executed directly
// Using modern ES module detection
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running cleanup script directly...");
  cleanupOrphanedImages()
    .then(() => {
      console.log("Cleanup completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { cleanupOrphanedImages };