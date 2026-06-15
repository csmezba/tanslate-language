import { Router } from "express";
import crypto from "crypto";
import {
  ensureDbConnected,
  generateSalt,
  hashPassword,
  getAuthenticatedUser,
  usersCollection,
  sessionsCollection,
  User
} from "../db";

const router = Router();

// Email/Password Signup
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }

    await ensureDbConnected();
    const lowerEmail = email.toLowerCase().trim();

    const existingUser = await usersCollection.findOne({ email: lowerEmail });
    if (existingUser) {
      res.status(400).json({ error: "user_exists", message: "A user with this email already exists" });
      return;
    }

    const id = crypto.randomUUID();
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const newUser: User = {
      id,
      email: lowerEmail,
      name: name.trim(),
      passwordHash,
      salt,
    };

    await usersCollection.insertOne(newUser);

    // Create a login session instantly
    const token = crypto.randomBytes(32).toString("hex");
    await sessionsCollection.insertOne({ token, userId: id, createdAt: new Date() });

    res.status(201).json({
      token,
      user: { email: newUser.email, name: newUser.name },
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Email/Password Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    await ensureDbConnected();
    const lowerEmail = email.toLowerCase().trim();

    const user = await usersCollection.findOne({ email: lowerEmail });
    if (!user || !user.passwordHash || !user.salt) {
      res.status(401).json({ error: "invalid_credentials", message: "Incorrect email or password" });
      return;
    }

    const calculatedHash = hashPassword(password, user.salt);
    if (calculatedHash !== user.passwordHash) {
      res.status(401).json({ error: "invalid_credentials", message: "Incorrect email or password" });
      return;
    }

    // Create a login session
    const token = crypto.randomBytes(32).toString("hex");
    await sessionsCollection.insertOne({ token, userId: user.id, createdAt: new Date() });

    res.json({
      token,
      user: { email: user.email, name: user.name },
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Google OAuth Verification Route
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: "Google token is required" });
      return;
    }

    await ensureDbConnected();

    // Check for mock testing credentials (highly recommended for reliable sandboxed iFrame flows)
    if (credential === "mock-google-credential" || credential.startsWith("mock_")) {
      const mockEmail = "google-test-user@example.com";
      const mockName = "Mock Google User";

      let user: User | null = await usersCollection.findOne({ email: mockEmail });
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          email: mockEmail,
          name: mockName,
          googleId: "mock_g_12345",
        };
        await usersCollection.insertOne(user);
      }

      const token = crypto.randomBytes(32).toString("hex");
      await sessionsCollection.insertOne({ token, userId: user.id, createdAt: new Date() });

      res.json({
        token,
        user: { email: user.email, name: user.name },
      });
      return;
    }

    // Standard Google OAuth validation with TokenInfo endpoint (lightweight, zero-compiled-dep)
    try {
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      
      if (!verifyRes.ok) {
        res.status(400).json({ error: "invalid_google_token", message: "Failed to verify token with Google" });
        return;
      }

      const payload = await verifyRes.json();
      const email = payload.email;
      const name = payload.name || email.split("@")[0];
      const googleId = payload.sub;

      if (!email) {
        res.status(400).json({ error: "invalid_google_payload", message: "No email associated with Google token" });
        return;
      }

      const lowerEmail = email.toLowerCase().trim();
      let user: User | null = await usersCollection.findOne({ email: lowerEmail });

      if (!user) {
        user = {
          id: crypto.randomUUID(),
          email: lowerEmail,
          name: name,
          googleId,
        };
        await usersCollection.insertOne(user);
      } else {
        // Sync Google ID if not already stored
        if (!user.googleId) {
          await usersCollection.updateOne({ id: user.id }, { $set: { googleId } });
        }
      }

      const token = crypto.randomBytes(32).toString("hex");
      await sessionsCollection.insertOne({ token, userId: user.id, createdAt: new Date() });

      res.json({
        token,
        user: { email: user.email, name: user.name },
      });
    } catch (err: any) {
      res.status(400).json({ error: "google_verification_failed", message: err.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Get active session user details
router.get("/me", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ user: { email: user.email, name: user.name } });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Logout session
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      await ensureDbConnected();
      await sessionsCollection.deleteOne({ token });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
