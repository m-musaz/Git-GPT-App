import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { WidgetContext, type WidgetContextType } from './WidgetContext';
import { AuthView, PRContextView } from './components';
import { PRsView } from './components/PRsView';
import type { AuthStatusOutput, PullRequestsOutput, PullRequestContext } from './types';
import './main.css';

// Mock data
const mockAuthNotConnected: AuthStatusOutput = {
  authenticated: false,
  authUrl: 'https://github.com/login/oauth/authorize'
};

const mockAuthConnected: AuthStatusOutput = {
  authenticated: true,
  user: {
    login: 'octocat',
    id: 1,
    name: 'The Octocat',
    avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4'
  }
};

const mockPRsData: PullRequestsOutput = {
  pullRequests: [
    {
      id: 1,
      number: 123,
      title: 'Add new authentication flow',
      state: 'open',
      html_url: 'https://github.com/octocat/hello-world/pull/123',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-16T14:20:00Z',
      draft: false,
      user: {
        login: 'octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4'
      },
      repository: {
        full_name: 'octocat/hello-world',
        html_url: 'https://github.com/octocat/hello-world'
      },
      labels: [
        { name: 'enhancement', color: 'a2eeef' },
        { name: 'security', color: 'd73a4a' }
      ]
    },
    {
      id: 2,
      number: 456,
      title: 'Fix bug in user profile component',
      state: 'open',
      html_url: 'https://github.com/octocat/hello-world/pull/456',
      created_at: '2024-01-14T09:15:00Z',
      updated_at: '2024-01-14T09:15:00Z',
      draft: true,
      user: {
        login: 'johndoe',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4'
      },
      repository: {
        full_name: 'octocat/hello-world',
        html_url: 'https://github.com/octocat/hello-world'
      },
      labels: [
        { name: 'bug', color: 'd73a4a' }
      ]
    },
    {
      id: 3,
      number: 789,
      title: 'Update documentation for API endpoints',
      state: 'open',
      html_url: 'https://github.com/facebook/react/pull/789',
      created_at: '2024-01-13T16:45:00Z',
      updated_at: '2024-01-15T11:30:00Z',
      draft: false,
      user: {
        login: 'octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4'
      },
      repository: {
        full_name: 'facebook/react',
        html_url: 'https://github.com/facebook/react'
      },
      labels: [
        { name: 'documentation', color: '0075ca' }
      ]
    }
  ],
  searchType: 'authored',
  totalCount: 3
};

const mockPRContext: PullRequestContext = {
  pr: {
    id: 1,
    number: 123,
    title: 'Add new authentication flow',
    state: 'open',
    author: 'octocat',
    repository: {
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world'
    },
    updatedAt: '2024-01-16T14:20:00Z',
    createdAt: '2024-01-15T10:30:00Z',
    htmlUrl: 'https://github.com/octocat/hello-world/pull/123',
    headSha: 'abc123',
    baseSha: 'def456'
  },
  description: 'This PR adds a new OAuth authentication flow to improve security and user experience.\n\n## Changes\n- Added OAuth provider integration\n- Updated login UI\n- Added tests for auth flow',
  files: [
    {
      filename: 'src/auth/oauth.ts',
      status: 'added',
      additions: 150,
      deletions: 0,
      changes: 150,
      patch: '@@ -0,0 +1,150 @@\n+export class OAuthProvider {\n+  constructor(config) {\n+    this.config = config;\n+  }\n+\n+  async authenticate(code: string) {\n+    // Implementation\n+  }\n+}'
    },
    {
      filename: 'src/components/Login.tsx',
      status: 'modified',
      additions: 45,
      deletions: 12,
      changes: 57,
      patch: '@@ -10,12 +10,45 @@ export function Login() {\n-  const handleLogin = () => {\n-    // Old login\n-  };\n+  const handleOAuthLogin = async () => {\n+    const provider = new OAuthProvider(config);\n+    await provider.authenticate();\n+  };'
    }
  ],
  commits: 5,
  baseRef: 'main',
  headRef: 'feature/oauth-auth',
  additions: 195,
  deletions: 12,
  changedFiles: 2,
  mergeable: true,
  mergeableState: 'clean',
  labels: [
    { name: 'enhancement', color: 'a2eeef' },
    { name: 'security', color: 'd73a4a' }
  ],
  reviewers: [
    {
      login: 'reviewer1',
      avatar_url: 'https://avatars.githubusercontent.com/u/2?v=4'
    }
  ]
};

