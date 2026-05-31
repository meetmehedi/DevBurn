import './style.css'

// Store last analysis results globally so the report can access them
let lastAnalysisData: { owner: string; repo: string; members: any[] } | null = null;

// ─── App Shell ────────────────────────────────────────────────────────────────

function renderApp() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <header>
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="url(#grad)"/>
          <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stop-color="#6366f1"/>
              <stop offset="1" stop-color="#ec4899"/>
            </linearGradient>
          </defs>
        </svg>
        DevBurn
      </div>
      <nav style="display: flex; gap: 0.75rem; align-items:center;">
        <button class="btn" id="nav-dashboard">Dashboard</button>
        <button class="btn" id="nav-report" style="display:none">📋 View Report</button>
        <button class="btn" id="nav-research">Research & Pitch</button>
        <button class="btn btn-primary" id="refresh-data">🔍 Analyze Repo</button>
      </nav>
    </header>
    <div id="content-area" class="animate-fade"></div>
    <footer style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
      &copy; 2026 DevBurn Research Group | SDM Course Project
    </footer>
  `
  setupListeners()
}

// ─── GitHub URL Parser ────────────────────────────────────────────────────────

function parseGitHubInput(input: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(input);
    if (url.hostname === 'github.com') {
      const parts = url.pathname.replace(/^\//, '').split('/');
      if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
    }
  } catch {
    const parts = input.trim().split('/');
    if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupListeners() {
  document.querySelector('#nav-dashboard')?.addEventListener('click', () => showView('dashboard'))
  document.querySelector('#nav-research')?.addEventListener('click', () => showView('research'))
  document.querySelector('#nav-report')?.addEventListener('click', () => showView('report'))

  document.body.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'refresh-data') {
      const btn = e.target as HTMLButtonElement
      const input = prompt(
        'Paste a GitHub URL or enter owner/repo:\n\nExamples:\n• https://github.com/meetmehedi/my-repo\n• facebook/react',
        ''
      );
      if (!input) return;
      const parsed = parseGitHubInput(input);
      if (!parsed) {
        alert('Invalid input. Please paste a full GitHub URL or enter owner/repo.');
        return;
      }
      btn.textContent = 'Fetching from GitHub...'
      btn.disabled = true
      runAnalysis(parsed.owner, parsed.repo).finally(() => {
        btn.textContent = '🔍 Analyze Repo'
        btn.disabled = false
      })
    }
  })
}

// ─── Views ────────────────────────────────────────────────────────────────────

function setNavActive(view: string) {
  document.querySelectorAll('nav .btn').forEach(btn => btn.classList.remove('btn-primary'))
  document.querySelector(`#nav-${view}`)?.classList.add('btn-primary')
}

