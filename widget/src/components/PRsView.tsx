import { useEffect, useState } from 'react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Badge } from '@openai/apps-sdk-ui/components/Badge';
import { ArrowRotateCcw } from '@openai/apps-sdk-ui/components/Icon';
import { useWidget } from '../WidgetContext';
import { theme } from '../theme';
import type { GitHubPullRequest, PullRequestsOutput, PRSearchType } from '../types';

interface PRCardProps {
  pr: GitHubPullRequest;
  isDark: boolean;
  index: number;
  total: number;
  onOpenPR: (url: string) => void;
}

function PRCard({ pr, isDark, index, total, onOpenPR }: PRCardProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = () => {
    if (pr.draft) {
      return <Badge className="px-2 bg-gray-500 text-white" size="sm">Draft</Badge>;
    }
    if (pr.merged_at) {
      return <Badge className="px-2 bg-purple-600 text-white" size="sm">Merged</Badge>;
    }
    if (pr.state === 'open') {
      return <Badge className="px-2" size="sm" color="success">Open</Badge>;
    }
    return <Badge className="px-2" size="sm" color="danger">Closed</Badge>;
  };

  return (
    <div className={`rounded-xl border p-4 ${theme.card(isDark)}`}>
      {/* Header: Title and Status Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold ${theme.textPrimary(isDark)}`}>{pr.title}</h3>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${theme.card(isDark)} ${theme.textPrimary(isDark)} ${theme.buttonShadow()} ${theme.buttonBorder(isDark)}`}>
              {index}/{total}
            </span>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Repository */}
      <div className={`mb-3 p-3 rounded-lg border ${theme.card(isDark)}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${theme.textPrimary(isDark)}`}>Repository</span>
        </div>
        <p className={`text-sm font-medium mt-1 ${theme.textPrimary(isDark)}`}>
          {pr.repository.full_name}
        </p>
        <p className={`text-xs mt-0.5 ${theme.textPrimary(isDark)}`}>
          #{pr.number}
        </p>
      </div>

      {/* Author and Date */}
      <div className={`text-sm space-y-2 mb-3 ${theme.textPrimary(isDark)}`}>
        <div className="flex items-center gap-2">
          <img
            src={pr.user.avatar_url}
            alt={pr.user.login}
            className="w-5 h-5 rounded-full"
          />
          <span>@{pr.user.login}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0">📅</span>
          <p>Created {formatDate(pr.created_at)}</p>
        </div>
        {pr.updated_at !== pr.created_at && (
          <div className="flex items-start gap-2">
            <span className="shrink-0">🔄</span>
            <p className={`text-xs ${theme.textPrimary(isDark)}`}>Updated {formatDate(pr.updated_at)}</p>
          </div>
        )}
      </div>

      {/* Labels */}
      {pr.labels && pr.labels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {pr.labels.slice(0, 5).map((label, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `#${label.color}`,
                color: parseInt(label.color, 16) > 0x7fffff ? '#000' : '#fff',
              }}
            >
              {label.name}
            </span>
          ))}
          {pr.labels.length > 5 && (
            <span className={`text-xs px-2 py-0.5 ${theme.textPrimary(isDark)}`}>
              +{pr.labels.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className={`pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <Button
          className={`rounded-xl py-2 w-full ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`}
          color="secondary"
          size="sm"
          block
          onClick={() => onOpenPR(pr.html_url)}
        >
          View on GitHub
        </Button>
      </div>
    </div>
  );
}

function getSearchTypeLabel(searchType: PRSearchType, searchedUser?: string): string {
  switch (searchType) {
    case 'authored':
      return 'Your PRs';
    case 'reviewing':
      return 'PRs to Review';
    case 'involved':
      return 'PRs You\'re Involved In';
    case 'user_authored':
      return `PRs by ${searchedUser || 'User'}`;
    default:
      return 'Pull Requests';
  }
}

function getSearchTypeDescription(searchType: PRSearchType): string {
  switch (searchType) {
    case 'authored':
      return 'Pull requests you created';
    case 'reviewing':
      return 'Waiting for your review (direct or via team)';
    case 'involved':
      return 'PRs where you\'re mentioned or commented';
    case 'user_authored':
      return 'Pull requests by this user';
    default:
      return '';
  }
}

export function PRsView() {
  const { isDark, prsData, setPrsData, callTool, openExternal, setWidgetState, notifyHeight } = useWidget();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { notifyHeight(); }, [prsData, isRefreshing, notifyHeight]);

  const handleOpenPR = (url: string) => {
    openExternal(url);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const result = await callTool('list_pull_requests', {}) as { structuredContent?: PullRequestsOutput };
      if (result?.structuredContent) {
        setPrsData(result.structuredContent);
        setWidgetState({ view: 'prs', prs: result.structuredContent });
      }
    } catch (err) {
      console.error('[Widget] Failed to refresh PRs:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!prsData) {
    return (
      <div className={`p-6 rounded-xl border shadow-sm ${theme.card(isDark)}`}>
        <p className={`text-center ${theme.textPrimary(isDark)}`}>No PR data</p>
      </div>
    );
  }

  const pullRequests = prsData.pullRequests || [];
  const searchType = prsData.searchType || 'authored';
  const searchedUser = prsData.searchedUser;

  return (
    <div className={`rounded-xl border shadow-sm ${theme.card(isDark)}`}>
      {pullRequests.length === 0 ? (
        <div className="p-6">
          {isRefreshing && (
            <div className={`flex items-center justify-center gap-2 py-2 mb-4 rounded-lg ${theme.surface(isDark)}`}>
              <div className={`size-4 rounded-full border-2 border-t-blue-500 animate-spin ${theme.spinner(isDark)}`} />
              <span className={`text-sm ${theme.textPrimary(isDark)}`}>Refreshing...</span>
            </div>
          )}

          <div className="py-8 text-center">
            <div className={`size-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-gray-600`}>
              <svg className="size-8 text-white" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
              </svg>
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${theme.textPrimary(isDark)}`}>No Pull Requests</h2>
            <p className={`text-sm mb-6 ${theme.textPrimary(isDark)}`}>
              {searchType === 'authored' && 'You have no open pull requests.'}
              {searchType === 'reviewing' && 'No PRs waiting for your review.'}
              {searchType === 'involved' && 'No PRs you\'re involved in.'}
              {searchType === 'user_authored' && `No open PRs by ${searchedUser}.`}
            </p>
            <button
              className={`${theme.textPrimary(isDark)} m-auto flex items-center justify-center p-4 rounded-xl ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`}
              onClick={handleRefresh}
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
              <div className={`size-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <svg className={`size-5 ${isDark ? 'text-white' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 16 16">
                  <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
                </svg>
              </div>
              <div>
                <h1 className={`text-lg font-semibold ${theme.textPrimary(isDark)}`}>
                  {pullRequests.length} {getSearchTypeLabel(searchType, searchedUser)}
                </h1>
                <p className={`text-xs ${theme.textPrimary(isDark)} opacity-70`}>
                  {getSearchTypeDescription(searchType)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className={`${theme.textPrimary(isDark)} p-2 rounded-xl ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`}
                variant="ghost"
                color="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <ArrowRotateCcw className="size-5" />
              </Button>
            </div>
          </div>

          {isRefreshing && (
            <div className={`flex items-center justify-center gap-2 py-2 mb-3 rounded-lg ${theme.surface(isDark)}`}>
              <div className={`size-4 rounded-full border-2 border-t-blue-500 animate-spin ${theme.spinner(isDark)}`} />
              <span className={`text-sm ${theme.textPrimary(isDark)}`}>Refreshing...</span>
            </div>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {pullRequests.map((pr, idx) => (
              <PRCard
                key={pr.id}
                pr={pr}
                isDark={isDark}
                index={idx + 1}
                total={pullRequests.length}
                onOpenPR={handleOpenPR}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
