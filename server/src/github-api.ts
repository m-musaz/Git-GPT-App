import {
  GitHubPullRequest,
  GitHubTeam,
  ListPullRequestsResult,
  PullRequestContext,
  FileChange,
  ReviewComment,
  PostReviewResponse,
} from "./types.js";
import { idempotencyService } from "./idempotency-service.js";
import crypto from "crypto";
import { getGitHubTokens } from "./token-store.js";

const GITHUB_API_BASE = "https://api.github.com";
const MAX_RESULTS = 10;

// Active requests lock to prevent duplicate simultaneous calls
const activeRequests = new Map<string, Promise<PostReviewResponse>>();
/**
 * Make an authenticated GitHub API request
 */
async function githubRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Git-GPT-App",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText} - ${error}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Search for PRs using GitHub search API
 */
async function searchPullRequests(
  accessToken: string,
  query: string
): Promise<GitHubPullRequest[]> {
  const searchQuery = encodeURIComponent(`${query} type:pr`);
  const url = `/search/issues?q=${searchQuery}&sort=updated&order=desc&per_page=${MAX_RESULTS}`;

  const result = await githubRequest<{
    total_count: number;
    items: Array<{
      id: number;
      number: number;
      title: string;
      state: string;
      html_url: string;
      created_at: string;
      updated_at: string;
      draft?: boolean;
      user: {
        login: string;
        avatar_url: string;
      };
      labels: Array<{
        name: string;
        color: string;
      }>;
      pull_request?: {
        merged_at?: string | null;
      };
      repository_url: string;
    }>;
  }>(accessToken, url);

  // Transform search results to our PR format
  const prs: GitHubPullRequest[] = await Promise.all(
    result.items.map(async (item) => {
      // Extract repo info from repository_url
      const repoMatch = item.repository_url.match(/repos\/(.+)$/);
      const repoFullName = repoMatch ? repoMatch[1] : "unknown/unknown";

      return {
        id: item.id,
        number: item.number,
        title: item.title,
        state: item.state as "open" | "closed",
        html_url: item.html_url,
        created_at: item.created_at,
        updated_at: item.updated_at,
        merged_at: item.pull_request?.merged_at || null,
        draft: item.draft || false,
        user: {
          login: item.user.login,
          avatar_url: item.user.avatar_url,
        },
        repository: {
          full_name: repoFullName,
          html_url: `https://github.com/${repoFullName}`,
        },
        labels: item.labels.map((l) => ({ name: l.name, color: l.color })),
      };
    })
  );

  return prs;
}

/**
 * Get teams the authenticated user belongs to
 */
async function getUserTeams(accessToken: string): Promise<GitHubTeam[]> {
  try {
    const teams = await githubRequest<
      Array<{
        id: number;
        name: string;
        slug: string;
        organization: {
          login: string;
        };
      }>
    >(accessToken, "/user/teams");

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      organization: {
        login: t.organization.login,
      },
    }));
  } catch (error) {
    console.error("Error fetching user teams:", error);
    return [];
  }
}

/**
 * Get the authenticated user's login
 */
async function getAuthenticatedUserLogin(accessToken: string): Promise<string> {
  const user = await githubRequest<{ login: string }>(accessToken, "/user");
  return user.login;
}

/**
 * List pull requests with priority cascade:
 * 1. PRs where user is author
 * 2. PRs where user is reviewer (direct or via team)
 * 3. PRs where user is involved
 *
 * If a specific user is provided, show PRs where that user is the author.
 */