function showView(view: string) {
  const content = document.querySelector('#content-area')!
  setNavActive(view)

  if (view === 'dashboard') {
    content.innerHTML = `
      <div class="dashboard-grid">
        <div class="glass stat-card">
          <span class="text-muted">Avg. Team Burnout Risk</span>
          <div class="stat-value" id="avg-risk">--%</div>
          <div class="risk-indicator" id="team-status">Awaiting GitHub Data...</div>
        </div>
        <div class="glass stat-card">
          <span class="text-muted">Developers Analyzed</span>
          <div class="stat-value" id="total-devs">0</div>
          <span class="text-muted">Based on recent commits</span>
        </div>
        <div class="glass stat-card" style="grid-column: span 2;">
          <span class="text-muted">Workload Intensity Trend</span>
          <div class="chart-container" id="trend-chart">
            ${Array.from({length: 12}).map(() => `<div class="bar" style="height: ${Math.random() * 80 + 20}%"></div>`).join('')}
          </div>
        </div>
        <div class="glass" style="grid-column: 1 / -1; padding: 2rem;">
          <h2 style="margin-bottom: 1.5rem;">Developer Health Insights</h2>
          <div id="team-list" style="display: grid; gap: 1rem;">
            <div style="text-align: center; color: var(--text-muted); padding: 3rem;">
              Click <strong>"🔍 Analyze Repo"</strong> and paste your GitHub repository URL to run the ML Burnout Engine on real commit data.
            </div>
          </div>
        </div>
      </div>
    `
    // Re-render analysis data if we already have it
    if (lastAnalysisData) renderDashboardResults(lastAnalysisData.members)

  } else if (view === 'report') {
    if (!lastAnalysisData) {
      content.innerHTML = `<div style="text-align:center;padding:4rem;color:var(--text-muted)">No analysis data yet. Run an analysis first.</div>`
      return
    }
    renderReportView(content, lastAnalysisData)

  } else {
    content.innerHTML = `
      <div style="max-width: 1000px; margin: 0 auto; padding: 3rem 2rem;">
        <section class="animate-fade">
          <h1 style="font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(135deg, #fff 0%, var(--accent-primary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Research Motivation</h1>
          <p class="text-muted" style="font-size: 1.2rem; margin-bottom: 3rem;">Predicting burnout isn't just about HR—it's about engineering quality and team resilience.</p>
          <div class="glass" style="padding: 2.5rem; margin-bottom: 2rem;">
            <h2 style="color: var(--accent-secondary); margin-bottom: 1rem;">The Research Gap</h2>
            <p>Current burnout detection relies on reactive surveys and annual reviews. These methods are subjective, intrusive, and often too late. <strong>DevBurn</strong> fills this gap by leveraging <strong>passive version control behavioral signals</strong> for real-time, objective analysis.</p>
          </div>
          <div class="dashboard-grid" style="grid-template-columns: repeat(2, 1fr); padding: 0;">
            <div class="glass" style="padding: 2rem;">
              <h3 style="margin-bottom: 1rem;">ML Objectives</h3>
              <ul style="list-style: none; color: var(--text-muted);">
                <li>• Detect off-hour commit patterns</li>
                <li>• Identify workload volatility spikes</li>
                <li>• Analyze communication sentiment</li>
                <li>• Predict attrition risk before it occurs</li>
              </ul>
            </div>
            <div class="glass" style="padding: 2rem;">
              <h3 style="margin-bottom: 1rem;">Strategic Impact</h3>
              <ul style="list-style: none; color: var(--text-muted);">
                <li>• 30% reduction in team attrition</li>
                <li>• Improved code quality and safety</li>
                <li>• Better work-life balance for devs</li>
                <li>• Data-driven engineering leadership</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    `
  }
}

// ─── Report View ──────────────────────────────────────────────────────────────

