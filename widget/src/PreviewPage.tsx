import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { WidgetContext, type WidgetContextType } from './WidgetContext';
import { AuthView, InvitesView } from './components';
import type { AuthStatusOutput, PendingInvitesOutput } from './types';
import './main.css';

// Mock data
const mockAuthNotConnected: AuthStatusOutput = {
  authenticated: false,
  authUrl: 'https://accounts.google.com/oauth'
};

const mockAuthConnected: AuthStatusOutput = {
  authenticated: true,
  email: 'user@example.com'
};

const mockInvites: PendingInvitesOutput = {
  invites: [
    {
      eventId: '1',
      summary: 'Team Standup Meeting',
      description: 'Daily standup to discuss progress and blockers. Please come prepared with updates on your current tasks and any blockers you\'re facing.',
      organizerName: 'John Smith',
      organizerEmail: 'john@company.com',
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(), // 30 min later
      isAllDay: false,
      location: 'Conference Room A',
      calendarLink: 'https://calendar.google.com/event?eid=abc123',
      attendees: [
        { email: 'you@company.com', name: 'You', status: 'needsAction' },
        { email: 'john@company.com', name: 'John Smith', status: 'accepted' },
        { email: 'alice@company.com', name: 'Alice Johnson', status: 'accepted' },
        { email: 'bob@company.com', name: 'Bob Williams', status: 'tentative' },
        { email: 'carol@company.com', name: 'Carol Davis', status: 'declined' }
      ]
    },
    {
      eventId: '2',
      summary: 'Q1 Product Review Session',
      description: 'Quarterly product review and planning session. We will cover:\n\n1. Q4 achievements and metrics\n2. Q1 goals and roadmap\n3. Customer feedback review\n4. Resource allocation for upcoming features\n\nPlease review the Q4 summary doc before the meeting.',
      organizerName: 'Sarah Johnson',
      organizerEmail: 'sarah@company.com',
      startTime: new Date(Date.now() + 172800000).toISOString(),
      endTime: new Date(Date.now() + 172800000 + 3600000).toISOString(), // 1 hour later
      isAllDay: false,
      location: 'Zoom Meeting: https://zoom.us/j/123456789',
      calendarLink: 'https://calendar.google.com/event?eid=def456',
      attendees: [
        { email: 'you@company.com', name: 'You', status: 'needsAction' },
        { email: 'sarah@company.com', name: 'Sarah Johnson', status: 'accepted' },
        { email: 'mike@company.com', name: 'Mike Chen', status: 'accepted' },
        { email: 'emma@company.com', name: null, status: 'accepted' },
      ]
    },
    {
      eventId: '3',
      summary: 'Client Presentation - Acme Corp',
      description: null,
      organizerName: null,
      organizerEmail: 'client@external.com',
      startTime: new Date(Date.now() + 259200000).toISOString(),
      endTime: new Date(Date.now() + 259200000 + 5400000).toISOString(), // 1.5 hours later
      isAllDay: false,
      location: null,
      calendarLink: 'https://calendar.google.com/event?eid=ghi789',
      attendees: [
        { email: 'you@company.com', name: 'You', status: 'needsAction' },
        { email: 'client@external.com', name: 'External Client', status: 'accepted' },
      ]
    }
  ]
};

const mockEmptyInvites: PendingInvitesOutput = {
  invites: []
};

function PreviewNav() {
  const location = useLocation();
  const isDark = location.pathname.includes('dark');
  
  const navLinks = [
    { path: '/auth-not-connected', label: 'Auth (Not Connected)' },
    { path: '/auth-connected', label: 'Auth (Connected)' },
    { path: '/invites', label: 'Invites List' },
    { path: '/invites-empty', label: 'Invites (Empty)' },
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
              ☀️ Light
            </Link>
            <Link 
              to={`${location.pathname.replace('/dark', '')}/dark`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isDark 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              🌙 Dark
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
  const [invitesData, setInvitesData] = useState<PendingInvitesOutput | null>(null);
  
  // Set data based on current route
  useEffect(() => {
    const path = location.pathname.replace('/dark', '');
    
    if (path.includes('/invites-empty')) {
      setInvitesData(mockEmptyInvites);
    } else if (path.includes('/invites')) {
      setInvitesData(mockInvites);
    }
  }, [location.pathname]);
  
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
    openExternal: (options: { href: string }) => {
      console.log('Mock openExternal:', options.href);
      alert('Would open: ' + options.href);
    },
    notifyHeight: () => {},
    setWidgetState: () => {},
    authData,
    setAuthData,
    invitesData,
    setInvitesData,
  };

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
              
              <Route path="/invites" element={<InvitesView />} />
              <Route path="/invites/dark" element={<InvitesView />} />
              
              <Route path="/invites-empty" element={<InvitesView />} />
              <Route path="/invites-empty/dark" element={<InvitesView />} />
              
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

