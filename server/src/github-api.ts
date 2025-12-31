import {
  GitHubPullRequest,
  GitHubTeam,
  ListPullRequestsResult,
} from "./types.js";
import { getGitHubTokens } from "./token-store.js";

const GITHUB_API_BASE = "https://api.github.com";
const MAX_RESULTS = 10;
// testting
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
