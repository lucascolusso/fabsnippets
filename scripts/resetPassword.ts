import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetPassword(username: string, newPassword: string) {
  try {
    // Find the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      console.error(`User ${username} not found`);
      return;
    }

    console.log(`Found user: ${user.username} (ID: ${user.id})`);
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the password
    const updatedUsers = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id))
      .returning();
    
    if (updatedUsers.length > 0) {
      console.log(`Password updated successfully for ${username}`);
    } else {
      console.log(`Failed to update password for ${username}`);
    }
  } catch (error) {
    console.error("Error resetting password:", error);
  } finally {
    process.exit(0);
  }
}

// Check if arguments were provided
if (process.argv.length < 4) {
  console.log("Usage: tsx scripts/resetPassword.ts <username> <newPassword>");
  process.exit(1);
}

const username = process.argv[2];
const newPassword = process.argv[3];

// Execute password reset
resetPassword(username, newPassword);