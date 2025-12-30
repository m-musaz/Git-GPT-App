import React, { useState } from 'react';
import { PendingInvite, InviteResponse } from '../types';
import ActionButtons from './ActionButtons';

interface InviteCardProps {
  invite: PendingInvite;
  onRespond: (eventId: string, response: InviteResponse) => Promise<boolean>;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e5e7eb',
    transition: 'box-shadow 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  calendarLink: {
    color: '#6366f1',
    textDecoration: 'none',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  metaContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '16px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#4b5563',
  },
  metaIcon: {
    width: '16px',
    textAlign: 'center' as const,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: 1.5,
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  attendeesSection: {
    marginBottom: '16px',
  },
  attendeesTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '8px',
  },
  attendeesList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  attendeeBadge: {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '12px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  footer: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseMessage: {
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 12px',
    borderRadius: '6px',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
};

function formatDate(dateString: string, isAllDay: boolean): string {
  const date = new Date(dateString);
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  
  if (isAllDay) {
    return date.toLocaleDateString('en-US', dateOptions) + ' (All day)';
  }
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };
  
  return `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
}

export function InviteCard({ invite, onRespond }: InviteCardProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [responded, setResponded] = useState(false);
  const [responseStatus, setResponseStatus] = useState<InviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRespond = async (response: InviteResponse) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await onRespond(invite.eventId, response);
      if (success) {
        setResponded(true);
        setResponseStatus(response);
      } else {
        setError('Failed to send response. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getResponseMessage = (): string => {
    switch (responseStatus) {
      case 'accepted':
        return '✅ You accepted this invitation';
      case 'declined':
        return '❌ You declined this invitation';
      case 'tentative':
        return '🤷 You marked this as tentative';
      default:
        return '';
    }
  };

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>{invite.summary}</h3>
        <a
          href={invite.calendarLink}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.calendarLink}
        >
          🔗 View in Calendar
        </a>
      </div>

      {/* Meta information */}
      <div style={styles.metaContainer}>
        <div style={styles.metaItem}>
          <span style={styles.metaIcon}>📅</span>
          <span>{formatDate(invite.startTime, invite.isAllDay)}</span>
        </div>
        
        <div style={styles.metaItem}>
          <span style={styles.metaIcon}>👤</span>
          <span>
            Organized by{' '}
            <strong>{invite.organizerName || invite.organizerEmail}</strong>
          </span>
        </div>
        
        {invite.location && (
          <div style={styles.metaItem}>
            <span style={styles.metaIcon}>📍</span>
            <span>{invite.location}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {invite.description && (
        <div style={styles.description}>
          {invite.description.length > 200
            ? invite.description.substring(0, 200) + '...'
            : invite.description}
        </div>
      )}

      {/* Attendees */}
      {invite.attendees.length > 1 && (
        <div style={styles.attendeesSection}>
          <div style={styles.attendeesTitle}>
            Attendees ({invite.attendees.length})
          </div>
          <div style={styles.attendeesList}>
            {invite.attendees.slice(0, 5).map((attendee, index) => (
              <span key={index} style={styles.attendeeBadge}>
                {attendee.name || attendee.email.split('@')[0]}
              </span>
            ))}
            {invite.attendees.length > 5 && (
              <span style={styles.attendeeBadge}>
                +{invite.attendees.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer with actions */}
      <div style={styles.footer}>
        {responded ? (
          <div
            style={{
              ...styles.responseMessage,
              ...styles.successMessage,
            }}
          >
            {getResponseMessage()}
          </div>
        ) : error ? (
          <>
            <div
              style={{
                ...styles.responseMessage,
                ...styles.errorMessage,
              }}
            >
              {error}
            </div>
            <ActionButtons
              onRespond={handleRespond}
              isLoading={isLoading}
              currentResponse={null}
            />
          </>
        ) : (
          <ActionButtons
            onRespond={handleRespond}
            isLoading={isLoading}
            currentResponse={null}
          />
        )}
      </div>
    </div>
  );
}

export default InviteCard;

