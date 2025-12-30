import {
  ApiResponse,
  AuthStatus,
  PendingInvitesData,
  RespondToInviteData,
  InviteResponse,
} from '../types';

// Base API URL - in production, same origin; in development, uses Vite proxy
const API_BASE = '';

/**
 * Make an API request with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
        authUrl: data.authUrl,
      };
    }

    return data;
  } catch (error: any) {
    console.error(`API error for ${endpoint}:`, error);
    return {
      success: false,
      error: error.message || 'Network error. Please try again.',
    };
  }
}

/**
 * Check authentication status
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();
    
    // Server returns {authenticated: true/false, email?: string, authUrl?: string}
    return {
      authenticated: data.authenticated || false,
      email: data.email,
      authUrl: data.authUrl,
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return {
      authenticated: false,
    };
  }
}

/**
 * Get the Google OAuth URL
 */
export function getAuthUrl(): string {
  return `${API_BASE}/auth/google`;
}

/**
 * Logout the current user
 */
export async function logout(): Promise<boolean> {
  const response = await apiRequest<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
  return response.success ?? false;
}

/**
 * Fetch pending calendar invites
 */
export async function fetchPendingInvites(
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<PendingInvitesData>> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  
  const queryString = params.toString();
  const endpoint = `/api/pending-invites${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<PendingInvitesData>(endpoint);
}

/**
 * Respond to a calendar invite
 */
export async function respondToInvite(
  eventId: string,
  response: InviteResponse
): Promise<ApiResponse<RespondToInviteData>> {
  return apiRequest<RespondToInviteData>('/api/respond', {
    method: 'POST',
    body: JSON.stringify({ eventId, response }),
  });
}

/**
 * Parse URL parameters (for handling OAuth callback)
 */
export function parseUrlParams(): {
  authSuccess: boolean;
  error: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  
  return {
    authSuccess: params.get('auth') === 'success',
    error: params.get('error'),
  };
}

/**
 * Clear URL parameters after reading them
 */
export function clearUrlParams(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}

