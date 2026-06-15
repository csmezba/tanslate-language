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

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "translate_lang_db";

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set.");
}

const client = new MongoClient(MONGODB_URI || "");
const db: Db = client.db(DB_NAME);
export const usersCollection: Collection<User> = db.collection("users");
export const translationsCollection: Collection<Translation> = db.collection("translations");
export const sessionsCollection: Collection<SessionDoc> = db.collection("sessions");

// Shared DB connection promise to ensure we only connect once
let dbConnectionPromise: Promise<MongoClient> | null = null;
export async function ensureDbConnected() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");
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
