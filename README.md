# ChatGPT Reservations Manager

A ChatGPT app that helps you manage pending Google Calendar invitations directly from within ChatGPT conversations. Built using OpenAI's Apps SDK with the Model Context Protocol (MCP), featuring multi-user support and a unified React widget interface.

## Features

- 🗓️ **View Pending Invitations** - See all calendar invites awaiting your response
- ✅ **Quick Actions** - Accept, decline, or mark invitations as tentative with one click
- 💬 **Natural Language** - Interact with your calendar through ChatGPT conversations
- 🔐 **Secure OAuth 2.1** - Google Calendar authentication with automatic token refresh
- 🔄 **Refresh Token Support** - Long-lived sessions with automatic token rotation (30 days)
- 👥 **Multi-User Support** - Each ChatGPT user has their own isolated authentication and data
- 🎨 **Modern UI** - Beautiful, theme-aware widget with 3D card effects and dark/light mode
- 🔄 **Real-time Updates** - Refresh invites on-demand with a single click
- 🚀 **Single-Page Widget** - Unified React Router-based interface for seamless navigation
- 🛡️ **OAuth 2.1 Compliant** - Full MCP authorization spec with PKCE, refresh tokens, and discovery endpoints

---

## Architecture Overview

### Backend (Express + MCP Server)

```
┌─────────────────────────────────────────────────────────────┐
│                         ChatGPT                              │
│  (Sends MCP requests with openai/subject as user ID)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ MCP Protocol (OAuth 2.1 Protected)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  MCP OAuth Layer (mcp-oauth.ts)                       │  │
│  │  - Client credentials validation                      │  │
│  │  - Access token + refresh token generation           │  │
│  │  - Authorization code flow with PKCE                  │  │
│  │  - Refresh token rotation (30-day expiry)            │  │
│  │  - Resource parameter handling                       │  │
│  │  - OAuth 2.1 discovery endpoints                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  MCP Server (mcp-server.ts)                           │  │
│  │  - Handles tool calls (get_pending_reservations,      │  │
│  │    check_auth_status, respond_to_invite)              │  │
│  │  - Serves widget HTML resource                        │  │
│  │  - Extracts user ID from openai/subject               │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Google Auth (google-auth.ts)                         │  │
│  │  - OAuth 2.0 flow with Google                         │  │
│  │  - Token refresh logic                                │  │
│  │  - Per-user authentication state                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Token Store (token-store.ts)                         │  │
│  │  - JSON-based token storage                           │  │
│  │  - Multi-user token management                        │  │
│  │  - Automatic token cleanup                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Calendar Service (calendar-service.ts)               │  │
│  │  - Fetches pending invitations from Google Calendar   │  │
│  │  - Updates RSVP status                                │  │
│  │  - Filters events by user response status             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Frontend (React Widget)

```
┌─────────────────────────────────────────────────────────────┐
│              ChatGPT Widget Container (iframe)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CalendarWidget.tsx (React Router)                    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  WidgetContext (Global State)                   │  │  │
│  │  │  - authData: Authentication state               │  │  │
│  │  │  - invitesData: List of pending invites         │  │  │
│  │  │  - theme: dark/light mode                       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Routes:                                         │  │  │
│  │  │  - / (AuthView)                                  │  │  │
│  │  │    • Not connected: Show Google sign-in         │  │  │
│  │  │    • Connected: Show status + "View Invites"    │  │  │
│  │  │                                                  │  │  │
│  │  │  - /invites (InvitesView)                       │  │  │
│  │  │    • List of pending invitations                │  │  │
│  │  │    • Accept/Decline/Maybe buttons               │  │  │
│  │  │    • Refresh button                             │  │  │
│  │  │    • Inline response status                     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  useOpenAI Hook                                  │  │  │
│  │  │  - window.openai API integration                │  │  │
│  │  │  - callTool() for MCP tool calls                │  │  │
│  │  │  - openExternal() for OAuth flow                │  │  │
│  │  │  - theme detection                              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Backend Flow

#### 1. **MCP Connection Initialization**
```typescript
// ChatGPT connects to the MCP server
POST /mcp
Authorization: Bearer <access_token>

// Server validates OAuth token and establishes connection
// Returns server capabilities and available tools
```

#### 2. **User Identification (Multi-User Support)**
```typescript
// Every MCP request includes user ID in metadata
{
  "_meta": {
    "openai/subject": "v1/lCfSEYFrY4Wl6KfrK0Oa7ucHW4p9rUXYcYgFLv6xWNjJ08m5eF3W6l"
  }
}

// Server extracts user ID
function extractUserId(params: any): string {
  return params._meta?.['openai/subject'] || DEFAULT_USER_ID;
}

// All operations are scoped to this user ID
```

#### 3. **Authentication Flow**
```typescript
// Step 1: Check if user is authenticated
check_auth_status() → { authenticated: false, authUrl: "..." }

// Step 2: User clicks "Connect with Google"
openExternal({ href: authUrl }) // Opens Google OAuth consent

// Step 3: Google redirects to callback with auth code
GET /oauth/callback?code=...&state=<userId>

// Step 4: Exchange code for tokens
const { tokens, email } = await exchangeCodeForTokens(code);

// Step 5: Save tokens with user ID
saveTokens(userId, tokens, email);

// Step 6: Widget polls for auth status
check_auth_status() → { authenticated: true, email: "user@example.com" }
```

#### 4. **Fetching Pending Invitations**
```typescript
// Tool call from ChatGPT
get_pending_reservations({ start_date?, end_date? })

// Server flow:
1. Extract userId from request metadata
2. Check if user is authenticated (has valid tokens)
3. If not authenticated → return { authRequired: true, authUrl: "..." }
4. Get authorized OAuth2 client (auto-refreshes token if expired)
5. Fetch events from Google Calendar API
6. Filter to only events where:
   - User is an attendee
   - User's response status is "needsAction"
   - User is not the organizer
7. Return { invites: [...], dateRange: {...}, totalCount: N }
```

