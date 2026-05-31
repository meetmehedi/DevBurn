import axios, { AxiosInstance } from 'axios';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CommitData {
  sha: string;
  author: string;
  date: Date;
  message: string;
  isOffHour: boolean;
  isWeekend: boolean;
  additions: number;
  deletions: number;
}

export interface PRData {
  number: number;
  author: string;
  title: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: Date;
  closedAt: Date | null;
  reviewCount: number;
  commentCount: number;
  hoursToClose: number | null;
  reviewComments: string[]; // raw text for sentiment analysis
}

export interface WeeklyContribStats {
  week: number; // Unix timestamp
  additions: number;
  deletions: number;
  commits: number;
}

export interface DevData {
  login: string;      // GitHub username
  name: string;       // Display name
  avatarUrl: string;
  commits: number;
  offHourCommits: number;
  weekendCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  workloadSpikes: number;    // Weeks where commits > 2x their own average
  recentPRs: number;
  mergedPRs: number;
  avgPRCloseHours: number;   // Average hours to close a PR
  reviewsGiven: number;
  commentsGiven: number;
  commitMessages: string[];  // For NLP sentiment
  prTitles: string[];        // For NLP sentiment
  reviewComments: string[];  // For NLP sentiment
  weeklyCommitHistory: number[]; // Commit counts per week (last 12 weeks)
  rawCommits: CommitData[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GithubService {
  private http: AxiosInstance;

  constructor() {
    const token = process.env.GITHUB_TOKEN || '';
    this.http = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 15000,
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Determine if a UTC commit hour is "off hours" (before 8am or after 7pm) */
  private isOffHour(date: Date): boolean {
    const hour = date.getUTCHours();
    return hour < 8 || hour >= 19;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  /** Detect weeks where a developer committed more than 2× their own weekly average */
  private detectWorkloadSpikes(weeklyHistory: number[]): number {
    if (weeklyHistory.length === 0) return 0;
    const avg = weeklyHistory.reduce((a, b) => a + b, 0) / weeklyHistory.length;
    return weeklyHistory.filter(w => w > avg * 2).length;
  }

  /** Simple paginated GET */
  private async paginate<T>(path: string, maxPages = 5): Promise<T[]> {
    const results: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const sep = path.includes('?') ? '&' : '?';
      const res = await this.http.get<T[]>(`${path}${sep}per_page=100&page=${page}`);
      results.push(...res.data);
      if (res.data.length < 100) break; // last page
    }
    return results;
  }

  // ─── Data Fetchers ──────────────────────────────────────────────────────────

  /** Fetch and enrich all commits in a repo */
  private async fetchCommits(owner: string, repo: string): Promise<CommitData[]> {
    const raw = await this.paginate<any>(`/repos/${owner}/${repo}/commits`, 5);

    const commits: CommitData[] = [];
    for (const c of raw) {
      const date = new Date(c.commit.author.date);
      commits.push({
        sha: c.sha,
        author: c.commit.author.name || c.author?.login || 'Unknown',
        date,
        message: c.commit.message?.split('\n')[0] || '',
        isOffHour: this.isOffHour(date),
        isWeekend: this.isWeekend(date),
        // additions/deletions require individual commit fetch (expensive); skip for now
        additions: 0,
        deletions: 0,
      });
    }
    return commits;
  }

  /** Fetch pull requests with review & comment counts */
  private async fetchPRs(owner: string, repo: string): Promise<PRData[]> {
    const raw = await this.paginate<any>(
      `/repos/${owner}/${repo}/pulls?state=all`,
      3
    );

    const prs: PRData[] = [];
    for (const pr of raw) {
      const createdAt = new Date(pr.created_at);
      const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;
      const hoursToClose = closedAt
        ? (closedAt.getTime() - createdAt.getTime()) / 3_600_000
        : null;

      // Fetch review comments for this PR (up to 1 page for speed)
      let reviewComments: string[] = [];
      try {
        const reviewRes = await this.http.get<any[]>(
          `/repos/${owner}/${repo}/pulls/${pr.number}/comments?per_page=30`
        );
        reviewComments = reviewRes.data.map((c: any) => c.body as string).filter(Boolean);
      } catch { /* ignore */ }

      prs.push({
        number: pr.number,
        author: pr.user?.login || 'Unknown',
        title: pr.title || '',
        state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
        createdAt,
        closedAt,
        reviewCount: pr.requested_reviewers?.length ?? 0,
        commentCount: pr.comments ?? 0,
        hoursToClose,
        reviewComments,
      });
    }
    return prs;
  }

  /** Fetch weekly contributor stats (GitHub caches this; may need a retry) */
  private async fetchContributorStats(owner: string, repo: string): Promise<
    Record<string, WeeklyContribStats[]>
  > {
    // GitHub returns 202 (processing) on first request; retry up to 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.http.get<any[]>(`/repos/${owner}/${repo}/stats/contributors`);
        if (res.status === 202) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        if (!res.data) return {};
        const map: Record<string, WeeklyContribStats[]> = {};
        for (const contributor of res.data) {
          const login = contributor.author?.login;
          if (!login) continue;
          map[login] = contributor.weeks.map((w: any) => ({
            week: w.w,
            additions: w.a,
            deletions: w.d,
            commits: w.c,
          }));
        }
        return map;
      } catch { break; }
    }
    return {};
  }

  /** Fetch PR reviews to see who reviewed what */
  private async fetchReviewsByAuthor(
    owner: string,
    repo: string,
    prNumbers: number[]
  ): Promise<Record<string, number>> {
    const reviewCounts: Record<string, number> = {};
    // Sample the first 20 PRs to keep API usage reasonable
    for (const num of prNumbers.slice(0, 20)) {
      try {
        const res = await this.http.get<any[]>(
          `/repos/${owner}/${repo}/pulls/${num}/reviews?per_page=50`
        );
        for (const review of res.data) {
          const login = review.user?.login;
          if (login) reviewCounts[login] = (reviewCounts[login] || 0) + 1;
        }
      } catch { /* skip */ }
    }
    return reviewCounts;
  }

  // ─── Main Entry Point ───────────────────────────────────────────────────────

  async fetchRepositoryData(owner: string, repo: string): Promise<DevData[]> {
    console.log(`[GitHub] Fetching data for ${owner}/${repo}…`);

    // Fetch in parallel where possible
    const [commits, prs, contributorStats] = await Promise.all([
      this.fetchCommits(owner, repo),
      this.fetchPRs(owner, repo),
      this.fetchContributorStats(owner, repo),
    ]);

    const prNumbers = prs.map(p => p.number);
    const reviewsByAuthor = await this.fetchReviewsByAuthor(owner, repo, prNumbers);

    // ── Aggregate by developer ──────────────────────────────────────────────
    const devMap: Record<string, DevData> = {};

    // Helper to get/init a dev entry (keyed by display name from commits)
    const getOrCreate = (name: string): DevData => {
      if (!devMap[name]) {
        devMap[name] = {
          login: name,
          name,
          avatarUrl: '',
          commits: 0,
          offHourCommits: 0,
          weekendCommits: 0,
          totalAdditions: 0,
          totalDeletions: 0,
          workloadSpikes: 0,
          recentPRs: 0,
          mergedPRs: 0,
          avgPRCloseHours: 0,
          reviewsGiven: 0,
          commentsGiven: 0,
          commitMessages: [],
          prTitles: [],
          reviewComments: [],
          weeklyCommitHistory: [],
          rawCommits: [],
        };
      }
      return devMap[name];
    };

    // Process commits
    for (const c of commits) {
      const dev = getOrCreate(c.author);
      dev.commits++;
      dev.rawCommits.push(c);
      if (c.message) dev.commitMessages.push(c.message);
      if (c.isOffHour) dev.offHourCommits++;
      if (c.isWeekend) dev.weekendCommits++;
      dev.totalAdditions += c.additions;
      dev.totalDeletions += c.deletions;
    }

    // Process PRs (keyed by GitHub login)
    for (const pr of prs) {
      const dev = getOrCreate(pr.author);
      dev.login = pr.author;
      dev.recentPRs++;
      dev.commentsGiven += pr.commentCount;
      if (pr.state === 'merged') dev.mergedPRs++;
      if (pr.title) dev.prTitles.push(pr.title);
      dev.reviewComments.push(...pr.reviewComments);
    }

    // Compute average PR close time per developer
    const prCloseMap: Record<string, number[]> = {};
    for (const pr of prs) {
      if (pr.hoursToClose !== null) {
        if (!prCloseMap[pr.author]) prCloseMap[pr.author] = [];
        prCloseMap[pr.author].push(pr.hoursToClose);
      }
    }
    for (const [login, hours] of Object.entries(prCloseMap)) {
      const dev = devMap[login];
      if (dev) {
        dev.avgPRCloseHours = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
      }
    }

    // Attach reviews given (from GitHub PR review API)
    for (const [login, count] of Object.entries(reviewsByAuthor)) {
      const dev = devMap[login];
      if (dev) dev.reviewsGiven = count;
    }

    // Enrich with contributor stats (weekly granularity)
    for (const [login, weeks] of Object.entries(contributorStats)) {
      const dev = devMap[login];
      if (!dev) continue;
      const last12 = weeks.slice(-12);
      dev.weeklyCommitHistory = last12.map(w => w.commits);
      dev.totalAdditions += last12.reduce((a, w) => a + w.additions, 0);
      dev.totalDeletions += last12.reduce((a, w) => a + w.deletions, 0);
      dev.workloadSpikes = this.detectWorkloadSpikes(dev.weeklyCommitHistory);
    }

    console.log(`[GitHub] Collected data for ${Object.keys(devMap).length} developers.`);
    return Object.values(devMap);
  }
}
