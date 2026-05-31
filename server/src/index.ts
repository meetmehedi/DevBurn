import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GithubService } from './services/githubService';
import { BurnoutEngine, DeveloperActivity } from './engine/BurnoutEngine';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const githubService = new GithubService();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DevBurn Backend is running' });
});

/**
 * GET /api/burnout/team/:owner/:repo
 * Fetches real GitHub data and runs the Burnout Engine on each developer.
 */
app.get('/api/burnout/team/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    console.log(`[API] Analysis requested for ${owner}/${repo}`);

    // 1. Fetch rich data from GitHub
    const teamData = await githubService.fetchRepositoryData(owner, repo);

    // 2. Simple keyword-based sentiment proxy (placeholder until NLP is integrated)
    //    Scans commit messages, PR titles, and review comments for stress/burnout keywords
    const stressKeywords = [
      'fix', 'bug', 'crash', 'broken', 'urgent', 'hotfix', 'revert',
      'wip', 'temp', 'hack', 'workaround', 'critical', 'emergency', 'asap',
      'failed', 'oops', 'sorry', 'late', 'deadline', 'rush'
    ];
    const positiveKeywords = [
      'feat', 'add', 'improve', 'refactor', 'clean', 'optimize',
      'enhance', 'great', 'nice', 'done', 'complete', 'test', 'docs'
    ];

    function computeSentiment(texts: string[]): number {
      if (texts.length === 0) return 0.5; // neutral default
      let score = 0;
      for (const text of texts) {
        const lower = text.toLowerCase();
        const stressHits = stressKeywords.filter(k => lower.includes(k)).length;
        const positiveHits = positiveKeywords.filter(k => lower.includes(k)).length;
        score += (positiveHits - stressHits);
      }
      // Normalize to 0–1 range
      const avg = score / texts.length;
      return Math.max(0, Math.min(1, 0.5 + avg * 0.1));
    }

    // 3. Map each developer's data → DeveloperActivity → BurnoutPrediction
    const results = teamData.map(dev => {
      const allTexts = [
        ...dev.commitMessages,
        ...dev.prTitles,
        ...dev.reviewComments,
      ];

      const activity: DeveloperActivity = {
        commits: dev.commits,
        offHourCommits: dev.offHourCommits,
        weekendCommits: dev.weekendCommits,
        workloadSpikes: dev.workloadSpikes,
        sentimentScore: computeSentiment(allTexts),
        recentPRs: dev.recentPRs,
        mergedPRs: dev.mergedPRs,
        avgPRCloseHours: dev.avgPRCloseHours,
        reviewsGiven: dev.reviewsGiven,
        totalAdditions: dev.totalAdditions,
        totalDeletions: dev.totalDeletions,
      };

      const prediction = BurnoutEngine.predict(activity);

      return {
        name: dev.name,
        login: dev.login,
        avatarUrl: dev.avatarUrl,
        role: 'Developer',
        stats: {
          commits: dev.commits,
          offHourCommits: dev.offHourCommits,
          weekendCommits: dev.weekendCommits,
          recentPRs: dev.recentPRs,
          mergedPRs: dev.mergedPRs,
          reviewsGiven: dev.reviewsGiven,
          avgPRCloseHours: dev.avgPRCloseHours,
          codeChurn: dev.totalAdditions + dev.totalDeletions,
          weeklyCommitHistory: dev.weeklyCommitHistory,
          sentimentScore: activity.sentimentScore,
        },
        prediction,
      };
    });

    // Sort by risk score (highest first)
    results.sort((a, b) => b.prediction.riskScore - a.prediction.riskScore);

    res.json(results);
  } catch (error: any) {
    console.error('[API Error]', error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`DevBurn server running at http://localhost:${port}`);
});
