import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@openai/apps-sdk-ui/components/Badge';
import { Check } from '@openai/apps-sdk-ui/components/Icon';
import { useWidget } from '../WidgetContext';
import { theme } from '../theme';
import type { AuthStatusOutput, AuthType, PullRequestsOutput } from '../types';

// GitHub Icon Component
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

// Google Calendar Icon Component
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
    </svg>
  );
}

interface AuthViewProps {
  initialAuthData: AuthStatusOutput | null;
}

export function AuthView({ initialAuthData }: AuthViewProps) {
  const { isDark, callTool, openExternal, setWidgetState, notifyHeight, authData, setAuthData, setPrsData } = useWidget();
  const navigate = useNavigate();
  const [isPolling, setIsPolling] = useState(false);
  const [isLoadingPRs, setIsLoadingPRs] = useState(false);

  const currentAuth = authData || initialAuthData;
  const isAuthenticated = currentAuth?.authenticated ?? false;

  // Determine auth type from data (default to calendar for backward compatibility)
  const authType: AuthType = currentAuth?.authType || 'calendar';
  const isGitHub = authType === 'github';

  useEffect(() => { notifyHeight(); }, [isAuthenticated, isPolling, isLoadingPRs, notifyHeight]);

  // Handler to list PRs
  const handleListPRs = async () => {
    setIsLoadingPRs(true);
    try {
      const result = await callTool('list_pull_requests', {}) as { structuredContent?: PullRequestsOutput };
      if (result?.structuredContent) {
        setPrsData(result.structuredContent);
        setWidgetState({ view: 'prs', prs: result.structuredContent });
        navigate('/prs');
      }
    } catch (err) {
      console.error('[Widget] Failed to fetch PRs:', err);
    } finally {
      setIsLoadingPRs(false);
    }
  };

  // Polling for auth status - uses different tool based on auth type
  useEffect(() => {
    if (!isPolling) return;

    const pollTool = isGitHub ? 'check_github_auth_status' : 'check_auth_status';

    const pollInterval = setInterval(async () => {
      try {
        const result = await callTool(pollTool, {}) as { structuredContent?: AuthStatusOutput };
        if (result?.structuredContent?.authenticated) {
          setAuthData(result.structuredContent);
          if (isGitHub) {
            setWidgetState({ authenticated: true, authType: 'github', user: result.structuredContent.user });
          } else {
            setWidgetState({ authenticated: true, authType: 'calendar', email: result.structuredContent.email });
          }
          setIsPolling(false);
        }
      } catch (err) {
        console.error('[Widget] Poll error:', err);
      }
    }, 3000);

    const timeout = setTimeout(() => setIsPolling(false), 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isPolling, callTool, setWidgetState, setAuthData, isGitHub]);

  const handleConnect = () => {
    if (currentAuth?.authUrl) {
      openExternal(currentAuth.authUrl);
      setIsPolling(true);
    }
  };

  // Brand configuration based on auth type
  const brand = isGitHub ? {
    name: 'GitHub',
    icon: GitHubIcon,
    buttonBg: 'bg-[#24292f] hover:bg-[#32383f]',
    iconBg: isDark ? 'bg-[#238636] shadow-green-600/25' : 'bg-[#238636] shadow-green-500/25',
    spinnerBorder: 'border-t-[#238636]',
    connectText: 'Continue with GitHub',
    connectedText: 'GitHub linked',
    description: 'Link your GitHub account to access your profile from ChatGPT',
    waitingTitle: 'Waiting for Sign In...',
    connectTitle: 'Connect GitHub',
    setupTitle: 'Setting Up GitHub Access',
    privacyText: 'We only access your basic profile information. Your data is encrypted and never shared with third parties.',
  } : {
    name: 'Google Calendar',
    icon: CalendarIcon,
    buttonBg: 'bg-[#4285f4] hover:bg-[#3367d6]',
    iconBg: isDark ? 'bg-[#4285f4] shadow-blue-600/25' : 'bg-[#4285f4] shadow-blue-500/25',
    spinnerBorder: 'border-t-[#4285f4]',
    connectText: 'Continue with Google',
    connectedText: 'Calendar linked',
    description: 'Link your Google account to manage calendar invitations from ChatGPT',
    waitingTitle: 'Waiting for Sign In...',
    connectTitle: 'Connect Google Calendar',
    setupTitle: 'Setting Up Calendar Access',
    privacyText: 'We only access your calendar invitations. Your data is encrypted and never shared with third parties.',
  };

  const BrandIcon = brand.icon;

  // Connected State
  if (isAuthenticated) {
    const user = currentAuth?.user;
    const email = currentAuth?.email;

    return (
      <div className={`rounded-2xl shadow-lg border p-8 relative overflow-hidden ${theme.card(isDark)}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 flex items-center justify-center shadow-lg shadow-green-500/25 dark:shadow-green-500/20">
              <Check className={`size-6 text-white`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${theme.textPrimary(isDark)}`}>Connected</h2>
              <p className={`text-sm ${theme.textPrimary(isDark)}`}>{brand.connectedText}</p>
            </div>
          </div>
          <Badge className='p-6 rounded-full' color="success">Active</Badge>
        </div>

        {/* GitHub: show @username, Calendar: show email */}
        {(isGitHub ? user?.login : email) && (
          <div className={`p-4 rounded-xl border ${theme.card(isDark)}`}>
            <p className={`text-xs uppercase tracking-wide font-medium mb-1 ${theme.textPrimary(isDark)}`}>Signed in as</p>
            <div className="flex items-center gap-2">
              <BrandIcon className="w-4 h-4" />
              <p className={`text-sm font-medium ${theme.textPrimary(isDark)}`}>
                {isGitHub ? `@${user?.login}` : email}
              </p>
            </div>
          </div>
        )}

        {/* GitHub-specific: List PRs button */}
        {isGitHub && (
          <button
            onClick={handleListPRs}
            disabled={isLoadingPRs}
            className={`mt-4 w-full h-12 flex items-center justify-center gap-3 font-medium rounded-xl ${brand.buttonBg} text-white transition-colors disabled:opacity-50`}
          >
            {isLoadingPRs ? (
              <>
                <div className={`size-5 rounded-full border-2 border-t-white animate-spin border-white/30`} />
                Loading PRs...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
                </svg>
                List Pull Requests
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Not Connected State
  return (
    <div className={`rounded-2xl shadow-lg border p-8 relative overflow-hidden ${theme.card(isDark)}`}>
      <div className="relative">
        {/* Icon Container */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${brand.iconBg}`}>
            <BrandIcon className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-semibold text-center mb-3 ${theme.textPrimary(isDark)}`}>
          {isPolling
            ? brand.waitingTitle
            : currentAuth?.authUrl
              ? brand.connectTitle
              : brand.setupTitle
          }
        </h1>

        {/* Description */}
        <p className={`text-center leading-relaxed mb-8 ${theme.textPrimary(isDark)}`}>
          {isPolling
            ? 'Complete the sign-in in the new tab. This will update automatically.'
            : currentAuth?.authUrl
              ? brand.description
              : `Preparing your ${brand.name} connection and checking authentication...`
          }
        </p>

        {isPolling ? (
          <div className="flex flex-col items-center gap-3 py-2 mb-6">
            <div className={`size-6 rounded-full border-2 ${brand.spinnerBorder} animate-spin ${theme.spinner(isDark)}`} />
            <p className={`text-xs ${theme.textPrimary(isDark)}`}>
              Checking every few seconds...
            </p>
          </div>
        ) : currentAuth?.authUrl ? (
          <>
            {/* Sign In Button */}
            <button
              onClick={handleConnect}
              className={`w-full h-12 flex items-center justify-center gap-3 font-medium rounded-xl text-white ${brand.buttonBg} transition-colors`}
            >
              <BrandIcon className="w-5 h-5" />
              {brand.connectText}
            </button>

            {/* Privacy Notice */}
            <div className={`mt-6 flex items-start ${theme.textPrimary(isDark)} gap-2 p-3 rounded-lg border ${theme.buttonBorder(isDark)}`}>
              <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {brand.privacyText}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className={`size-4 rounded-full border-2 ${brand.spinnerBorder} animate-spin ${theme.spinner(isDark)}`} />
            <p className={`text-sm ${theme.textPrimary(isDark)}`}>Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
