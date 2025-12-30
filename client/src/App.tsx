import React, { useState, useEffect, useCallback } from 'react';
import { AuthStatus, Notification } from './types';
import { checkAuthStatus, getAuthUrl, logout, parseUrlParams, clearUrlParams } from './services/api';
import InviteList from './components/InviteList';

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f7f7f8',
    padding: '20px',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '16px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#6b7280',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  loginContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center' as const,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  loginIcon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  loginTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '12px',
  },
  loginText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    maxWidth: '400px',
    lineHeight: 1.6,
  },
  loginButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 28px',
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  googleLogo: {
    width: '20px',
    height: '20px',
    backgroundColor: 'white',
    borderRadius: '2px',
    padding: '2px',
  },
  notification: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    padding: '16px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontSize: '14px',
    fontWeight: 500,
    zIndex: 1000,
    animation: 'slideIn 0.3s ease',
  },
  successNotification: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  errorNotification: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  infoNotification: {
    backgroundColor: '#6366f1',
    color: 'white',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// CSS animations
const animations = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

function App(): React.ReactElement {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await checkAuthStatus();
      setAuthStatus(status);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({ authenticated: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle URL params (OAuth callback)
  useEffect(() => {
    const { authSuccess, error } = parseUrlParams();
    
    if (authSuccess) {
      showNotification('success', '✅ Successfully connected to Google Calendar!');
      clearUrlParams();
    } else if (error) {
      showNotification('error', `Authentication failed: ${error}`);
      clearUrlParams();
    }
    
    checkAuth();
  }, [checkAuth]);

  // Inject CSS animations
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = animations;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Show notification
  const showNotification = (type: Notification['type'], message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle login
  const handleLogin = () => {
    window.location.href = getAuthUrl();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setAuthStatus({ authenticated: false });
      showNotification('info', 'Successfully logged out');
    } catch (error) {
      showNotification('error', 'Failed to logout');
    }
  };

  // Get notification style
  const getNotificationStyle = (type: Notification['type']): React.CSSProperties => {
    const base = { ...styles.notification };
    switch (type) {
      case 'success':
        return { ...base, ...styles.successNotification };
      case 'error':
        return { ...base, ...styles.errorNotification };
      case 'info':
        return { ...base, ...styles.infoNotification };
    }
  };

  if (isLoading) {
    return (
      <div style={styles.app}>
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        {/* Notification */}
        {notification && (
          <div style={getNotificationStyle(notification.type)}>
            {notification.message}
          </div>
        )}

        {/* Header */}
        <header style={styles.header}>
          <div style={styles.logoSection}>
            <span style={styles.logoIcon}>📅</span>
            <h1 style={styles.logoText}>Reservations Manager</h1>
          </div>
          
          {authStatus?.authenticated && (
            <div style={styles.userSection}>
              <span style={styles.userEmail}>{authStatus.email}</span>
              <button style={styles.logoutButton} onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Main Content */}
        {authStatus?.authenticated ? (
          <InviteList
            onError={(msg) => showNotification('error', msg)}
            onSuccess={(msg) => showNotification('success', msg)}
          />
        ) : (
          <div style={styles.loginContainer}>
            <div style={styles.loginIcon}>📆</div>
            <h2 style={styles.loginTitle}>Connect Your Google Calendar</h2>
            <p style={styles.loginText}>
              Connect your Google Calendar to view and manage your pending
              meeting invitations directly from ChatGPT.
            </p>
            <button style={styles.loginButton} onClick={handleLogin}>
              <svg style={styles.googleLogo} viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