function renderReportView(container: Element, data: { owner: string; repo: string; members: any[] }) {
  const { owner, repo, members } = data;
  const totalRisk = members.reduce((sum, m) => sum + m.prediction.riskScore, 0);
  const avgRisk = Math.round(totalRisk / members.length);
  const highRisk = members.filter(m => m.prediction.riskLevel === 'High');
  const medRisk  = members.filter(m => m.prediction.riskLevel === 'Medium');
  const lowRisk  = members.filter(m => m.prediction.riskLevel === 'Low');
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const overallStatus = avgRisk >= 65
    ? { label: 'CRITICAL', color: '#ef4444', emoji: '🔴', bg: 'rgba(239,68,68,0.1)' }
    : avgRisk >= 38
    ? { label: 'AT RISK', color: '#f59e0b', emoji: '🟡', bg: 'rgba(245,158,11,0.1)' }
    : { label: 'HEALTHY', color: '#22c55e', emoji: '🟢', bg: 'rgba(34,197,94,0.1)' };

  // Company-level action items
  const companyActions = generateCompanyActions(members, avgRisk);

  // Data sources section
  const dataSources = [
    { icon: '📝', name: 'Commit History', endpoint: `/repos/${owner}/${repo}/commits`, description: 'Timestamps analyzed for off-hour (before 9am / after 6pm Bangladesh Time) and weekend (Friday & Saturday) activity patterns.', collected: members.reduce((s, m) => s + (m.stats.commits || 0), 0) + ' commits' },
    { icon: '🔀', name: 'Pull Requests', endpoint: `/repos/${owner}/${repo}/pulls?state=all`, description: 'PR open/close times used to compute turnaround pressure and merge rates.', collected: members.reduce((s, m) => s + (m.stats.recentPRs || 0), 0) + ' PRs' },
    { icon: '💬', name: 'PR Review Comments', endpoint: `/repos/${owner}/${repo}/pulls/:n/comments`, description: 'Raw comment text scanned for stress/positive keywords as a sentiment proxy.', collected: 'Sampled from first 20 PRs' },
    { icon: '📊', name: 'Weekly Contributor Stats', endpoint: `/repos/${owner}/${repo}/stats/contributors`, description: '12-week per-contributor commit, addition, and deletion history for workload spike detection.', collected: members.length + ' contributors' },
    { icon: '🧐', name: 'PR Reviews Given', endpoint: `/repos/${owner}/${repo}/pulls/:n/reviews`, description: 'Number of reviews submitted per developer, used to detect review overload.', collected: 'Sampled from first 20 PRs' },
  ];

  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:2rem">

      <!-- Report Header -->
      <div class="glass" style="padding:2.5rem;margin-bottom:2rem;background:${overallStatus.bg};border:1px solid ${overallStatus.color}33">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
          <div>
            <div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${overallStatus.color};margin-bottom:0.5rem">
              ${overallStatus.emoji} DevBurn Report — ${overallStatus.label}
            </div>
            <h1 style="font-size:2rem;font-weight:800;margin:0 0 0.5rem">
              Developer Burnout Risk Assessment
            </h1>
            <div style="color:var(--text-muted);font-size:0.9rem">
              Repository: <strong style="color:#fff">github.com/${owner}/${repo}</strong> &nbsp;|&nbsp; Generated: ${now}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:3.5rem;font-weight:900;color:${overallStatus.color};line-height:1">${avgRisk}</div>
            <div style="font-size:0.8rem;font-weight:600;text-transform:uppercase;color:${overallStatus.color}">Team Risk Score / 100</div>
          </div>
        </div>
      </div>

      <!-- Summary Stats Row -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem">
        ${statBox('👥', members.length, 'Developers Analyzed', 'var(--accent-primary)')}
        ${statBox('🔴', highRisk.length, 'High Risk', '#ef4444')}
        ${statBox('🟡', medRisk.length, 'Medium Risk', '#f59e0b')}
        ${statBox('🟢', lowRisk.length, 'Low Risk', '#22c55e')}
      </div>

      <!-- Two columns: Company Actions + Data Sources -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">

        <!-- Company Action Plan -->
        <div class="glass" style="padding:1.75rem">
          <h2 style="font-size:1.2rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:0.5rem">
            🎯 Company Action Plan
          </h2>
          ${companyActions.map(a => `
            <div style="display:flex;gap:0.75rem;margin-bottom:1rem;padding:0.85rem;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid ${a.color}">
              <div style="font-size:1.3rem;flex-shrink:0">${a.icon}</div>
              <div>
                <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.2rem">${a.title}</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">${a.body}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Data Sources -->
        <div class="glass" style="padding:1.75rem">
          <h2 style="font-size:1.2rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:0.5rem">
            🗄️ Where Is the Data From?
          </h2>
          ${dataSources.map(ds => `
            <div style="margin-bottom:1rem;padding:0.85rem;background:rgba(255,255,255,0.04);border-radius:8px">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem">
                <span style="font-size:1.1rem">${ds.icon}</span>
                <span style="font-weight:700;font-size:0.9rem">${ds.name}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);margin-left:auto;font-family:monospace;background:rgba(255,255,255,0.07);padding:0.1rem 0.4rem;border-radius:4px">${ds.collected}</span>
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.2rem">${ds.description}</div>
              <div style="font-size:0.7rem;color:var(--accent-primary);font-family:monospace;opacity:0.7">GET ${ds.endpoint}</div>
            </div>
          `).join('')}
          <div style="margin-top:1rem;padding:0.75rem;background:rgba(99,102,241,0.08);border-radius:8px;font-size:0.75rem;color:var(--text-muted)">
            🔒 <strong>Privacy:</strong> Only public repository data is accessed. No personal tokens or private data are stored. All analysis runs locally on your machine.
          </div>
        </div>
      </div>

      <!-- Per-Developer Report -->
      <div class="glass" style="padding:1.75rem;margin-bottom:2rem">
        <h2 style="font-size:1.2rem;margin-bottom:1.5rem">👤 Individual Developer Findings</h2>
        <div style="display:grid;gap:1rem">
          ${members.map(m => developerReportCard(m)).join('')}
        </div>
      </div>

      <!-- Risk Legend -->
      <div class="glass" style="padding:1.5rem;margin-bottom:2rem">
        <h2 style="font-size:1.1rem;margin-bottom:1rem">📖 How the Risk Score Is Calculated</h2>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.75rem">
          ${scoreFactorBox('Off-Hour Activity', '25 pts', '#f59e0b', 'Ratio of commits made before 9am or after 6pm Bangladesh Time, including weekends (Friday & Saturday).')}
          ${scoreFactorBox('Workload Spikes', '20 pts', '#ef4444', 'Weeks where commit volume exceeds 2× the developer\'s own rolling average.')}
          ${scoreFactorBox('Negative Sentiment', '20 pts', '#a855f7', 'Keyword-based proxy: stress words (fix, bug, urgent) vs positive words in messages.')}
          ${scoreFactorBox('Code Intensity', '20 pts', '#3b82f6', 'Total lines added + deleted normalized per period (>1000 lines = max score).')}
          ${scoreFactorBox('PR Pressure', '15 pts', '#ec4899', 'Fast PR turnaround time + high number of reviews given to others.')}
        </div>
      </div>

    </div>
  `
}

// ─── Helper Renderers ─────────────────────────────────────────────────────────

function statBox(icon: string, value: number | string, label: string, color: string): string {
  return `
    <div class="glass" style="padding:1.25rem;text-align:center">
      <div style="font-size:1.5rem">${icon}</div>
      <div style="font-size:2rem;font-weight:800;color:${color}">${value}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">${label}</div>
    </div>
  `
}

function scoreFactorBox(title: string, weight: string, color: string, desc: string): string {
  return `
    <div style="padding:0.85rem;background:rgba(255,255,255,0.04);border-radius:8px;border-top:3px solid ${color}">
      <div style="font-weight:700;font-size:0.85rem;margin-bottom:0.2rem">${title}</div>
      <div style="font-size:1rem;font-weight:900;color:${color};margin-bottom:0.35rem">${weight}</div>
      <div style="font-size:0.72rem;color:var(--text-muted)">${desc}</div>
    </div>
  `
}

function developerReportCard(member: any): string {
  const { prediction, name, stats } = member;
  const riskColor = prediction.riskLevel === 'High' ? '#ef4444' : prediction.riskLevel === 'Medium' ? '#f59e0b' : '#22c55e';
  const bd = prediction.breakdown || {};
  const topSignal = Object.entries(bd as Record<string, number>)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];

  const offHourPct = stats.commits > 0 ? Math.round(((stats.offHourCommits + stats.weekendCommits) / stats.commits) * 100) : 0;

  return `
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;padding:1rem;background:rgba(255,255,255,0.03);border-radius:10px;border-left:4px solid ${riskColor}">
      <div style="text-align:center;min-width:60px">
        <div style="font-size:1.6rem;font-weight:900;color:${riskColor}">${prediction.riskScore}</div>
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:${riskColor}">${prediction.riskLevel}</div>
      </div>
      <div>
        <div style="font-weight:700;font-size:1rem">${name}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem">
          ${stats.commits} commits &nbsp;·&nbsp; ${offHourPct}% off-hour &nbsp;·&nbsp; ${stats.recentPRs} PRs &nbsp;·&nbsp; ${(stats.codeChurn || 0).toLocaleString()} lines changed
        </div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem">
          <strong style="color:#fff">Signals:</strong> ${prediction.indicators.join(' · ') || 'None'}
        </div>
      </div>
      <div style="max-width:220px;font-size:0.78rem;color:var(--text-muted);background:rgba(255,255,255,0.04);padding:0.6rem;border-radius:6px">
        <strong style="color:#fff">Action:</strong> ${prediction.recommendation}
      </div>
    </div>
  `
}

