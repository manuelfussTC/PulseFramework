# Pulse CLI Reference (v0.3.0)

> The command-line interface for the Pulse Framework — guardrails, checkpoints, and escalation for AI-assisted development.

## CLI vs MCP

| Aspect | CLI (`pulse`) | MCP (`pulse_*`) |
|--------|---------------|-----------------|
| Who calls it | **Human** in terminal | **AI agent** in Cursor |
| How to use | Run commands manually | Agent calls automatically |
| Output | Terminal output | Returns to agent context |
| Documentation | This document | [pulse-mcp.md](./pulse-mcp.md) |

**Use CLI when:** You want to manually run commands, create prompts, or check status.  
**Use MCP when:** You want Cursor's agent to automatically call tools during conversations.

## Installation

```bash
# From the monorepo root
npm install
npm run build -w @pulseframework/pulse-cli

# Global link (optional)
npm link -w packages/pulse-cli
```

## Quick Start

```bash
# Initialize Pulse in your project (with preset selection)
pulse init

# Check current status (one-liner overview)
pulse status

# Start a combined workflow (prompt + watcher)
pulse run

# Or create a single prompt
pulse s --action "Add user authentication" -C  # -C = copy to clipboard

# Create a checkpoint (every 5-10 min)
pulse c

# Scan for safeguards and red flags
pulse d --loop

# Stuck? Create an escalation package
pulse e -C
```

---

## Commands

### `pulse init`

Initialize Pulse in the current git repository with interactive preset selection.

```bash
pulse init [options]
```

| Option | Description |
|--------|-------------|
| `--path <path>` | Target path (defaults to cwd) |
| `--hooks` | Install git hooks (pre-commit, pre-push) |
| `--preset <name>` | Preset: `frontend`, `backend`, `fullstack`, `monorepo`, `custom` |
| `--mcp` | Install MCP server config (`.cursor/mcp.json`) + Cursor Rules |
| `--global` | Install MCP config globally (`~/.cursor/mcp.json`) - works across all projects |
| `--agents` | Create `AGENTS.md` (universal for other editors) |
| `--no-interactive` | Skip interactive prompts |

**Presets:**

| Preset | Max Lines | Max Files | Checkpoint |
|--------|-----------|-----------|------------|
| `frontend` | 200 | 10 | 20 min |
| `backend` | 400 | 15 | 30 min |
| `fullstack` | 500 | 20 | 25 min |
| `monorepo` | 800 | 30 | 30 min |
| `custom` | 300 | 15 | 30 min |

**What happens automatically with `--mcp`:**

1. **Checks for pulse-mcp** - Installs automatically if not found
2. **Uses absolute paths** - No PATH issues with different Node versions
3. **Detects workspace mismatch** - If Git root differs from Cursor workspace, installs rules in both
4. **Creates wrapper script** - If needed to fix working directory issues
5. **Validates setup** - Shows clear error messages if something is wrong

**Creates:**
- `.pulse/` directory structure
- `pulse.config.json` with preset defaults
- `.cursorrules` (fallback rules)
- With `--mcp`:
  - `.cursor/rules/pulse.mdc` (Cursor Rules with `alwaysApply: true`)
  - `.cursor/mcp.json` (MCP server configuration with absolute paths)
  - `.pulse/run-mcp.sh` (wrapper script, if workspace mismatch detected)
- With `--mcp --global`:
  - `~/.cursor/mcp.json` (global MCP config, works for all projects)
- With `--agents`:
  - `AGENTS.md` (universal rules for Windsurf, Copilot, Cline, etc.)

**Local vs Global MCP:**

| Mode | Command | When to use |
|------|---------|-------------|
| Local | `pulse init --mcp` | Project-specific, config stays in repo |
| Global | `pulse init --mcp --global` | One-time setup, works for all projects |

---

### `pulse status`

Quick one-liner overview of current project state.

