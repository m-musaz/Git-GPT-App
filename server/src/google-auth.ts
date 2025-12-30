import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { OAuth2Tokens } from './types.js';
import { getTokens, saveTokens, updateTokens } from './token-store.js';

// OAuth2 scopes required for Calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Get environment variables (read lazily to allow dotenv to load first)
function getClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID;
}

function getClientSecret(): string | undefined {
  return process.env.GOOGLE_CLIENT_SECRET;
}

function getRedirectUri(): string | undefined {
  return process.env.GOOGLE_REDIRECT_URI;
}

/**
 * Validate that all required environment variables are set
 */
export function validateConfig(): boolean {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing required Google OAuth environment variables:');
    if (!clientId) console.error('  - GOOGLE_CLIENT_ID');
    if (!clientSecret) console.error('  - GOOGLE_CLIENT_SECRET');
    if (!redirectUri) console.error('  - GOOGLE_REDIRECT_URI');
    return false;
  }
  return true;
}

/**
 * Create a new OAuth2 client instance
 */
export function createOAuth2Client(): OAuth2Client {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth configuration is incomplete');
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the OAuth consent URL
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    scope: SCOPES,
    prompt: 'consent', // Force consent to ensure we get refresh token
    state: state || '',
  });
  
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  tokens: OAuth2Tokens;
  email: string;
}> {
  const oauth2Client = createOAuth2Client();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }
    
    // Set credentials to get user info
    oauth2Client.setCredentials(tokens);
    
    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;
    
    if (!email) {
      throw new Error('Could not retrieve user email');
    }
    
    const oauth2Tokens: OAuth2Tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      scope: tokens.scope || SCOPES.join(' '),
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || undefined,
    };
    
    return { tokens: oauth2Tokens, email };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuth2Tokens> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('No access token received during refresh');
    }
    
    const tokens: OAuth2Tokens = {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refreshToken, // Keep old refresh token if not provided
      scope: credentials.scope || SCOPES.join(' '),
      token_type: credentials.token_type || 'Bearer',
      expiry_date: credentials.expiry_date || undefined,
    };
    
    return tokens;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Get an authorized OAuth2 client for a user
 * Automatically refreshes token if needed
 */
export async function getAuthorizedClient(userId: string): Promise<OAuth2Client> {
  const storedData = getTokens(userId);
  
  if (!storedData || !storedData.tokens) {
    throw new Error(`No tokens found for user: ${userId}`);
  }
  
  const oauth2Client = createOAuth2Client();
  let tokens = storedData.tokens;
  
  // Check if token needs refresh
  if (tokens.expiry_date) {
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer
    
    if (tokens.expiry_date - bufferMs < now) {
      // Token expired or about to expire, refresh it
      if (!tokens.refresh_token) {
        throw new Error('Access token expired and no refresh token available');
      }
      
      console.log(`Refreshing expired token for user: ${userId}`);
      tokens = await refreshAccessToken(tokens.refresh_token);
      
      // Update stored tokens
      updateTokens(userId, tokens);
    }
  }
  
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });
  
  return oauth2Client;
}

/**
 * Revoke tokens for a user (logout)
 */
export async function revokeTokens(userId: string): Promise<boolean> {
  const storedData = getTokens(userId);
  
  if (!storedData || !storedData.tokens) {
    return false;
  }
  
  const oauth2Client = createOAuth2Client();
  
  try {
    await oauth2Client.revokeToken(storedData.tokens.access_token);
    return true;
  } catch (error) {
    console.error('Error revoking token:', error);
    // Return true anyway as we'll delete locally
    return true;
  }
}

/**
 * Handle OAuth callback and save tokens
 */
export async function handleOAuthCallback(
  code: string,
  userId: string
): Promise<{ email: string }> {
  const { tokens, email } = await exchangeCodeForTokens(code);
  
  // Save tokens
  saveTokens(userId, tokens, email);
  
  return { email };
}

/**
 * Check if a user is authenticated
 */
export function isAuthenticated(userId: string): boolean {
  const storedData = getTokens(userId);
  return !!storedData && !!storedData.tokens && !!storedData.tokens.access_token;
}

/**
 * Get the email for an authenticated user
 */
export function getUserEmail(userId: string): string | null {
  const storedData = getTokens(userId);
  return storedData?.email || null;
}

