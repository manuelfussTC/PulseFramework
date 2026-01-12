# PULSE Framework - Technical Reference

**Version:** 0.3.0  
**Date:** 2026-01-06  
**Packages:** `@pulseframework/pulse-cli`, `@pulseframework/pulse-mcp`

---

## Table of Contents

1. [CLI vs MCP: Understanding the Difference](#cli-vs-mcp)
2. [MCP Tools](#mcp-tools)
3. [CLI Commands](#cli-commands)
4. [Configuration](#configuration)
5. [Automation (Cursor Rules)](#automation)
6. [Data Structures](#data-structures)

---

## CLI vs MCP

PULSE provides two interfaces that serve different purposes:

### Overview

| Aspect | CLI (`pulse`) | MCP (`pulse_*`) |
|--------|---------------|-----------------|
| **Who calls it** | Human in terminal | AI agent in Cursor |
| **When to use** | Manual operations | Automatic during AI conversation |
| **Output** | Terminal (human-readable) | Agent context (machine-readable) |
| **Installation** | `npm link` globally | Configure in `.cursor/mcp.json` |
| **Package** | `@pulseframework/pulse-cli` | `@pulseframework/pulse-mcp` |

### When to Use Which

**Use CLI (`pulse`) when:**
- Initializing a project (`pulse init`)
- Manually checking status (`pulse status`)
- Creating prompts to paste into AI tools (`pulse start -C`)
- Working with non-Cursor editors
- Running in CI/CD pipelines

**Use MCP (`pulse_*`) when:**
- Working in Cursor IDE with MCP enabled
- You want automatic safeguard checks
- The agent should call tools during conversation
- You want tool chaining (recommendations for next action)

### Dedicated Documentation

- **[CLI Reference](./tooling/pulse-cli.md)** - Complete CLI command reference
- **[MCP Reference](./tooling/pulse-mcp.md)** - Complete MCP tool reference

---

## MCP Tools

MCP (Model Context Protocol) Tools are automatically called by Cursor. The MCP server runs as a background process.

> **See also:** [Detailed MCP Reference](./tooling/pulse-mcp.md)

### `pulse_status`

**Purpose:** Get project status (MANDATORY before every agent response)

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "json": {
      "type": "boolean",
      "description": "JSON output instead of formatted"
    }
  }
}
```

**Example Call:**
```
pulse_status
```

**Example Output:**
```
📊 PULSE Status

🔨 Profile: build
🔴 Checkpoint: 18 min ago
📝 Files: 5
📏 Lines: 234

📊 Scope (frontend Preset):
   Files: ████████░░░░░░░ 50% (5/10)
   Lines: ██████████████░ 93% (234/250)

🔍 Findings:
   ⚠️ 2 Warnings

🟢 Loop Risk: LOW

💡 Recommendation: CHECKPOINT
   → 18 min since checkpoint
   → pulse checkpoint -m 'wip: progress'
```

**JSON Output:**
```json
{
  "profile": "build",
  "preset": "frontend",
  "minutesSinceCheckpoint": 18,
  "filesChanged": 5,
  "linesChanged": 234,
  "warnings": 2,
  "criticals": 0,
  "loopRisk": "LOW",
  "recommendation": "checkpoint"
}
```

---

### `pulse_run`

**Purpose:** Start new workflow (create branch + work order)

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "What should be done?"
    },
    "template": {
      "type": "string",
      "enum": ["feature", "bugfix", "refactor", "concept", "analyze"]
    },
    "branch": {
      "type": "string",
      "description": "Branch name (optional, auto-generated)"
    }
  },
  "required": ["action"]
}
```

**Example Call:**
```
pulse_run action="Implement user dashboard" template="feature"
```

**Automatic Actions:**
1. Check current branch
2. Create feature branch if on main/master: `feature/implement-user-dashboard`
3. Save worklog in `.pulse/pulses/`
4. Return work order

**Example Output:**
```
# 🚀 WORK ORDER

✅ Branch created: `feature/implement-user-dashboard`

**ACTION:** Implement user dashboard

## START IMMEDIATELY

You are the agent. Start DIRECTLY with implementation.

## Your Task

Implement: **Implement user dashboard**

Template: feature
Profile: frontend/build
Branch: feature/implement-user-dashboard

## During Work

- ⏱️ **Checkpoint every 15 min:** call `pulse_checkpoint`
- 🔍 **After code changes:** call `pulse_doctor`
- ❌ **On problems after 2-3 attempts:** `pulse_escalate`

---

**START IMPLEMENTATION NOW.**
```

---

### `pulse_checkpoint`

**Purpose:** Create Git commit with validation

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "Commit message"
    },
    "runTests": {
      "type": "boolean",
      "description": "Run tests before commit"
    }
  }
}
```

**Example Call:**
```
pulse_checkpoint message="feat: add login form"
```

**Automatic Actions:**
1. Run `pulse doctor` (check safeguards)
2. On critical findings: Abort
3. `git add -A`
4. `git commit -m "<message>"`
5. Update state (lastCheckpointAt)

**Example Output:**
```
✅ Checkpoint created

Commit: abc1234
Message: feat: add login form
Files: 3 files changed
Lines: +45 -12

⏱️ Next checkpoint recommended in ~15 min
```

**On Error (Safeguard Violation):**
```
❌ Checkpoint aborted

🚨 Critical Finding: SECRETS
   API key found in src/config.ts

Fix the problem and try again.
```

---

### `pulse_doctor`

**Purpose:** Check safeguards and red flags

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "staged": {
      "type": "boolean",
      "description": "Only check staged changes"
    },
    "loop": {
      "type": "boolean",
      "description": "Enable loop detection"
    }
  }
}
```

**Example Call:**
```
pulse_doctor loop=true
```

**Checked Patterns:**

| Code | Severity | Description |
|------|----------|-------------|
| `SECRETS` | critical | API Keys, Passwords, Tokens |
| `PROD_URL` | warn/critical | Production URLs in code |
| `MASS_DELETE` | critical | File deletions |
| `BIG_CHANGESET` | warn | Too many changes |
| `UNKNOWN_DEPS` | warn | New dependencies |
| `CONSOLE_LOG` | warn | Debug output |
| `LOOP_SIGNAL` | warn/critical | Loop patterns detected |

**Loop Detection Patterns:**

| Pattern | Detection |
|---------|-----------|
| `fix_chain` | 3+ "fix" commits in a row |
| `revert` | Revert commits in log |
| `churn` | Same file changed 5+ times |
| `pendulum` | Similar commit messages |
| `fix_no_test` | Fix without test change |

**Example Output:**
```
🔍 Pulse Doctor (working tree)

Profile: frontend/build
Scope: 5 files | +234 -45 lines
Limits (frontend): Files 50%, Lines 93%

⚠️ UNKNOWN_DEPS: New dependencies detected (3): Do you know these?
     + axios @ ^1.6.0
     + lodash @ ^4.17.21
     + dayjs @ ^1.11.10

⚠️ LOOP_SIGNAL: 3x "fix" commits in last 15 commits.
   Possible fix-loop.

🔴 Loop Risk: HIGH

🚨 RECOMMENDATION: ESCALATE
   → High loop risk detected
   → pulse escalate
```

---

### `pulse_escalate`

**Purpose:** Escalate problem to external model

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "Problem description"
    },
    "tried": {
      "type": "string",
      "description": "What was already tried?"
    },
    "error": {
      "type": "string",
      "description": "Error message"
    },
    "stage": {
      "type": "number",
      "enum": [1, 2, 3],
      "description": "Escalation stage"
    },
    "autoInclude": {
      "type": "boolean",
      "description": "Auto-include relevant files"
    }
  },
  "required": ["problem"]
}
```

**Example Call:**
```
pulse_escalate 
  problem="Auth token not refreshing"
  tried="useEffect with dependency array, axios interceptor"
  error="401 Unauthorized after 1h"
  stage=2
  autoInclude=true
