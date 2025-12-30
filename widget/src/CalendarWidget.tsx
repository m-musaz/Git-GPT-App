import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useOpenAI } from './useOpenAI';
import { WidgetContext, useWidget, type WidgetContextType } from './WidgetContext';
import { AuthView, InvitesView } from './components';
import { theme } from './theme';
import type { AuthStatusOutput, PendingInvitesOutput } from './types';
import './main.css';

// ============================================
// Main Widget with Router
// ============================================
function WidgetRouter({ initialData }: { initialData: unknown }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthData, setInvitesData, authData } = useWidget();
  const [initialRouteSet, setInitialRouteSet] = useState(false);
  
  useEffect(() => {
    console.log('[Widget] Route changed to:', location.pathname);
  }, [location.pathname]);

  // Auto-detect data type and route accordingly on initial load
  useEffect(() => {
    if (initialRouteSet || !initialData) return;
    
    const data = initialData as Record<string, unknown>;
    console.log('[Widget] Auto-detecting data type:', Object.keys(data));
    
    // Check if it's invites data (has 'invites' array)
    if ('invites' in data && Array.isArray(data.invites)) {
      console.log('[Widget] Detected invites data, navigating to /invites');
      setInvitesData(data as unknown as PendingInvitesOutput);
      // Also mark as authenticated since we could fetch invites
      setAuthData({ authenticated: true });
      navigate('/invites', { replace: true });
      setInitialRouteSet(true);
      return;
    }
    
    // Check if auth is required (from get_pending_reservations when not authenticated)
    if ('authRequired' in data && data.authRequired === true) {
      console.log('[Widget] Detected authRequired, showing auth view');
      setAuthData({ 
        authenticated: false, 
        authUrl: data.authUrl as string | undefined 
      });
      setInitialRouteSet(true);
      return;
    }
    
    // Check if it's auth data (has 'authenticated')
    if ('authenticated' in data) {
      console.log('[Widget] Detected auth data, staying on /');
      setAuthData(data as unknown as AuthStatusOutput);
      setInitialRouteSet(true);
      return;
    }
    
    // Unknown data type, stay on current route
    console.log('[Widget] Unknown data type, staying on current route');
    setInitialRouteSet(true);
  }, [initialData, initialRouteSet, navigate, setAuthData, setInvitesData]);

  // Derive initial auth data for AuthView
  const initialAuthData: AuthStatusOutput | null = (() => {
    if (!initialData) return authData;
    const data = initialData as Record<string, unknown>;
    
    // Handle authRequired from get_pending_reservations
    if ('authRequired' in data && data.authRequired === true) {
      return { authenticated: false, authUrl: data.authUrl as string | undefined };
    }
    
    // Handle regular auth data
    if ('authenticated' in data) {
      return initialData as AuthStatusOutput;
    }
    
    return authData;
  })();

  return (
    <Routes>
      <Route path="/" element={<AuthView initialAuthData={initialAuthData} />} />
      <Route path="/invites" element={<InvitesView />} />
    </Routes>
  );
}

export default function CalendarWidget() {
  const { data, theme: appTheme, isLoading, error, callTool, openExternal, notifyHeight, setWidgetState, openai } = useOpenAI<AuthStatusOutput>();
  const isDark = appTheme === 'dark';
  
  const [authData, setAuthData] = useState<AuthStatusOutput | null>(null);
  const [invitesData, setInvitesData] = useState<PendingInvitesOutput | null>(null);

  // Only restore from widgetState if there's no fresh data from the tool call
  useEffect(() => {
    // If we have fresh data from the tool call, don't load from cache
    if (data) return;
    
    const state = openai?.widgetState as { 
      authenticated?: boolean;
      email?: string;
      view?: string;
      invites?: PendingInvitesOutput;
    } | null;
    
    if (state?.authenticated) {
      setAuthData({ authenticated: true, email: state.email || undefined });
    }
    if (state?.invites) setInvitesData(state.invites);
  }, [openai?.widgetState, data]);

  const contextValue: WidgetContextType = {
    theme: appTheme,
    isDark,
    callTool,
    openExternal,
    notifyHeight,
    setWidgetState,
    authData,
    setAuthData,
    invitesData,
    setInvitesData,
  };

  if (isLoading) {
    return (
      <div className={`p-4 rounded-xl border shadow-sm ${theme.card(isDark)}`}>
        <div className="flex items-center justify-center gap-3 py-8">
          <div className={`size-5 rounded-full border-2 border-t-blue-500 animate-spin ${theme.spinner(isDark)}`} />
          <p className={`text-sm ${theme.textSecondary(isDark)}`}>Loading...</p>
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

  return (
    <WidgetContext.Provider value={contextValue}>
      <BrowserRouter>
        <WidgetRouter initialData={data} />
      </BrowserRouter>
    </WidgetContext.Provider>
  );
}
