import React, { useState, useEffect, useCallback } from 'react';
import { PendingInvite, InviteResponse } from '../types';
import { fetchPendingInvites, respondToInvite } from '../services/api';
import InviteCard from './InviteCard';

interface InviteListProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '16px',
    color: '#6b7280',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center' as const,
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  errorText: {
    fontSize: '16px',
    color: '#991b1b',
    marginBottom: '16px',
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  countBadge: {
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    marginLeft: '8px',
  },
};

// CSS animation for spinner
const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export function InviteList({ onError, onSuccess }: InviteListProps): React.ReactElement {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchPendingInvites();
      
      if (response.success && response.data) {
        setInvites(response.data.invites);
      } else {
        setError(response.error || 'Failed to load invites');
        onError(response.error || 'Failed to load invites');
      }
    } catch (err) {
      const message = 'An error occurred while loading invites';
      setError(message);
      onError(message);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleRespond = async (
    eventId: string,
    response: InviteResponse
  ): Promise<boolean> => {
    try {
      const result = await respondToInvite(eventId, response);
      
      if (result.success && result.data) {
        onSuccess(result.data.message);
        // Remove the invite from the list after successful response
        setInvites((prev) => prev.filter((inv) => inv.eventId !== eventId));
        return true;
      } else {
        onError(result.error || 'Failed to respond to invite');
        return false;
      }
    } catch (err) {
      onError('An error occurred while responding to the invite');
      return false;
    }
  };

  // Inject spinner animation
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = spinnerKeyframes;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading your pending invitations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.retryButton} onClick={loadInvites}>
          🔄 Try Again
        </button>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🎉</div>
        <h3 style={styles.emptyTitle}>All caught up!</h3>
        <p style={styles.emptyText}>
          You have no pending calendar invitations that need a response.
        </p>
        <button
          style={{ ...styles.refreshButton, marginTop: '16px' }}
          onClick={loadInvites}
        >
          🔄 Refresh
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          Pending Invitations
          <span style={styles.countBadge}>{invites.length}</span>
        </h2>
        <button style={styles.refreshButton} onClick={loadInvites}>
          🔄 Refresh
        </button>
      </div>
      
      {invites.map((invite) => (
        <InviteCard
          key={invite.eventId}
          invite={invite}
          onRespond={handleRespond}
        />
      ))}
    </div>
  );
}

export default InviteList;

