/**
 * Scheduled Image Validation and Repair Script
 * 
 * This script combines image monitoring and fixing into a single process
 * that can be run on a schedule to maintain image integrity.
 */

import { monitorImageErrors } from "./monitorImageErrors.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// ESM module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log the execution with timestamp
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(path.join(__dirname, '../logs/image-maintenance.log'), logMessage);
};

async function scheduleImageCheck() {
  console.log("Starting scheduled image validation and repair...");
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory: ${logsDir}`);
  }
  
  try {
    // First, monitor for issues
    console.log("Checking for image issues...");
    const imageErrors = await monitorImageErrors();
    
    if (imageErrors.length === 0) {
      console.log("No image issues detected. All images are valid and accessible.");
      logToFile("Scheduled check complete - No issues found");
      return;
    }
    
    // Log the issues found
    console.log(`Found ${imageErrors.length} image issues that need fixing.`);
    logToFile(`Found ${imageErrors.length} image issues. Running fix script...`);
    
    // Run the fix script as a separate process
    console.log("Running image fix script...");
    const fixProcess = spawn('npx', ['tsx', 'scripts/fixMissingImages.ts'], {
      stdio: 'inherit'
    });
    
    fixProcess.on('close', (code) => {
      if (code === 0) {
        console.log("Image fix process completed successfully");
        logToFile("Image fix process completed successfully");
      } else {
        console.error(`Image fix process exited with code ${code}`);
        logToFile(`ERROR: Image fix process exited with code ${code}`);
      }
    });
  } catch (error) {
    console.error("Error in scheduled image check:", error);
    logToFile(`ERROR in scheduled image check: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// If this script is run directly, execute the scheduled check
if (import.meta.url === `file://${process.argv[1]}`) {
  scheduleImageCheck()
    .then(() => {
      console.log("Scheduled image check completed");
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { scheduleImageCheck };