```

**Example Output:**
```
# 🚨 ESCALATION (Stage 2)

## Problem
Auth token not refreshing

## Context
- Project: MyApp (React/TypeScript)
- Branch: feature/auth-improvements
- Recent changes: 5 files

## What was tried
- useEffect with dependency array
- axios interceptor

## Error Message
```
401 Unauthorized after 1h
```

## Relevant Files

<file path="src/hooks/useAuth.ts">
// ... Code ...
</file>

<file path="src/api/client.ts">
// ... Code ...
</file>

## Question for External Model
Analyze the problem and suggest a solution.
Note: The agent has already made 2-3 attempts.

---

📋 Copy prompt to ChatGPT/Claude or use MCP tool in another window.
```

---

### `pulse_correct`

**Purpose:** Course correction during work

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "feedback": {
      "type": "string",
      "description": "What should be done differently?"
    },
    "mode": {
      "type": "string",
      "enum": ["narrow", "expand", "pivot", "explain", "milestone"],
      "description": "Type of correction"
    }
  },
  "required": ["feedback"]
}
```

**Modes:**

| Mode | Description |
|------|-------------|
| `narrow` | Focus, do less |
| `expand` | Extend scope |
| `pivot` | Completely different direction |
| `explain` | Agent should explain what they understand |
| `milestone` | Set smaller intermediate goals |

