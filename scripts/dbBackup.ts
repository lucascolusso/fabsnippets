import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

// Ensure backup directory exists
const backupDir = path.join(__dirname, '../backups');

async function ensureBackupDir() {
  try {
    await fs.access(backupDir);
    console.log('Backup directory exists at:', backupDir);
  } catch {
    console.log('Creating backup directory at:', backupDir);
    await fs.mkdir(backupDir, { recursive: true });
  }
}

export async function createBackup() {
  console.log('Starting database backup process...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  await ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}.sql`);

  const databaseUrl = new URL(process.env.DATABASE_URL);

  console.log('Preparing pg_dump command...');

  // Note: Using -Fc for custom format which is more flexible for restoration
  const command = `pg_dump "${process.env.DATABASE_URL}" -F c -f "${backupPath}"`;

  try {
    console.log('Executing backup...');
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.log('pg_dump messages:', stderr);
    }

    if (stdout) {
      console.log('pg_dump output:', stdout);
    }

    console.log(`Backup created successfully at ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

export async function restoreFromBackup(backupPath: string) {
  console.log('Starting database restoration process...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);

  console.log('Preparing to restore from:', backupPath);

  // Drop existing connections except our own
  const dropConnectionsCommand = `psql "${process.env.DATABASE_URL}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = current_database();"`;

  // Using pg_restore for custom format backup
  const restoreCommand = `pg_restore -c -d "${process.env.DATABASE_URL}" "${backupPath}"`;

  try {
    console.log('Terminating existing connections...');
    const { stdout: dropOut, stderr: dropErr } = await execAsync(dropConnectionsCommand);

    if (dropErr) console.log('Connection termination messages:', dropErr);
    if (dropOut) console.log('Connection termination output:', dropOut);

    console.log('Restoring from backup...');
    const { stdout, stderr } = await execAsync(restoreCommand);

    if (stderr) console.log('Restore messages:', stderr);
    if (stdout) console.log('Restore output:', stdout);

    console.log('Database restored successfully from', backupPath);
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}

// If script is run directly, create a backup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createBackup()
    .then((backupPath) => {
      console.log('Backup completed:', backupPath);
    })
    .catch((error) => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}