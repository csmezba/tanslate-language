import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Interfaces
interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  salt?: string;
  googleId?: string;
}

interface Translation {
  id: string;
  userId: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
}

interface DB {
  users: User[];
  translations: Translation[];
  sessions: { [token: string]: string }; // token -> userId
}

const DB_FILE = "./db.json";

// Initialize/load local JSON database
function loadDB(): DB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return {
        users: parsed.users || [],
        translations: parsed.translations || [],
        sessions: parsed.sessions || {},
      };
    }
  } catch (error) {
    console.error("Error loading database file. Initializing a clean state.", error);
  }
  const defaultState: DB = { users: [], translations: [], sessions: {} };
  saveDB(defaultState);
  return defaultState;
}

function saveDB(db: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to db.json", error);
  }
}

// Password cryptography
function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// Lazy Gemini API client initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Go to Settings > Secrets in the AI Studio panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to obtain authenticated user from headers
  function getAuthenticatedUser(req: express.Request, db: DB): User | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split(" ")[1];
    const userId = db.sessions[token];
    if (!userId) {
      return null;
    }
    return db.users.find((u) => u.id === userId) || null;
  }

  // --- API Authentication Routes ---

  // Email/Password Signup
  app.post("/api/auth/signup", (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        res.status(400).json({ error: "Name, email, and password are required" });
        return;
      }

      const db = loadDB();
      const lowerEmail = email.toLowerCase().trim();

      const existingUser = db.users.find((u) => u.email === lowerEmail);
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

      db.users.push(newUser);

      // Create a login session instantly
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = id;
      saveDB(db);

      res.status(201).json({
        token,
        user: { email: newUser.email, name: newUser.name },
      });
    } catch (err: any) {
      res.status(500).json({ error: "server_error", message: err.message });
    }
  });

  // Email/Password Login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const db = loadDB();
      const lowerEmail = email.toLowerCase().trim();

      const user = db.users.find((u) => u.email === lowerEmail);
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
      db.sessions[token] = user.id;
      saveDB(db);

      res.json({
        token,
        user: { email: user.email, name: user.name },
      });
    } catch (err: any) {
      res.status(500).json({ error: "server_error", message: err.message });
    }
  });

  // Google OAuth Verification Route
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        res.status(400).json({ error: "Google token is required" });
        return;
      }

      // Check for mock testing credentials (highly recommended for reliable sandboxed iFrame flows)
      if (credential === "mock-google-credential" || credential.startsWith("mock_")) {
        const db = loadDB();
        const mockEmail = "google-test-user@example.com";
        const mockName = "Mock Google User";

        let user = db.users.find((u) => u.email === mockEmail);
        if (!user) {
          user = {
            id: crypto.randomUUID(),
            email: mockEmail,
            name: mockName,
            googleId: "mock_g_12345",
          };
          db.users.push(user);
        }

        const token = crypto.randomBytes(32).toString("hex");
        db.sessions[token] = user.id;
        saveDB(db);

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

        const db = loadDB();
        let user = db.users.find((u) => u.email === email.toLowerCase().trim());

        if (!user) {
          user = {
            id: crypto.randomUUID(),
            email: email.toLowerCase().trim(),
            name: name,
            googleId,
          };
          db.users.push(user);
        } else {
          // Sync Google ID if not already stored
          if (!user.googleId) {
            user.googleId = googleId;
          }
        }

        const token = crypto.randomBytes(32).toString("hex");
        db.sessions[token] = user.id;
        saveDB(db);

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
  app.get("/api/auth/me", (req, res) => {
    const db = loadDB();
    const user = getAuthenticatedUser(req, db);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ user: { email: user.email, name: user.name } });
  });

  // Logout session
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const db = loadDB();
      if (db.sessions[token]) {
        delete db.sessions[token];
        saveDB(db);
      }
    }
    res.json({ success: true });
  });

  // --- Translate API Route ---
  app.post("/api/translate", async (req, res) => {
    try {
      const db = loadDB();
      const user = getAuthenticatedUser(req, db);
      if (!user) {
        res.status(401).json({ error: "unauthorized", message: "Authentication required to translate" });
        return;
      }

      const { text, sourceLang, targetLang } = req.body;
      if (!text || !sourceLang || !targetLang) {
        res.status(400).json({ error: "missing_fields", message: "Missing required properties: text, sourceLang, targetLang" });
        return;
      }

      // Map codes to fully expressive language names
      const langNames: { [key: string]: string } = {
        en: "English",
        es: "Spanish",
        bn: "Bangla",
        fr: "French",
        ar: "Arabic",
      };

      const sourceName = langNames[sourceLang] || sourceLang;
      const targetName = langNames[targetLang] || targetLang;

      let translatedText = "";

      try {
        const ai = getGeminiClient();
        const systemInstruction = `You are a highly precise, context-aware multilingual translation engine. Translate the provided text from ${sourceName} into ${targetName} perfectly. Keep natural nuances and idioms intact.
CRITICAL MANDATE: Output ONLY the direct translated text. Do NOT wrap your translation in quotes, do NOT write markdown codes, do NOT explain anything, do NOT add preambles, and do NOT include the source or original text in your output under any condition.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Original text in ${sourceName} to translate into ${targetName}:
"${text}"`,
          config: {
            systemInstruction,
            temperature: 0.2,
          }
        });

        translatedText = (response.text || "").trim();
      } catch (geminiError: any) {
        console.error("Gemini API translation error:", geminiError);
        // Clean up error representation
        const isApiKeyError = geminiError.message && (geminiError.message.includes("API key") || geminiError.message.includes("API_KEY"));
        
        if (isApiKeyError) {
          res.status(500).json({ 
            error: "key_missing", 
            message: "Translate service requires a Gemini API Key setup in AI Studio secrets panel." 
          });
          return;
        }

        // Safe fallback in case translation rate levels are capped or temporarily down
        translatedText = `[Offline translation fallback from ${sourceName.toUpperCase()} to ${targetName.toUpperCase()}]: ${text}`;
      }

      // Capture history record in local DB JSON
      const historyItem: Translation = {
        id: crypto.randomUUID(),
        userId: user.id,
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
        createdAt: new Date().toISOString(),
      };

      db.translations.unshift(historyItem); // insert at start
      saveDB(db);

      res.json({ translatedText });
    } catch (err: any) {
      res.status(500).json({ error: "server_error", message: err.message });
    }
  });

  // Fetch translation history for user
  app.get("/api/history", (req, res) => {
    const db = loadDB();
    const user = getAuthenticatedUser(req, db);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const records = db.translations.filter((t) => t.userId === user.id);
    res.json({ history: records });
  });

  // Clear translation history
  app.delete("/api/history", (req, res) => {
    const db = loadDB();
    const user = getAuthenticatedUser(req, db);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    db.translations = db.translations.filter((t) => t.userId !== user.id);
    saveDB(db);
    res.json({ success: true });
  });

  // Delete a single historical record
  app.delete("/api/history/:id", (req, res) => {
    const db = loadDB();
    const user = getAuthenticatedUser(req, db);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const { id } = req.params;
    db.translations = db.translations.filter((t) => !(t.id === id && t.userId === user.id));
    saveDB(db);
    res.json({ success: true });
  });

  // --- Vite Dev Server Middleware / Static Production Assets ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
  });
}

startServer();