#### 5. **Responding to Invitations**
```typescript
// Tool call from ChatGPT
respond_to_invite({ event_id: "abc123", event_title: "Team Standup", response: "accepted" })

// Server flow:
1. Extract userId from request
2. Get authorized client
3. Fetch event from Google Calendar
4. Update attendee status for this user
5. Patch event with sendUpdates: "all" (notify organizer)
6. Return { success: true, message: "...", newStatus: "accepted" }
```

#### 6. **Token Management**
```typescript
// Automatic token refresh
if (token.expiry_date - 5_minutes < now) {
  // Token expired or about to expire
  const newTokens = await refreshAccessToken(token.refresh_token);
  updateTokens(userId, newTokens);
}

// Token storage structure (data/tokens.json)
{
  "v1/user_id_hash_1": {
    "tokens": {
      "access_token": "...",
      "refresh_token": "...",
      "expiry_date": 1234567890
    },
    "email": "user1@example.com",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "v1/user_id_hash_2": { ... }
}
```

---

### Frontend Flow

#### 1. **Widget Initialization**
```typescript
// CalendarWidget mounts
useOpenAI() // Detects window.openai and reads toolOutput

// Initial data routing
if (toolOutput.invites) → navigate('/invites')
if (toolOutput.authenticated === false) → stay on '/' (AuthView)
if (toolOutput.authenticated === true) → stay on '/' (show connected state)
if (toolOutput.authRequired) → stay on '/' (show sign-in)
```

#### 2. **State Management**
```typescript
// Global state via WidgetContext
const contextValue = {
  theme: 'dark' | 'light',
  isDark: boolean,
  callTool: (name, args) => window.openai.callTool(...),
  openExternal: ({ href }) => window.openai.openExternal(...),
  notifyHeight: () => window.openai.notifyIntrinsicHeight(...),
  setWidgetState: (state) => window.openai.setWidgetState(...),
  authData: { authenticated, email, authUrl },
  setAuthData: (data) => { ... },
  invitesData: { invites, dateRange, totalCount },
  setInvitesData: (data) => { ... }
};

// State persists across route navigation via Context
```

#### 3. **AuthView Component**
```typescript
// Not Connected State
<button onClick={handleConnect}>
  Connect with Google
</button>

function handleConnect() {
  openExternal({ href: authData.authUrl }); // Opens OAuth in new tab
  setIsPolling(true); // Start polling
  
  // Poll every 3 seconds for up to 5 minutes
  setInterval(async () => {
    const result = await callTool('check_auth_status', {});
    if (result.authenticated) {
      setAuthData(result);
      setWidgetState({ authenticated: true, email: result.email });
      setIsPolling(false);
    }
  }, 3000);
}

// Connected State
<button onClick={handleViewInvites}>
  View Pending Invites
</button>

function handleViewInvites() {
  const result = await callTool('get_pending_reservations', {});
  setInvitesData(result);
  navigate('/invites');
}
```

#### 4. **InvitesView Component**
```typescript
// Render list of invites
{invites.map(invite => (
  <InviteCard
    invite={invite}
    onRespond={handleRespond}
  />
))}

// Handle response (inline, no navigation)
async function handleRespond(eventId, response) {
  setStatus('loading');
  await callTool('respond_to_invite', { event_id: eventId, event_title: eventTitle, response });
  setStatus(response); // Show "Accepted", "Declined", or "Maybe"
}

// Refresh invites
async function handleRefresh() {
  const result = await callTool('get_pending_reservations', {});
  setInvitesData(result);
}
```

#### 5. **Theme Handling**
```typescript
// Automatic theme detection from window.openai.theme
const theme = window.openai?.theme || 'light';

// Theme-aware CSS classes
const card = (isDark) => isDark 
  ? 'bg-slate-900 border-slate-700 text-white'
  : 'bg-white border-gray-200 text-gray-900';

// Tailwind dark mode
<div className={isDark ? 'dark' : ''}>
  <div className="dark:bg-slate-900 dark:text-white">
    ...
  </div>
</div>
```

---

## API Endpoints

### MCP Protocol Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /mcp` | POST | OAuth Bearer | Main MCP protocol endpoint. Handles all tool calls and resource requests |

### OAuth 2.1 Endpoints (for ChatGPT)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /.well-known/oauth-authorization-server` | GET | OAuth server metadata (RFC 8414) - Discovery endpoint for ChatGPT |
| `GET /.well-known/oauth-protected-resource` | GET | Protected resource metadata (RFC 9728) - Required for MCP |
| `GET /.well-known/openid-configuration` | GET | OpenID Connect discovery (optional) |
| `POST /oauth/register` | POST | Dynamic client registration (RFC 7591) |
| `GET /oauth/authorize` | GET | Authorization endpoint with PKCE + resource parameter support |
| `POST /oauth/token` | POST | Token endpoint (supports `authorization_code`, `client_credentials`, `refresh_token` grants) |
| `GET /oauth/credentials` | GET | Display OAuth credentials for setup |

### Google OAuth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /auth/google` | GET | Initiate Google OAuth flow (redirects to Google) |
| `GET /oauth/callback` | GET | Google OAuth callback handler. Exchanges code for tokens |
| `GET /auth/status` | GET | Check if current user is authenticated (for testing) |
| `POST /auth/logout` | POST | Revoke tokens and log out user |

### Utility Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /health` | GET | Health check endpoint |
| `GET /` | GET | Server info and status page |

---

## OAuth 2.1 Implementation

### Overview

This app implements **full OAuth 2.1 compliance** for both ChatGPT authentication (MCP OAuth) and Google Calendar access. It supports long-lived sessions through refresh tokens, automatic token rotation, and comprehensive security policies.

