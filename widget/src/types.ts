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

// Tool output types
export interface PendingInvitesOutput {
  invites?: PendingInvite[];
  dateRange?: {
    start: string;
    end: string;
  };
  authRequired?: boolean;
  authUrl?: string;
  error?: string;
}

export interface AuthStatusOutput {
  authenticated: boolean;
  email?: string | null;
  authUrl?: string;
}