function PreviewNav() {
  const location = useLocation();
  const isDark = location.pathname.includes('dark');

  const navLinks = [
    { path: '/auth-not-connected', label: 'Auth (Not Connected)' },
    { path: '/auth-connected', label: 'Auth (Connected)' },
    { path: '/prs', label: 'Pull Requests List' },
    { path: '/pr-context', label: 'PR Context' },
  ];

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 border-b ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Component Preview
          </h1>
          <div className="flex gap-2">
            <Link
              to={location.pathname.replace('/dark', '')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !isDark
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Light
            </Link>
            <Link
              to={`${location.pathname.replace('/dark', '')}/dark`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Dark
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {navLinks.map(link => {
            const linkPath = isDark ? `${link.path}/dark` : link.path;
            const isActive = location.pathname === linkPath;
            return (
              <Link
                key={link.path}
                to={linkPath}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreviewRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = location.pathname.includes('/dark');
  const theme = isDark ? 'dark' : 'light';

  const [authData, setAuthData] = useState<AuthStatusOutput | null>(null);
  const [prsData, setPrsData] = useState<PullRequestsOutput | null>(null);
  const [prContextData, setPrContextData] = useState<PullRequestContext | null>(null);

  // Redirect from root to default view
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/preview.html') {
      navigate('/auth-not-connected', { replace: true });
    }
  }, [location.pathname, navigate]);

  const mockContext: WidgetContextType = {
    theme,
    isDark,
    callTool: async (name: string, args: Record<string, unknown>) => {
      console.log('Mock callTool:', name, args);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { structuredContent: {} };
    },
    openExternal: (url: string) => {
      console.log('Mock openExternal:', url);
      alert('Would open: ' + url);
    },
    notifyHeight: () => {},
    setWidgetState: () => {},
    authData,
    setAuthData,
    prsData,
    setPrsData,
    prContextData,
    setPrContextData,
    pendingParams: null,
    setPendingParams: () => {},
  };

  // Set mock data based on route
  useEffect(() => {
    if (location.pathname.includes('/prs')) {
      setPrsData(mockPRsData);
      setAuthData(mockAuthConnected);
    } else if (location.pathname.includes('/pr-context')) {
      setPrContextData(mockPRContext);
      setAuthData(mockAuthConnected);
    }
  }, [location.pathname]);

  return (
    <div className={isDark ? 'dark' : ''}>
      <PreviewNav />
      <div className={`pt-32 pb-8 px-4 min-h-screen transition-colors ${isDark ? 'bg-black' : 'bg-slate-100'}`}>
        <div className="max-w-lg mx-auto">
          <WidgetContext.Provider value={mockContext}>
            <Routes>
              <Route path="/auth-not-connected" element={<AuthView initialAuthData={mockAuthNotConnected} />} />
              <Route path="/auth-not-connected/dark" element={<AuthView initialAuthData={mockAuthNotConnected} />} />

              <Route path="/auth-connected" element={<AuthView initialAuthData={mockAuthConnected} />} />
              <Route path="/auth-connected/dark" element={<AuthView initialAuthData={mockAuthConnected} />} />

              <Route path="/prs" element={<PRsView />} />
              <Route path="/prs/dark" element={<PRsView />} />

              <Route path="/pr-context" element={<PRContextView initialData={{ prContext: mockPRContext }} />} />
              <Route path="/pr-context/dark" element={<PRContextView initialData={{ prContext: mockPRContext }} />} />

              <Route path="/" element={<AuthView initialAuthData={mockAuthNotConnected} />} />
            </Routes>
          </WidgetContext.Provider>
        </div>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <BrowserRouter basename="/">
      <PreviewRoutes />
    </BrowserRouter>
  );
}