export async function listPullRequests(
  userId: string,
  specifiedUser?: string
): Promise<ListPullRequestsResult> {
  const storedData = getGitHubTokens(userId);

  if (!storedData?.tokens?.access_token) {
    throw new Error("Not authenticated with GitHub");
  }

  const accessToken = storedData.tokens.access_token;
  const myUsername =
    storedData.user?.login || (await getAuthenticatedUserLogin(accessToken));

  // If a specific user is provided, search for their authored PRs
  if (specifiedUser) {
    const prs = await searchPullRequests(
      accessToken,
      `author:${specifiedUser} is:open`
    );
    return {
      pullRequests: prs,
      searchType: "user_authored",
      searchedUser: specifiedUser,
      totalCount: prs.length,
    };
  }

  // Priority 1: PRs where I am the author
  console.log(`Searching for open PRs authored by ${myUsername}...`);
  const authoredPRs = await searchPullRequests(
    accessToken,
    `author:${myUsername} is:open`
  );

  if (authoredPRs.length > 0) {
    console.log(`Found ${authoredPRs.length} authored PRs`);
    return {
      pullRequests: authoredPRs,
      searchType: "authored",
      totalCount: authoredPRs.length,
    };
  }

  // Priority 2: PRs where I am a reviewer (direct + team-based)
  console.log(`No authored PRs found. Searching for review requests...`);

  // Direct review requests
  let reviewingPRs = await searchPullRequests(
    accessToken,
    `review-requested:${myUsername} is:open`
  );

  // Team-based review requests
  const teams = await getUserTeams(accessToken);
  console.log(`User belongs to ${teams.length} teams`);

  for (const team of teams) {
    const teamQuery = `team-review-requested:${team.organization.login}/${team.slug} is:open`;
    console.log(`Searching for team reviews: ${teamQuery}`);
    const teamPRs = await searchPullRequests(accessToken, teamQuery);

    // Merge team PRs, avoiding duplicates
    for (const pr of teamPRs) {
      if (!reviewingPRs.find((existing) => existing.id === pr.id)) {
        reviewingPRs.push(pr);
      }
    }
  }

  // Sort by updated_at and limit to MAX_RESULTS
  reviewingPRs.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  reviewingPRs = reviewingPRs.slice(0, MAX_RESULTS);

  if (reviewingPRs.length > 0) {
    console.log(`Found ${reviewingPRs.length} PRs to review`);
    return {
      pullRequests: reviewingPRs,
      searchType: "reviewing",
      totalCount: reviewingPRs.length,
    };
  }

  // Priority 3: PRs where I am involved (mentioned, commented, etc.)
  console.log(`No review requests found. Searching for involved PRs...`);
  const involvedPRs = await searchPullRequests(
    accessToken,
    `involves:${myUsername} is:open`
  );

  console.log(`Found ${involvedPRs.length} involved PRs`);
  return {
    pullRequests: involvedPRs,
    searchType: "involved",
    totalCount: involvedPRs.length,
  };
}

/**
 * Check if the user has valid GitHub authentication
 */
export function hasGitHubAuth(userId: string): boolean {
  const storedData = getGitHubTokens(userId);
  return !!storedData?.tokens?.access_token;
}

// ============================================
// PR Context Cache (in-memory with TTL)
// ============================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const prContextCache = new Map<string, CacheEntry<PullRequestContext>>();
const PR_CONTEXT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedPRContext(cacheKey: string): PullRequestContext | null {
  const entry = prContextCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    prContextCache.delete(cacheKey);
    return null;
  }

  console.log(`[Cache] PR context cache hit for ${cacheKey}`);
  return entry.data;
}

function setCachedPRContext(cacheKey: string, data: PullRequestContext): void {
  prContextCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + PR_CONTEXT_CACHE_TTL,
  });
  console.log(`[Cache] PR context cached for ${cacheKey} (TTL: ${PR_CONTEXT_CACHE_TTL / 1000}s)`);
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of prContextCache.entries()) {
    if (now > entry.expiresAt) {
      prContextCache.delete(key);
    }
  }
}, 60 * 1000); // Every minute

// ============================================
// PR Identifier Parsing
// ============================================

interface ParsedPRIdentifier {
  owner: string;
  repo: string;
  prNumber: number;
}

/**
 * Parse a PR identifier in various formats:
 * - "owner/repo#123" (full format)
 * - "pr-123" (simple format - requires recent PR lookup)
 * - "#123" (requires context)
 * - "123" (just number)
 */