```bash
pulse status [--json]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (for scripting) |

**Example output:**
```
🔨 build | 🟢 12m ago | 📝 5 files | ⚠️ 2 warnings
```

**Components:**
- Profile emoji (🧠 concept, 🔨 build, 🚨 escalation)
- Time since last checkpoint (🟢 < 15m, 🟡 < 30m, 🔴 > 30m)
- Dirty file count
- Findings summary

---

### `pulse run`

Combined workflow: Start prompt → Watch loop → Checkpoint reminders → Review offer.

```bash
pulse run [options]
```

| Option | Description |
|--------|-------------|
| `-t, --template <id>` | Template: `feature`, `bugfix`, `refactor`, `concept`, `analyze`, `review` |
| `--minutes <n>` | Checkpoint reminder interval (default: 30) |
| `--no-watch` | Don't start the watcher |
| `--action <text>` | ACTION directly |

**Flow:**
1. Select template or enter ACTION
2. Generate prompt (displayed and saved)
3. Start watch loop with checkpoint reminders
4. On exit (Ctrl+C): offer checkpoint and review

---

### `pulse profile`

Manage the current Pulse layer (concept / build / escalation).

```bash
pulse profile show           # Show current layer
pulse profile set <layer>    # Set layer: concept | build | escalation
```

**Layers:**
- **concept** — Read-only, architecture, planning (Layer 1)
- **build** — Standard coding, respects deletion lock (Layer 2)
- **escalation** — Reasoning mode, debug analysis (Layer 3)

---

### `pulse start` (Alias: `s`)

Create a Start Pulse artifact with a paste-ready prompt (6-element framework).

```bash
pulse start [options]
pulse s [options]  # Shortcut
```

| Option | Description |
|--------|-------------|
| `-t, --template <id>` | Template: `feature`, `bugfix`, `refactor`, `concept`, `analyze`, `review` |
| `-q, --quick` | Quick mode: only prompt for ACTION |
| `--role <text>` | ROLE |
| `--context <text>` | CONTEXT |
| `--input <text>` | INPUT |
| `--action <text>` | ACTION |
| `--output <text>` | OUTPUT |
| `--examples <text>` | EXAMPLES |
| `--ist <text>` | IST state (for IST/SOLL bug-fix prompt) |
| `--soll <text>` | SOLL state (for IST/SOLL bug-fix prompt) |
| `-C, --clipboard` | Copy prompt to clipboard |

**Templates:**
| Template | Layer | Description |
|----------|-------|-------------|
| `feature` | build | New feature implementation |
| `bugfix` | build | Fix existing bug |
| `refactor` | build | Code restructuring |
| `concept` | concept | Architecture planning |
| `analyze` | concept | Code analysis |
| `review` | concept | Code review |

**Output:** `.pulse/pulses/{timestamp}-start.md`

---

### `pulse correct`

Create a Correction Pulse (scoped feedback → narrow fix).

```bash
pulse correct [options]
```

| Option | Description |
|--------|-------------|
| `--feedback <text>` | What's wrong? |
| `--mode <mode>` | `explain`, `narrow`, `milestone` (default: narrow) |
| `-C, --clipboard` | Copy prompt to clipboard |

**Modes:**
- **explain**: Agent explains its understanding (IST/SOLL/Attempts/Theory)
- **narrow**: Apply minimal change, no refactoring
- **milestone**: Split into small milestones

**Output:** `.pulse/pulses/{timestamp}-correct.md`

---

### `pulse review` (Alias: `r`)

Generate a Review Pulse checklist (code quality, security, git, docs).

```bash
pulse review [--staged]
pulse r [--staged]  # Shortcut
```

| Option | Description |
|--------|-------------|
| `--staged` | Review staged diff instead of working tree |

**Checklist sections:**
- Code quality (naming, error handling, edge cases)
- Functionality (works as requested, tested locally)
- Security (no secrets, input validation, auth impacts)
- Git history (clear commits, traceable changes)
- Documentation (new behavior documented)
- Red Flags (code you don't understand, huge diffs, unknown deps)

**Output:** `.pulse/reviews/{timestamp}-review.md`

---

### `pulse escalate` (Alias: `e`)

Create an escalation package for an external model (ChatGPT, Claude, GPT-5, Opus).

```bash
pulse escalate [options]
pulse e [options]  # Shortcut
```

| Option | Description |
|--------|-------------|
| `--problem <text>` | What is the problem? |
| `--tried <text>` | What has Cursor already tried? |
| `--error <text>` | Error message/logs |
| `--error-file <path>` | Path to log file |
| `--code <text>` | Relevant code snippet |
| `--code-file <path>` | Path to code file |
| `--question <text>` | Your specific question |
| `--detailed` | Include full diff (not just summary) |
| `-C, --clipboard` | Copy prompt to clipboard |

**Interactive mode:** If no options provided, prompts for:
1. Cursor's explanation (what it tried)
2. Additional attempts
3. Error text
4. Your question

**Output:** `.pulse/escalations/{timestamp}-escalate.md`

---

### `pulse checkpoint` (Alias: `c`)

Checkpoint helper: show git context, warn on red flags, optionally commit.

```bash
pulse checkpoint [options]
pulse c [options]  # Shortcut
```

| Option | Description |
|--------|-------------|
| `--staged` | Use staged diff |
| `--inspect-latest` | Inspect the latest commit |
| `--run-tests` | Run configured test command |
| `-m, --message <msg>` | Create a commit with this message |

**Output:** `.pulse/worklogs/{timestamp}-checkpoint.md`

---

### `pulse doctor` (Alias: `d`)

Scan current changes for Pulse Safeguards + Red Flags.

```bash
pulse doctor [options]
pulse d [options]  # Shortcut
```

| Option | Description |
|--------|-------------|
| `--staged` | Scan staged diff |
| `--ci` | CI mode: quieter output + exit codes |
| `--hook <name>` | Hook mode: `pre-commit` or `pre-push` |
| `--loop` | Include advanced loop-detection |
| `--confirm-delete` | Confirm deletes for this run |
| `--allow-push` | Allow push for this run |

**Exit codes:**
- `0` — No findings
- `1` — Warnings only
- `2` — Critical findings (blocked)

**Loop Detection Signals (`--loop`):**

| Signal | Severity | Description |
|--------|----------|-------------|
| Fix-Chain | warn | 3+ "fix" commits in last 15 commits |
| Revert | critical | Revert commits detected |
| File-Churn | warn | Same file changed 5+ times |
| Pendeln | critical | Similar commit messages repeat |
| Fix-No-Test | warn | Fix commits without test changes |

---

### `pulse learn`

Capture lessons learned with optional auto-promotion to `.cursorrules`.

```bash
pulse learn [options]
```

| Option | Description |
|--------|-------------|
| `--problem <text>` | What was the problem? |
| `--solution <text>` | What was the solution? |
| `--rule <text>` | Derived rule |
| `--reason <text>` | Why this rule? |
| `--no-promote` | Don't ask to update .cursorrules |

**Interactive flow:**
1. Enter problem, solution, rule
2. Saves to `.pulse/memory.md`
3. Offers to add rule to `.cursorrules` (auto-promotion)

**Output:** `.pulse/memory.md` (appended)

---

### `pulse watch` (Alias: `w`)

Background watcher: timer + git/fs change observation + reminders.

```bash
pulse watch [options]
pulse w [options]  # Shortcut
```

| Option | Description |
|--------|-------------|
| `--minutes <n>` | Minutes between reminders (default: 30) |
| `--poll-seconds <n>` | Polling interval in seconds (default: 30) |

**Notifications:**
- Terminal output
- macOS native notifications (via `osascript`)

**Stop:** `Ctrl+C`

---

## Configuration (`pulse.config.json`)

```json
{
  "version": 1,
  "projectType": "node",
  "preset": "backend",
  "enforcement": "mixed",
  "notifications": "both",
  "checkpointReminderMinutes": 30,
  "thresholds": {
    "warnMaxFilesChanged": 15,
    "warnMaxLinesChanged": 400,
    "warnMaxDeletions": 50
  },
  "patterns": {
    "secret": ["AKIA[0-9A-Z]{16}", "ghp_[A-Za-z0-9]{36}", "..."],
    "prodUrl": ["https?://(?!localhost)..."]
  },
  "commands": {
    "test": "npm test"
  }
}
```

| Field | Values | Description |
|-------|--------|-------------|
| `preset` | `frontend`, `backend`, `fullstack`, `monorepo`, `custom` | Project type preset |
| `projectType` | `node`, `python`, `unknown` | Auto-detected or set manually |
| `enforcement` | `advisory`, `mixed`, `strict` | How strictly to enforce safeguards |
| `notifications` | `terminal`, `macos`, `both` | Where to send reminders |
| `checkpointReminderMinutes` | number | Default checkpoint interval |
| `thresholds` | object | Warn thresholds for diff size |
| `patterns.secret` | string[] | Regex patterns for secret detection |
| `patterns.prodUrl` | string[] | Regex patterns for production URLs |
| `commands.test` | string | Test command for `--run-tests` |

---

## Git Hooks (Mixed Enforcement)

Install with:

```bash
pulse init --hooks
```

### `pre-commit`

Runs `pulse doctor --staged --hook pre-commit`:
- **Blocks** secrets in staged changes
- **Blocks** file deletions unless `PULSE_CONFIRM_DELETE=1`
- **Warns** on other red flags

```bash
# Confirm delete for this commit
PULSE_CONFIRM_DELETE=1 git commit -m "Remove unused files"
```

### `pre-push`

Runs `pulse doctor --hook pre-push`:
- **Blocks** push unless `PULSE_ALLOW_PUSH=1`

```bash
# Explicit push (after review)
PULSE_ALLOW_PUSH=1 git push
```

---

## Command Aliases

| Full Command | Alias |
|--------------|-------|
| `pulse start` | `pulse s` |
| `pulse checkpoint` | `pulse c` |
| `pulse doctor` | `pulse d` |
| `pulse review` | `pulse r` |
| `pulse escalate` | `pulse e` |
| `pulse watch` | `pulse w` |

---

## Artifact Directory Structure

```
.pulse/
├── state.json              # Current profile, lastCheckpointAt
├── memory.md               # Lessons learned
├── pulses/                 # Start + Correct + Run artifacts
│   ├── 20260105-143022-start.md
│   ├── 20260105-144511-correct.md
│   └── 20260105-145033-run.md
├── reviews/                # Review checklists
│   └── 20260105-150033-review.md
├── worklogs/               # Checkpoint logs
│   └── 20260105-145522-checkpoint.md
├── escalations/            # Escalation packages
│   └── 20260105-151044-escalate.md
└── templates/
    └── roles/              # Role-specific .cursorrules
        ├── architect.cursorrules
        ├── backend.cursorrules
        └── frontend.cursorrules
