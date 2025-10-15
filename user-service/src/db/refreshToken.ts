import { getDatabase } from "./connection";
import { v4 as uuidv4 } from "uuid";

export interface RefreshToken {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  revoked: boolean;
  deviceInfo?: string; // Optional: track which device/browser
}

/**
 * Store a new refresh token in the database
 */
export async function storeRefreshToken(
  userId: string,
  expiresInDays: number = 30,
  deviceInfo?: string
): Promise<string> {
  try {
    const db = getDatabase();
    const RefreshTokens = db.collection<RefreshToken>("refresh_tokens");

    const token = uuidv4();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000
    );

    await RefreshTokens.insertOne({
      token,
      userId,
      expiresAt,
      createdAt: now,
      revoked: false,
      deviceInfo,
    });

    console.log(`✓ Refresh token stored for user: ${userId}`);
    return token;
  } catch (error) {
    console.error("Error storing refresh token:", error);
    throw new Error("Failed to store refresh token");
  }
}

/**
 * Verify if a refresh token is valid
 * Returns the userId if valid, null otherwise
 */
export async function verifyRefreshToken(
  token: string
): Promise<string | null> {
  try {
    const db = getDatabase();
    const RefreshTokens = db.collection<RefreshToken>("refresh_tokens");

    const refreshToken = await RefreshTokens.findOne({ token });

    // Check if token exists
    if (!refreshToken) {
      console.log("Refresh token not found in database");
      return null;
    }

    // Check if token is revoked
    if (refreshToken.revoked) {
      console.log("Refresh token has been revoked");
      return null;
    }

    // Check if token is expired
    if (refreshToken.expiresAt < new Date()) {
      console.log("Refresh token has expired");
      // Optionally delete expired token
      await RefreshTokens.deleteOne({ token });
      return null;
    }

    console.log(`✓ Refresh token verified for user: ${refreshToken.userId}`);
    return refreshToken.userId;
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    throw new Error("Failed to verify refresh token");
  }
}

/**
 * Revoke a specific refresh token (for logout)
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    const db = getDatabase();
    const RefreshTokens = db.collection<RefreshToken>("refresh_tokens");

    const result = await RefreshTokens.updateOne(
      { token },
      { $set: { revoked: true } }
    );

    if (result.modifiedCount > 0) {
      console.log("✓ Refresh token revoked");
      return true;
    }

    console.log("Refresh token not found or already revoked");
    return false;
  } catch (error) {
    console.error("Error revoking refresh token:", error);
    throw new Error("Failed to revoke refresh token");
  }
}

/**
 * Revoke all refresh tokens for a user (for security purposes like password change)
 */
export async function revokeAllUserRefreshTokens(
  userId: string
): Promise<number> {
  try {
    const db = getDatabase();
    const RefreshTokens = db.collection<RefreshToken>("refresh_tokens");

    const result = await RefreshTokens.updateMany(
      { userId, revoked: false },
      { $set: { revoked: true } }
    );

    console.log(
      `✓ Revoked ${result.modifiedCount} refresh tokens for user: ${userId}`
    );
    return result.modifiedCount;
  } catch (error) {
    console.error("Error revoking all user refresh tokens:", error);
    throw new Error("Failed to revoke all user refresh tokens");
  }
}

/**
 * Clean up expired and revoked tokens (can be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const db = getDatabase();
    const RefreshTokens = db.collection<RefreshToken>("refresh_tokens");

    const result = await RefreshTokens.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        {
          revoked: true,
          createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }, // Revoked tokens older than 7 days
      ],
    });

    console.log(`✓ Cleaned up ${result.deletedCount} expired/old tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
    throw new Error("Failed to cleanup expired tokens");
  }
}

/**
 * Get all active refresh tokens for a user (for admin/debugging)
 */
export async function getUserActiveTokens(
  userId: string
): Promise<RefreshToken[]> {
  try {
    const db = getDatabase();
    const RefreshTokens = db.collection<RefreshToken>("refresh_tokens");

    const tokens = await RefreshTokens.find({
      userId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).toArray();

    return tokens;
  } catch (error) {
    console.error("Error fetching user active tokens:", error);
    throw new Error("Failed to fetch user active tokens");
  }
}

/**
 * Initialize indexes for the refresh_tokens collection
 * Should be called on application startup
 */
export async function initializeRefreshTokenIndexes(): Promise<void> {
  try {
    const db = getDatabase();
    const RefreshTokens = db.collection<RefreshToken>("refresh_tokens");

    // Index on token for fast lookups during verification
    await RefreshTokens.createIndex({ token: 1 }, { unique: true });

    // Index on userId for querying user's tokens
    await RefreshTokens.createIndex({ userId: 1 });

    // Index on expiresAt for cleanup operations
    await RefreshTokens.createIndex({ expiresAt: 1 });

    // Compound index for finding active tokens
    await RefreshTokens.createIndex({ userId: 1, revoked: 1, expiresAt: 1 });

    console.log("✓ Refresh token indexes initialized");
  } catch (error) {
    console.error("Error initializing refresh token indexes:", error);
    throw new Error("Failed to initialize refresh token indexes");
  }
}
