/**
 * OAuth 2.1 implementation for ChatGPT MCP authentication
 * Supports:
 * - Client Credentials flow
 * - Authorization Code flow with PKCE
 * - Dynamic Client Registration (RFC 7591)
 */

import crypto from 'crypto';

// ============================================
// Types
// ============================================

interface RegisteredClient {
  client_id: string;
  client_secret: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  created_at: number;
}

interface IssuedToken {
  expiresAt: number;
  clientId: string;
  scope?: string;
  refreshToken?: string; // Link to refresh token
  resource?: string; // Resource parameter (audience)
}

interface RefreshToken {
  expiresAt: number;
  clientId: string;
  scope?: string;
  accessToken?: string; // Currently linked access token
  resource?: string; // Resource parameter (audience)
}

interface AuthorizationCode {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
  scope?: string;
  resource?: string; // Resource parameter (audience)
}

// ============================================
// Storage (in production, use Redis or database)
// ============================================

// Registered OAuth clients
const registeredClients: Map<string, RegisteredClient> = new Map();

// Issued access tokens
const issuedTokens: Map<string, IssuedToken> = new Map();

// Issued refresh tokens
const refreshTokens: Map<string, RefreshToken> = new Map();

// Authorization codes (for auth code flow)
const authorizationCodes: Map<string, AuthorizationCode> = new Map();

// Token expiration time (1 hour)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// Refresh token expiration (30 days)
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Auth code expiration (10 minutes)
const AUTH_CODE_EXPIRY_MS = 10 * 60 * 1000;

// ============================================
// Default/Fallback Client
// ============================================

/**
 * Get default OAuth credentials from environment variables
 */
export function getOAuthCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.MCP_OAUTH_CLIENT_ID || 'chatgpt-mcp-client';
  const clientSecret = process.env.MCP_OAUTH_CLIENT_SECRET || 'chatgpt-mcp-secret-key-2024';
  return { clientId, clientSecret };
}

// Initialize default client
function initializeDefaultClient(): void {
  const { clientId, clientSecret } = getOAuthCredentials();
  if (!registeredClients.has(clientId)) {
    registeredClients.set(clientId, {
      client_id: clientId,
      client_secret: clientSecret,
      client_name: 'Default MCP Client',
      redirect_uris: ['https://chatgpt.com/aip/g-*/oauth/callback', 'https://chatgpt.com/connector_platform_oauth_redirect', 'https://platform.openai.com/apps-manage/oauth'],
      grant_types: ['authorization_code', 'client_credentials', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      created_at: Date.now(),
    });
  }
}

// Initialize on module load
initializeDefaultClient();

// ============================================
// Dynamic Client Registration (RFC 7591)
// ============================================

export interface ClientRegistrationRequest {
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
}

export interface ClientRegistrationResponse {
  client_id: string;
  client_secret: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  client_id_issued_at: number;
  client_secret_expires_at: number;
}

/**
 * Register a new OAuth client dynamically
 */
export function registerClient(request: ClientRegistrationRequest): ClientRegistrationResponse {
  const clientId = `client_${crypto.randomBytes(16).toString('hex')}`;
  const clientSecret = crypto.randomBytes(32).toString('hex');
  
  const client: RegisteredClient = {
    client_id: clientId,
    client_secret: clientSecret,
    client_name: request.client_name || 'Dynamic Client',
    redirect_uris: request.redirect_uris || ['https://chatgpt.com/aip/g-*/oauth/callback'],
    grant_types: request.grant_types || ['authorization_code'],
    response_types: request.response_types || ['code'],
    token_endpoint_auth_method: request.token_endpoint_auth_method || 'client_secret_post',
    created_at: Date.now(),
  };
  
  registeredClients.set(clientId, client);
  console.log(`Registered new OAuth client: ${clientId}`);
  
  return {
    client_id: clientId,
    client_secret: clientSecret,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
    grant_types: client.grant_types,
    response_types: client.response_types,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
    client_id_issued_at: Math.floor(client.created_at / 1000),
    client_secret_expires_at: 0, // Never expires
  };
}

/**
 * Get a registered client by ID
 */
export function getClient(clientId: string): RegisteredClient | undefined {
  return registeredClients.get(clientId);
}

// ============================================
// Client Validation
// ============================================

/**
 * Validate client credentials
 */
export function validateClientCredentials(clientId: string, clientSecret: string): boolean {
  const client = registeredClients.get(clientId);
  if (client) {
    return client.client_secret === clientSecret;
  }
  
  // Fallback to env-based credentials
  const { clientId: envId, clientSecret: envSecret } = getOAuthCredentials();
  return clientId === envId && clientSecret === envSecret;
}

/**
 * Validate client exists (for auth code flow without secret)
 */
export function validateClientId(clientId: string): boolean {
  if (registeredClients.has(clientId)) {
    return true;
  }
  const { clientId: envId } = getOAuthCredentials();
  return clientId === envId;
}

// ============================================
// Authorization Codes (for PKCE flow)
// ============================================

/**
 * Generate an authorization code
 */
export function generateAuthorizationCode(
  clientId: string,
  redirectUri: string,
  codeChallenge?: string,
  codeChallengeMethod?: string,
  scope?: string,
  resource?: string
): string {
  const code = crypto.randomBytes(32).toString('hex');
  
  authorizationCodes.set(code, {
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    expiresAt: Date.now() + AUTH_CODE_EXPIRY_MS,
    scope,
    resource,
  });
  
  return code;
}

/**
 * Validate and consume an authorization code
 */
export function validateAuthorizationCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string
): { valid: boolean; error?: string; scope?: string; resource?: string } {
  const authCode = authorizationCodes.get(code);
  
  if (!authCode) {
    return { valid: false, error: 'Invalid authorization code' };
  }
  
  // Check expiration
  if (Date.now() > authCode.expiresAt) {
    authorizationCodes.delete(code);
    return { valid: false, error: 'Authorization code expired' };
  }
  
  // Check client ID
  if (authCode.clientId !== clientId) {
    return { valid: false, error: 'Client ID mismatch' };
  }
  
  // Check redirect URI
  if (authCode.redirectUri !== redirectUri) {
    return { valid: false, error: 'Redirect URI mismatch' };
  }
  
  // Validate PKCE if code challenge was provided
  if (authCode.codeChallenge && authCode.codeChallengeMethod === 'S256') {
    if (!codeVerifier) {
      return { valid: false, error: 'Code verifier required' };
    }
    
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    if (hash !== authCode.codeChallenge) {
      return { valid: false, error: 'Invalid code verifier' };
    }
  }
  
  // Consume the code (one-time use)
  authorizationCodes.delete(code);
  
  return { valid: true, scope: authCode.scope, resource: authCode.resource };
}

