// Invite type from our API
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
  attendees?: {
    email: string;
    name: string | null;
    status: string;
  }[];
  calendarLink: string;
}

// Auth type identifier
export type AuthType = "calendar" | "github";

// GitHub user type
export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
}

// Tool output types
export interface PendingInvitesOutput {
  invites?: PendingInvite[];
  dateRange?: {
    start: string;
    end: string;
  };
  authRequired?: boolean;
  authType?: AuthType;
  authUrl?: string;
  error?: string;
}

export interface AuthStatusOutput {
  authenticated: boolean;
  authType?: AuthType;
  email?: string | null;
  authUrl?: string;
  user?: GitHubUser; // For GitHub auth
}

// PR Context Types (for code review)
export interface FileChange {
  filename: string;
  status:
    | "added"
    | "removed"
    | "modified"
    | "renamed"
    | "copied"
    | "changed"
    | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface PullRequestContext {
  pr: {
    id: number;
    number: number;
    title: string;
    state: "open" | "closed" | "merged";
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

export interface PRContextOutput {
  prContext?: PullRequestContext;
  authRequired?: boolean;
  authType?: AuthType;
  authUrl?: string;
  error?: string;
}

// GitHub Pull Request types
export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
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
}

export type PRSearchType =
  | "authored"
  | "reviewing"
  | "involved"
  | "user_authored";

export interface PullRequestsOutput {
  pullRequests?: GitHubPullRequest[];
  searchType?: PRSearchType;
  searchedUser?: string;
  totalCount?: number;
  authRequired?: boolean;
  authType?: AuthType;
  authUrl?: string;
  error?: string;
}