```

---

## Workflow with Cursor Agent Mode

### Quick Workflow (Recommended)

```bash
# 1. Initialize (once per project)
pulse init

# 2. Start combined workflow
pulse run

# 3. Copy prompt to Cursor, work, Ctrl+C when done
```

### Manual Workflow

```bash
# 1. Set profile and create prompt
pulse profile set build
pulse s --action "Implement user registration" -C

# 2. Start watcher in separate terminal
pulse w

# 3. Checkpoint every 5-10 minutes
pulse c

# 4. When stuck
pulse d --loop
pulse e -C  # If escalation needed

# 5. Before merge
pulse r
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PULSE_CONFIRM_DELETE=1` | Confirm file deletions (bypass hook block) |
| `PULSE_ALLOW_PUSH=1` | Allow push (bypass hook block) |

---

## Cheatsheet Reference

| Cheatsheet | CLI Feature |
|------------|-------------|
| 01 Controlled Loops | `pulse run`, `pulse start/correct/review/escalate` |
| 02 3-Layer Architecture | `pulse profile set` |
| 03 6-Element Framework | `pulse start` (templates + validation) |
| 04 30-Min Rule | `pulse watch`, `pulse run`, `pulse status` |
| 05 5 Critical Safeguards | `pulse doctor` + hooks |
| 06 Loop Detection | `pulse doctor --loop` (5 signals) |
| 07 3-Stage Escalation | `pulse escalate` |
| 08 Git Safety Net | `pulse checkpoint` |
| 09 .cursorrules Memory | `pulse learn` (auto-promotion) |
| 10 Review Checklist | `pulse review` |
| 11 Red Flags | `pulse doctor` |
| 12 Beginner Mistakes | `pulse start` templates + coach prompts |

---

### `pulse reset`

Safe Git reset with safeguards (for loop recovery).

```bash
pulse reset [options]
```

| Option | Description |
|--------|-------------|
| `-n, --commits <n>` | Number of commits to go back (default: 1) |
| `--mode <mode>` | Reset mode: `soft`, `mixed`, `hard` (default: mixed) |
| `-y, --yes` | Skip confirmation prompt |

**Safeguards:**
- Warns on protected branches (main, master, develop)
- Shows affected commits before reset
- Requires confirmation for hard reset

**Example:**
```bash
pulse reset              # Go back 1 commit (mixed)
pulse reset -n 3         # Go back 3 commits
pulse reset --hard       # Hard reset (loses changes!)
pulse reset -y           # Skip confirmation
```

---

## See Also

- [Pulse MCP Reference](./pulse-mcp.md) - MCP tools for Cursor agent
- [PULSE Cheatsheet](../cheatsheet/PULSE-Cheatsheet.md)
- [Workflow Guide](../workflow.md)
- [Technical Reference](../PULSE-Technical-Reference-2026-01-06.md) - Combined CLI + MCP reference
