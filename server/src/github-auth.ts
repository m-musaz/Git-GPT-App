import { GitHubTokens, GitHubUser } from './types.js';
import { getGitHubTokens, saveGitHubTokens, deleteGitHubTokens } from './token-store.js';

// OAuth2 scopes required for GitHub access
const SCOPES = [
  'read:user',      // Read user profile data
  'read:org',       // Read organization and team membership (for team-based PR reviews)
  'repo',           // Full repo access (required for posting PR reviews)
];

// Get environment variables
function getClientId(): string | undefined {
  return process.env.GITHUB_CLIENT_ID;
}

function getClientSecret(): string | undefined {
  return process.env.GITHUB_CLIENT_SECRET;
}

function getRedirectUri(): string | undefined {
  return process.env.GITHUB_REDIRECT_URI;
}

/**
 * Validate that all required GitHub OAuth environment variables are set
 */
export function validateGitHubConfig(): boolean {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing required GitHub OAuth environment variables:');
    if (!clientId) console.error('  - GITHUB_CLIENT_ID');
    if (!clientSecret) console.error('  - GITHUB_CLIENT_SECRET');
    if (!redirectUri) console.error('  - GITHUB_REDIRECT_URI');
    return false;
  }
  return true;
}

/**
 * Generate the GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(state?: string): string {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();

  if (!clientId || !redirectUri) {
    throw new Error('GitHub OAuth configuration is incomplete');
  }

  const scope = encodeURIComponent(SCOPES.join(' '));
  const redirect = encodeURIComponent(redirectUri);

  let authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirect}`;

  if (state) {
    authUrl += `&state=${encodeURIComponent(state)}`;
  }

  return authUrl;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForTokens(code: string): Promise<GitHubTokens> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GitHub OAuth configuration is incomplete');
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json() as any;

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    if (!data.access_token) {
      throw new Error('No access token received from GitHub');
    }

    const tokens: GitHubTokens = {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      scope: data.scope || SCOPES.join(' '),
    };

    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Get authenticated GitHub user info using fetch (no Octokit dependency)
 */
export async function getGitHubUserInfo(accessToken: string): Promise<GitHubUser> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Git-GPT-App',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      id: data.id,
      login: data.login,
      name: data.name || undefined,
      email: data.email || undefined,
      avatar_url: data.avatar_url,
    };
  } catch (error) {
    console.error('Error fetching GitHub user info:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback and save tokens
 */
export async function handleGitHubOAuthCallback(
  code: string,
  userId: string
): Promise<{ user: GitHubUser }> {
  const tokens = await exchangeCodeForTokens(code);
  const user = await getGitHubUserInfo(tokens.access_token);

  // Save tokens
  saveGitHubTokens(userId, tokens, user);

  return { user };
}

/**
 * Check if a user is authenticated with GitHub
 */
export function isGitHubAuthenticated(userId: string): boolean {
  const storedData = getGitHubTokens(userId);
  return !!storedData && !!storedData.tokens && !!storedData.tokens.access_token;
}

/**
 * Get the GitHub user for an authenticated user
 */
export function getGitHubUser(userId: string): GitHubUser | null {
  const storedData = getGitHubTokens(userId);
  return storedData?.user || null;
}

/**
 * Revoke/logout GitHub for a user
 */
export function revokeGitHubTokens(userId: string): boolean {
  return deleteGitHubTokens(userId);
}
