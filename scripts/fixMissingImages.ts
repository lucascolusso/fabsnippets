import { db } from "../db";
import { snippets } from "../db/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { eq, isNotNull } from "drizzle-orm";
import { monitorImageErrors } from "./monitorImageErrors.js";

// ESM module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create an SVG placeholder for missing images
const createPlaceholderSVG = (snippetId: number, snippetTitle: string) => {
  const title = snippetTitle.length > 30 ? snippetTitle.substring(0, 27) + '...' : snippetTitle;
  
  return `<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="400" fill="#f1f5f9" />
  <text x="400" y="150" font-family="Arial, sans-serif" font-size="24" fill="#64748b" text-anchor="middle" alignment-baseline="middle">Original Image Unavailable</text>
  <text x="400" y="190" font-family="Arial, sans-serif" font-size="18" fill="#64748b" text-anchor="middle" alignment-baseline="middle">Snippet ID: ${snippetId}</text>
  <text x="400" y="220" font-family="Arial, sans-serif" font-size="16" fill="#64748b" text-anchor="middle" alignment-baseline="middle">"${title}"</text>
  <path d="M320,270 L480,270 M400,250 L400,290" stroke="#64748b" stroke-width="2"/>
  <text x="400" y="320" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle" alignment-baseline="middle">Contact admin to restore the original image</text>
</svg>`;
};

/**
 * This script checks all snippets for missing image files and fixes the issue.
 * It will look for images in multiple locations and create a meaningful placeholder
 * if no original image can be found.
 */
async function fixMissingImages() {
  console.log("Starting image fix process...");
  
  // First, use the monitoring script to identify issues
  console.log("Running image error monitoring to identify issues...");
  const imageErrors = await monitorImageErrors();
  
  if (imageErrors.length === 0) {
    console.log("No image issues detected. All images are valid and accessible.");
    return;
  }
  
  console.log(`Found ${imageErrors.length} image issues to fix.`);
  
  // Setup directories
  const uploadsDir = path.join(__dirname, "../uploads");
  const publicUploadsDir = path.join(__dirname, "../public/uploads");
  const backupsDir = path.join(__dirname, "../backups");
  
  // Make sure all directories exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created missing uploads directory: ${uploadsDir}`);
  }
  
  if (!fs.existsSync(publicUploadsDir)) {
    fs.mkdirSync(publicUploadsDir, { recursive: true });
    console.log(`Created missing public uploads directory: ${publicUploadsDir}`);
  }
  
  // Get all existing image files in the uploads directory
  const existingFiles = fs.readdirSync(uploadsDir);
  console.log(`Found ${existingFiles.length} files in uploads directory`);
  
  // Get all existing image files in the public uploads directory
  let publicUploadFiles: string[] = [];
  if (fs.existsSync(publicUploadsDir)) {
    publicUploadFiles = fs.readdirSync(publicUploadsDir);
    console.log(`Found ${publicUploadFiles.length} files in public uploads directory`);
  }
  
  // Check for backup files
  let backupFiles: string[] = [];
  if (fs.existsSync(backupsDir)) {
    const backupDirs = fs.readdirSync(backupsDir);
    for (const dir of backupDirs) {
      const fullBackupDir = path.join(backupsDir, dir);
      if (fs.statSync(fullBackupDir).isDirectory()) {
        try {
          const files = fs.readdirSync(fullBackupDir);
          backupFiles.push(...files);
        } catch (error) {
          console.log(`Could not read backup directory: ${fullBackupDir}`);
        }
      }
    }
  }
  console.log(`Found ${backupFiles.length} potential backup files`);
  
  // Fix each image issue detected
  let fixedCount = 0;
  let placeholderCount = 0;
  
  for (const error of imageErrors) {
    const snippet = await db.query.snippets.findFirst({
      where: eq(snippets.id, error.snippetId)
    });
    
    if (!snippet || !snippet.imagePath) continue;
    
    console.log(`Fixing ${error.errorType} issue for snippet ID ${error.snippetId}: ${error.imagePath}`);
    
    // Extract just the filename from the path
    const imagePath = snippet.imagePath.includes('/') 
      ? snippet.imagePath.split('/').pop() || snippet.imagePath
      : snippet.imagePath;
    
    // Check if image exists in public uploads folder as fallback
    const publicImageExists = publicUploadFiles.includes(imagePath);
    
    if (publicImageExists) {
      // Copy from public uploads to main uploads
      try {
        const sourceFilePath = path.join(publicUploadsDir, imagePath);
        const targetFilePath = path.join(uploadsDir, imagePath);
        fs.copyFileSync(sourceFilePath, targetFilePath);
        console.log(`✅ Fixed: Copied from public uploads ${imagePath}`);
        fixedCount++;
        continue;
      } catch (error) {
        console.error(`❌ Error copying from public uploads for snippet ${snippet.id}:`, error);
      }
    }
    
    // Check if image exists in any backup directory
    let foundInBackup = false;
    if (fs.existsSync(backupsDir)) {
      const backupDirs = fs.readdirSync(backupsDir);
      for (const dir of backupDirs) {
        const fullBackupDir = path.join(backupsDir, dir);
        if (fs.statSync(fullBackupDir).isDirectory()) {
          const potentialBackupFile = path.join(fullBackupDir, imagePath);
          if (fs.existsSync(potentialBackupFile)) {
            try {
              const targetFilePath = path.join(uploadsDir, imagePath);
              fs.copyFileSync(potentialBackupFile, targetFilePath);
              console.log(`✅ Fixed: Restored from backup directory ${dir}`);
              fixedCount++;
              foundInBackup = true;
              break;
            } catch (err) {
              console.error(`❌ Error copying from backup for snippet ${snippet.id}:`, err);
            }
          }
        }
      }
    }
    
    // If still missing, create a custom SVG placeholder
    if (!foundInBackup) {
      try {
        const placeholderSvg = createPlaceholderSVG(snippet.id, snippet.title);
        const targetFilePath = path.join(uploadsDir, imagePath);
        fs.writeFileSync(targetFilePath, placeholderSvg);
        console.log(`✅ Created placeholder SVG for snippet ${snippet.id}`);
        placeholderCount++;
      } catch (err) {
        console.error(`❌ Error creating placeholder for snippet ${snippet.id}:`, err);
      }
    }
  }
  
  console.log(`
Image fix process completed:
- Total issues found: ${imageErrors.length}
- Issues fixed from public/uploads or backups: ${fixedCount}
- Placeholders created: ${placeholderCount}
- Remaining issues: ${imageErrors.length - fixedCount - placeholderCount}
  `);
  
  // Run monitoring again to verify fixes
  console.log("\nVerifying fixes...");
  const remainingIssues = await monitorImageErrors();
  console.log(`After fixes, ${remainingIssues.length} issues remain.`);
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