### Two OAuth Layers

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: MCP OAuth (ChatGPT ↔ Your Server)        │
│  - Authenticates ChatGPT to access MCP tools        │
│  - Issues: access_token (1h) + refresh_token (30d) │
│  - Supports: client_credentials, authorization_code,│
│             refresh_token grants                    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: Google OAuth (Your Server ↔ Google)      │
│  - Authenticates users to access Google Calendar   │
│  - Issues: access_token (1h) + refresh_token       │
│  - Auto-refreshes before expiration                 │
│  - Per-user token storage and management           │
└─────────────────────────────────────────────────────┘
```

### Discovery Endpoints

#### 1. OAuth Authorization Server Metadata
**Endpoint:** `GET /.well-known/oauth-authorization-server`

```json
{
  "issuer": "https://your-app.railway.app",
  "authorization_endpoint": "https://your-app.railway.app/oauth/authorize",
  "token_endpoint": "https://your-app.railway.app/oauth/token",
  "registration_endpoint": "https://your-app.railway.app/oauth/register",
  "token_endpoint_auth_methods_supported": [
    "client_secret_post",
    "client_secret_basic",
    "none"
  ],
  "grant_types_supported": [
    "authorization_code",
    "client_credentials",
    "refresh_token"
  ],
  "response_types_supported": ["code"],
  "scopes_supported": [
    "calendar:read",
    "calendar:write",
    "mcp"
  ],
  "code_challenge_methods_supported": ["S256"]
}
```

**Purpose:** ChatGPT uses this endpoint to discover your OAuth configuration automatically.

#### 2. Protected Resource Metadata
**Endpoint:** `GET /.well-known/oauth-protected-resource`

```json
{
  "resource": "https://your-app.railway.app",
  "authorization_servers": ["https://your-app.railway.app"],
  "scopes_supported": [
    "calendar:read",
    "calendar:write",
    "mcp"
  ],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://your-app.railway.app/docs"
}
```

**Purpose:** Required by MCP spec (RFC 9728). Tells ChatGPT where to authenticate and what scopes are available.

### Token Lifecycle

#### Access Token + Refresh Token Pair

```typescript
// Token Response
{
  "access_token": "abc123...",      // Short-lived (1 hour)
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "xyz789...",     // Long-lived (30 days)
  "scope": "calendar:read calendar:write"
}
```

#### Flow Diagram

```
1. Initial Authentication
   ↓
   POST /oauth/token (grant_type=authorization_code)
   ↓
   Issues: { access_token (1h), refresh_token (30d) }

2. Use Access Token (repeated API calls)
   ↓
   Authorization: Bearer abc123...
   ↓
   Valid for 1 hour

3. Access Token Expires
   ↓
   ChatGPT automatically calls:
   POST /oauth/token (grant_type=refresh_token)
   ↓
   Server validates refresh token
   ↓
   Issues: { new_access_token (1h), new_refresh_token (30d) }
   ↓
   Old refresh token is revoked (token rotation)

4. Repeat Step 2-3 for up to 30 days

5. Refresh Token Expires (after 30 days)
   ↓
   User must re-authenticate from scratch
```

### Refresh Token Implementation

**Storage:**
```typescript
// In-memory storage (production should use Redis/database)
const refreshTokens: Map<string, RefreshToken> = new Map();

interface RefreshToken {
  expiresAt: number;           // 30 days from issuance
  clientId: string;
  scope?: string;
  resource?: string;           // Audience claim
  accessToken?: string;        // Currently linked access token
}
```

**Refresh Token Grant Handler:**
```typescript
// POST /oauth/token with grant_type=refresh_token
if (grant_type === 'refresh_token') {
  // 1. Validate refresh token
  const validation = validateRefreshToken(refresh_token);
  if (!validation.valid) {
    return 401 Unauthorized;
  }
  
  // 2. Verify client matches
  if (validation.clientId !== client_id) {
    return 401 Unauthorized;
  }
  
  // 3. Revoke old refresh token (security best practice)
  revokeRefreshToken(refresh_token);
  
  // 4. Generate new token pair
  const { accessToken, refreshToken } = generateTokenPair(
    client_id,
    validation.scope,
    validation.resource
  );
  
  // 5. Return new tokens
  return {
    access_token: accessToken,
    refresh_token: refreshToken,  // New refresh token!
    expires_in: 3600
  };
}
```

**Security Features:**
- ✅ Token rotation: Old refresh token is revoked on use
- ✅ Client validation: Refresh token can only be used by issuing client
- ✅ Scope preservation: New tokens maintain original scopes
- ✅ Expiration: Refresh tokens expire after 30 days
- ✅ Resource binding: Tokens are bound to specific resource (audience)

### Resource Parameter Handling

Per MCP spec, the `resource` parameter identifies the protected resource (your MCP server) and is echoed throughout the OAuth flow:

```
1. Authorization Request
   GET /oauth/authorize?resource=https://your-app.railway.app&...
   ↓
   Server stores resource with authorization code

2. Token Request
   POST /oauth/token
   {
     "grant_type": "authorization_code",
     "code": "abc123",
     "resource": "https://your-app.railway.app"
   }
   ↓
   Server validates resource matches authorization code
   ↓
   Embeds resource in access token (as audience claim)

3. API Calls
   Authorization: Bearer <access_token>
   ↓
   Server validates token audience matches its own URL
```

**Implementation:**
```typescript
// Generate tokens with resource
const { accessToken, refreshToken } = generateTokenPair(
  clientId,
  scope,
  resource  // ← Stored in token as audience
);

// Validate tokens
if (token.resource !== expectedResource) {
  return 401 Unauthorized; // Token not for this server
}
```

### Tool Security Schemes

Each MCP tool declares its authentication requirements via `securitySchemes`:

```typescript
// get_pending_reservations - Requires OAuth with calendar:read scope
{
  name: 'get_pending_reservations',
  securitySchemes: [
    { type: 'oauth2', scopes: ['calendar:read'] }
  ]
}

