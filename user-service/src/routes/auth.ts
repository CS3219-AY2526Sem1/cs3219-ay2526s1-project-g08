import express from "express";
import { CLIENT_ID, CLIENT_SECRET } from "../config/github";
import { signJwt } from "../utils/jwt";
import { getDb } from "../utils/mongo";

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
    const accessToken = tokenData.access_token;
    if (!accessToken) return res.status(400).send("No access token");

    // Fetch GitHub user info
    const userResp = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
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

    // Generate JWT with role
    const jwtToken = signJwt({
      userId: githubUser.login,
      role: userRole,
    });

    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: false, // might be https in production
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
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

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
  res.status(200).send("Logged out");
});

export default router;