**Example Call:**
```
pulse_correct feedback="Too complex, make it simpler" mode="narrow"
```

---

### `pulse_review`

**Purpose:** Decision Briefing before merge/end

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "full": {
      "type": "boolean",
      "description": "Detailed checklist"
    },
    "json": {
      "type": "boolean",
      "description": "JSON output"
    }
  }
}
```

**Example Output:**
```
┌───────────────────────────────────────────────────────┐
│ PULSE Review – Decision Briefing                      │
├───────────────────────────────────────────────────────┤
│ Profile: frontend/build                               │
├───────────────────────────────────────────────────────┤
│ SCOPE-CHECK                                           │
│  Files: 8/10 (80%)  ████████████░░░                   │
│  Lines: 180/250 (72%)  ███████████░░░░                │
│  Deletes: 12/30 (40%)  ██████░░░░░░░░░                │
├───────────────────────────────────────────────────────┤
│ RISK-SUMMARY                                          │
│  ✅ 0 Critical, ⚠️ 2 Warnings                         │
│  ⏱️ Checkpoint 8 min ago                              │
│  🟢 Loop Risk: LOW                                    │
├───────────────────────────────────────────────────────┤
│ ✅ RECOMMENDATION: APPROVE                            │
│  → Scope OK, no critical findings                    │
│  → Ready for PR                                       │
└───────────────────────────────────────────────────────┘
```

---

### `pulse_learn`

**Purpose:** Save knowledge from solved problems

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "What was the problem?"
    },
    "solution": {
      "type": "string",
      "description": "How was it solved?"
    },
    "rule": {
      "type": "string",
      "description": "What rule results from this?"
    }
  },
  "required": ["problem", "solution"]
}
```

**Example Call:**
```
pulse_learn 
  problem="Race condition on token refresh"
  solution="useRef instead of useState for token"
  rule="Always use useRef for auth state, not useState"
```

**Example Output:**
```
✅ Knowledge saved

📁 File: .pulse/memory/2026-01-06T12-00-00.000Z-learning.md

Should the rule be added to .cursorrules?
→ "Always use useRef for auth state, not useState"
```

---

### `pulse_profile`

**Purpose:** Switch work layer

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["show", "set"]
    },
    "layer": {
      "type": "string",
      "enum": ["concept", "build", "escalation"]
    }
  }
}
```

**Layers:**

| Layer | Description | Typical Tool |
|-------|-------------|--------------|
| `concept` | Planning, architecture | ChatGPT/Claude |
| `build` | Implementation | Cursor |
| `escalation` | Complex problems | GPT-4/Opus |

---

### `pulse_reset`

**Purpose:** Git reset with safeguards

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "commits": {
      "type": "number",
      "description": "Number of commits back (default: 1)"
    },
    "mode": {
      "type": "string",
      "enum": ["soft", "mixed", "hard"]
    }
  }
}
```

**Example Output:**
```
🔄 PULSE Reset

📍 Branch: feature/user-dashboard
📋 Affected commits (1):
   🗑️ abc1234 fix: button color

   ✅ New HEAD: def5678 feat: add login form

🔧 Executing: git reset --mixed HEAD~1

✅ Reset successful!
📍 New HEAD: def5678 feat: add login form
```

---

## CLI Commands