// respond_to_invite - Requires OAuth with calendar:write scope
{
  name: 'respond_to_invite',
  securitySchemes: [
    { type: 'oauth2', scopes: ['calendar:write'] }
  ]
}

// check_auth_status - No authentication required (private visibility)
{
  name: 'check_auth_status',
  securitySchemes: [
    { type: 'noauth' }
  ],
  _meta: {
    'openai/visibility': 'private' // Only widget can call this
  }
}
```

**Benefits:**
- ChatGPT knows which tools require authentication
- Clear scope requirements for each operation
- Can mix authenticated and non-authenticated tools
- Better security and UX (prompts only when needed)

### WWW-Authenticate Headers

When MCP requests fail due to missing/invalid auth, the server returns RFC 9728-compliant headers:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://your-app.railway.app/.well-known/oauth-protected-resource",
                         error="insufficient_scope",
                         error_description="Authentication required"
```

This tells ChatGPT:
1. Where to find resource metadata
2. Why the request failed
3. How to fix it (initiate OAuth flow)

### Dynamic Client Registration (DCR)

**Endpoint:** `POST /oauth/register`

```json
// Request
{
  "client_name": "ChatGPT MCP Client",
  "redirect_uris": [
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "https://platform.openai.com/apps-manage/oauth"
  ],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "client_secret_post"
}

// Response
{
  "client_id": "generated-client-id-123",
  "client_secret": "generated-secret-456",
  "client_id_issued_at": 1640000000,
  "client_secret_expires_at": 0,  // Never expires
  // ... echoes request fields
}
```

**Note:** Currently, ChatGPT uses DCR per session. The MCP spec is moving toward Client Metadata Documents (CMID) for stable client identity.

### Google Calendar Token Management

Separate from MCP OAuth, the app manages Google OAuth tokens per user:

**Automatic Refresh:**
```typescript
// Before every Google Calendar API call
export async function getAuthorizedClient(userId: string): Promise<OAuth2Client> {
  const tokens = getTokens(userId);
  
  // Check if token expires within 5 minutes
  if (tokens.expiry_date - (5 * 60 * 1000) < Date.now()) {
    // Auto-refresh
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    updateTokens(userId, newTokens);
  }
  
  return oauth2Client;
}
```

**Storage:**
```json
// data/tokens.json
{
  "v1/user_id_hash": {
    "tokens": {
      "access_token": "ya29.a0...",
      "refresh_token": "1//0g...",
      "expiry_date": 1703012345000,
      "scope": "https://www.googleapis.com/auth/calendar.events ...",
      "token_type": "Bearer"
    },
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### PKCE (Proof Key for Code Exchange)

The app supports PKCE (RFC 7636) for enhanced security in the authorization code flow:

```
1. Client generates code_verifier (random string)
   ↓
2. Client computes code_challenge = BASE64URL(SHA256(code_verifier))
   ↓
3. Authorization Request
   GET /oauth/authorize?code_challenge=abc123&code_challenge_method=S256
   ↓
4. Server stores code_challenge with authorization code
   ↓
5. Token Request
   POST /oauth/token
   {
     "code": "xyz789",
     "code_verifier": "original_random_string"
   }
   ↓
6. Server validates: SHA256(code_verifier) === stored_code_challenge
   ↓
