import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { db } from "@db";
import { users } from "@db/schema";
import { eq, or } from "drizzle-orm";
import { Resend } from 'resend';

// Configuration for nodemailer and Resend
let transporter: nodemailer.Transporter;
let resend: Resend | null = null;
let emailProvider: 'resend' | 'nodemailer' | 'ethereal' = 'ethereal';

// Tokens stored in memory for simplicity (would use DB in production)
// Format: { token: { userId: number, expires: Date } }
const resetTokens: {
  [token: string]: { userId: number; expires: Date };
} = {};

/**
 * Email Sending Service
 * 
 * This service supports multiple email providers:
 * 1. Resend - for production use (requires RESEND_API_KEY)
 * 2. SMTP via Nodemailer - for production use (requires EMAIL_* vars)
 * 3. Ethereal - for development/testing (no credentials needed)
 */
export function initEmailService() {
  // First try Resend (recommended for production)
  if (process.env.RESEND_API_KEY) {
    try {
      resend = new Resend(process.env.RESEND_API_KEY);
      emailProvider = 'resend';
      console.log('Resend email service configured and ready.');
      return;
    } catch (error) {
      console.error('Failed to initialize Resend:', error);
      // Fall through to next option
    }
  }
  
  // Then try SMTP configuration
  if (process.env.EMAIL_HOST && 
      process.env.EMAIL_PORT && 
      process.env.EMAIL_USER && 
      process.env.EMAIL_PASS) {
    try {
      // Use SMTP configuration if provided
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_PORT === "465",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      emailProvider = 'nodemailer';
      console.log('SMTP email service configured and ready.');
      return;
    } catch (error) {
      console.error('Failed to initialize SMTP email:', error);
      // Fall through to fallback option
    }
  }
  
  // Use Ethereal as fallback for development/testing
  console.log('Using Ethereal Email for testing. This does not send real emails!');
  console.log('Email contents and links will be logged to console.');
  
  // Create a test account at Ethereal
  nodemailer.createTestAccount().then(testAccount => {
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    emailProvider = 'ethereal';
    console.log('Ethereal Email configured. Preview URL will be logged when emails are sent.');
  }).catch(err => {
    console.error('Failed to create test email account', err);
  });
}

/**
 * Generate a password reset token for a user
 * @param userId The user ID
 * @returns The generated token
 */
function generateResetToken(userId: number): string {
  // Generate random token
  const token = randomBytes(32).toString('hex');
  
  // Set expiration to 1 hour from now
  const expires = new Date();
  expires.setHours(expires.getHours() + 1);
  
  // Store token with expiration
  resetTokens[token] = { userId, expires };
  
  return token;
}

/**
 * Verify a password reset token
 * @param token The token to verify
 * @returns The user ID if token is valid, null otherwise
 */
export function verifyResetToken(token: string): number | null {
  const tokenData = resetTokens[token];
  
  // Check if token exists and is not expired
  if (tokenData && new Date() < tokenData.expires) {
    return tokenData.userId;
  }
  
  // Token is invalid or expired
  // Clean up if it's expired
  if (tokenData) {
    delete resetTokens[token];
  }
  
  return null;
}

/**
 * Invalidate a token after it's been used
 * @param token The token to invalidate
 */
export function invalidateToken(token: string): void {
  delete resetTokens[token];
}

/**
 * Send a password reset email
 * @param identifier Username or email of the user
 * @param origin The origin URL for building reset links
 * @returns Success status and message
 */
export async function sendPasswordResetEmail(
  identifier: string,
  origin: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (emailProvider === 'ethereal' && !transporter) {
      console.log('Waiting for Ethereal email account setup...');
      return {
        success: false,
        message: "Email service still initializing, please try again in a moment",
      };
    }

    // Find user by username or email
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, identifier),
          eq(users.email, identifier)
        )
      )
      .limit(1);

    // We don't want to reveal if a user exists or not for security
    // So we'll return success even if user not found
    if (!user || !user.email) {
      console.log(`Password reset requested for non-existent user or user without email: ${identifier}`);
      return {
        success: true,
        message: "If an account with this information exists, password reset instructions have been sent.",
      };
    }

    // Generate reset token
    const token = generateResetToken(user.id);

    // Create reset URL
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Prepare email content (same for all providers)
    const emailSubject = "Password Reset Instructions";
    const textContent = `
      You requested a password reset for your FabSnippets account.
      
      Please follow this link to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email.
    `;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Instructions</h2>
        <p>You requested a password reset for your FabSnippets account.</p>
        <p>Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Your Password</a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #666;">FabSnippets - Code Snippet Sharing Platform</p>
      </div>
    `;

    // Send email using the appropriate provider
    if (emailProvider === 'resend' && resend) {
      // Resend email sending
      const result = await resend.emails.send({
        from: 'FabSnippets <noreply@fabsnippets.app>',
        to: user.email,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      });
      
      console.log(`Password reset email sent via Resend to user: ${user.username}`, result);
    } 
    else if (emailProvider === 'nodemailer' || emailProvider === 'ethereal') {
      // Nodemailer sending (both SMTP and Ethereal)
      const info = await transporter.sendMail({
        from: `"FabSnippets" <noreply@fabsnippets.com>`,
        to: user.email,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      });

      // For ethereal emails, log the preview URL
      if (emailProvider === 'ethereal' && info.messageId && info.preview) {
        console.log(`Password reset email sent for user: ${user.username}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        // Log contents for testing/debugging - this makes it more like production
        console.log('\n---- RESET EMAIL CONTENTS ----');
        console.log('To:', user.email);
        console.log('Subject:', emailSubject);
        console.log('Reset Link:', resetUrl);
        console.log('\n');
      }
    }

    return {
      success: true,
      message: "If an account with this information exists, password reset instructions have been sent.",
    };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return {
      success: false,
      message: "Failed to send password reset email. Please try again later.",
    };
  }
}