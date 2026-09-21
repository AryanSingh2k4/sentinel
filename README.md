# Sentinel 🛡️
### Autonomous AI-Assisted Security Pentesting & Repo Fixer Platform

**Sentinel** is an autonomous security operations platform that unifies black-box Dynamic Application Security Testing (DAST), automated Git repository secret auditing, intelligent LLM false-positive triage, and automated code remediation. It bridges the gap between vulnerability discovery and remediation by synthesizing type-safe, sandbox-verified patches and dispatching GitHub Pull Requests automatically.

---

## 📑 Table of Contents
- [Key Features](#-key-features)
- [Architecture & Pipeline Flow](#-architecture--pipeline-flow)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Environment Configuration (`.env.local`)](#-environment-configuration-envlocal)
- [Step-by-Step Local Setup & Execution](#-step-by-step-local-setup--execution)
  - [1. Start Redis Server](#1-start-redis-server)
  - [2. Start Background Worker](#2-start-background-worker)
  - [3. Start Next.js Web Application](#3-start-nextjs-web-application)
- [Operating Sentinel (User Guide)](#-operating-sentinel-user-guide)
  - [Running a Web Application Pentest](#running-a-web-application-pentest)
  - [Auditing a Git Repository for Secrets](#auditing-a-git-repository-for-secrets)
  - [Reviewing Verified Findings & cURL PoCs](#reviewing-verified-findings--curl-pocs)
  - [Inspecting Monaco Diffs & GitHub Pull Requests](#inspecting-monaco-diffs--github-pull-requests)
- [Automated GitHub Pull Request Dispatch](#-automated-github-pull-request-dispatch)
  - [Scenario A: Direct Repository Branch & PR](#scenario-a-direct-repository-branch--pr)
  - [Scenario B: Automated Fork & Cross-Repository PR](#scenario-b-automated-fork--cross-repository-pr)
- [Testing & Quality Verification](#-testing--quality-verification)

---

## ⚡ Key Features

1. **Autonomous Web Pentesting (DAST Engine)**:
   - **Reconnaissance**: High-speed asset crawling via **Katana** and technology fingerprinting via **HTTPx**.
   - **Vulnerability Probing**: Orchestrated vulnerability scanning via **Nuclei** templates across discovered attack surfaces.
   - **Deterministic cURL PoCs**: Automatic `-irr` (include request/response) capture generating 1-click copyable `curl` commands and raw HTTP evidence streams.

2. **Enterprise Git Secret Scanner**:
   - Deep repository commit history auditing via **TruffleHog** (v3.97+ with 800+ detector rules).
   - Live credential validation (AWS, OpenAI, GitHub, Stripe, Slack, etc.) distinguishing active live keys from pattern matches.

3. **AI-Assisted Noise Reduction & Triage**:
   - Automated candidate alert triage eliminating false positives and noise before alerting operators.
   - Severity re-ranking and technical evidence extraction.

4. **Autonomous Code Fixer (Auto-Patcher Engine)**:
   - **AST Scope Mapping**: Uses the TypeScript Compiler API (`ts.createSourceFile`) to map code boundaries and exact line numbers (`lineStart` to `lineEnd`).
   - **LLM Patch Synthesis**: Synthesizes clean, production-grade security fixes replacing hardcoded credentials with environment variables (`process.env.SECURITY_SECRET_KEY`) or sanitized handlers.
   - **Self-Healing Sandbox Verification Loop**: Type-checks and validates syntax diagnostics (`tsc --noEmit`). If syntax or compiler errors occur, feeds diagnostics back to the LLM for up to 2 self-healing retries.
   - **Unified Git Diffs**: Emits standard unified diff patches (`diff.createTwoFilesPatch`).

5. **Automated GitHub Pull Request Dispatch**:
   - **Scenario A (Direct Branch)**: For repositories with push access, creates `sentinel/patch-<id>` and opens a PR on the target repository.
   - **Scenario B (Forking Workflow)**: For external/open-source repositories, automatically provisions a fork under the operator's GitHub account, commits the fix, and opens a cross-repository Pull Request upstream.
   - **Zero Local Git Contamination**: Purely HTTPS REST API driven via `@octokit/rest` without touching local `.gitconfig` or local branches.

6. **Interactive Monaco Diff UI & Forensics**:
   - Embedded `@monaco-editor/react` Diff Editor with side-by-side and inline view modes.
   - Live PR status badges, AST line scope badges, Sandbox pass badges, and one-click "Copy Diff".
   - Collapsible Raw HTTP Interaction Stream (`-irr`) for inspecting HTTP requests sent and responses received.
   - Executive PDF/print reports and JSON export options.

---

## 🏗️ Architecture & Pipeline Flow

Sentinel utilizes an event-driven state machine orchestrated by **BullMQ** on **Redis** and backed by **Supabase PostgreSQL**:

```mermaid
flowchart TD
    subgraph Ingestion["1. Target Ingestion"]
        UI["Web Console UI / REST API"] --> Queue["BullMQ Redis Queue"]
    end

    subgraph Pipeline["2. Pipeline State Machine"]
        Queue --> S_Recon["RECON / SECRETS"]
        S_Recon -->|Discovered Assets| S_Attack["ATTACK (Nuclei -irr)"]
        S_Attack -->|Candidate Findings| S_Validate["VALIDATE (LLM Triage)"]
        S_Validate -->|Confirmed High-Risk| S_Patch["PATCH (Auto-Patcher)"]
        S_Validate -->|No Flaws| S_Report["REPORT (Executive Summary)"]
        S_Patch -->|Verified Patches & PRs| S_Report
    end

    subgraph AutoPatcher["3. Auto-Patcher Engine"]
        S_Patch --> AST["AST Scope & Line Parsing (TypeScript API)"]
        AST --> LLM["LLM Patch Synthesis"]
        LLM --> Sandbox{"Sandbox Verify (tsc --noEmit)"}
        Sandbox -->|Diagnostics Error| Retry["Self-Healing Feedback Loop"]
        Retry --> LLM
        Sandbox -->|Clean (0 Errors)| Diff["Unified Diff Generation"]
        Diff --> Octokit["Octokit PR Dispatch (Scenario A or B)"]
    end

    subgraph Delivery["4. Delivery & Forensics"]
        Octokit --> GitHubPR["Live GitHub Pull Request"]
        S_Report --> Console["Active Scan Console (/scans/:id)"]
        S_Report --> Monaco["Interactive Monaco Diff Report (/reports/:id)"]
    end
```

---

## 🛠️ Tech Stack

- **Frontend & Fullstack**: Next.js 16 (App Router with Turbopack), React 19, TypeScript 5, Tailwind CSS, Lucide Icons.
- **Diff & Code Inspection**: `@monaco-editor/react`, `diff`.
- **Database & Realtime Telemetry**: Supabase PostgreSQL, Supabase Realtime WebSocket subscriptions.
- **Task Queue & State Machine**: BullMQ 5, Redis 5+ / ioredis.
- **LLM Reasoning**: OpenAI SDK (compatible with OpenAI `gpt-4o-mini`, Gemini OpenAI endpoint, Groq, Ollama).
- **GitHub Integration**: `@octokit/rest`, `simple-git`.
- **Security Engines (Binaries in `bin/`)**:
  - `katana.exe` (Web crawler & asset discovery)
  - `httpx.exe` (HTTP probe & tech fingerprinting)
  - `nuclei.exe` (Vulnerability scanner with `-irr`)
  - `trufflehog.exe` (Secret scanner with 800+ detectors)
  - `redis-server.exe` (Portable Redis service)

---

## 📁 Project Directory Structure

```
sentinel/
├── bin/                        # Security binaries
│   ├── httpx.exe               # HTTPx probe executable
│   ├── katana.exe              # Katana crawler executable
│   ├── nuclei.exe              # Nuclei scanner executable
│   ├── trufflehog.exe          # TruffleHog secret detector executable
│   └── redis/                  # Portable Redis binaries
│       ├── redis-server.exe    # Redis background server
│       └── redis-cli.exe       # Redis command-line interface
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── scans/          # Scan creation and telemetry endpoints
│   │   │   ├── reports/        # Executive reporting & patch payload endpoints
│   │   │   └── secrets/        # Secret inventory & metrics endpoints
│   │   ├── scans/[scanId]/     # Real-time console terminal & pipeline stepper
│   │   ├── reports/[scanId]/   # Report page with Monaco diffs & cURL PoCs
│   │   ├── github-scanner/     # Standalone GitHub secret audit interface
│   │   └── page.tsx            # Main dashboard & active scans overview
│   ├── components/
│   │   ├── MonacoDiffViewer.tsx # Interactive Monaco diff editor component
│   │   ├── Navbar.tsx          # Editorial navigation bar
│   │   └── theme-toggle.tsx    # Light/Dark mode switcher
│   └── lib/
│       ├── agents/
│       │   ├── recon.ts        # Katana + HTTPx orchestration
│       │   ├── attack.ts       # Nuclei execution with -irr PoC capture
│       │   ├── secret.ts       # TruffleHog git audit agent
│       │   ├── validation.ts   # LLM triage & false-positive elimination
│       │   ├── patch.ts        # Auto-Patcher (AST, Sandbox, Octokit PR)
│       │   └── reporting.ts    # Executive summary generation & report save
│       ├── queue/
│       │   ├── bull.ts         # BullMQ queue definitions
│       │   └── redis.ts        # Redis connection singleton
│       ├── tools/              # Binary process wrappers (nuclei, trufflehog, etc.)
│       └── supabase/           # Supabase client helpers
├── worker.ts                   # BullMQ background job state machine
├── package.json
└── README.md
```

---

## 📦 Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: v20.x or v22.x+ (Node v24 supported)
- **npm**: v10.x+
- **Git**: Installed and available on system PATH
- **Redis**: Included portably in `bin/redis/redis-server.exe` (or external Redis instance)

---

## 🔑 Environment Configuration (`.env.local`)

Create or update `.env.local` in the root of the project with your API keys and credentials:

```env
# Supabase Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis Connection (Defaults to local)
REDIS_URL=redis://127.0.0.1:6379

# LLM Configuration (OpenAI, Gemini, or Groq)
OPENAI_API_KEY=your-llm-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# GitHub Token (Required for automated Pull Request dispatch)
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
```

> [!TIP]
> **GitHub Token Permissions**: Generate a Personal Access Token (classic) with `repo` scope to enable automatic branch creation and Pull Request dispatch.

---

## 🚀 Step-by-Step Local Setup & Execution

Sentinel operates with three lightweight processes running concurrently. Open **3 separate terminals** in the project root:

### 1. Start Redis Server
Sentinel includes a portable Redis binary located in `bin/redis`. Start it in your first terminal:

```powershell
# Terminal 1 (Redis)
.\bin\redis\redis-server.exe
```

*Verification: In another terminal, run `.\bin\redis\redis-cli.exe ping`. It should return `PONG`.*

---

### 2. Start Background Worker
The worker drives the BullMQ state machine through all phases (`RECON` → `ATTACK` → `VALIDATE` → `PATCH` → `REPORT`):

```powershell
# Terminal 2 (Worker)
npm run worker
```

You should see:
```text
Sentinel - Background Worker initialized.
[Worker] Connected to Redis and ready to process jobs.
```

---

### 3. Start Next.js Web Application
Start the frontend and API routes with Next.js Turbopack:

```powershell
# Terminal 3 (Web App)
npm run dev
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🖥️ Operating Sentinel (User Guide)

### Running a Web Application Pentest
1. Navigate to **Dashboard** (`/`) or click **New Scan**.
2. Select **Web Application** and input a target domain or URL (e.g. `https://example.com` or local test target).
3. Click **Launch Security Audit**.
4. You will be automatically redirected to the **Active Scan Console** (`/scans/[scanId]`).
5. Watch the stepper transition: `RECON` → `ATTACK` → `VALIDATE` → `PATCH` → `REPORT`.

### Auditing a Git Repository for Secrets
1. Navigate to the **GitHub Secret Scanner** (`/github-scanner`).
2. Enter any public or private repository URL (e.g. `https://github.com/AryanSingh2k4/PhishAware`).
3. Click **Start Secret Scan**.
4. TruffleHog audits the complete commit history, validates keys, and streams discovered credentials directly to the console.

### Reviewing Verified Findings & cURL PoCs
1. Once the scan completes, click **View Final Report** (`/reports/[scanId]`).
2. Under **Confirmed High-Risk Vulnerabilities**:
   - Click **Copy cURL PoC** to copy the deterministic HTTP replay command.
   - Click **Inspect Stream** under **Raw HTTP Interaction Stream (`-irr Evidence`)** to inspect the full request headers, payload, and response body.

### Inspecting Monaco Diffs & GitHub Pull Requests
1. In the report, navigate to **Autonomous Code Fixes & Verified Patches**.
2. Toggle between **Side-by-Side** and **Inline** view inside the embedded Monaco Editor.
3. Review the **AST Scope** (`L5–L8`) and **Sandbox Verification Status** (`tsc --noEmit Passed`).
4. Click **View Pull Request** to jump directly to the live Pull Request on GitHub.

---

## 🐙 Automated GitHub Pull Request Dispatch

Sentinel supports both internal and open-source contribution models:

### Scenario A: Direct Repository Branch & PR
- **When Used**: Target repositories where your `GITHUB_TOKEN` has direct push permissions.
- **Workflow**:
  1. Sentinel creates a branch `sentinel/patch-<findingId>` directly on `owner/repo`.
  2. Commits the remediated file via GitHub REST API.
  3. Opens a PR directly into `main` / `master`.

### Scenario B: Automated Fork & Cross-Repository PR
- **When Used**: External or open-source repositories where your token does not have write access (e.g. `OWASP/NodeGoat`).
- **Workflow**:
  1. Sentinel automatically forks the repository to your account (`your-username/repo`) via `octokit.repos.createFork`.
  2. Creates the patch branch on **your fork**.
  3. Commits the verified fix to your fork.
  4. Submits a cross-repository Pull Request upstream (`head: "your-username:sentinel/patch-<id>"` into `base: "upstream:main"`).
  5. **Safety Guarantee**: Sentinel never runs local `git` CLI commands or modifies your local `.gitconfig`.

---

## 🧪 Testing & Quality Verification

You can verify the codebase at any time using the built-in test scripts:

```powershell
# 1. Verify TypeScript type-safety (0 errors)
npx tsc --noEmit

# 2. Verify Next.js production compilation
npm run build

# 3. Test Auto-Patcher AST analysis & sandbox verification in isolation
npx tsx scratch/test_patcher_logic.ts
```

---

## 📄 License

This project is developed for educational, defensive security auditing, and automated remediation purposes. All tools and binaries are used in accordance with their respective open-source licenses.
