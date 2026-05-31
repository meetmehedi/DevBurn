export interface DeveloperActivity {
  commits: number;
  offHourCommits: number;
  weekendCommits: number;
  aiAssistedCommits: number;
  workloadSpikes: number;
  sentimentScore: number;     // 0-1 (higher = more positive)
  recentPRs: number;
  mergedPRs: number;
  avgPRCloseHours: number;    // Lower = more pressure / faster turnaround
  reviewsGiven: number;       // High review load = more stress
  totalAdditions: number;
  totalDeletions: number;
}

export interface BurnoutPrediction {
  riskScore: number;           // 0 to 100
  riskLevel: 'Low' | 'Medium' | 'High';
  indicators: string[];
  recommendation: string;
  breakdown: {
    offHourScore: number;      // 0-25
    workloadScore: number;     // 0-20
    sentimentScore: number;    // 0-20
    intensityScore: number;    // 0-20
    prPressureScore: number;   // 0-15
  };
}

export class BurnoutEngine {

  /**
   * ML-inspired scoring model based on research signals.
   * In production this would be an XGBoost/Random Forest inference call.
   */
  static predict(activity: DeveloperActivity): BurnoutPrediction {
    const breakdown = {
      offHourScore: 0,
      workloadScore: 0,
      sentimentScore: 0,
      intensityScore: 0,
      prPressureScore: 0,
    };

    // ── 1. Off-hour & weekend commit ratio (Weight: 25%) ──────────────────
    const totalCommits = Math.max(activity.commits, 1);
    const offHourRatio = (activity.offHourCommits + activity.weekendCommits) / totalCommits;
    breakdown.offHourScore = Math.min(Math.round(offHourRatio * 25), 25);

    // ── 2. Workload volatility spikes (Weight: 20%) ───────────────────────
    breakdown.workloadScore = Math.min(activity.workloadSpikes * 5, 20);

    // ── 3. Negative sentiment signal (Weight: 20%) ────────────────────────
    // sentimentScore from 0 (very negative) to 1 (very positive)
    breakdown.sentimentScore = Math.round((1 - activity.sentimentScore) * 20);

    // ── 4. Raw code intensity: additions + deletions (Weight: 20%) ────────
    const codeChurn = (activity.totalAdditions + activity.totalDeletions);
    // Normalize: 1000 lines/period = max intensity
    breakdown.intensityScore = Math.min(Math.round(codeChurn / 50), 20);

    // ── 5. PR turnaround pressure + review overload (Weight: 15%) ─────────
    const prPressure = activity.avgPRCloseHours > 0
      ? Math.min(48 / Math.max(activity.avgPRCloseHours, 1) * 7, 7)  // fast close = pressure
      : 0;
    const reviewOverload = Math.min(activity.reviewsGiven / 2, 8);
    breakdown.prPressureScore = Math.min(Math.round(prPressure + reviewOverload), 15);

    // ── Final score ────────────────────────────────────────────────────────
    const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    let recommendation = 'Healthy signals detected. Maintain current pace and encourage regular breaks.';
    const indicators: string[] = [];

    const aiRatio = activity.aiAssistedCommits / totalCommits;
    if (aiRatio > 0.15) {
      indicators.push(`AI Assistance: ${Math.round(aiRatio * 100)}% of commits contain auto-generated/Copilot patterns`);
    }

    if (breakdown.offHourScore >= 15) {
      indicators.push(`High off-hour activity (${Math.round(offHourRatio * 100)}% commits outside work hours)`);
    }
    if (breakdown.workloadScore >= 10) {
      indicators.push(`${activity.workloadSpikes} workload spike weeks detected`);
    }
    if (breakdown.sentimentScore >= 12) {
      indicators.push('Negative sentiment detected in commit messages / PR comments');
    }
    if (breakdown.intensityScore >= 15) {
      indicators.push(`High code churn: ${(activity.totalAdditions + activity.totalDeletions).toLocaleString()} lines changed`);
    }
    if (breakdown.prPressureScore >= 10) {
      indicators.push(`High review load (${activity.reviewsGiven} reviews given) or fast-turnaround PRs`);
    }

    if (totalScore >= 65) {
      riskLevel = 'High';
      recommendation = 'Immediate intervention required. Enforce mandatory time off, redistribute workload, and schedule a 1-on-1 check-in.';
      if (indicators.length === 0) indicators.push('Multiple compounding stress signals detected');
    } else if (totalScore >= 38) {
      riskLevel = 'Medium';
      recommendation = 'Monitor closely. Consider reducing PR review load, limit after-hours notifications, and check in with the developer.';
      if (indicators.length === 0) indicators.push('Elevated stress signals across multiple dimensions');
    } else {
      if (indicators.length === 0) indicators.push('Healthy work-life balance', 'Stable workload pattern');
    }

    return {
      riskScore: Math.min(totalScore, 100),
      riskLevel,
      indicators,
      recommendation,
      breakdown,
    };
  }
}
