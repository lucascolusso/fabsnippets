import { createBackup } from './dbBackup';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupDir = path.join(__dirname, '../backups');

// Configuration
const MAX_BACKUPS = 10; // Keep last 10 backups
const BACKUP_INTERVAL = 3600000; // 1 hour in milliseconds

async function cleanOldBackups() {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .sort()
      .reverse(); // Most recent first

    // Keep only the most recent MAX_BACKUPS backups
    const filesToDelete = backupFiles.slice(MAX_BACKUPS);
    
    for (const file of filesToDelete) {
      const filePath = path.join(backupDir, file);
      await fs.unlink(filePath);
      console.log(`Deleted old backup: ${file}`);
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
}

async function runBackup() {
  try {
    console.log('\n=== Starting scheduled backup ===');
    console.log(new Date().toISOString());
    
    // Create new backup
    const backupPath = await createBackup();
    console.log(`Backup created at: ${backupPath}`);
    
    // Clean old backups
    await cleanOldBackups();
    
    console.log('=== Backup process completed ===\n');
  } catch (error) {
    console.error('Backup process failed:', error);
  }
}

// Run backup immediately on start
runBackup();

// Schedule regular backups
setInterval(runBackup, BACKUP_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Backup service shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Backup service shutting down...');
  process.exit(0);
});

console.log(`Automated backup service started. Backing up every ${BACKUP_INTERVAL / 3600000} hour(s)`);
