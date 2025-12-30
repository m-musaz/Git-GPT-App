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
export type AuthType = 'calendar' | 'github';

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
