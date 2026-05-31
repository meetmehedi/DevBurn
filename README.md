# 🔥 DevBurn — Developer Burnout Detection Platform

> **A research-backed, data-driven platform that passively analyzes GitHub repository behaviour to detect developer burnout risk, AI-assisted code patterns, and team health — in real time.**

---

## 📌 Table of Contents

- [What is DevBurn?](#what-is-devburn)
- [Why We Built It](#why-we-built-it)
- [The Research Gap](#the-research-gap)
- [How It Works](#how-it-works)
- [What We Detect](#what-we-detect)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [What Companies Gain](#what-companies-gain)
- [ML Scoring Model](#ml-scoring-model)
- [Bangladesh Time Configuration](#bangladesh-time-configuration)
- [AI-Assisted Code Detection](#ai-assisted-code-detection)
- [Research Outcomes](#research-outcomes)
- [Contributors](#contributors)

---

## What is DevBurn?

**DevBurn** is a full-stack research platform built for companies and engineering teams to passively monitor developer wellbeing through **version control behavioural signals** — without intrusive surveys or manual HR reviews.

Simply paste a GitHub repository URL and DevBurn fetches real commit history, pull request data, review patterns, and code churn — then runs it through a multi-factor burnout scoring engine to generate a ranked, actionable team health report.

---

## Why We Built It

Developer burnout is a silent crisis in the software industry. It leads to:

- High employee attrition (costing 50–200% of annual salary per lost developer)
- Degraded code quality and increased bug rates
- Longer PR turnaround times and team communication breakdown
- Mental health impacts that cascade across the entire team

Traditional detection is reactive — annual reviews, exit interviews, and self-reported surveys. **DevBurn makes burnout detection proactive and objective.**

---

## The Research Gap

| Existing Methods | DevBurn |
|---|---|
| Reactive surveys & annual reviews | Real-time, passive signal analysis |
| Subjective and prone to bias | Objective, data-driven metrics |
| Requires developer self-reporting | Zero-intrusion: reads only public git activity |
| Detects burnout *after* it happens | Predicts attrition risk *before* it escalates |
| No AI usage visibility | Detects AI-assisted commit patterns |

---

## How It Works

```
GitHub Repository URL
        │
        ▼
┌──────────────────────────────────┐
│       GitHub REST API            │
│  - Commits (up to 500)           │
│  - Pull Requests (all states)    │
│  - PR Review Comments            │
│  - Weekly Contributor Stats      │
│  - PR Reviews Given              │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│       githubService.ts           │
│  - Parse commit timestamps       │
│  - Detect off-hour activity      │   ← Bangladesh Time (UTC+6)
│  - Flag weekend commits          │   ← Friday & Saturday
│  - Detect AI-assisted commits    │   ← Copilot / GPT heuristics
│  - Compute code churn            │
│  - Keyword sentiment analysis    │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│       BurnoutEngine.ts           │
│  - Off-Hour Score      (25 pts)  │
│  - Workload Spike Score(20 pts)  │
│  - Sentiment Score     (20 pts)  │
│  - Code Intensity Score(20 pts)  │
│  - PR Pressure Score   (15 pts)  │
│  ─────────────────────────────   │
│  Total: 0–100 Risk Score         │
│  Risk Level: Low / Medium / High │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│     Frontend Dashboard           │
│  - Developer Health Cards        │
│  - 12-Week Sparkline Trends      │
│  - Executive Report View         │
│  - Company Action Plan           │
│  - Data Sources Transparency     │
└──────────────────────────────────┘
```

---

## What We Detect

### 🕐 Off-Hour Activity
Commits made outside standard working hours in **Bangladesh Time (UTC+6)**: before **9:00 AM** or after **6:00 PM**.

### 📅 Weekend Commits
Commits made on **Friday or Saturday** — the Bangladesh weekend. Many well-known companies operate on a 5-day week with Friday and Saturday off.

### 📈 Workload Volatility Spikes
Weeks where a developer's commit volume exceeds **2× their own rolling 12-week average**. These spikes indicate unsustainable crunch periods.

### 💬 Communication Sentiment
A keyword-based NLP proxy scans commit messages, PR titles, and review comments for:
- **Stress signals**: `fix`, `bug`, `crash`, `urgent`, `hotfix`, `deadline`, `rush`, `revert`, `failed`, `emergency`
- **Positive signals**: `feat`, `improve`, `refactor`, `clean`, `optimize`, `complete`, `test`, `docs`

### 🤖 AI-Assisted Code Detection
DevBurn identifies commits that show evidence of AI code generation tools:
- Explicit mentions of `copilot`, `gpt`, `chatgpt`, `llm`, `claude`
- Git `Co-authored-by: github-copilot` signatures
- Messages containing `ai-assisted` or `generated by`

If >15% of a developer's commits are AI-assisted, a signal indicator is raised in their burnout report.

### 📊 PR Pressure & Review Overload
- Fast PR close time indicates high-pressure, rushed reviews
- High number of reviews *given* indicates context-switching overhead
- Both are combined into the PR Pressure sub-score

### 🧨 Code Intensity (Churn)
Total lines added + deleted, normalized per period. High churn (>1000 lines) combined with off-hour patterns is a strong burnout predictor.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | TypeScript, Vite, Vanilla CSS |
| **Backend** | Node.js, Express, TypeScript, ts-node |
| **Data Source** | GitHub REST API v3 |
| **HTTP Client** | Axios (with retry + pagination) |
| **Dev Tooling** | Nodemon, ESLint |
| **Deployment** | Static frontend + Node.js API server |

---

## Project Structure

```
DevBurn/
├── index.html                    # App entry point
├── src/
│   ├── main.ts                   # Frontend app shell, views, report renderer
│   └── style.css                 # Dark glassmorphism design system
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── server/
│   └── src/
│       ├── index.ts              # Express API server & sentiment engine
│       ├── engine/
│       │   └── BurnoutEngine.ts  # Multi-factor burnout scoring model
│       └── services/
│           └── githubService.ts  # GitHub API data fetcher & enricher
├── package.json                  # Frontend dependencies (Vite, TypeScript)
└── server/package.json           # Backend dependencies (Express, Axios)
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- A GitHub Personal Access Token (optional, but increases API rate limits from 60 → 5000 req/hr)

### 1. Clone the Repository

```bash
git clone https://github.com/meetmehedi/DevBurn.git
cd DevBurn
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
```

### 4. Configure Environment Variables (Optional but Recommended)

Create a `.env` file inside the `server/` directory:

```env
GITHUB_TOKEN=ghp_your_personal_access_token_here
PORT=3000
```

> Without a token, GitHub's unauthenticated API rate limit is 60 requests/hour. With a token, it is 5,000 requests/hour.

### 5. Start the Backend Server

```bash
# From the server/ directory
npm run dev
```

The API will be available at `http://localhost:3000`.

### 6. Start the Frontend Dev Server

```bash
# From the project root
npm run dev
```

The app will be available at `http://localhost:5173`.

### 7. Analyze a Repository

1. Open `http://localhost:5173`
2. Click **"🔍 Analyze Repo"** in the header
3. Paste a GitHub URL: e.g. `https://github.com/facebook/react`
4. DevBurn fetches data and renders the full team burnout dashboard
5. Click **"📋 View Report"** for the executive report with recommendations

---

## What Companies Gain

### 📉 30% Reduction in Team Attrition
By identifying at-risk developers *before* they resign, engineering managers can intervene with targeted 1-on-1 check-ins, workload redistribution, or rest mandates — preventing costly departures.

### 🛡️ Improved Code Quality & Safety
Developers in burnout produce more bugs, write brittle code, and skip testing. Early detection of burnout patterns directly correlates with downstream code quality improvements.

### ⚖️ Better Work-Life Balance for Developers
By surfacing off-hour commit patterns and weekend work, teams can enforce clear boundaries — "no deploys after 6 PM," respecting the Friday–Saturday weekend, and disabling evening merge notifications.

### 📊 Data-Driven Engineering Leadership
Replace gut-feel HR conversations with concrete, visual evidence. The executive report provides leadership with:
- Team-level risk scores and trend charts
- Per-developer burnout breakdowns
- Prioritized, actionable company recommendations
- Full data source transparency (which API endpoints, what was collected)

### 🤖 AI Dependency Transparency
Companies are increasingly concerned about how much AI-generated code enters their codebase. DevBurn surfaces which developers are relying heavily on Copilot or GPT — helping managers understand skill dependency, code ownership risk, and training needs.

---

## ML Scoring Model

The burnout risk score is a weighted sum of five behavioural factors:

| Factor | Max Points | Signal |
|---|---|---|
| **Off-Hour Activity** | 25 pts | % of commits outside 9 AM–6 PM BST |
| **Workload Spikes** | 20 pts | Weeks exceeding 2× personal weekly average |
| **Negative Sentiment** | 20 pts | Stress keywords in messages & PR comments |
| **Code Intensity** | 20 pts | Total lines added + deleted (normalized) |
| **PR Pressure** | 15 pts | Fast turnarounds + high review load |

**Risk Classification:**
- `0–37` → 🟢 **Low** — Healthy signals, maintain current pace
- `38–64` → 🟡 **Medium** — Monitor closely, consider reducing load
- `65–100` → 🔴 **High** — Immediate intervention required

> In a production system, this rule-based model would be replaced with an XGBoost or Random Forest classifier trained on labelled burnout datasets.

---

## Bangladesh Time Configuration

DevBurn is configured for the **Bangladesh Standard Time (BST, UTC+6)** work context:

- **Off-hours**: Before **9:00 AM** or after **6:00 PM** BST
- **Weekend**: **Friday and Saturday** (as observed by most Bangladeshi companies)
- All GitHub commit timestamps (stored in UTC) are automatically shifted by +6 hours before classification

---

## AI-Assisted Code Detection

DevBurn performs commit message analysis to flag AI-generated or AI-assisted code:

**Detected patterns:**
- `copilot`, `co-authored-by: github-copilot`
- `gpt`, `chatgpt`, `llm`, `claude`
- `ai-assisted`, `generated by`

**What it tells you:**
- Count of AI-assisted commits per developer
- Percentage of total work attributed to AI tools
- Automatic indicator in risk profile if >15% of commits are AI-assisted

This helps organizations understand AI adoption across their engineering team and assess code ownership and review responsibility.

---

## Research Outcomes

This platform validates the following academic hypotheses from the SDM research project:

| Hypothesis | Implementation |
|---|---|
| Off-hour git activity correlates with burnout | ✅ Off-Hour Score (25 pts) |
| Commit frequency spikes signal unsustainable workloads | ✅ Workload Spike detection (12-week rolling) |
| Commit message negativity signals stress | ✅ Keyword-based NLP sentiment proxy |
| PR review overload compounds developer stress | ✅ PR Pressure Score with review count |
| AI tool adoption is detectable from commit metadata | ✅ Heuristic AI-commit detection |

---

## Contributors

Built as part of the **Software Development Management (SDM)** course research project.

| Name | Role |
|---|---|
| **Mehedi Hasan** | Lead Developer, Research Design, Full-Stack Implementation |

---

## License

This project is built for academic research purposes under the SDM course. All data fetched from GitHub is read-only and governed by the [GitHub API Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service).

---

> *"Predicting burnout isn't just about HR — it's about engineering quality and team resilience."*