function generateCompanyActions(members: any[], avgRisk: number): { icon: string; title: string; body: string; color: string }[] {
  const highRisk = members.filter(m => m.prediction.riskLevel === 'High');
  const medRisk  = members.filter(m => m.prediction.riskLevel === 'Medium');
  const highOffHour = members.filter(m => m.stats.offHourCommits > m.stats.commits * 0.3);
  const highChurn = members.filter(m => m.stats.codeChurn > 5000);
  const actions = [];

  if (highRisk.length > 0) {
    actions.push({
      icon: '🚨', color: '#ef4444',
      title: `Immediate 1-on-1 Check-ins (${highRisk.length} developer${highRisk.length > 1 ? 's' : ''})`,
      body: `Schedule mandatory wellness meetings with: ${highRisk.map((m: any) => m.name).join(', ')}. Discuss workload, blockers, and offer reassignment options.`
    });
  }

  if (highOffHour.length > 0) {
    actions.push({
      icon: '🌙', color: '#f59e0b',
      title: 'Enforce Work-Hour Boundaries',
      body: `${highOffHour.length} developer(s) are regularly committing after hours or on weekends. Disable evening merge notifications and implement a "no deploy after 6pm" policy.`
    });
  }

  if (medRisk.length > 0) {
    actions.push({
      icon: '🔔', color: '#f59e0b',
      title: `Monitor Medium-Risk Developers (${medRisk.length})`,
      body: `Set up bi-weekly check-ins for: ${medRisk.map((m: any) => m.name).join(', ')}. Track PR merge rates and review load over the next 4 weeks.`
    });
  }

  if (highChurn.length > 0) {
    actions.push({
      icon: '📊', color: '#3b82f6',
      title: 'Redistribute High Code-Churn Workloads',
      body: `${highChurn.map((m: any) => m.name).join(', ')} ${highChurn.length === 1 ? 'is' : 'are'} carrying exceptionally high code change volumes. Consider pairing with junior developers or splitting epic tickets.`
    });
  }

  actions.push({
    icon: '📅', color: '#22c55e',
    title: 'Establish a Sprint Retrospective on Burnout Signals',
    body: 'Add a standing 10-minute agenda item to review DevBurn metrics at the end of every sprint. Use trend data to proactively intervene before risk escalates.'
  });

  if (avgRisk < 38) {
    actions.push({
      icon: '✅', color: '#22c55e',
      title: 'Team Health is Good — Maintain the Culture',
      body: 'Current signals indicate a healthy team. Continue regular 1-on-1s, protect deep work time blocks, and re-run this analysis monthly.'
    });
  }

  return actions;
}

