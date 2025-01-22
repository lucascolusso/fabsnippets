import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from "../db";
import { snippets, votes } from "../db/schema";
import { sql } from "drizzle-orm";
import archiver from 'archiver';
import { createWriteStream } from 'fs';

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
    await fs.mkdir(backupDir, { recursive: true });
    console.log('Created backup directory at:', backupDir);
  }
}

function objectToCSV(items: any[]) {
  if (items.length === 0) return '';

  const headers = Object.keys(items[0]);
  const csvRows = [
    headers.join(','), // Header row
    ...items.map(row => 
      headers.map(fieldName => 
        JSON.stringify(row[fieldName] ?? '')
      ).join(',')
    )
  ];

  return csvRows.join('\n');
}

export async function createBackup() {
  console.log('Starting database backup process...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  await ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDirPath = path.join(backupDir, `backup-${timestamp}`);
  await fs.mkdir(backupDirPath, { recursive: true });

  try {
    console.log('Fetching data from tables...');

    // Export snippets table
    const snippetsData = await db.select().from(snippets);
    const snippetsCSV = objectToCSV(snippetsData);
    await fs.writeFile(path.join(backupDirPath, 'snippets.csv'), snippetsCSV);

    // Export votes table
    const votesData = await db.select().from(votes);
    const votesCSV = objectToCSV(votesData);
    await fs.writeFile(path.join(backupDirPath, 'votes.csv'), votesCSV);

    // Create zip file
    const zipPath = path.join(backupDir, `backup-${timestamp}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    archive.pipe(output);
    archive.directory(backupDirPath, false);

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });

    // Clean up the temporary directory
    await fs.rm(backupDirPath, { recursive: true });

    console.log(`Backup created successfully at ${zipPath}`);
    return zipPath;
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

  if (!backupPath.endsWith('.zip')) {
    throw new Error('Invalid backup file format. Expected a zip file.');
  }

  const tempDir = path.join(backupDir, 'temp-restore');

  try {
    // Create temporary directory for extraction
    await fs.mkdir(tempDir, { recursive: true });

    // Extract zip file
    await execAsync(`unzip "${backupPath}" -d "${tempDir}"`);

    // Read and parse CSV files
    const snippetsCSV = await fs.readFile(path.join(tempDir, 'snippets.csv'), 'utf-8');
    const votesCSV = await fs.readFile(path.join(tempDir, 'votes.csv'), 'utf-8');

    // Parse CSV data
    const parseCSV = (csv: string) => {
      const [headers, ...rows] = csv.split('\n');
      const fields = headers.split(',');
      return rows.map(row => {
        const values = row.split(',');
        return fields.reduce((obj: any, field, index) => {
          obj[field] = JSON.parse(values[index] || 'null');
          return obj;
        }, {});
      });
    };

    const snippetsData = parseCSV(snippetsCSV);
    const votesData = parseCSV(votesCSV);

    // Drop existing connections except our own
    await db.execute(sql`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE pid <> pg_backend_pid() 
      AND datname = current_database();
    `);

    // Restore data
    await db.transaction(async (tx) => {
      // Clear existing data
      await tx.delete(votes);
      await tx.delete(snippets);

      // Insert new data
      for (const snippet of snippetsData) {
        await tx.insert(snippets).values(snippet);
      }
      for (const vote of votesData) {
        await tx.insert(votes).values(vote);
      }
    });

    console.log('Database restored successfully from', backupPath);
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  } finally {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true }).catch(console.error);
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