function parsePRIdentifier(prName: string): ParsedPRIdentifier | null {
  const trimmed = prName.trim();

  // Format: owner/repo#123 (preserve case for GitHub API)
  const fullMatch = trimmed.match(/^([^/]+)\/([^#]+)#(\d+)$/);
  if (fullMatch) {
    return {
      owner: fullMatch[1],
      repo: fullMatch[2],
      prNumber: parseInt(fullMatch[3], 10),
    };
  }

  // Format: pr-123 (simple format - not supported without context)
  const simpleMatch = trimmed.match(/^pr-?(\d+)$/i);
  if (simpleMatch) {
    return null; // Will need to search recent PRs
  }

  // Format: #123 or just 123
  const numberMatch = trimmed.match(/^#?(\d+)$/);
  if (numberMatch) {
    return null; // Will need context
  }

  return null;
}

/**
 * Search for a PR by number across user's recent PRs
 */
async function findPRByNumber(
  accessToken: string,
  prNumber: number,
  username: string
): Promise<{ owner: string; repo: string } | null> {
  // Search in user's authored PRs and review requests
  const queries = [
    `author:${username} is:pr`,
    `review-requested:${username} is:pr`,
    `involves:${username} is:pr`,
  ];

  for (const query of queries) {
    try {
      const searchQuery = encodeURIComponent(`${query}`);
      const result = await githubRequest<{
        items: Array<{
          number: number;
          repository_url: string;
        }>;
      }>(accessToken, `/search/issues?q=${searchQuery}&sort=updated&order=desc&per_page=50`);

      for (const item of result.items) {
        if (item.number === prNumber) {
          const repoMatch = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
          if (repoMatch) {
            return { owner: repoMatch[1], repo: repoMatch[2] };
          }
        }
      }
    } catch (error) {
      console.error(`Error searching for PR ${prNumber}:`, error);
    }
  }

  return null;
}

// ============================================
// Get Pull Request Context
// ============================================

/**
 * Get full context for a pull request including files and diffs.
 * Supports multiple PR identifier formats.
 */
export async function getPullRequestContext(
  userId: string,
  prName: string
): Promise<PullRequestContext> {
  const storedData = getGitHubTokens(userId);

  if (!storedData?.tokens?.access_token) {
    throw new Error("Not authenticated with GitHub");
  }

  const accessToken = storedData.tokens.access_token;
  const username = storedData.user?.login;

  // Parse PR identifier
  let parsed = parsePRIdentifier(prName);

  // If simple format (pr-123), try to find the PR
  if (!parsed) {
    const numberMatch = prName.match(/(\d+)/);
    if (numberMatch && username) {
      const prNumber = parseInt(numberMatch[1], 10);
      const found = await findPRByNumber(accessToken, prNumber, username);
      if (found) {
        parsed = { ...found, prNumber };
      }
    }
  }

  if (!parsed) {
    throw new Error(
      `Invalid PR identifier format: "${prName}". Use format like "owner/repo#123" or "pr-123".`
    );
  }

  const { owner, repo, prNumber } = parsed;
  const cacheKey = `${userId}:${owner}/${repo}#${prNumber}`;

  // Check cache first
  const cached = getCachedPRContext(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`[GitHub] Fetching PR context for ${owner}/${repo}#${prNumber}`);

  // Fetch PR details
  const prData = await githubRequest<{
    id: number;
    number: number;
    title: string;
    state: string;
    body: string | null;
    html_url: string;
    created_at: string;
    updated_at: string;
    merged_at: string | null;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      sha: string;
      ref: string;
    };
    user: {
      login: string;
    };
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
    mergeable: boolean | null;
    mergeable_state: string;
    labels: Array<{ name: string; color: string }>;
    requested_reviewers: Array<{ login: string; avatar_url: string }>;
  }>(accessToken, `/repos/${owner}/${repo}/pulls/${prNumber}`);

  // Fetch changed files with patches
  const filesData = await githubRequest<Array<{
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    previous_filename?: string;
  }>>(accessToken, `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`);

  // Build file changes with patches
  const files: FileChange[] = filesData.map((file) => ({
    filename: file.filename,
    status: file.status as FileChange['status'],
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch,
    previous_filename: file.previous_filename,
  }));

  // Determine state
  let state: 'open' | 'closed' | 'merged' = prData.state as 'open' | 'closed';
  if (prData.merged_at) {
    state = 'merged';
  }

  const context: PullRequestContext = {
    pr: {
      id: prData.id,
      number: prData.number,
      title: prData.title,
      state,
      author: prData.user.login,
      repository: {
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
      },
      updatedAt: prData.updated_at,
      createdAt: prData.created_at,
      htmlUrl: prData.html_url,
      headSha: prData.head.sha,
      baseSha: prData.base.sha,
    },
    description: prData.body || '',
    files,
    commits: prData.commits,
    baseRef: prData.base.ref,
    headRef: prData.head.ref,
    additions: prData.additions,
    deletions: prData.deletions,
    changedFiles: prData.changed_files,
    mergeable: prData.mergeable ?? undefined,
    mergeableState: prData.mergeable_state,
    labels: prData.labels.map((l) => ({ name: l.name, color: l.color })),
    reviewers: prData.requested_reviewers.map((r) => ({
      login: r.login,
      avatar_url: r.avatar_url,
    })),
  };

  // Cache the result
  setCachedPRContext(cacheKey, context);

  return context;
}

// ============================================
// Post Review Comments
// ============================================

/**
 * Post review comments to a pull request.
 * Supports inline comments (with path + line) and general comments.
 * Includes idempotency protection to prevent duplicate posts on retries.
 */
export async function postReviewComments(
  userId: string,
  prName: string,
  comments: ReviewComment[],
  event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES" = "COMMENT",
  idempotencyKey: string
): Promise<PostReviewResponse> {
  const storedData = getGitHubTokens(userId);

  if (!storedData?.tokens?.access_token) {
    throw new Error("Not authenticated with GitHub");
  }

  const accessToken = storedData.tokens.access_token;

  // Normalize PR name for consistent idempotency keys (case-insensitive)
  const normalizedPrName = String(prName || "").trim().toLowerCase();

  // Short-term lock to prevent duplicate calls within 10 seconds
  const lockKey = `lock:${normalizedPrName}:${JSON.stringify(comments.map(c => c.body).sort())}`;
  if (activeRequests.has(lockKey)) {
    console.log(`[PostReview] Duplicate request blocked (lock active): ${lockKey}`);
    // Wait for the first request to complete and return its result
    const existingResult = await activeRequests.get(lockKey);
    if (existingResult) return existingResult;
  }

  // Set lock with a promise that will resolve when we're done
  let resolveLock: (result: PostReviewResponse) => void;
  const lockPromise = new Promise<PostReviewResponse>((resolve) => {
    resolveLock = resolve;
  });
  activeRequests.set(lockKey, lockPromise);

  // Clean up lock after 10 seconds
  setTimeout(() => activeRequests.delete(lockKey), 10000);

  // Generate payload hash for content-based deduplication
  const normalizeComment = (c: ReviewComment) => ({
    body: String(c?.body || "").trim(),
    path: c?.path ? String(c.path) : undefined,
    line: typeof c?.line === "number" ? c.line : undefined,
    side: c?.side ? String(c.side) : undefined,
  });

  const payload = {
    prName: normalizedPrName,
    event,
    comments: Array.isArray(comments) ? comments.map(normalizeComment) : [],
  };

  const payloadHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  // Use normalized PR name for idempotency key (ignore userId for content-based dedup)
  const payloadKey = `idempotency:content:${normalizedPrName}:${payloadHash}`;

  console.log(`[PostReview] Checking idempotency for payload key: ${payloadKey}`);

  // Check if this exact payload was already processed
  if (idempotencyService.isProcessed(payloadKey)) {
    const cached = idempotencyService.getResult<PostReviewResponse>(payloadKey);
    if (cached) {
      console.log(`[Idempotency] Returning cached result for payload hash`);
      return cached;
    }
  }

  // Check if this idempotency key was already processed (also normalized)
  const idempKey = `idempotency:key:${normalizedPrName}:${idempotencyKey}`;

  if (idempotencyService.isProcessed(idempKey)) {
    const cached = idempotencyService.getResult<PostReviewResponse>(idempKey);
    if (cached) {
      console.log(`[Idempotency] Returning cached result for idempotency key`);
      return cached;
    }
  }

  // Parse PR identifier
  let parsed = parsePRIdentifier(prName);

  if (!parsed) {
    const numberMatch = prName.match(/(\d+)/);
    const username = storedData.user?.login;
    if (numberMatch && username) {
      const prNumber = parseInt(numberMatch[1], 10);
      const found = await findPRByNumber(accessToken, prNumber, username);
      if (found) {
        parsed = { ...found, prNumber };
      }
    }
  }

  if (!parsed) {
    throw new Error(
      `Invalid PR identifier format: "${prName}". Use format like "owner/repo#123".`
    );
  }

  const { owner, repo, prNumber } = parsed;

  // Check GitHub for existing reviews with same content (persistent duplicate check)
  const existingReviews = await githubRequest<Array<{
    id: number;
    body: string | null;
    state: string;
  }>>(accessToken, `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);

  // Separate inline comments from general comments
  const inlineComments = comments.filter((c) => c.path && c.line);
  const generalComments = comments.filter((c) => !c.path || !c.line);

  // Build review body from general comments
  const reviewBody = generalComments
    .map((c) => c.body)
    .filter(Boolean)
    .join("\n\n");

  // Check if this exact review body already exists
  if (reviewBody) {
    const duplicateReview = existingReviews.find(
      (r) => r.body?.trim().toLowerCase() === reviewBody.trim().toLowerCase()
    );
    if (duplicateReview) {
      console.log(`[PostReview] Duplicate review found on GitHub (ID: ${duplicateReview.id}), skipping post`);
      const prData = await githubRequest<{ html_url: string }>(
        accessToken,
        `/repos/${owner}/${repo}/pulls/${prNumber}`
      );
      return {
        success: true,
        reviewId: duplicateReview.id,
        prUrl: prData.html_url,
        commentsPosted: 0,
        message: `Review already exists on PR #${prNumber} (duplicate prevented)`,
      };
    }
  }

  // Determine if we should create a review
  const shouldCreateReview =
    inlineComments.length > 0 || event !== "COMMENT" || Boolean(reviewBody);

  let reviewId: number | undefined;

  if (shouldCreateReview) {
    // Format inline comments for GitHub API
    const reviewComments = inlineComments.map((comment) => ({
      path: comment.path!,
      line: comment.line!,
      side: comment.side || "RIGHT",
      body: comment.body,
    }));

    // Create the review
    const reviewData = await githubRequest<{ id: number }>(
      accessToken,
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          body: reviewBody || undefined,
          comments: reviewComments.length > 0 ? reviewComments : undefined,
        }),
      }
    );

    reviewId = reviewData.id;
  }

  // Fetch PR URL
  const prData = await githubRequest<{ html_url: string }>(
    accessToken,
    `/repos/${owner}/${repo}/pulls/${prNumber}`
  );

  const response: PostReviewResponse = {
    success: true,
    reviewId,
    prUrl: prData.html_url,
    commentsPosted: comments.length,
    message: `Successfully posted ${comments.length} comment(s) to PR #${prNumber}`,
  };

  // Mark as processed for both keys
  idempotencyService.markProcessed(idempKey, response);
  idempotencyService.markProcessed(payloadKey, response);

  // Resolve the lock so waiting requests get the result
  resolveLock!(response);

  return response;
}
