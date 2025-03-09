
import { db } from "../db/index.js";
import { snippets, users } from "../db/schema.js";
import { isNotNull, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import archiver from 'archiver';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');
const publicUploadsDir = path.join(rootDir, 'public', 'uploads');
const tempDir = path.join(rootDir, 'temp_download');
const zipFile = path.join(rootDir, 'snippet_images.zip');

/**
 * Creates a ZIP file of all snippet images that can be downloaded to the local machine
 */
async function prepareImagesForDownload() {
  console.log("Preparing snippet images for download to your local machine...");
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    console.log(`Creating temporary directory at: ${tempDir}`);
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    // Get all snippets with images from the database
    const snippetsWithImages = await db
      .select({
        id: snippets.id,
        title: snippets.title,
        authorId: snippets.authorId,
        imagePath: snippets.imagePath,
        authorUsername: users.username
      })
      .from(snippets)
      .where(isNotNull(snippets.imagePath))
      .leftJoin(users, eq(snippets.authorId, users.id))
      .orderBy(snippets.id);
    
    if (snippetsWithImages.length === 0) {
      console.log("No snippets with images found in the database.");
      return;
    }
    
    console.log(`Found ${snippetsWithImages.length} snippets with images to package.`);
    
    // Create a summary file
    const summaryPath = path.join(tempDir, 'image_summary.csv');
    const summaryFile = fs.createWriteStream(summaryPath);
    summaryFile.write('ID,Title,Author,Original Filename,New Filename\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each snippet
    for (const snippet of snippetsWithImages) {
      if (!snippet.imagePath) continue;
      
      const filename = snippet.imagePath.includes('/') 
        ? snippet.imagePath.split('/').pop() 
        : snippet.imagePath;
      
      if (!filename) {
        console.log(`❌ Invalid image path format for snippet ${snippet.id}: ${snippet.imagePath}`);
        errorCount++;
        continue;
      }
      
      // Create a more descriptive filename
      const sanitizedTitle = snippet.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const newFilename = `${snippet.id}_${sanitizedTitle}_${filename}`;
      const downloadPath = path.join(tempDir, newFilename);
      
      // Check if file exists in main uploads directory
      const mainFilePath = path.join(uploadsDir, filename);
      let sourcePath = '';
      
      if (fs.existsSync(mainFilePath)) {
        sourcePath = mainFilePath;
      } else {
        // Try the public uploads directory
        const publicFilePath = path.join(publicUploadsDir, filename);
        if (fs.existsSync(publicFilePath)) {
          sourcePath = publicFilePath;
        } else {
          console.log(`❌ Image file not found for snippet ${snippet.id}: ${filename}`);
          errorCount++;
          continue;
        }
      }
      
      // Copy the file to the temp directory
      try {
        fs.copyFileSync(sourcePath, downloadPath);
        console.log(`✅ Prepared image for snippet ${snippet.id}: ${newFilename}`);
        summaryFile.write(`${snippet.id},"${snippet.title.replace(/"/g, '""')}",${snippet.authorUsername || 'unknown'},${filename},${newFilename}\n`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error copying file for snippet ${snippet.id}:`, error);
        errorCount++;
      }
    }
    
    // Close the summary file
    summaryFile.end();
    
    // Create a ZIP file for easy download
    console.log("\nCreating ZIP file for download...");
    const output = fs.createWriteStream(zipFile);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    archive.pipe(output);
    
    // Add the temp directory contents to the ZIP
    archive.directory(tempDir, false);
    
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });
    
    console.log(`\n✅ ZIP file created at: ${zipFile}`);
    console.log(`ZIP file size: ${(fs.statSync(zipFile).size / 1024 / 1024).toFixed(2)} MB`);
    
    console.log("\n=== DOWNLOAD SUMMARY ===");
    console.log(`Total images found: ${snippetsWithImages.length}`);
    console.log(`Successfully packaged: ${successCount}`);
    console.log(`Failed to package: ${errorCount}`);
    console.log(`\nTo download the images to your local machine:`);
    console.log(`1. Right-click on 'snippet_images.zip' in the file explorer`);
    console.log(`2. Select 'Download' from the context menu`);
    
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("\nTemporary directory cleaned up.");
    
  } catch (error) {
    console.error("Error packaging snippet images:", error);
  }
}

// Run the script
prepareImagesForDownload()
  .then(() => {
    console.log("\nImage packaging process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in image packaging script:", error);
    process.exit(1);
  });
