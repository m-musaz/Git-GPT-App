import { useEffect, useState } from 'react';
import { useOpenAI } from './useOpenAI';
import { WidgetContext, type WidgetContextType } from './WidgetContext';
import { AuthView, PRContextView } from './components';
import { theme } from './theme';
import type { AuthStatusOutput, PRContextOutput, PullRequestContext } from './types';
import './main.css';

export default function PRContextWidget() {
  const { data, theme: appTheme, isLoading, error, callTool, openExternal, notifyHeight, setWidgetState } = useOpenAI<PRContextOutput>();
  const isDark = appTheme === 'dark';

  const [authData, setAuthData] = useState<AuthStatusOutput | null>(null);
  const [prContextData, setPRContextData] = useState<{ prContext?: PullRequestContext } | null>(null);

  // Process initial data
  useEffect(() => {
    if (!data) return;

    console.log('[PRContextWidget] Received data:', Object.keys(data));

    // Check if auth is required
    if ('authRequired' in data && data.authRequired === true) {
      console.log('[PRContextWidget] Auth required, showing auth view');
      setAuthData({
        authenticated: false,
        authType: data.authType || 'github',
        authUrl: data.authUrl,
      });
      return;
    }

    // Check if we have PR context
    if ('prContext' in data && data.prContext) {
      console.log('[PRContextWidget] Got PR context:', data.prContext.pr.title);
      setPRContextData({ prContext: data.prContext });
      return;
    }

    // Check for error
    if ('error' in data) {
      console.log('[PRContextWidget] Error:', data.error);
    }
  }, [data]);

  const contextValue: WidgetContextType = {
    theme: appTheme,
    isDark,
    callTool,
    openExternal,
    notifyHeight,
    setWidgetState,
    authData,
    setAuthData,
    invitesData: null,
    setInvitesData: () => {},
  };

  if (isLoading) {
    return (
      <div className={`p-4 rounded-xl border shadow-sm ${theme.card(isDark)}`}>
        <div className="flex items-center justify-center gap-3 py-8">
          <div className={`size-5 rounded-full border-2 border-t-blue-500 animate-spin ${theme.spinner(isDark)}`} />
          <p className={`text-sm ${theme.textSecondary(isDark)}`}>Loading PR context...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-xl border text-center shadow-sm ${theme.card(isDark)}`}>
        <p className={theme.textSecondary(isDark)}>{error}</p>
      </div>
    );
  }

  // Show auth view if auth is required
  if (authData && !authData.authenticated) {
    return (
      <WidgetContext.Provider value={contextValue}>
        <AuthView initialAuthData={authData} />
      </WidgetContext.Provider>
    );
  }

  // Show PR context
  if (prContextData?.prContext) {
    return (
      <WidgetContext.Provider value={contextValue}>
        <PRContextView initialData={prContextData} />
      </WidgetContext.Provider>
    );
  }

  // Fallback - no data
  return (
    <WidgetContext.Provider value={contextValue}>
      <div className={`p-6 rounded-xl border text-center shadow-sm ${theme.card(isDark)}`}>
        <p className={theme.textSecondary(isDark)}>No PR context available</p>
      </div>
    </WidgetContext.Provider>
  );
}
