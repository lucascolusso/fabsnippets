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
      headers.map(fieldName => {
        const value = row[fieldName];
        // Handle different types of values
        if (value === null || value === undefined) return '""';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (value instanceof Date) return `"${value.toISOString()}"`;
        return `"${String(value)}"`;
      }).join(',')
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

  try {
    await fs.mkdir(backupDirPath, { recursive: true });
    console.log('Created temporary backup directory at:', backupDirPath);

    console.log('Fetching data from tables...');

    // Export snippets table
    const snippetsData = await db.select().from(snippets);
    console.log(`Retrieved ${snippetsData.length} snippets`);
    const snippetsCSV = objectToCSV(snippetsData);
    await fs.writeFile(path.join(backupDirPath, 'snippets.csv'), snippetsCSV);
    console.log('Wrote snippets.csv');

    // Export votes table with all required columns
    const votesData = await db.select({
      id: votes.id,
      snippetId: votes.snippetId,
      ipAddress: votes.ipAddress,
      createdAt: votes.createdAt
    }).from(votes);
    console.log(`Retrieved ${votesData.length} votes`);
    const votesCSV = objectToCSV(votesData);
    await fs.writeFile(path.join(backupDirPath, 'votes.csv'), votesCSV);
    console.log('Wrote votes.csv');

    // Create zip file
    const zipPath = path.join(backupDir, `backup-${timestamp}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      console.log(`Zip archive finalized. Total bytes: ${archive.pointer()}`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Add files to the zip
    archive.directory(backupDirPath, false);
    console.log('Added files to zip archive');

    await archive.finalize();
    console.log('Finalized zip archive');

    // Wait for the output stream to finish
    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

    // Clean up the temporary directory
    await fs.rm(backupDirPath, { recursive: true });
    console.log('Cleaned up temporary directory');

    console.log(`Backup created successfully at ${zipPath}`);
    return zipPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    // Clean up temporary directory if it exists
    try {
      await fs.rm(backupDirPath, { recursive: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temporary directory:', cleanupError);
    }
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
    console.log('Created temporary restore directory');

    // Extract zip file
    await execAsync(`unzip "${backupPath}" -d "${tempDir}"`);
    console.log('Extracted backup archive');

    // Read and parse CSV files
    const snippetsCSV = await fs.readFile(path.join(tempDir, 'snippets.csv'), 'utf-8');
    const votesCSV = await fs.readFile(path.join(tempDir, 'votes.csv'), 'utf-8');
    console.log('Read CSV files');

    // Parse CSV data
    const parseCSV = (csv: string) => {
      const [headers, ...rows] = csv.split('\n');
      const fields = headers.split(',');
      return rows.map(row => {
        const values = row.split(',').map(v => v.trim());
        return fields.reduce((obj: any, field, index) => {
          let value = values[index] || null;
          // Remove surrounding quotes and unescape internal quotes
          if (value && value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/""/g, '"');
          }
          try {
            obj[field] = value === 'null' ? null : JSON.parse(value);
          } catch {
            obj[field] = value;
          }
          return obj;
        }, {});
      });
    };

    const snippetsData = parseCSV(snippetsCSV);
    const votesData = parseCSV(votesCSV);
    console.log(`Parsed ${snippetsData.length} snippets and ${votesData.length} votes`);

    // Drop existing connections except our own
    await db.execute(sql`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE pid <> pg_backend_pid() 
      AND datname = current_database();
    `);
    console.log('Terminated existing database connections');

    // Restore data
    await db.transaction(async (tx) => {
      // Clear existing data
      await tx.delete(votes);
      await tx.delete(snippets);
      console.log('Cleared existing data');

      // Insert new data
      for (const snippet of snippetsData) {
        await tx.insert(snippets).values(snippet);
      }
      console.log(`Restored ${snippetsData.length} snippets`);

      for (const vote of votesData) {
        await tx.insert(votes).values({
          id: vote.id,
          snippetId: vote.snippetId,
          ipAddress: vote.ipAddress,
          createdAt: new Date(vote.createdAt)
        });
      }
      console.log(`Restored ${votesData.length} votes`);
    });

    console.log('Database restored successfully from', backupPath);
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  } finally {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true });
      console.log('Cleaned up temporary directory');
    } catch (cleanupError) {
      console.error('Error cleaning up temporary directory:', cleanupError);
    }
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