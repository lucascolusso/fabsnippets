import { createBackup, restoreFromBackup } from './dbBackup';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backupDir = path.join(__dirname, '../backups');

async function listBackups() {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.sql'));
    return backupFiles.sort().reverse(); // Most recent first
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

async function restoreLatest() {
  const backups = await listBackups();
  if (backups.length === 0) {
    console.error('No backups found');
    return;
  }

  const latestBackup = backups[0];
  const backupPath = path.join(backupDir, latestBackup);
  
  try {
    console.log('Restoring from latest backup:', latestBackup);
    await restoreFromBackup(backupPath);
    console.log('Restore completed successfully');
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    throw error;
  }
}

// If script is run directly, restore from latest backup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  restoreLatest()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export { listBackups, restoreLatest };