> **See also:** [Detailed CLI Reference](./tooling/pulse-cli.md)

### Installation

```bash
# Global (after npm link)
pulse <command>

# Or via npx (if published)
npx @pulseframework/pulse-cli <command>
```

### `pulse init`

```bash
# Interactive
pulse init

# With options
pulse init --preset frontend --mcp --hooks

# For other editors
pulse init --agents
```

**Creates:**
- `.pulse/` - Artifact directory
- `pulse.config.json` - Configuration
- `.cursorrules` - Fallback rules
- `.cursor/rules/pulse.mdc` - Cursor Rules (with --mcp)
- `.cursor/mcp.json` - MCP Config (with --mcp)
- `AGENTS.md` - Universal Rules (with --agents)

---

### `pulse status`

```bash
pulse status              # Short form
pulse status --verbose    # Detailed
pulse status --json       # JSON output
pulse status --share      # Markdown for Slack/Discord
```

---

### `pulse start`

```bash
# Interactive
pulse start

# Quick mode (for MCP)
pulse start --template feature --action "Dashboard" --quick

# With all elements
pulse start \
  --role "Senior React Developer" \
  --context "E-Commerce App" \
  --action "Implement user dashboard" \
  --output "Working dashboard with tests"
```

---

### `pulse checkpoint`

```bash
pulse checkpoint -m "feat: add login form"
pulse checkpoint -m "wip: progress" --test
```

---

### `pulse doctor`

```bash
pulse doctor              # Working tree
pulse doctor --staged     # Only staged
pulse doctor --loop       # With loop detection
pulse doctor --ci         # CI Mode (Exit Codes)
```

**Exit Codes:**
- `0` - No findings
- `1` - Warnings
- `2` - Critical findings

---

### `pulse review`

```bash
pulse review              # Decision Briefing
pulse review --full       # With checklist
pulse review --json       # JSON output
```

---

### `pulse escalate`

```bash
# Interactive
pulse escalate

# With options
pulse escalate \
  --problem "Auth Token Bug" \
  --tried "useEffect, interceptor" \
  --stage 2 \
  --auto-include \
  --clipboard
```

---

### `pulse reset`

```bash
pulse reset               # 1 commit back, interactive
pulse reset -n 3          # 3 commits back
pulse reset --hard        # Hard reset
pulse reset -y            # Without confirmation
```

---

### `pulse run`

```bash
pulse run                 # Interactive workflow
```

---

### `pulse watch`

```bash
pulse watch               # Start watcher
pulse watch --interval 10 # Custom interval (minutes)
```

---

### `pulse learn`

```bash
pulse learn \
  --problem "Race Condition" \
  --solution "useRef instead of useState" \
  --rule "Auth state with useRef"
```

---

### `pulse profile`

```bash
pulse profile             # Show current profile
pulse profile set build   # Set profile
pulse profile set concept
pulse profile set escalation
```

---

## Configuration

### `pulse.config.json`

```json
{
  "preset": "frontend",
  "enforcement": "mixed",
  "thresholds": {
    "warnMaxFilesChanged": 10,
    "warnMaxLinesChanged": 250,
    "warnMaxDeletions": 30
  },
  "checkpointReminderMinutes": 15,
  "patterns": {
    "secret": [
      "(?i)(api[_-]?key|password|secret|token)\\s*[:=]\\s*['\"][^'\"]+['\"]",
      "(?i)bearer\\s+[a-zA-Z0-9_-]+",
      "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"
    ],
    "prodUrl": [
      "https?://[a-zA-Z0-9.-]+\\.(com|io|net|org|de)"
    ]
  }
}
```

### Presets

| Preset | Max Files | Max Lines | Checkpoint |
|--------|-----------|-----------|------------|
| `frontend` | 10 | 250 | 15 min |
| `backend` | 15 | 400 | 20 min |
| `fullstack` | 15 | 300 | 15 min |
| `monorepo` | 25 | 600 | 25 min |
| `custom` | 15 | 300 | 30 min |

---

## Automation

### `.cursor/rules/pulse.mdc`

```yaml
---
description: PULSE Framework - Automatic Safeguards
globs: *
alwaysApply: true
---
```

**Injected with EVERY chat message.**