// ============================================
// Access Tokens & Refresh Tokens
// ============================================

/**
 * Generate an access token (legacy - for backward compatibility)
 */
export function generateAccessToken(clientId: string, scope?: string, resource?: string): string {
  const { accessToken } = generateTokenPair(clientId, scope, resource);
  return accessToken;
}

/**
 * Generate both access token and refresh token
 */
export function generateTokenPair(
  clientId: string, 
  scope?: string,
  resource?: string
): { 
  accessToken: string; 
  refreshToken: string;
} {
  const accessToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');
  
  const accessExpiresAt = Date.now() + TOKEN_EXPIRY_MS;
  const refreshExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRY_MS;
  
  // Store access token with link to refresh token
  issuedTokens.set(accessToken, { 
    expiresAt: accessExpiresAt, 
    clientId, 
    scope,
    resource,
    refreshToken 
  });
  
  // Store refresh token with link to access token
  refreshTokens.set(refreshToken, { 
    expiresAt: refreshExpiresAt, 
    clientId, 
    scope,
    resource,
    accessToken 
  });
  
  // Clean up expired tokens periodically
  cleanupExpiredTokens();
  
  return { accessToken, refreshToken };
}

/**
 * Validate an access token
 */
export function validateAccessToken(token: string): boolean {
  const tokenData = issuedTokens.get(token);
  
  if (!tokenData) {
    return false;
  }
  
  if (Date.now() > tokenData.expiresAt) {
    issuedTokens.delete(token);
    return false;
  }
  
  return true;
}

/**
 * Validate a refresh token and return its data
 */
export function validateRefreshToken(token: string): { 
  valid: boolean; 
  clientId?: string; 
  scope?: string;
  resource?: string;
  error?: string;
} {
  const tokenData = refreshTokens.get(token);
  
  if (!tokenData) {
    return { valid: false, error: 'Invalid refresh token' };
  }
  
  if (Date.now() > tokenData.expiresAt) {
    refreshTokens.delete(token);
    return { valid: false, error: 'Refresh token expired' };
  }
  
  return { 
    valid: true, 
    clientId: tokenData.clientId, 
    scope: tokenData.scope,
    resource: tokenData.resource
  };
}

/**
 * Revoke a refresh token and its linked access token
 */
export function revokeRefreshToken(token: string): void {
  const tokenData = refreshTokens.get(token);
  
  if (tokenData && tokenData.accessToken) {
    // Revoke the linked access token
    issuedTokens.delete(tokenData.accessToken);
  }
  
  // Revoke the refresh token
  refreshTokens.delete(token);
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  
  // Clean up expired access tokens
  for (const [token, data] of issuedTokens.entries()) {
    if (now > data.expiresAt) {
      issuedTokens.delete(token);
    }
  }
  
  // Clean up expired refresh tokens
  for (const [token, data] of refreshTokens.entries()) {
    if (now > data.expiresAt) {
      refreshTokens.delete(token);
    }
  }
  
  // Clean up expired auth codes
  for (const [code, data] of authorizationCodes.entries()) {
    if (now > data.expiresAt) {
      authorizationCodes.delete(code);
    }
  }
}

// ============================================
// Utilities
// ============================================

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Get token response (with refresh token)
 */
export function getTokenResponse(
  accessToken: string, 
  refreshToken: string,
  scope?: string
): {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope?: string;
} {
  const response: any = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: Math.floor(TOKEN_EXPIRY_MS / 1000),
    refresh_token: refreshToken,
  };
  
  if (scope) {
    response.scope = scope;
  }
  
  return response;
}
