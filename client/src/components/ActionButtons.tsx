import React from 'react';
import { InviteResponse } from '../types';

interface ActionButtonsProps {
  onRespond: (response: InviteResponse) => void;
  isLoading: boolean;
  currentResponse?: InviteResponse | null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  declineButton: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  tentativeButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  selectedButton: {
    boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.2)',
  },
};

export function ActionButtons({
  onRespond,
  isLoading,
  currentResponse,
}: ActionButtonsProps): React.ReactElement {
  const handleClick = (response: InviteResponse) => {
    if (!isLoading) {
      onRespond(response);
    }
  };

  const getButtonStyle = (response: InviteResponse): React.CSSProperties => {
    let baseStyle = { ...styles.button };
    
    switch (response) {
      case 'accepted':
        baseStyle = { ...baseStyle, ...styles.acceptButton };
        break;
      case 'declined':
        baseStyle = { ...baseStyle, ...styles.declineButton };
        break;
      case 'tentative':
        baseStyle = { ...baseStyle, ...styles.tentativeButton };
        break;
    }
    
    if (isLoading) {
      baseStyle = { ...baseStyle, ...styles.disabledButton };
    }
    
    if (currentResponse === response) {
      baseStyle = { ...baseStyle, ...styles.selectedButton };
    }
    
    return baseStyle;
  };

  return (
    <div style={styles.container}>
      <button
        style={getButtonStyle('accepted')}
        onClick={() => handleClick('accepted')}
        disabled={isLoading}
        title="Accept this invitation"
      >
        ✅ Accept
      </button>
      <button
        style={getButtonStyle('declined')}
        onClick={() => handleClick('declined')}
        disabled={isLoading}
        title="Decline this invitation"
      >
        ❌ Decline
      </button>
      <button
        style={getButtonStyle('tentative')}
        onClick={() => handleClick('tentative')}
        disabled={isLoading}
        title="Mark as tentative"
      >
        🤷 Maybe
      </button>
    </div>
  );
}

export default ActionButtons;

