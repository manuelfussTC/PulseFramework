# Pulse CLI Reference

> The command-line interface for the Pulse Framework — guardrails, checkpoints, and escalation for AI-assisted development.

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
# Initialize Pulse in your project
pulse init

# Set your working layer
pulse profile set build

# Start a new task with the 6-element framework
pulse start --role "Senior Backend Engineer" --action "Add user authentication"

# Run the background watcher (30-min reminders)
pulse watch

# Create a checkpoint (every 5-10 min)
pulse checkpoint

# Scan for safeguards and red flags
pulse doctor

# Create a review checklist
pulse review

# Stuck? Create an escalation package
pulse escalate
```

---

## Commands

### `pulse init`

Initialize Pulse in the current git repository.

```bash
pulse init [--path <path>] [--hooks]
```

| Option | Description |
|--------|-------------|
| `--path <path>` | Target path (defaults to cwd) |
| `--hooks` | Install git hooks (mixed enforcement) |

**Creates:**
- `.pulse/` directory structure
- `pulse.config.json` with defaults
- `.cursorrules` (if missing)
- `.pulse/templates/roles/` with role templates

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

### `pulse start`

Create a Start Pulse artifact with a paste-ready prompt (6-element framework).

```bash
pulse start [options]
```

| Option | Description |
|--------|-------------|
| `--role <text>` | Role (e.g., "Senior Backend Engineer") |
| `--context <text>` | Project/task context |
| `--input <text>` | Specific input/data |
| `--action <text>` | **One** clear action (required) |
| `--output <text>` | Expected output format |
| `--examples <text>` | Examples or references |

**Validation:**
- Warns if fewer than 3 elements provided
- Warns if action contains multiple actions (split them!)

**Output:** `.pulse/pulses/{timestamp}-start.md`

---

### `pulse correct`

Create a Correction Pulse (scoped feedback → narrow fix).

```bash
pulse correct [--feedback <text>]
```

| Option | Description |
|--------|-------------|
| `--feedback <text>` | User feedback (e.g., "Fix the type error on line 42") |

**Output:** `.pulse/pulses/{timestamp}-correct.md`

---

### `pulse review`

Generate a Review Pulse checklist (code quality, security, git, docs).

```bash
pulse review [--staged]
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

### `pulse escalate`

Create an escalation package for an external model (ChatGPT, Claude, GPT-5, Opus).

```bash
pulse escalate [options]
```

| Option | Description |
|--------|-------------|
| `--cursor <text>` | Paste Cursor's explanation |
| `--error <text>` | Primary error message/logs |
| `--error-file <path>` | Path to a log file to include |
| `--question <text>` | What should the external model answer? |

**Output:** `.pulse/escalations/{timestamp}-escalate.md`

Contains a complete prompt template with:
- Role + Context + Input (Cursor explanation, error, git context)
- Output format (analysis + instructions for Cursor)
- Your specific question

---

### `pulse checkpoint`

Checkpoint helper: show git context, warn on red flags, optionally commit.

```bash
pulse checkpoint [options]
```

| Option | Description |
|--------|-------------|
| `--staged` | Use staged diff |
| `--inspect-latest` | Inspect the latest commit (useful if Cursor auto-committed) |
| `--run-tests` | Run configured test command |
| `-m, --message <msg>` | Create a commit with this message |

**Output:** `.pulse/worklogs/{timestamp}-checkpoint.md`

**Updates:** `lastCheckpointAt` in `.pulse/state.json`

---

### `pulse doctor`

Scan current changes for Pulse Safeguards + Red Flags (mixed enforcement).

```bash
pulse doctor [options]
```

| Option | Description |
|--------|-------------|
| `--staged` | Scan staged diff |
| `--ci` | CI mode: quieter output + exit codes |
| `--hook <name>` | Hook mode: `pre-commit` or `pre-push` |
| `--loop` | Include loop-detection heuristics |
| `--confirm-delete` | Explicitly confirm deletes for this run |
| `--allow-push` | Explicitly allow push for this run |

**Exit codes:**
- `0` — No findings
- `1` — Warnings only
- `2` — Critical findings (blocked)

**Critical (blocked):**
- Secrets in diff
- File deletions without `--confirm-delete` or `PULSE_CONFIRM_DELETE=1`
- Push without `--allow-push` or `PULSE_ALLOW_PUSH=1`

**Loop heuristics (`--loop`):**
- Multiple recent "fix" commits → Loop risk
- Revert commits → A↔B toggling risk

---

### `pulse learn`

Capture a lesson learned and optionally generate a `.cursorrules` suggestion.

