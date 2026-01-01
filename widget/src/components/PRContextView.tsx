import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWidget } from '../WidgetContext';
import { theme } from '../theme';
import type { PullRequestContext, FileChange } from '../types';

interface PRContextViewProps {
  initialData?: { prContext?: PullRequestContext };
}

/**
 * Format a date relative to now
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Get status color for file change
 */
function getFileStatusColor(status: FileChange['status'], isDark: boolean): string {
  switch (status) {
    case 'added':
      return isDark ? 'text-green-400' : 'text-green-600';
    case 'removed':
      return isDark ? 'text-red-400' : 'text-red-600';
    case 'modified':
      return isDark ? 'text-yellow-400' : 'text-yellow-600';
    case 'renamed':
      return isDark ? 'text-blue-400' : 'text-blue-600';
    default:
      return isDark ? 'text-gray-400' : 'text-gray-600';
  }
}

/**
 * Get status icon for file change
 */
function getFileStatusIcon(status: FileChange['status']): string {
  switch (status) {
    case 'added': return '+';
    case 'removed': return '-';
    case 'modified': return 'M';
    case 'renamed': return 'R';
    case 'copied': return 'C';
    default: return '?';
  }
}

/**
 * Get PR state badge style
 */
function getPRStateBadge(state: 'open' | 'closed' | 'merged', isDark: boolean): { bg: string; text: string; label: string } {
  switch (state) {
    case 'open':
      return {
        bg: isDark ? 'bg-green-900/50' : 'bg-green-100',
        text: isDark ? 'text-green-300' : 'text-green-700',
        label: 'Open',
      };
    case 'merged':
      return {
        bg: isDark ? 'bg-purple-900/50' : 'bg-purple-100',
        text: isDark ? 'text-purple-300' : 'text-purple-700',
        label: 'Merged',
      };
    case 'closed':
      return {
        bg: isDark ? 'bg-red-900/50' : 'bg-red-100',
        text: isDark ? 'text-red-300' : 'text-red-700',
        label: 'Closed',
      };
  }
}

/**
 * File change item component
 */
