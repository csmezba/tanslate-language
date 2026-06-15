import { Router } from "express";
import crypto from "crypto";
import {
  ensureDbConnected,
  getAuthenticatedUser,
  translationsCollection,
  Translation
} from "../db";
import { getGeminiClient } from "../gemini";

const router = Router();

// --- Translate API Route ---
router.post("/translate", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
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

    await ensureDbConnected();

    // Capture history record in MongoDB collection
    const historyItem: Translation = {
      id: crypto.randomUUID(),
      userId: user.id,
      originalText: text,
      translatedText,
      sourceLang,
      targetLang,
      createdAt: new Date().toISOString(),
    };

    await translationsCollection.insertOne(historyItem);

    res.json({ translatedText });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Fetch translation history for user
router.get("/history", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    await ensureDbConnected();
    const records = await translationsCollection
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ history: records });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Clear translation history
router.delete("/history", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    await ensureDbConnected();
    await translationsCollection.deleteMany({ userId: user.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Delete a single historical record
router.delete("/history/:id", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const { id } = req.params;
    await ensureDbConnected();
    await translationsCollection.deleteOne({ id, userId: user.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