```bash
pulse learn [--problem <text>] [--solution <text>] [--rule]
```

| Option | Description |
|--------|-------------|
| `--problem <text>` | What was the problem? |
| `--solution <text>` | How did you solve it? |
| `--rule` | Generate a `.cursorrules` suggestion block |

**Output:** `.pulse/memory/{timestamp}-learn.md`

---

### `pulse watch`

Background watcher: 30-min timer + git/fs change observation + reminders.

```bash
pulse watch [--minutes <n>] [--poll-seconds <n>]
```

| Option | Description |
|--------|-------------|
| `--minutes <n>` | Minutes between checkpoint reminders (default: 30) |
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
  "enforcement": "mixed",
  "notifications": "both",
  "thresholds": {
    "warnMaxFilesChanged": 15,
    "warnMaxLinesChanged": 300,
    "warnMaxDeletions": 50
  },
  "patterns": {
    "secret": [
      "AKIA[0-9A-Z]{16}",
      "ghp_[A-Za-z0-9]{36}",
      "sk_(live|test)_[A-Za-z0-9]{16,}",
      "..."
    ],
    "prodUrl": [
      "https?://(?!localhost)(?!127\\.0\\.0\\.1)..."
    ]
  },
  "commands": {
    "test": "npm test"
  }
}
```

| Field | Values | Description |
|-------|--------|-------------|
| `projectType` | `node`, `python`, `unknown` | Auto-detected or set manually |
| `enforcement` | `advisory`, `mixed`, `strict` | How strictly to enforce safeguards |
| `notifications` | `terminal`, `macos`, `both` | Where to send reminders |
| `thresholds` | object | Warn thresholds for diff size |
| `patterns.secret` | string[] | Regex patterns for secret detection |
| `patterns.prodUrl` | string[] | Regex patterns for production URLs |
| `commands.test` | string | Test command to run with `--run-tests` |

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

## Artifact Directory Structure

```
.pulse/
├── state.json              # Current profile, lastCheckpointAt
├── pulses/                 # Start + Correct artifacts
│   ├── 20260105-143022-start.md
│   └── 20260105-144511-correct.md
├── reviews/                # Review checklists
│   └── 20260105-150033-review.md
├── worklogs/               # Checkpoint logs
│   └── 20260105-145522-checkpoint.md
├── escalations/            # Escalation packages
│   └── 20260105-151044-escalate.md
├── memory/                 # Lessons learned
│   └── 20260105-152055-learn.md
└── templates/
    └── roles/              # Role-specific .cursorrules
        ├── architect.cursorrules
        ├── backend.cursorrules
        └── frontend.cursorrules
```

---

## Workflow with Cursor Agent Mode

### 1. Start a Session

```bash
pulse profile set build
pulse start --role "Senior Backend Engineer" --action "Implement user registration endpoint"
```

Copy the generated prompt into Cursor Agent Mode.

### 2. During Agent Mode

```bash
# Run in a separate terminal
pulse watch
```

Every 5–10 minutes:

```bash
pulse checkpoint
```

If Cursor auto-committed:

```bash
pulse checkpoint --inspect-latest
```

### 3. When Stuck (Loop/Red Flag)

```bash
pulse doctor --loop
```

If STOP recommended:

```bash
pulse escalate
```

Paste the escalation package into ChatGPT/Claude/GPT-5 → get instructions → paste back into Cursor.

### 4. Review Before Merge

```bash
pulse review
```

Fill the checklist. If Red Flags → Reject or Escalate.

### 5. Capture Learnings

```bash
pulse learn --problem "Type inference broke after library update" --solution "Pin dependency to ^4.x" --rule
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
| 01 Controlled Loops | `pulse start/correct/review/escalate` |
| 02 3-Layer Architecture | `pulse profile set` |
| 03 6-Element Framework | `pulse start` (validates min 3 elements + one action) |
| 04 30-Min Rule | `pulse watch` + reminders |
| 05 5 Critical Safeguards | `pulse doctor` + hooks |
| 06 Loop Detection | `pulse doctor --loop` |
| 07 3-Stage Escalation | `pulse escalate` |
| 08 Git Safety Net | `pulse checkpoint` |
| 09 .cursorrules Memory | `pulse learn --rule` |
| 10 Review Checklist | `pulse review` |
| 11 Red Flags | `pulse doctor` |
| 12 Beginner Mistakes | `pulse start` coach prompts |

---

## See Also

- [PULSE Cheatsheet](../cheatsheet/PULSE-Cheatsheet.md)
- [Pulse Spec v1](../../spec/pulse-spec-v1.md)
- [Source Map](./pulse-toolkit-source-map.md)
