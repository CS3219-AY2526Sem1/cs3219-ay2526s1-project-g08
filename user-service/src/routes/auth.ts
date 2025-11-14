import express from "express";
import { CLIENT_ID, CLIENT_SECRET } from "../config/github";
import { signAccessToken } from "../utils/jwt";
import { getDatabase } from "../db/connection";
import {
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from "../db/refreshToken";
import { getUserById } from "../db/user";

const router = express.Router();

// Token expiry constants (in ms)
const ACCESS_TOKEN_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_DAYS = 30;

// Environment-aware URLs
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || "http://localhost:3002/auth/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

router.get("/github", (req, res) => {
  // Prevent caching of auth redirect
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:user&redirect_uri=${OAUTH_REDIRECT_URI}`;
  res.redirect(redirectUri);
});

router.get("/callback", async (req, res) => {
  // Prevent caching of auth callback - always execute fresh
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const code = req.query.code as string;
  if (!code) return res.status(400).send("No code provided");

  try {
    // Exchange code for access token
    const tokenResp = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        }),
      }
    );
    const tokenData = await tokenResp.json();
    const githubAccessToken = tokenData.access_token;
    if (!githubAccessToken) return res.status(400).send("No access token");

    // Fetch GitHub user info
    const userResp = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });
    const githubUser = await userResp.json();

    // Store/update user in MongoDB
    const db = getDatabase();
    await db.collection("users").updateOne(
      { userId: githubUser.login },
      {
        $set: { name: githubUser.name || githubUser.login },
        $setOnInsert: { role: "user" }, // Default role for new users
      },
      { upsert: true }
    );
    console.log("User stored/updated in DB:", {
      userId: githubUser.login,
      name: githubUser.name,
    });

    // Fetch user from DB to get role
    const user = await db
      .collection("users")
      .findOne({ userId: githubUser.login });
    const userRole = user?.role || "user";

    // Generate access token (short-lived)
    const accessToken = signAccessToken({
      userId: githubUser.login,
      role: userRole,
    });

    // Use expiry constants
    const accessTokenMs = ACCESS_TOKEN_MS;
    const refreshTokenMs = REFRESH_TOKEN_MS;
    const refreshTokenDays = REFRESH_TOKEN_DAYS;

    // Generate and store refresh token (long-lived)
    const refreshToken = await storeRefreshToken(
      githubUser.login,
      refreshTokenDays, // Use dynamic expiry
      req.headers["user-agent"] // Store device info
    );

    // Detect if request came through HTTPS (CloudFront sets these headers)
    const isSecure = 
      req.headers['x-forwarded-proto'] === 'https' || 
      req.headers['cloudfront-forwarded-proto'] === 'https' ||
      req.protocol === 'https';

    // CloudFront only serves HTTPS, so always use secure cookies in production
    const shouldUseSecure = process.env.NODE_ENV === 'production' || isSecure;

    console.log("Cookie security settings:", { 
      isSecure, 
      shouldUseSecure,
      nodeEnv: process.env.NODE_ENV,
      proto: req.protocol,
      xForwardedProto: req.headers['x-forwarded-proto'],
      cloudfrontProto: req.headers['cloudfront-forwarded-proto'],
      allHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('proto') || h.toLowerCase().includes('forward'))
    });

    // Cookie configuration for both tokens
    const cookieConfig = {
      httpOnly: true,
      secure: shouldUseSecure, // Always true in production (CloudFront is HTTPS-only)
      sameSite: shouldUseSecure ? "none" as const : "lax" as const,
      path: "/",
    };

    // Set access token as httpOnly cookie
    res.cookie("token", accessToken, {
      ...cookieConfig,
      maxAge: accessTokenMs, // Use dynamic expiry
    });

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      ...cookieConfig,
      maxAge: refreshTokenMs, // Use dynamic expiry
    });

    console.log("✓ User authenticated:", githubUser.login);
    console.log("✓ Cookie set with token");
    console.log(
      "✓ Redirecting to:",
      `${FRONTEND_URL}/auth/callback?userId=${
        githubUser.login
      }&name=${encodeURIComponent(githubUser.name || githubUser.login)}`
    );

    // Redirect to frontend callback with user info as URL params
    // The frontend will handle navigation after receiving the data
    res.redirect(
      `${FRONTEND_URL}/auth/callback?userId=${
        githubUser.login
      }&name=${encodeURIComponent(githubUser.name || githubUser.login)}`
    );
  } catch (err) {
    console.error("OAuth error:", err);
    res.status(500).send("OAuth error");
  }
});

router.post("/logout", async (req, res) => {
  // Prevent caching of logout
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    // Revoke refresh token if present
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
      console.log("✓ Refresh token revoked on logout");
    }

    // Detect if request came through HTTPS
    const isSecure = 
      req.headers['x-forwarded-proto'] === 'https' || 
      req.headers['cloudfront-forwarded-proto'] === 'https' ||
      req.protocol === 'https';

    const shouldUseSecure = process.env.NODE_ENV === 'production' || isSecure;

    // Clear both cookies with matching settings
    res.clearCookie("token", {
      httpOnly: true,
      secure: shouldUseSecure,
      sameSite: shouldUseSecure ? "none" : "lax",
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: shouldUseSecure,
      sameSite: shouldUseSecure ? "none" : "lax",
      path: "/",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

/**
 * POST /auth/refresh
 * Use refresh token to get a new access token
 */
router.post("/refresh", async (req, res) => {
  // Prevent caching of token refresh
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    // Verify refresh token
    const userId = await verifyRefreshToken(refreshToken);

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }

    // Fetch user from DB to get current role
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate new access token
    const newAccessToken = signAccessToken({
      userId: user.userId,
      role: user.role,
    });

    // Use expiry constant
    const accessTokenMs = ACCESS_TOKEN_MS;

    // Detect if request came through HTTPS
    const isSecure = 
      req.headers['x-forwarded-proto'] === 'https' || 
      req.headers['cloudfront-forwarded-proto'] === 'https' ||
      req.protocol === 'https';

    const shouldUseSecure = process.env.NODE_ENV === 'production' || isSecure;

    // Set new access token cookie
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: shouldUseSecure,
      sameSite: shouldUseSecure ? "none" : "lax",
      maxAge: accessTokenMs, // Use dynamic expiry
      path: "/",
    });

    console.log(`✓ Access token refreshed for user: ${userId}`);
    res.status(200).json({
      message: "Token refreshed successfully",
      userId: user.userId,
      role: user.role,
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ error: "Token refresh failed" });
  }
});

export default router;
