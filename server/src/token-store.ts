import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Tokens, StoredTokenData, TokenStore } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token storage file path
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

/**
 * Ensure the data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Read the token store from disk
 */
function readTokenStore(): TokenStore {
  ensureDataDir();
  
  if (!fs.existsSync(TOKENS_FILE)) {
    return {};
  }
  
  try {
    const data = fs.readFileSync(TOKENS_FILE, 'utf-8');
    return JSON.parse(data) as TokenStore;
  } catch (error) {
    console.error('Error reading token store:', error);
    return {};
  }
}

/**
 * Write the token store to disk
 */
function writeTokenStore(store: TokenStore): void {
  ensureDataDir();
  
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing token store:', error);
    throw error;
  }
}

/**
 * Save tokens for a user
 */
export function saveTokens(userId: string, tokens: OAuth2Tokens, email: string): void {
  const store = readTokenStore();
  const now = new Date().toISOString();
  
  store[userId] = {
    tokens,
    email,
    createdAt: store[userId]?.createdAt || now,
    updatedAt: now,
  };
  
  writeTokenStore(store);
  console.log(`Tokens saved for user: ${userId}`);
}

/**
 * Get tokens for a user
 */
export function getTokens(userId: string): StoredTokenData | null {
  const store = readTokenStore();
  return store[userId] || null;
}

/**
 * Delete tokens for a user
 */
export function deleteTokens(userId: string): boolean {
  const store = readTokenStore();
  
  if (store[userId]) {
    delete store[userId];
    writeTokenStore(store);
    console.log(`Tokens deleted for user: ${userId}`);
    return true;
  }
  
  return false;
}

/**
 * Check if user has valid tokens (not expired)
 */
export function hasValidTokens(userId: string): boolean {
  const data = getTokens(userId);
  
  if (!data || !data.tokens) {
    return false;
  }
  
  // Check if access token exists
  if (!data.tokens.access_token) {
    return false;
  }
  
  // Check expiry if available
  if (data.tokens.expiry_date) {
    const now = Date.now();
    // Consider token invalid if it expires within 5 minutes
    const bufferMs = 5 * 60 * 1000;
    if (data.tokens.expiry_date - bufferMs < now) {
      // Token is expired or about to expire
      // But if we have a refresh token, we can still use it
      return !!data.tokens.refresh_token;
    }
  }
  
  return true;
}

/**
 * Update tokens after refresh
 */
export function updateTokens(userId: string, newTokens: Partial<OAuth2Tokens>): void {
  const data = getTokens(userId);
  
  if (!data) {
    throw new Error(`No existing tokens for user: ${userId}`);
  }
  
  const updatedTokens: OAuth2Tokens = {
    ...data.tokens,
    ...newTokens,
  };
  
  saveTokens(userId, updatedTokens, data.email);
}

/**
 * Get all user IDs with stored tokens
 */
export function getAllUserIds(): string[] {
  const store = readTokenStore();
  return Object.keys(store);
}

/**
 * Get user ID by email (for looking up during OAuth callback)
 */
export function getUserIdByEmail(email: string): string | null {
  const store = readTokenStore();
  
  for (const [userId, data] of Object.entries(store)) {
    if (data.email === email) {
      return userId;
    }
  }
  
  return null;
}

/**
 * Clean up expired tokens (utility function)
 */
export function cleanupExpiredTokens(): number {
  const store = readTokenStore();
  let removedCount = 0;
  const now = Date.now();
  
  for (const [userId, data] of Object.entries(store)) {
    // Remove if no refresh token and access token is expired
    if (data.tokens.expiry_date && data.tokens.expiry_date < now && !data.tokens.refresh_token) {
      delete store[userId];
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    writeTokenStore(store);
    console.log(`Cleaned up ${removedCount} expired tokens`);
  }
  
  return removedCount;
}

