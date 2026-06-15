import crypto from "crypto";
import express from "express";
import { MongoClient, Db, Collection } from "mongodb";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  salt?: string;
  googleId?: string;
}

export interface Translation {
  id: string;
  userId: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
}

export interface SessionDoc {
  token: string;
  userId: string;
  createdAt: Date;
}

const DB_NAME = "translate_lang_db";

let client: MongoClient | null = null;
let db: Db | null = null;

export let usersCollection: Collection<User>;
export let translationsCollection: Collection<Translation>;
export let sessionsCollection: Collection<SessionDoc>;

// Shared DB connection promise to ensure we only connect once
let dbConnectionPromise: Promise<MongoClient> | null = null;
export async function ensureDbConnected() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing");
  
  if (!client) {
    client = new MongoClient(uri);
    db = client.db(DB_NAME);
    usersCollection = db.collection<User>("users");
    translationsCollection = db.collection<Translation>("translations");
    sessionsCollection = db.collection<SessionDoc>("sessions");
  }
  
  if (!dbConnectionPromise) {
    dbConnectionPromise = client.connect();
  }
  return dbConnectionPromise;
}

// Password cryptography
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// Helper to obtain authenticated user from headers using MongoDB
export async function getAuthenticatedUser(req: express.Request): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    await ensureDbConnected();
    const session = await sessionsCollection.findOne({ token });
    if (!session) {
      return null;
    }
    const user = await usersCollection.findOne({ id: session.userId });
    return user;
  } catch (err) {
    console.error("Error retrieving authenticated user from MongoDB:", err);
    return null;
  }
}