function FileItem({ file, isDark, isExpanded, onToggle }: {
  file: FileChange;
  isDark: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusColor = getFileStatusColor(file.status, isDark);
  const statusIcon = getFileStatusIcon(file.status);

  return (
    <div className={`border-b last:border-b-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
          isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
        }`}
      >
        <span className={`font-mono text-xs font-bold w-4 flex-shrink-0 ${statusColor}`}>
          {statusIcon}
        </span>
        <span
          className="flex-1 text-sm font-mono break-all"
          style={{ color: isDark ? '#ffffff' : '#111827' }}
        >
          {file.previous_filename ? (
            <>
              <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{file.previous_filename}</span>
              <span className="mx-1">→</span>
              {file.filename}
            </>
          ) : (
            file.filename
          )}
        </span>
        <span className="flex items-center gap-2 text-xs flex-shrink-0">
          <span style={{ color: '#22c55e' }}>+{file.additions}</span>
          <span style={{ color: '#ef4444' }}>-{file.deletions}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isExpanded && file.patch && (
        <div className={`px-3 py-2 overflow-x-auto ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {file.patch.split('\n').map((line, i) => {
              let lineClass = isDark ? 'text-gray-300' : 'text-gray-700';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = isDark ? 'text-green-400 bg-green-900/20' : 'text-green-700 bg-green-50';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = isDark ? 'text-red-400 bg-red-900/20' : 'text-red-700 bg-red-50';
              } else if (line.startsWith('@@')) {
                lineClass = isDark ? 'text-blue-400' : 'text-blue-600';
              }
              return (
                <div key={i} className={`${lineClass} px-1`}>
                  {line}
                </div>
              );
            })}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function PRContextView({ initialData }: PRContextViewProps) {
  const { isDark, openExternal, notifyHeight } = useWidget();
  const navigate = useNavigate();
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [showAllFiles, setShowAllFiles] = useState(false);

  const prContext = initialData?.prContext;

  // Notify height changes
  useEffect(() => {
    notifyHeight?.();
  }, [expandedFiles, showAllFiles, notifyHeight]);

  const handleBackToPRs = () => {
    navigate('/prs');
  };

  if (!prContext) {
    return (
      <div className={`p-6 rounded-xl border text-center ${theme.card(isDark)}`}>
        <p className={theme.textSecondary(isDark)}>No PR context available</p>
      </div>
    );
  }

  const { pr, files, description, baseRef, headRef, additions, deletions, changedFiles, labels, reviewers } = prContext;
  const stateBadge = getPRStateBadge(pr.state, isDark);

  const toggleFile = (filename: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const displayedFiles = showAllFiles ? files : files.slice(0, 10);
  const hasMoreFiles = files.length > 10;

  return (
    <div className={`rounded-xl border overflow-hidden ${theme.card(isDark)}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stateBadge.bg} ${stateBadge.text}`}>
                {stateBadge.label}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                #{pr.number}
              </span>
            </div>
            <h2
              className="text-lg font-semibold leading-tight"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              {pr.title}
            </h2>
            <div
              className="mt-1 flex items-center gap-2 text-sm"
              style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
            >
              <span>@{pr.author}</span>
              <span>·</span>
              <span>{pr.repository.fullName}</span>
              <span>·</span>
              <span>{formatRelativeDate(pr.updatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleBackToPRs}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to PRs
            </button>
            <button
              onClick={() => openExternal?.({ href: pr.htmlUrl })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              View on GitHub
            </button>
          </div>
        </div>

        {/* Branch info */}
        <div
          className="mt-3 flex items-center gap-2 text-sm font-mono"
          style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
        >
          <span
            className="px-2 py-0.5 rounded"
            style={{ backgroundColor: isDark ? '#334155' : '#f3f4f6', color: isDark ? '#e2e8f0' : '#374151' }}
          >
            {headRef}
          </span>
          <span>→</span>
          <span
            className="px-2 py-0.5 rounded"
            style={{ backgroundColor: isDark ? '#334155' : '#f3f4f6', color: isDark ? '#e2e8f0' : '#374151' }}
          >
            {baseRef}
          </span>
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <span
                key={label.name}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: isDark ? `#${label.color}` : `#${label.color}`,
                  border: `1px solid #${label.color}40`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Reviewers */}
        {reviewers.length > 0 && (
          <div className={`mt-3 flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>Reviewers:</span>
            <div className="flex -space-x-1">
              {reviewers.slice(0, 5).map((reviewer) => (
                <img
                  key={reviewer.login}
                  src={reviewer.avatar_url}
                  alt={reviewer.login}
                  title={reviewer.login}
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800"
                />
              ))}
              {reviewers.length > 5 && (
                <span className="ml-2">+{reviewers.length - 5}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div
        className="px-4 py-3 flex items-center gap-4 text-sm border-b"
        style={{
          borderColor: isDark ? '#334155' : '#e5e7eb',
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f9fafb',
        }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>Files:</span>
          <span className="font-medium" style={{ color: isDark ? '#ffffff' : '#000000' }}>{changedFiles}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: '#22c55e' }} className="font-medium">+{additions}</span>
          <span style={{ color: '#ef4444' }} className="font-medium">-{deletions}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>Commits:</span>
          <span className="font-medium" style={{ color: isDark ? '#ffffff' : '#000000' }}>{prContext.commits}</span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}
        >
          <h3
            className="text-sm font-medium mb-2"
            style={{ color: isDark ? '#d1d5db' : '#374151' }}
          >
            Description
          </h3>
          <div
            className="text-sm whitespace-pre-wrap"
            style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
          >
            {description.length > 500 ? description.slice(0, 500) + '...' : description}
          </div>
        </div>
      )}

      {/* Files */}
      <div>
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }}
        >
          <h3
            className="text-sm font-medium"
            style={{ color: isDark ? '#d1d5db' : '#374151' }}
          >
            Changed Files ({files.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedFiles(new Set(files.map(f => f.filename)))}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedFiles(new Set())}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {displayedFiles.map((file) => (
            <FileItem
              key={file.filename}
              file={file}
              isDark={isDark}
              isExpanded={expandedFiles.has(file.filename)}
              onToggle={() => toggleFile(file.filename)}
            />
          ))}
        </div>

        {hasMoreFiles && !showAllFiles && (
          <button
            onClick={() => setShowAllFiles(true)}
            className="w-full py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#f3f4f6',
              color: isDark ? '#d1d5db' : '#374151',
            }}
          >
            Show {files.length - 10} more files
          </button>
        )}
      </div>
    </div>
  );
}