7. If valid, issue tokens
```

**Security Benefit:** Even if authorization code is intercepted, attacker cannot exchange it for tokens without the `code_verifier`.

### ChatGPT Production Redirect URIs

The app whitelists ChatGPT's official redirect URIs:

```typescript
redirect_uris: [
  'https://chatgpt.com/connector_platform_oauth_redirect',  // Production
  'https://platform.openai.com/apps-manage/oauth',          // Review/testing
  'https://chatgpt.com/aip/g-*/oauth/callback'              // Legacy pattern
]
```

---

## MCP Tools

### 1. `check_auth_status`

Check if the current user is authenticated with Google Calendar.

**Visibility:** `private` (Hidden from ChatGPT, only accessible by widget for polling auth status)

**Input Schema:**
```json
{}
```

**Output (not authenticated):**
```json
{
  "authenticated": false,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Output (authenticated):**
```json
{
  "authenticated": true,
  "email": "user@example.com"
}
```

**Widget Template:** `ui://widget/calendar-widget.html`

---

### 2. `get_pending_reservations`

Fetch pending calendar invitations that the user hasn't responded to. Automatically prompts for authentication if needed.

**Input Schema:**
```json
{
  "start_date": "2024-01-15T00:00:00Z",  // Optional, defaults to now
  "end_date": "2024-01-30T23:59:59Z"     // Optional, defaults to +14 days
}
```

**Output (authenticated with invites):**
```json
{
  "invites": [
    {
      "eventId": "abc123",
      "summary": "Team Standup",
      "description": "Daily standup meeting",
      "location": "Conference Room A",
      "startTime": "2024-01-16T10:00:00-05:00",
      "endTime": "2024-01-16T10:30:00-05:00",
      "isAllDay": false,
      "organizerEmail": "manager@company.com",
      "organizerName": "Manager Name",
      "attendees": [
        {
          "email": "user@company.com",
          "name": "User Name",
          "status": "needsAction"
        }
      ],
      "calendarLink": "https://www.google.com/calendar/event?eid=..."
    }
  ],
  "dateRange": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-30T23:59:59Z"
  },
  "totalCount": 1
}
```

**Output (not authenticated):**
```json
{
  "authRequired": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "invites": [],
  "totalCount": 0
}
```

**Widget Template:** `ui://widget/calendar-widget.html`

---

### 3. `respond_to_invite`

Accept, decline, or mark a calendar invitation as tentative.

**Input Schema:**
```json
{
  "event_id": "abc123",               // Required
  "event_title": "Team Standup",      // Optional: Used for user-friendly confirmation messages
  "response": "accepted"              // Required: "accepted" | "declined" | "tentative"
}
```

**Output:**
```json
{
  "success": true,
  "message": "You have accepted the invitation \"Team Standup\"",
  "eventId": "abc123",
  "newStatus": "accepted",
  "eventSummary": "Team Standup"
}
```

**Note:** This tool does not show a widget UI - it returns a simple text confirmation.

---

## Project Structure

```
chatgpt-reservations-manager/
├── package.json                 # Root package with npm workspaces
├── railway.json                 # Railway deployment configuration
├── Dockerfile                   # Docker configuration for Railway
├── Procfile                     # Process file for Railway
├── data/
│   └── tokens.json              # Multi-user token storage (auto-created)
├── server/                      # Backend Express + MCP server
│   ├── src/
│   │   ├── index.ts             # Express server entry point
│   │   │                         - Serves MCP endpoint, OAuth endpoints, Google OAuth
│   │   │
│   │   ├── mcp-server.ts        # MCP protocol handler
│   │   │                         - Registers tools and resources
│   │   │                         - Handles tool calls
│   │   │                         - Serves widget HTML
│   │   │                         - Extracts user ID from openai/subject
│   │   │
│   │   ├── mcp-oauth.ts         # OAuth 2.1 implementation for ChatGPT
│   │   │                         - Client credentials validation
│   │   │                         - Access token generation
│   │   │                         - Authorization code flow with PKCE
│   │   │                         - Dynamic client registration
│   │   │
│   │   ├── google-auth.ts       # Google OAuth 2.0 logic
│   │   │                         - Generate auth URLs
│   │   │                         - Exchange code for tokens
│   │   │                         - Refresh expired tokens
│   │   │                         - Per-user authentication
│   │   │
│   │   ├── token-store.ts       # Token persistence layer
│   │   │                         - JSON-based storage
│   │   │                         - Multi-user token management
│   │   │                         - CRUD operations for tokens
│   │   │                         - Automatic cleanup
│   │   │
│   │   ├── calendar-service.ts  # Google Calendar API integration
│   │   │                         - Fetch pending invitations
│   │   │                         - Filter by response status
│   │   │                         - Update RSVP status
│   │   │
│   │   └── types.ts             # TypeScript type definitions
│   │                             - OAuth tokens, Calendar events, MCP types
│   │
│   ├── dist/                    # Compiled JavaScript (generated)
│   ├── package.json
│   └── tsconfig.json
│
└── widget/                      # React widget (embedded in ChatGPT)
    ├── src/
    │   ├── calendar-widget-entry.tsx  # Widget entry point
    │   │
    │   ├── CalendarWidget.tsx         # Main widget component
    │   │                                - React Router setup
    │   │                                - Context provider
    │   │                                - Initial data routing
    │   │
    │   ├── WidgetContext.tsx           # Global state management
    │   │                                - Auth data
    │   │                                - Invites data
    │   │                                - OpenAI SDK methods
    │   │
    │   ├── useOpenAI.ts                # OpenAI SDK hook
    │   │                                - window.openai integration
    │   │                                - callTool, openExternal, etc.
    │   │                                - Theme detection
    │   │
    │   ├── components/
    │   │   ├── AuthView.tsx            # Authentication view
    │   │   │                            - Not connected: Google sign-in
    │   │   │                            - Connected: Status + "View Invites"
    │   │   │                            - OAuth polling
    │   │   │
    │   │   ├── InvitesView.tsx         # Invitations list view
    │   │   │                            - List of pending invites
    │   │   │                            - InviteCard components
    │   │   │                            - Refresh button
    │   │   │                            - Inline response handling
    │   │   │
    │   │   └── index.ts                # Component exports
    │   │
    │   ├── types.ts                    # TypeScript types (widget-specific)
    │   ├── theme.ts                    # Theme utilities and CSS helpers
    │   ├── main.css                    # Tailwind CSS + custom styles
    │   │
    │   ├── preview-entry.tsx           # Local preview entry point
    │   └── PreviewPage.tsx             # Local preview with mock data
    │
    ├── dist/
    │   └── calendar-widget.html        # Bundled widget (served by MCP)
    │
    ├── preview.html                    # Local preview HTML
    ├── build-widgets.js                # Vite build script
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── tsconfig.json
```

---

## Data Flow

### 1. Initial Widget Load

```
ChatGPT → calls tool → MCP Server
                          ↓
                  check_auth_status or get_pending_reservations
                          ↓
              Returns structured data + widget template
                          ↓
        ChatGPT renders widget with initial data
                          ↓
          Widget detects data type and navigates:
          - authRequired → AuthView (/)
          - invites → InvitesView (/invites)
          - authenticated → AuthView (/) connected state
```

### 2. User Authentication Flow

```
User clicks "Connect with Google"
          ↓
Widget calls openExternal(authUrl)
          ↓
Opens new tab with Google OAuth consent
          ↓
User approves → Google redirects to /oauth/callback?code=...&state=userId
          ↓
Server exchanges code for tokens
          ↓
Server saves tokens with userId in data/tokens.json
          ↓
Widget polls check_auth_status every 3 seconds
          ↓
Server returns { authenticated: true, email: "..." }
          ↓
Widget updates state and shows connected UI
```

### 3. Fetching Invitations

```
User clicks "View Pending Invites"
          ↓
Widget calls callTool('get_pending_reservations', {})
          ↓
MCP Server extracts userId from metadata
          ↓
Server checks authentication (loads tokens)
          ↓
If token expired → auto-refresh with refresh_token
          ↓
Server creates authorized Google Calendar client
          ↓
Fetch events from Google Calendar API
          ↓
Filter to pending invites only
          ↓
Return { invites: [...], totalCount: N }
          ↓
Widget navigates to /invites and displays list
```

### 4. Responding to Invitation

```
User clicks "Accept" on an invite
          ↓
Widget calls callTool('respond_to_invite', { event_id, event_title, response })
          ↓
MCP Server extracts userId
          ↓
Server fetches event from Google Calendar
          ↓
Server updates attendee status for this user
          ↓
Server patches event with sendUpdates: 'all'
          ↓
Google notifies organizer of response
          ↓
Server returns { success: true, newStatus: "accepted" }
          ↓
Widget updates InviteCard to show "✓ Accepted" badge
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Google OAuth 2.0 Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback  # Update for production

# Server Configuration
PORT=3000
NODE_ENV=development

# MCP OAuth Credentials (for ChatGPT authentication)
# Optional - defaults provided if not set
MCP_OAUTH_CLIENT_ID=chatgpt-mcp-client
MCP_OAUTH_CLIENT_SECRET=chatgpt-mcp-secret-key-2024

# Widget Base URL (for CSP and resource loading)
# Optional - auto-detected from request in development
WIDGET_BASE_URL=https://your-app.railway.app
```

---

## Local Development

### Installation

```bash
# Install all dependencies (server + widget)
npm install

# Build widget
cd widget
npm run build

# Build server
cd ../server
npm run build
```

### Running Locally

```bash
# Option 1: Start server with MCP stdio transport (for ChatGPT)
cd server
npm run start:mcp

# Option 2: Start server with HTTP (for testing API endpoints)
npm run start

# Option 3: Development mode with auto-rebuild
npm run dev
```

### Widget Development

```bash
# Start local preview server with hot reload
cd widget
npm run dev

# Visit http://localhost:5173 to preview widget with mock data
# Toggle between light/dark themes and different views
```

### Building for Production

```bash
# Build everything
npm run build

# This runs:
# 1. widget build → creates dist/calendar-widget.html
# 2. server build → compiles TypeScript to dist/
```

---

## Google Cloud Project Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "ChatGPT Reservations Manager"
3. Enable Google Calendar API

### Step 2: Configure OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Select "External" user type
3. Fill required fields:
   - **App name**: ChatGPT Reservations Manager
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (during development)

### Step 3: Create OAuth 2.0 Credentials

1. Go to APIs & Services → Credentials
2. Create OAuth client ID → Web application
3. Add authorized origins:
   - `http://localhost:3000` (development)
   - `https://your-app.railway.app` (production)
4. Add redirect URIs:
   - `http://localhost:3000/oauth/callback`
   - `https://your-app.railway.app/oauth/callback`
5. Copy Client ID and Client Secret to `.env`

### Step 4: Publish App (Production)

1. Go to OAuth consent screen
2. Click "Publish App"
3. Submit for verification (if using sensitive scopes)

---

## Railway Deployment

### Step 1: Prepare Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to [Railway.app](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects configuration from `railway.json`

### Step 3: Configure Environment Variables

Add in Railway dashboard Variables tab:

```
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://your-app.railway.app/oauth/callback
PORT=3000
NODE_ENV=production
WIDGET_BASE_URL=https://your-app.railway.app
```

### Step 4: Update Google OAuth Settings

1. Go to Google Cloud Console → Credentials
2. Edit OAuth client
3. Add production URLs:
   - Origin: `https://your-app.railway.app`
   - Redirect URI: `https://your-app.railway.app/oauth/callback`

---

## ChatGPT Integration

### Step 1: Register MCP Server in ChatGPT

1. Open ChatGPT → Settings → Personalization
2. Add MCP server:
   - **Server URL**: `https://your-app.railway.app/mcp`
   - **Authentication**: OAuth 2.1
   - **Client ID**: `chatgpt-mcp-client` (from your MCP_OAUTH_CLIENT_ID)
   - **Client Secret**: `chatgpt-mcp-secret-key-2024` (from MCP_OAUTH_CLIENT_SECRET)
   - **Discovery URL**: `https://your-app.railway.app/.well-known/oauth-authorization-server` (auto-discovered)

**Note:** ChatGPT will automatically discover all OAuth endpoints from the discovery URL. You don't need to manually configure token, authorization, or registration endpoints.

### Step 2: Test in ChatGPT

Try these commands:

- "Show my pending calendar invites"
- "What meetings haven't I responded to?"
- "Do I have any calendar invitations?"
- "Accept the meeting with [person name]"
- "Decline all meetings on Friday"

The widget will automatically appear with your data!

### Step 3: Verify OAuth 2.1 Implementation

Test the OAuth flow:

```bash
# 1. Test discovery endpoint
curl https://your-app.railway.app/.well-known/oauth-authorization-server

# 2. Test protected resource metadata
curl https://your-app.railway.app/.well-known/oauth-protected-resource

# 3. Test token issuance
curl -X POST https://your-app.railway.app/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"chatgpt-mcp-client","client_secret":"your-secret"}'

# 4. Verify refresh token is included in response
# Expected: { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }

# 5. Test refresh token grant
curl -X POST https://your-app.railway.app/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"refresh_token","refresh_token":"<token>","client_id":"chatgpt-mcp-client"}'
```

---

## Multi-User Support

### How It Works

Each ChatGPT user is identified by a unique `openai/subject` ID in the MCP request metadata:

```typescript
{
  "_meta": {
    "openai/subject": "v1/uniqueUserIdHash..."
  }
}
```

**Token Storage:**
- Tokens are stored in `data/tokens.json` keyed by user ID
- Each user has isolated authentication state
- Automatic token refresh per user
- Secure and private - no cross-user data leakage

**Example:**
```json
{
  "v1/user_1_hash": {
    "tokens": { "access_token": "...", ... },
    "email": "user1@gmail.com",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "v1/user_2_hash": {
    "tokens": { "access_token": "...", ... },
    "email": "user2@gmail.com",
    "createdAt": "2024-01-02T00:00:00Z"
  }
}
```

---

## Widget Architecture

### Key Technologies

- **React 18** - UI framework
- **React Router 6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Vite** - Build tool with single-file output
- **OpenAI Apps SDK** - ChatGPT widget integration

### Unified Widget Pattern

Instead of separate HTML files for each view, we use a single widget with React Router:

**Before (legacy):**
- `auth-status.html`
- `pending-invites.html`
- `respond-result.html`

**After (unified):**
- `calendar-widget.html` (single file with React Router)
  - Route `/` → AuthView
  - Route `/invites` → InvitesView

### Benefits

✅ Seamless navigation without page reloads  
✅ Shared state across views via Context  
✅ Smaller bundle size (one React instance)  
✅ Better UX with smooth transitions  
✅ Easier maintenance (single codebase)  

---

## Troubleshooting

### "Resource not found" in ChatGPT

**Problem:** ChatGPT can't find the widget resource  
**Solution:**
1. Disconnect and reconnect MCP server in ChatGPT settings
2. Verify server is running and accessible
3. Check server logs for resource registration
4. Verify widget is built: `cd widget && npm run build`
5. Check `widget/dist/calendar-widget.html` exists

### OAuth Discovery Issues

**Problem:** ChatGPT fails to connect with "Discovery endpoint not found"  
**Solution:**
1. Verify `/.well-known/oauth-authorization-server` is accessible
   ```bash
   curl https://your-app.railway.app/.well-known/oauth-authorization-server
   ```
2. Ensure `/.well-known/oauth-protected-resource` returns valid JSON
3. Check server logs for discovery endpoint hits
4. Verify HTTPS is enabled (required for production)

### MCP OAuth Token Refresh Failures

**Problem:** "Invalid or expired refresh token"  
**Solution:**
1. Check if refresh tokens are being generated (should see `refresh_token` in `/oauth/token` response)
2. Verify refresh token expiry (30 days default)
3. Check server logs for refresh token validation errors
4. Ensure `grant_types_supported` includes `"refresh_token"` in discovery endpoint

### Google OAuth "redirect_uri_mismatch"

**Problem:** Google OAuth fails with redirect URI error  
**Solution:**
1. Ensure `.env` GOOGLE_REDIRECT_URI exactly matches Google Cloud Console
2. Check for trailing slashes
3. Verify protocol (http vs https)
4. Add both development and production URIs to Google Console

### Google Token Refresh Errors

**Problem:** "Access token expired and no refresh token available"  
**Solution:**
1. Delete `data/tokens.json`
2. Re-authenticate in ChatGPT
3. Ensure OAuth consent includes `access_type: 'offline'`
4. Verify Google OAuth scopes include `calendar.events`

### Widget Shows White Screen

**Problem:** Widget doesn't load in ChatGPT  
**Solution:**
1. Check browser console for CSP errors
2. Verify `openai/widgetCSP` configuration in `mcp-server.ts`
3. Ensure widget HTML is valid and bundled correctly
4. Check `connect_domains` includes ChatGPT URLs
5. Verify React bundle loaded (check Network tab)

### Multi-User Issues

**Problem:** Users seeing each other's data  
**Solution:**
1. Verify `openai/subject` is being extracted correctly
2. Check server logs for user ID in tool calls
3. Ensure token-store is using user ID as key
4. Test with two different ChatGPT accounts simultaneously

### PKCE Validation Errors

**Problem:** "Invalid code verifier" during token exchange  
**Solution:**
1. Ensure `code_challenge_method` is `S256` (not `plain`)
2. Verify code verifier is properly base64url encoded
3. Check authorization code hasn't expired (10 minutes)
4. Don't try to reuse authorization codes (single-use only)

### 401 Unauthorized on MCP Requests

**Problem:** All MCP requests return 401  
**Solution:**
1. Check `Authorization: Bearer <token>` header is present
2. Verify token hasn't expired (1 hour)
3. Check WWW-Authenticate response header for details
4. Test token endpoint: `curl -X POST .../oauth/token`
5. Verify client credentials are correct

### Resource Parameter Mismatch

**Problem:** "Token audience does not match resource"  
**Solution:**
1. Ensure `resource` parameter is consistent across OAuth flow
2. Check token issuance logs for resource value
3. Verify server's base URL matches expected resource
4. Use `getBaseUrl(req)` helper for dynamic detection

---

## Security Considerations

### Token Storage

**Google Calendar Tokens:**
- Stored in JSON file (`data/tokens.json`) - suitable for MVP/small deployments
- For production: Consider Redis or encrypted database
- Automatic cleanup of expired tokens
- Per-user isolation with user ID as key

**MCP OAuth Tokens:**
- Stored in-memory (Map) - fast but not persistent across restarts
- Suitable for development and testing
- For production: Implement persistent storage (Redis recommended)
- Access tokens: 1-hour expiry
- Refresh tokens: 30-day expiry with automatic rotation
- Automatic cleanup of expired tokens

### OAuth Flow

- Uses Google OAuth 2.0 with offline access
- Refresh tokens for long-lived sessions
- Automatic token refresh before expiration
- Secure token exchange

### CSP Policy

```typescript
'openai/widgetCSP': {
  connect_domains: ['https://chatgpt.com', baseUrl, 'https://accounts.google.com'],
  resource_domains: [baseUrl, 'https://*.oaistatic.com'],
  redirect_domains: ['https://accounts.google.com'],
}
```

### MCP OAuth 2.1

- Bearer token authentication for all MCP requests
- Client credentials validation
- Authorization code flow with PKCE (S256)
- Dynamic client registration support
- Refresh token issuance and rotation
- Resource parameter handling (audience claims)
- Discovery endpoints (RFC 8414, RFC 9728)
- Token expiration: Access tokens (1h), Refresh tokens (30d)
- Automatic token cleanup

---

## Performance

### Widget Bundle

- Single HTML file with embedded CSS and JS
- Optimized with Vite (tree-shaking, minification)
- Typical size: ~200KB (React + Router + Tailwind)

### API Efficiency

- Token refresh only when needed (5-minute buffer)
- Calendar API: Single request per invitation fetch
- Efficient filtering on server side
- Minimal data transfer

### Caching

- Widget HTML served with MCP resource caching
- Auth state cached in WidgetContext
- No unnecessary re-fetches

---

## Testing

### Manual Testing Checklist

**Authentication Flow:**
- [ ] Initial load shows "Connect with Google"
- [ ] OAuth opens in new tab
- [ ] After approval, widget auto-updates to connected state
- [ ] Email displays correctly
- [ ] Re-opening ChatGPT shows connected state (persistent)

**Invitations List:**
- [ ] "View Pending Invites" loads invitation list
- [ ] Invites display with correct details
- [ ] Empty state shows "All Caught Up" message
- [ ] Refresh button updates the list

**RSVP Actions:**
- [ ] Accept button works and shows "✓ Accepted"
- [ ] Decline button works and shows "✗ Declined"
- [ ] Maybe button works and shows "? Maybe"
- [ ] Organizer receives email notification
- [ ] Status persists in Google Calendar

**Multi-User:**
- [ ] Two different ChatGPT accounts can authenticate separately
- [ ] Each user sees only their invitations
- [ ] No data leakage between users

**Theme Support:**
- [ ] Light mode displays correctly
- [ ] Dark mode displays correctly
- [ ] Theme switches dynamically

---

## Future Enhancements

### Completed Features ✅

- [x] **OAuth 2.1 Compliance** - Full MCP authorization spec with refresh tokens
- [x] **Refresh Token Support** - Long-lived sessions with automatic rotation
- [x] **Discovery Endpoints** - RFC 8414 and RFC 9728 compliant
- [x] **Security Schemes** - Per-tool authentication requirements
- [x] **Resource Parameter** - Proper audience handling
- [x] **Multi-User Support** - Isolated authentication per ChatGPT user
- [x] **Modern UI** - 3D card effects with dark mode support

### Potential Future Features

- [ ] **Persistent Token Storage** - Redis/PostgreSQL instead of in-memory for MCP tokens
- [ ] **Token Introspection** - RFC 7662 token introspection endpoint
- [ ] **Token Revocation** - RFC 7009 token revocation endpoint
- [ ] **Database Storage** - PostgreSQL/MongoDB for Google tokens
- [ ] **Calendar Sync** - Two-way sync with Google Calendar
- [ ] **Notifications** - Alert when new invites arrive
- [ ] **Bulk Actions** - Accept/decline multiple invites at once
- [ ] **Custom Responses** - Add personal notes when responding
- [ ] **Calendar Creation** - Create new events from ChatGPT
- [ ] **Multiple Calendars** - Support for work/personal calendars
- [ ] **Analytics** - Track response patterns and insights
- [ ] **Reminder Settings** - Configure invite reminder preferences
- [ ] **Mobile Optimization** - Better mobile widget experience
- [ ] **CMID Support** - Client Metadata Documents for stable client identity

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues, questions, or contributions:

1. Check existing issues on GitHub
2. Open a new issue with detailed description
3. Include server logs and browser console output
4. Specify environment (local/Railway, ChatGPT version)

---

## OAuth 2.1 Compliance Summary

This application fully implements the **MCP Authorization Specification** as required by OpenAI's Apps SDK:

| Requirement | Status | Implementation |
|------------|--------|----------------|
| **Protected Resource Metadata** | ✅ | `GET /.well-known/oauth-protected-resource` |
| **OAuth Server Metadata** | ✅ | `GET /.well-known/oauth-authorization-server` |
| **PKCE Support (S256)** | ✅ | Authorization code flow with code challenges |
| **Refresh Token Issuance** | ✅ | All token grants return refresh tokens |
| **Refresh Token Grant** | ✅ | `grant_type=refresh_token` supported |
| **Token Rotation** | ✅ | Old refresh tokens revoked on use |
| **Resource Parameter** | ✅ | Echoed through flow, stored as audience |
| **WWW-Authenticate Headers** | ✅ | RFC 9728 compliant 401 responses |
| **Security Schemes** | ✅ | Per-tool auth requirements declared |
| **Dynamic Client Registration** | ✅ | `POST /oauth/register` (RFC 7591) |
| **Scope Support** | ✅ | `calendar:read`, `calendar:write`, `mcp` |
| **Token Expiration** | ✅ | Access: 1h, Refresh: 30d |
| **Multi-User Support** | ✅ | Per-user token isolation via `openai/subject` |

**References:**
- [MCP Authorization Spec](https://spec.modelcontextprotocol.io/specification/2024-11-05/authentication/)
- [OpenAI Apps SDK - Authentication](https://developers.openai.com/apps-sdk/build/auth)
- [RFC 8414 - OAuth 2.0 Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc8414.html)
- [RFC 9728 - OAuth 2.0 Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728.html)
- [RFC 7636 - PKCE](https://www.rfc-editor.org/rfc/rfc7636.html)

---

## Credits

Built with:
- [OpenAI Apps SDK](https://platform.openai.com/docs/apps)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Google Calendar API](https://developers.google.com/calendar)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

**OAuth 2.1 Compliance:**
- Implements [MCP Authorization Specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/authentication/)
- Follows [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414.html) (OAuth Server Metadata)
- Follows [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html) (OAuth Protected Resource Metadata)
- Supports [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html) (PKCE)
- Supports [RFC 7591](https://www.rfc-editor.org/rfc/rfc7591.html) (Dynamic Client Registration)

---

**Happy Calendar Managing! 🗓️✨**

*This app demonstrates a production-ready implementation of OAuth 2.1 for ChatGPT integrations with full MCP spec compliance, refresh token support, and multi-user isolation.*
