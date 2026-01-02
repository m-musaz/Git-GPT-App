// OAuth Token Types (Google)
export interface OAuth2Tokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export interface StoredTokenData {
  tokens: OAuth2Tokens;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenStore {
  [userId: string]: StoredTokenData;
}

// GitHub OAuth Types
export interface GitHubTokens {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
}

export interface StoredGitHubTokenData {
  tokens: GitHubTokens;
  user: GitHubUser;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubTokenStore {
  [userId: string]: StoredGitHubTokenData;
}

// GitHub Auth Status
export interface GitHubAuthStatus {
  authenticated: boolean;
  user?: GitHubUser;
  authUrl?: string;
}

// GitHub Pull Request Types
export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
  draft: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  repository: {
    full_name: string;
    html_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  requested_reviewers?: Array<{
    login: string;
  }>;
  requested_teams?: Array<{
    name: string;
    slug: string;
  }>;
}

export interface GitHubTeam {
  id: number;
  name: string;
  slug: string;
  organization: {
    login: string;
  };
}

export interface ListPullRequestsResult {
  pullRequests: GitHubPullRequest[];
  searchType: 'authored' | 'reviewing' | 'involved' | 'user_authored';
  searchedUser?: string;
  totalCount: number;
}

// PR Context Types (for code review)
export interface FileChange {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;  // Unified diff
  previous_filename?: string;  // For renamed files
}

export interface PullRequestContext {
  pr: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed' | 'merged';
    author: string;
    repository: {
      owner: string;
      name: string;
      fullName: string;
    };
    updatedAt: string;
    createdAt: string;
    htmlUrl: string;
    headSha: string;
    baseSha: string;
  };
  description: string;
  files: FileChange[];
  commits: number;
  baseRef: string;
  headRef: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergeable?: boolean;
  mergeableState?: string;
  labels: Array<{ name: string; color: string }>;
  reviewers: Array<{ login: string; avatar_url: string }>;
}

// Calendar Event Types
export interface CalendarAttendee {
  email: string;
  displayName?: string | null;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  self?: boolean | null;
  organizer?: boolean | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  start: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  end: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  organizer: {
    email: string;
    displayName?: string | null;
  };
  attendees: CalendarAttendee[];
  htmlLink: string;
  status: string;
}

export interface PendingInvite {
  eventId: string;
  summary: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  organizerEmail: string;
  organizerName: string | null;
  attendees: {
    email: string;
    name: string | null;
    status: string;
  }[];
  calendarLink: string;
}

export interface PendingInvitesResponse {
  invites: PendingInvite[];
  dateRange: {
    start: string;
    end: string;
  };
  totalCount: number;
}

export interface RespondToInviteRequest {
  eventId: string;
  response: 'accepted' | 'declined' | 'tentative';
}

export interface RespondToInviteResponse {
  success: boolean;
  message: string;
  eventId: string;
  newStatus: string;
  eventSummary?: string;
}

// Review Comment Types (for posting PR reviews)
export interface ReviewComment {
  body: string;
  path?: string;       // File path for inline comments
  line?: number;       // Line number for inline comments
  side?: 'LEFT' | 'RIGHT';  // Side of the diff (LEFT = old, RIGHT = new)
}

export interface PostReviewRequest {
  prName: string;
  comments: ReviewComment[];
  event?: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
  idempotencyKey: string;
}

export interface PostReviewResponse {
  success: boolean;
  reviewId?: number;
  prUrl: string;
  commentsPosted: number;
  message: string;
}

// MCP Types
export interface MCPToolResult {
  content: {
    type: 'text';
    text: string;
  }[];
  isError?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth Status
export interface AuthStatus {
  authenticated: boolean;
  email?: string;
  authUrl?: string;
}

