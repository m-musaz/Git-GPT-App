// OAuth Token Types
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

