import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Badge } from '@openai/apps-sdk-ui/components/Badge';
import { Calendar, Check, ArrowRotateCcw } from '@openai/apps-sdk-ui/components/Icon';
import { useWidget } from '../WidgetContext';
import { theme } from '../theme';
import { DateRangeSelector } from './DateRangeSelector';
import type { PendingInvite, PendingInvitesOutput } from '../types';

interface InviteCardProps {
  invite: PendingInvite;
  onRespond: (eventId: string, eventTitle: string, response: string) => Promise<void>;
  isDark: boolean;
  index: number;
  total: number;
}

function InviteCard({ invite, onRespond, isDark, index, total }: InviteCardProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'accepted' | 'declined' | 'tentative' | 'error'>('idle');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRespond = async (response: 'accepted' | 'declined' | 'tentative') => {
    setStatus('loading');
    try {
      await onRespond(invite.eventId, invite.summary || 'this meeting', response);
      setStatus(response);
    } catch {
      setStatus('error');
    }
  };

  const formatTime = (time: string) => {
    try {
      return new Date(time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch { return time; }
  };

  const formatTimeShort = (time: string) => {
    try {
      return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return time; }
  };

  const getAttendeeStatusBadge = (attendeeStatus: string) => {
    switch (attendeeStatus) {
      case 'accepted': return <Badge className="px-2" size="sm" color="success">Accepted</Badge>;
      case 'declined': return <Badge className="px-2.5" size="sm" color="danger">Declined</Badge>;
      case 'tentative': return <Badge className="px-4" size="sm" color="warning">Maybe</Badge>;
      case 'needsAction': return <Badge size="sm" className="bg-gray-500 px-3 text-white">Pending</Badge>;
      default: return <Badge size="sm" className="bg-gray-400 px-2 text-white">{attendeeStatus}</Badge>;
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${theme.card(isDark)}`}>
      {/* Header: Title and Status Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${theme.textPrimary(isDark)}`}>{invite.summary || '(No title)'}</h3>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${theme.card(isDark)} ${theme.textPrimary(isDark)} ${theme.buttonShadow()} ${theme.buttonBorder(isDark)}`}>
              {index}/{total}
            </span>
          </div>
        </div>
        <Badge color='success' className={`bg-green-600 text-white ${theme.textPrimary(isDark)} p-2 shrink-0`}>Pending</Badge>
      </div>

      {/* Organizer - Prominent at top */}
      <div className={`mb-3 p-3 rounded-lg border ${theme.card(isDark)}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${theme.textPrimary(isDark)}`}>Organizer</span>
        </div>
        <p className={`text-sm font-medium mt-1 ${theme.textPrimary(isDark)}`}>
          {invite.organizerName ? `${invite.organizerName}` : invite.organizerEmail}
        </p>
        {invite.organizerName && (
          <p className={`text-xs mt-0.5 ${theme.textPrimary(isDark)}`}>{invite.organizerEmail}</p>
        )}
      </div>
      
      {/* Time and Location */}
      <div className={`text-sm space-y-2 mb-3 ${theme.textPrimary(isDark)}`}>
        <div className="flex items-start gap-2">
          <span className="shrink-0">📅</span>
          <div>
            <p>{formatTime(invite.startTime)}</p>
            {invite.endTime && (
              <p className={`text-xs mt-0.5 ${theme.textPrimary(isDark)}`}>
                Until {formatTimeShort(invite.endTime)}
              </p>
            )}
          </div>
        </div>
        {invite.location && (
          <div className="flex items-start gap-2">
            <span className="shrink-0">📍</span>
            <p>{invite.location}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {invite.description && (
        <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme.textPrimary(isDark)}`}>Description</p>
          <p className={`text-sm whitespace-pre-wrap ${theme.textPrimary(isDark)}`}>
            {invite.description.length > 150 && !isExpanded 
              ? `${invite.description.substring(0, 150)}...` 
              : invite.description
            }
          </p>
          {invite.description.length > 150 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs mt-1 text-blue-500 hover:underline`}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Attendees List */}
      {invite.attendees && invite.attendees.length > 0 && (
        <div className={`mb-3 p-3 rounded-lg border ${theme.card(isDark)}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme.textPrimary(isDark)}`}>
            Attendees ({invite.attendees.length})
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {invite.attendees.map((attendee, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${theme.textPrimary(isDark)}`}>
                    {attendee.name || attendee.email}
                  </p>
                  {attendee.name && (
                    <p className={`text-xs truncate ${theme.textPrimary(isDark)}`}>{attendee.email}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {getAttendeeStatusBadge(attendee.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={`pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {status === 'idle' && (
          <div className="grid grid-cols-3 gap-2">
            <Button className={`rounded-xl py-4 text-white ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`} color="success" size="sm" block onClick={() => handleRespond('accepted')}>Accept</Button>
            <Button className={`rounded-xl py-4 text-white ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`} color="warning" size="sm" block onClick={() => handleRespond('tentative')}>Maybe</Button>
            <Button className={`rounded-xl py-4 text-white ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`} color="danger" size="sm" block onClick={() => handleRespond('declined')}>Decline</Button>
          </div>
        )}
        {status === 'loading' && <div className={`text-center py-2 text-sm ${theme.textPrimary(isDark)}`}>Sending...</div>}
        {(status === 'accepted' || status === 'declined' || status === 'tentative') && (
          <div className="text-center"><Badge className='p-4' color={status === 'accepted' ? 'success' : status === 'declined' ? 'danger' : 'warning'}>{status === 'accepted' ? '✓ Accepted' : status === 'declined' ? '✗ Declined' : '? Maybe'}</Badge></div>
        )}
        {status === 'error' && <div className="text-center"><Badge color="danger">Failed</Badge></div>}
      </div>
    </div>
  );
}

export function InvitesView() {
  const { isDark, invitesData, setInvitesData, callTool, setWidgetState, notifyHeight } = useWidget();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { notifyHeight(); }, [invitesData, isRefreshing, notifyHeight]);

  const handleRespond = async (eventId: string, eventTitle: string, response: string) => {
    try {
      await callTool('respond_to_invite', { event_id: eventId, event_title: eventTitle, response });
      // Response is shown inline in the InviteCard, no need to navigate
    } catch (err) {
      console.error('[Widget] Failed to respond:', err);
      throw err;
    }
  };

  const handleRefresh = async (customStartDate?: string, customEndDate?: string) => {
    try {
      setIsRefreshing(true);
      const args: { start_date?: string; end_date?: string } = {};
      
      if (customStartDate) args.start_date = customStartDate;
      if (customEndDate) args.end_date = customEndDate;
      
      const result = await callTool('get_pending_reservations', args) as { structuredContent?: PendingInvitesOutput };
      if (result?.structuredContent) {
        setInvitesData(result.structuredContent);
        setWidgetState({ view: 'invites', invites: result.structuredContent });
      }
    } catch (err) {
      console.error('[Widget] Failed to refresh:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!invitesData) {
    return (
      <div className={`p-6 rounded-xl border shadow-sm ${theme.card(isDark)}`}>
        <p className={`text-center ${theme.textPrimary(isDark)}`}>No invites data</p>
        <div className="flex justify-center mt-4">
          <Button variant="outline" color="secondary" size="sm" onClick={handleBack}>
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  const invites = invitesData.invites || [];

  return (
    <div className={`rounded-xl border shadow-sm ${theme.card(isDark)}`}>
      {invites.length === 0 ? (
        <div className="p-6">
          <div className="mb-4">
            <DateRangeSelector
              isDark={isDark}
              isRefreshing={isRefreshing}
              onRangeChange={handleRefresh}
            />
          </div>

          {isRefreshing && (
            <div className={`flex items-center justify-center gap-2 py-2 mb-4 rounded-lg ${theme.surface(isDark)}`}>
              <div className={`size-4 rounded-full border-2 border-t-blue-500 animate-spin ${theme.spinner(isDark)}`} />
              <span className={`text-sm ${theme.textPrimary(isDark)}`}>Refreshing...</span>
            </div>
          )}

          <div className="py-8 text-center">
            <div className={`size-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-green-600`}>
              <Check className="size-8 text-white" />
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${theme.textPrimary(isDark)}`}>All Caught Up!</h2>
            <p className={`text-sm mb-6 ${theme.textPrimary(isDark)}`}>No pending invitations in this date range.</p>
            <button 
              className={`${theme.textPrimary(isDark)} m-auto flex items-center justify-center p-4 rounded-xl ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`} 
              color="secondary" 
              onClick={() => handleRefresh()} 
              disabled={isRefreshing}
            >
              <ArrowRotateCcw className="size-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center ${theme.iconBg(isDark)}`}>
                <Calendar className="size-5 text-blue-500" />
              </div>
              <h1 className={`text-lg font-semibold ${theme.textPrimary(isDark)}`}>{invites.length} Pending Invites</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button className={`${theme.textPrimary(isDark)} p-2 rounded-xl ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`} variant="ghost" color="secondary" size="sm" onClick={() => handleRefresh()} disabled={isRefreshing}>
                <ArrowRotateCcw className="size-5" />
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <DateRangeSelector
              isDark={isDark}
              isRefreshing={isRefreshing}
              onRangeChange={handleRefresh}
            />
          </div>

          {isRefreshing && (
            <div className={`flex items-center justify-center gap-2 py-2 mb-3 rounded-lg ${theme.surface(isDark)}`}>
              <div className={`size-4 rounded-full border-2 border-t-blue-500 animate-spin ${theme.spinner(isDark)}`} />
              <span className={`text-sm ${theme.textPrimary(isDark)}`}>Refreshing...</span>
            </div>
          )}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {invites.map((invite, idx) => (
              <InviteCard 
                key={invite.eventId} 
                invite={invite} 
                onRespond={handleRespond} 
                isDark={isDark}
                index={idx + 1}
                total={invites.length}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