// ─── Analysis Runner ──────────────────────────────────────────────────────────

async function runAnalysis(owner: string, repo: string) {
  // Switch to dashboard and show loading
  showView('dashboard')
  const teamList = document.querySelector('#team-list')!
  teamList.innerHTML = `
    <div style="text-align:center;padding:3rem">
      <div style="font-size:2rem;margin-bottom:1rem">⚙️</div>
      <div style="font-weight:700;margin-bottom:0.5rem">Fetching real data from GitHub…</div>
      <div style="color:var(--text-muted);font-size:0.85rem">Collecting commits, PRs, reviews, and contributor stats for <strong>${owner}/${repo}</strong></div>
    </div>
  `;

  try {
    const url = `http://localhost:3000/api/burnout/team/${owner}/${repo}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    const members = await response.json();
    if (members.length === 0) {
      teamList.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)">No commit data found for this repository.</div>';
      return;
    }

    // Store globally for report view
    lastAnalysisData = { owner, repo, members };

    // Show the report nav button
    const reportBtn = document.querySelector('#nav-report') as HTMLElement;
    if (reportBtn) reportBtn.style.display = 'inline-flex';

    renderDashboardResults(members);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    const teamList2 = document.querySelector('#team-list');
    if (teamList2) {
      teamList2.innerHTML = `
        <div style="text-align:center;color:#ef4444;padding:2rem">
          <div style="font-size:2rem;margin-bottom:0.5rem">❌</div>
          <div>Error fetching data. Is the backend running on port 3000?</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">${(error as Error).message}</div>
        </div>
      `;
    }
  }
}

function renderDashboardResults(members: any[]) {
  const teamList = document.querySelector('#team-list');
  if (!teamList) return;

  let totalRisk = 0;

  const membersHtml = members.map((member: any) => {
    const { prediction, name, stats } = member;
    totalRisk += prediction.riskScore;

    const riskColorClass = prediction.riskLevel === 'High' ? 'risk-high' : prediction.riskLevel === 'Medium' ? 'risk-medium' : 'risk-low';
    const signals = prediction.indicators.join(' • ');
    const sentimentPct = Math.round((stats.sentimentScore || 0.5) * 100);
    const history: number[] = stats.weeklyCommitHistory || [];
    const maxH = Math.max(...history, 1);
    const sparkline = history.length > 0
      ? history.map(v => {
          const h = Math.round((v / maxH) * 28);
          return `<div style="width:6px;height:${Math.max(h,2)}px;background:var(--accent-primary);border-radius:2px;opacity:0.8;align-self:flex-end"></div>`;
        }).join('')
      : '<span style="font-size:0.75rem;color:var(--text-muted)">No history</span>';

    const bd = prediction.breakdown || {};
    const bar = (label: string, val: number, max: number, color: string) => {
      const pct = Math.round((val / max) * 100);
      return `<div style="margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-bottom:2px"><span>${label}</span><span>${val}/${max}</span></div>
        <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px">
          <div style="height:4px;width:${pct}%;background:${color};border-radius:2px;transition:width 0.6s ease"></div>
        </div>
      </div>`;
    };

    return `
      <div class="glass glass-hover" style="padding:1.5rem;border-radius:12px;display:flex;flex-direction:column;gap:1rem">
        <div style="display:grid;grid-template-columns:1fr auto;align-items:start;gap:1rem">
          <div>
            <div style="font-weight:700;font-size:1.1rem">${name}</div>
            <div class="text-muted" style="font-size:0.85rem">${member.login !== name ? '@' + member.login : '&nbsp;'}</div>
          </div>
          <div style="text-align:center;min-width:80px">
            <div class="stat-value ${riskColorClass}" style="font-size:1.8rem;line-height:1">${prediction.riskScore}</div>
            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px">${prediction.riskLevel} Risk</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;background:rgba(255,255,255,0.03);border-radius:8px;padding:0.75rem">
          ${['commits','offHourCommits','weekendCommits','recentPRs','reviewsGiven'].map((k, i) => {
            const labels = ['Commits','Off-Hour','Weekends','PRs','Reviews'];
            const warn = k === 'offHourCommits' && stats.offHourCommits > stats.commits * 0.3;
            return `<div style="text-align:center"><div style="font-size:1.1rem;font-weight:700;${warn ? 'color:#f59e0b' : ''}">${stats[k] || 0}</div><div class="text-muted" style="font-size:0.7rem">${labels[i]}</div></div>`;
          }).join('')}
          <div style="text-align:center"><div style="font-size:1.1rem;font-weight:700">${sentimentPct}%</div><div class="text-muted" style="font-size:0.7rem">Sentiment</div></div>
        </div>
        <div style="display:flex;gap:1rem;font-size:0.8rem;color:var(--text-muted);flex-wrap:wrap">
          <span>📝 <strong>${(stats.codeChurn || 0).toLocaleString()}</strong> lines changed</span>
          <span>⏱ Avg PR close: <strong>${stats.avgPRCloseHours ? stats.avgPRCloseHours + 'h' : 'N/A'}</strong></span>
          <span>✅ <strong>${stats.mergedPRs || 0}</strong> merged</span>
        </div>
        ${history.length > 0 ? `
        <div>
          <div class="text-muted" style="font-size:0.72rem;margin-bottom:4px">12-week commit history</div>
          <div style="display:flex;gap:3px;align-items:flex-end;height:30px">${sparkline}</div>
        </div>` : ''}
        <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:0.75rem">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Risk Score Breakdown</div>
          ${bar('Off-Hour Activity', bd.offHourScore || 0, 25, '#f59e0b')}
          ${bar('Workload Spikes', bd.workloadScore || 0, 20, '#ef4444')}
          ${bar('Negative Sentiment', bd.sentimentScore || 0, 20, '#a855f7')}
          ${bar('Code Intensity', bd.intensityScore || 0, 20, '#3b82f6')}
          ${bar('PR Pressure / Reviews', bd.prPressureScore || 0, 15, '#ec4899')}
        </div>
        <div>
          <div style="font-size:0.82rem;margin-bottom:6px;color:var(--text-muted)"><strong>Signals:</strong> ${signals || 'No strong signals'}</div>
          <div style="font-size:0.82rem;background:rgba(255,255,255,0.04);padding:0.6rem;border-radius:6px;border-left:3px solid var(--accent-primary)">
            <strong>Recommendation:</strong> ${prediction.recommendation}
          </div>
        </div>
      </div>
    `;
  }).join('');

  teamList.innerHTML = membersHtml;

  // Update stat cards
  const avgRisk = Math.round(totalRisk / members.length);
  const avgEl = document.querySelector('#avg-risk');
  if (avgEl) avgEl.textContent = `${avgRisk}%`;
  const devEl = document.querySelector('#total-devs');
  if (devEl) devEl.textContent = members.length.toString();
  const statusEl = document.querySelector('#team-status');
  if (statusEl) {
    if (avgRisk > 60) { statusEl.textContent = '⚠️ Critical: High Burnout Risk Detected'; statusEl.className = 'risk-indicator risk-high'; }
    else if (avgRisk > 30) { statusEl.textContent = '🔔 Advisory: Moderate Stress Levels'; statusEl.className = 'risk-indicator risk-medium'; }
    else { statusEl.textContent = '✅ Healthy: Team Resilience is High'; statusEl.className = 'risk-indicator risk-low'; }
  }

  // Show report prompt banner
  const reportPrompt = document.querySelector('#report-prompt');
  if (!reportPrompt) {
    const banner = document.createElement('div');
    banner.id = 'report-prompt';
    banner.style.cssText = 'margin-top:1.5rem;padding:1rem 1.5rem;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:1rem';
    banner.innerHTML = `
      <div>
        <div style="font-weight:700;margin-bottom:0.2rem">📋 Analysis complete!</div>
        <div style="font-size:0.85rem;color:var(--text-muted)">View the full report with company action plan, data sources, and suggestions.</div>
      </div>
      <button class="btn btn-primary" id="open-report-btn" style="white-space:nowrap">View Full Report →</button>
    `;
    teamList.parentElement?.appendChild(banner);
    document.querySelector('#open-report-btn')?.addEventListener('click', () => showView('report'));
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

renderApp()
showView('dashboard')