### Automatic Triggers

| Trigger | Tool |
|---------|------|
| Every message | `pulse_status` |
| After code change | `pulse_doctor` |
| >10 min since checkpoint | Recommendation |
| >30 min autonomous | STOP |
| Loop detected | `pulse_escalate` |
| DELETE operation | User confirmation |

---

## Data Structures

### `.pulse/` Directory

```
.pulse/
├── pulses/           # Start prompts
│   └── 2026-01-06T12-00-00.000Z-start.md
├── reviews/          # Review documents
│   └── 2026-01-06T12-30-00.000Z-review.md
├── escalations/      # Escalation prompts
│   └── 2026-01-06T13-00-00.000Z-escalation.md
├── worklogs/         # Work logs
│   └── 2026-01-06.json
├── memory/           # Learned knowledge
│   └── 2026-01-06T14-00-00.000Z-learning.md
└── state.json        # Current status
```

### `state.json`

```json
{
  "profile": "build",
  "lastCheckpointAt": "2026-01-06T12:00:00.000Z",
  "currentAction": "Implement user dashboard",
  "sessionStartedAt": "2026-01-06T10:00:00.000Z"
}
```

---

## Versions

- **CLI:** 0.3.0
- **MCP:** 0.3.0
- **Node.js:** >=18
- **Cursor:** >=0.40

---

## Templates

### Cursor Rules Template (`.cursor/rules/pulse.mdc`)

This file is created with `pulse init --mcp` and injected with **EVERY** chat message in Cursor.

```markdown
---
description: PULSE Framework - Automatic safeguards for every message
globs: *
alwaysApply: true
---

# PULSE Framework Safeguards

These rules are applied to **EVERY** message. No exceptions.

## 🔴 MANDATORY CHECKS (before EVERY response)

### 1. ALWAYS: Call `pulse_status`
WHEN: Before every response, without exception
WHAT: Shows time since checkpoint, changes, risk

### 2. AFTER Code Changes: Call `pulse_doctor`
WHEN: When you just changed/created/deleted code
WHAT: Checks for secrets, deletes, scope, loop signals
ON CRITICAL: STOP immediately, don't continue!

### 3. EVERY 5-10 MIN: Recommend `pulse_checkpoint`
WHEN: pulse_status shows >10 min since checkpoint
WHAT: "Should I create a checkpoint?"

## 🔴 AUTOMATIC ACTIONS

| Situation | Action |
|-----------|--------|
| Every message | → `pulse_status` |
| Code changed | → `pulse_doctor` |
| >10 min since checkpoint | → Recommend checkpoint |
| >15 min since checkpoint | → **Checkpoint URGENT** |
| >30 min autonomous | → **STOP + ask user** |
| 2-3 failed attempts | → **STOP + `pulse_escalate`** |
| DELETE operation | → **Get user confirmation** |
| Loop detected | → **STOP + `pulse_escalate`** |

## 🔴 SAFEGUARDS (non-negotiable)

- ⏱️ **MAX 30 min autonomous** - Then STOP + ask user
- 🗑️ **NO DELETE** without explicit user confirmation
- 📤 **NO GIT PUSH** without user confirmation
- 🔐 **NO Secrets** in code
- 📋 **Git commit every 5-10 min** via `pulse_checkpoint`

## MCP Tools

| Tool | When |
|------|------|
| `pulse_status` | **EVERY message** |
| `pulse_doctor` | **After code changes** |
| `pulse_checkpoint` | After 5-10 min |
| `pulse_run` | At start of new tasks |
| `pulse_escalate` | On problems, loop |
| `pulse_review` | At end / before merge |
```

---

### MCP Config Template (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "pulse": {
      "command": "pulse-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

---

### AGENTS.md Template (Universal for all editors)

This file is created with `pulse init --agents` and works with:
- Windsurf
- GitHub Copilot
- Cline
- Aider
- Other AI Assistants

