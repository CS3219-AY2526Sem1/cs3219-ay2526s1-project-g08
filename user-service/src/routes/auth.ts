import express from "express";
import { CLIENT_ID, CLIENT_SECRET } from "../config/github";
import { signAccessToken } from "../utils/jwt";
import { getDb } from "../utils/mongo";
import {
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from "../db/refreshToken";
import { getUserById } from "../db/user";

const router = express.Router();

router.get("/github", (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:user&redirect_uri=http://localhost:3002/auth/callback`;
  res.redirect(redirectUri);
});

router.get("/callback", async (req, res) => {
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
    const db = await getDb();
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

    // Generate and store refresh token (long-lived)
    const refreshToken = await storeRefreshToken(
      githubUser.login,
      30, // 30 days
      req.headers["user-agent"] // Store device info
    );

    // Set access token as httpOnly cookie
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false, // might be https in production
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
      path: "/",
    });

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // might be https in production
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    console.log("✓ User authenticated:", githubUser.login);
    console.log("✓ Cookie set with token");
    console.log(
      "✓ Redirecting to:",
      `http://localhost:3000/auth/callback?userId=${
        githubUser.login
      }&name=${encodeURIComponent(githubUser.name || githubUser.login)}`
    );

    // Redirect to frontend callback with user info as URL params
    // The frontend will handle navigation after receiving the data
    res.redirect(
      `http://localhost:3000/auth/callback?userId=${
        githubUser.login
      }&name=${encodeURIComponent(githubUser.name || githubUser.login)}`
    );
  } catch (err) {
    console.error("OAuth error:", err);
    res.status(500).send("OAuth error");
  }
});

router.post("/logout", async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    // Revoke refresh token if present
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
      console.log("✓ Refresh token revoked on logout");
    }

    // Clear both cookies
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
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

    // Set new access token cookie
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
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
