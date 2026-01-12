# Pulse MCP Server Reference (v0.3.0)

> Model Context Protocol server for Cursor IDE integration — automatic safeguards and workflow tools.

## Overview

The Pulse MCP Server provides tools that Cursor's AI agent can call automatically. Unlike the CLI (which humans run), MCP tools are called by the agent during conversations.

**Key Difference: CLI vs MCP**

| Aspect | CLI (`pulse`) | MCP (`pulse_*`) |
|--------|---------------|-----------------|
| Who calls it | Human in terminal | AI agent in Cursor |
| How to use | Run commands manually | Agent calls automatically |
| Output | Terminal output | Returns to agent context |
| Installation | `npm link` globally | Configure in `.cursor/mcp.json` |

## Installation

### 1. Build the MCP Server

```bash
cd /path/to/PulseFramework
npm install
npm run -w packages/pulse-mcp build
npm link -w packages/pulse-mcp
```

### 2. Configure in Project

Run `pulse init --mcp` in your project, or manually create:

**`.cursor/mcp.json`:**
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

### 3. Restart Cursor

The MCP server starts automatically when Cursor opens the project.

**Verify:** View → Output → MCP (should show "pulse" server running)

---

## MCP Tools

### `pulse_status`

**Purpose:** Get project status (MANDATORY before every agent response)

**When to call:** Before EVERY response, without exception.

```
pulse_status
pulse_status json=true
```

**Input:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `json` | boolean | JSON output instead of formatted |

**Output Example:**
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
```

---

### `pulse_run`

**Purpose:** Start a new workflow (creates branch + gives work order)

**When to call:** At the start of a new task/feature.

```
pulse_run action="Implement user dashboard" template="feature"
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | ✅ | What should be done |
| `template` | string | | feature, bugfix, refactor, concept, analyze |
| `branch` | string | | Custom branch name (auto-generated if omitted) |

**Automatic Actions:**
1. Checks current branch
2. Creates feature branch if on main/master
3. Saves worklog
4. Returns work order with safeguards

**Output:** Work order with ACTION, safeguards, and next steps.

---

### `pulse_checkpoint`

**Purpose:** Create Git commit with validation

**When to call:** Every 5-10 minutes, or when `pulse_status` recommends.

```
pulse_checkpoint message="feat: add login form"
pulse_checkpoint message="wip: progress" runTests=true
```

**Input:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | string | Commit message |
| `runTests` | boolean | Run tests before commit |

**Automatic Actions:**
1. Runs `pulse_doctor` (safeguard check)
2. Aborts on critical findings
3. Stages all changes
4. Creates commit

---

### `pulse_doctor`

**Purpose:** Check safeguards and red flags

**When to call:** After EVERY code change.

```
pulse_doctor
pulse_doctor staged=true loop=true
```

**Input:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `staged` | boolean | Only check staged changes |
| `loop` | boolean | Enable loop detection |

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

**Loop Detection (5 patterns):**

| Pattern | Description |
|---------|-------------|
| `fix_chain` | 3+ "fix" commits in a row |
| `revert` | Revert commits in log |
| `churn` | Same file changed 5+ times |
| `pendulum` | Similar commit messages |
| `fix_no_test` | Fix without test change |

---

### `pulse_escalate`

**Purpose:** Escalate problem to external model (GPT-5/Claude/Opus)

**When to call:** After 2-3 failed fix attempts, or when stuck.

```
pulse_escalate problem="Auth token not refreshing" tried="useEffect, interceptor" stage=2
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `problem` | string | ✅ | Problem description |
| `tried` | string | | What was already tried |
| `error` | string | | Error message |
| `stage` | number | | Escalation stage (1, 2, or 3) |
| `autoInclude` | boolean | | Auto-include relevant files |

**Output:** Formatted escalation prompt for external model.

---

### `pulse_correct`

**Purpose:** Course correction during work

**When to call:** When feedback indicates wrong direction.

```
pulse_correct feedback="Too complex, simplify" mode="narrow"
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `feedback` | string | ✅ | What should be different |
| `mode` | string | | narrow, expand, pivot, explain, milestone |

**Modes:**
| Mode | Description |
|------|-------------|
| `narrow` | Focus, do less |
| `expand` | Extend scope |
| `pivot` | Different direction |
| `explain` | Agent explains understanding |
| `milestone` | Set smaller goals |

---

### `pulse_review`

**Purpose:** Decision Briefing before merge/end

**When to call:** Before merge, at end of feature, or on request.

```
pulse_review
pulse_review full=true
```

**Input:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `full` | boolean | Detailed checklist |
| `json` | boolean | JSON output |

**Output:** Decision Briefing with scope check, risk summary, and recommendation.

---

### `pulse_learn`

**Purpose:** Save knowledge from solved problems

**When to call:** After solving a non-trivial problem.

```
pulse_learn problem="Race condition" solution="useRef instead of useState" rule="Auth state with useRef"
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `problem` | string | ✅ | What was the problem |
| `solution` | string | ✅ | How it was solved |
| `rule` | string | | Derived rule for future |

**Saves to:** `.pulse/memory/`

---

### `pulse_profile`

**Purpose:** Show or switch work layer

```
pulse_profile action="show"
pulse_profile action="set" layer="build"
```

**Input:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | string | show or set |
| `layer` | string | concept, build, escalation |

---

### `pulse_reset`

**Purpose:** Git reset with safeguards (for loop recovery)

```
pulse_reset commits=1 mode="mixed"
```

**Input:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `commits` | number | Commits to go back (default: 1) |
| `mode` | string | soft, mixed, hard |

---

## Automatic Triggers (Cursor Rules)

When `.cursor/rules/pulse.mdc` is installed, these triggers are active:

| Trigger | Action |
|---------|--------|
| Every message | → `pulse_status` |
| After code change | → `pulse_doctor` |
| >10 min since checkpoint | → Recommend checkpoint |
| >15 min since checkpoint | → **Checkpoint URGENT** |
| >30 min autonomous | → **STOP + ask user** |
| 2-3 failed attempts | → **STOP + `pulse_escalate`** |
| DELETE operation | → **Get user confirmation** |
| Loop detected | → **STOP + `pulse_escalate`** |

---

## Troubleshooting

### MCP Server Not Starting

1. Check if `pulse-mcp` is linked: `which pulse-mcp`
2. Rebuild: `npm run -w packages/pulse-mcp build && npm link -w packages/pulse-mcp`
3. Check `.cursor/mcp.json` configuration
4. Restart Cursor

### Tools Not Available

1. View → Output → MCP → Check for errors
2. Ask agent: "What pulse tools do you have?"
3. Verify `.cursor/rules/pulse.mdc` exists with `alwaysApply: true`

### Agent Not Calling Tools

The Cursor Rules (`.cursor/rules/pulse.mdc`) instruct the agent to call tools. Ensure:
- File exists with correct content
- `alwaysApply: true` is set
- Cursor was restarted after setup

---

## See Also

- [Pulse CLI Reference](./pulse-cli.md) - Human-facing CLI commands
- [PULSE Technical Reference](../PULSE-Technical-Reference-2026-01-06.md) - Combined reference
- [Workflow Guide](../workflow.md) - How to use CLI + MCP together
