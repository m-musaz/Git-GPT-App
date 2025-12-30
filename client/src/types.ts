// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  authUrl?: string;
}

// Pending invite from the server
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
  attendees: Attendee[];
  calendarLink: string;
}

export interface Attendee {
  email: string;
  name: string | null;
  status: string;
}

export interface PendingInvitesData {
  invites: PendingInvite[];
  dateRange: {
    start: string;
    end: string;
  };
  totalCount: number;
}

// Response to invite
export interface RespondToInviteData {
  success: boolean;
  message: string;
  eventId: string;
  newStatus: string;
  eventSummary?: string;
}

// Auth status
export interface AuthStatus {
  authenticated: boolean;
  email?: string;
  authUrl?: string;
}

// Response types
export type InviteResponse = 'accepted' | 'declined' | 'tentative';

// UI State
export interface AppState {
  isLoading: boolean;
  error: string | null;
  authStatus: AuthStatus | null;
  invites: PendingInvite[];
  notification: Notification | null;
}

export interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