```markdown
# AI Agent Instructions

> Universal agent configuration for PULSE Framework.

## Core Principles

You are an AI coding assistant following the **PULSE Framework**.

### The 30-Minute Rule

⚠️ **NEVER work autonomously for more than 30 minutes.**

### Critical Safeguards (Non-Negotiable)

1. 🗑️ **DELETE Guard** - Never delete without confirmation
2. 📤 **PUSH Guard** - Never push without confirmation
3. 🔐 **SECRETS Guard** - Never commit secrets
4. 🧪 **TEST Guard** - Test before deploy
5. ⚠️ **BREAKING CHANGE Guard** - Warn before breaking changes

### Workflow Commands

| Command | When to Use |
|---------|-------------|
| `pulse status` | Check state before work |
| `pulse checkpoint -m "msg"` | Every 5-10 min |
| `pulse doctor` | Before commits |
| `pulse escalate` | When stuck |
| `pulse reset` | To go back |

### Loop Detection

Signs you're in a loop:
- Multiple "fix" commits in a row
- Going back and forth (A↔B)
- Same error after multiple attempts

What to do:
1. STOP
2. Summarize what you tried
3. Escalate or reset

### Remember

- You are a pair programmer, not solo
- Iterate in small steps
- Ask when uncertain
- Commit often
- Human has final say
```

---

## Setup / Onboarding

### Complete Setup Flow

```bash
# 1. Install CLI globally (after npm link in PulseFramework)
cd /path/to/PulseFramework
npm install
npm run -w packages/pulse-cli build
npm run -w packages/pulse-mcp build
npm link -w packages/pulse-cli
npm link -w packages/pulse-mcp

# 2. Initialize in target project
cd /your/project
pulse init
```

### `pulse init` Flow

```
🎯 PULSE Init

📦 Choose a preset for your project:

  🎨 Frontend - React/Vue/Angular (stricter limits)
  ⚙️ Backend - API/Services (moderate limits)
  🔄 Fullstack - Frontend + Backend
  📦 Monorepo - Multiple packages (relaxed limits)
  ⚙️ Custom - Default settings

? Preset: fullstack

? Install MCP + Cursor Rules? (recommended for Cursor IDE) Yes

✅ .pulse/ directory created
✅ Config created: pulse.config.json (Preset: fullstack)
✅ .cursorrules created (fallback rules)
✅ Cursor Rules created: .cursor/rules/pulse.mdc (alwaysApply: true)
✅ MCP Config created: .cursor/mcp.json
✅ Role templates copied

──────────────────────────────────────────────────

✨ PULSE initialized!

Preset: fullstack
Max Lines: 300
Checkpoint: 15 min
MCP: ✅ Installed

📋 Next steps for MCP:
   1. Restart Cursor (MCP loads automatically)
   2. In Cursor: Settings > Features > Enable MCP
   3. Test: pulse status
```

### What `pulse init` Creates

| File | Description |
|------|-------------|
| `.pulse/` | Artifact directory |
| `pulse.config.json` | Project configuration |
| `.cursorrules` | Fallback rules (without MCP) |
| `.cursor/rules/pulse.mdc` | Cursor Rules (with `--mcp`) |
| `.cursor/mcp.json` | MCP Server Config (with `--mcp`) |
| `AGENTS.md` | Universal Rules (with `--agents`) |

### After Setup

1. **Restart Cursor** (important!)
2. **Check MCP:** View → Output → MCP
3. **Test:** Ask in chat "What pulse tools do you have?"

---

## Implementation Status

| Component | Status | Path |
|-----------|--------|------|
| CLI v0.3.0 | ✅ Implemented | `packages/pulse-cli/` |
| MCP Server v0.3.0 | ✅ Implemented | `packages/pulse-mcp/` |
| Cursor Rules Template | ✅ Implemented | `packages/pulse-cli/templates/cursor/pulse.mdc` |
| MCP Config Template | ✅ Implemented | `packages/pulse-cli/templates/cursor/mcp.json` |
| AGENTS.md Template | ✅ Implemented | `packages/pulse-cli/templates/AGENTS.md` |
| `pulse init --mcp` | ✅ Implemented | Creates `.cursor/` files |
| `pulse init --agents` | ✅ Implemented | Creates `AGENTS.md` |
| Automatic Branch Creation | ✅ Implemented | `pulse_run` |
| Loop Detection | ✅ Implemented | 5 patterns |
| Dependency Warning | ✅ Implemented | New packages detected |

---

*Generated on 2026-01-06*
