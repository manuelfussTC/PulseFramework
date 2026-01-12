# PULSE CLI v0.2.0 - Changelog

> **Release:** v0.2.0  
> **Date:** January 2026  
> **Previous Version:** v0.1.0

---

## Summary

This version brings **6 major improvements** based on external feedback:

1. New command `pulse status`
2. New command `pulse run`
3. Clipboard support (`-C, --clipboard`)
4. Team presets with `pulse init`
5. Extended loop detection
6. Auto-promotion with `pulse learn`

---

## New Commands

### 1. `pulse status`

**One-liner overview** of the current project state.

```bash
pulse status
# Output: 🔨 build | 🟢 12m ago | 📝 5 files | ⚠️ 2 warnings

pulse status --json
# Output: {"profile":"build","lastCheckpointMinutesAgo":12,...}
```

**Shows:**
- Current profile (🧠 concept, 🔨 build, 🚨 escalation)
- Time since last checkpoint (🟢 <15m, 🟡 <30m, 🔴 >30m)
- Number of changed files
- Number of findings (Warnings/Critical)

**Files:**
- `packages/pulse-cli/src/commands/status.ts` (new)

---

### 2. `pulse run`

**Combined workflow:** Start → Watch → Checkpoint → Review in one command.

```bash
pulse run
pulse run -t feature --minutes 20
pulse run --no-watch --action "Implement API"
```

**Options:**
| Option | Description |
|--------|-------------|
| `-t, --template <id>` | Template: feature, bugfix, refactor, concept, analyze, review |
| `--minutes <n>` | Checkpoint interval (default: 30) |
| `--no-watch` | Don't start watcher |
| `--action <text>` | Specify ACTION directly |

**Flow:**
1. Template selection (interactive or via flag)
2. Generate and output prompt
3. Start watch loop (checkpoint reminders)
4. On Ctrl+C: Offer checkpoint and review

**Files:**
- `packages/pulse-cli/src/commands/run.ts` (new)

---

## New Features

### 3. Clipboard Support (`-C, --clipboard`)

All prompt-generating commands can now copy the prompt directly to clipboard.

```bash
pulse start --action "Build feature" -C
pulse escalate -C
pulse correct -C
```

**Platform Support:**
| OS | Tool |
|----|------|
| macOS | `pbcopy` |
| Windows | `clip` |
| Linux | `xclip` or `xsel` |

**Files:**
- `packages/pulse-cli/src/lib/clipboard.ts` (new)
- `packages/pulse-cli/src/commands/start.ts` (extended)
- `packages/pulse-cli/src/commands/escalate.ts` (extended)
- `packages/pulse-cli/src/commands/correct.ts` (extended)

---

### 4. Team Presets with `pulse init`

Interactive preset selection during project initialization.

```bash
pulse init
# Shows selection: frontend, backend, fullstack, monorepo, custom

pulse init --preset backend --no-interactive
```

**Available Presets:**

| Preset | Max Lines | Max Files | Max Deletes | Checkpoint |
|--------|-----------|-----------|-------------|------------|
| `frontend` | 200 | 10 | 30 | 20 min |
| `backend` | 400 | 15 | 50 | 30 min |
| `fullstack` | 500 | 20 | 60 | 25 min |
| `monorepo` | 800 | 30 | 100 | 30 min |
| `custom` | 300 | 15 | 50 | 30 min |

**New Config Fields:**
```json
{
  "preset": "backend",
  "checkpointReminderMinutes": 30
}
```

**Files:**
- `packages/pulse-cli/src/lib/config.ts` (extended: `PRESETS`, `getPresetNames()`)
- `packages/pulse-cli/src/lib/types.ts` (extended: `PresetName`, `PresetConfig`)
- `packages/pulse-cli/src/commands/init.ts` (completely revised)

---

### 5. Extended Loop Detection

`pulse doctor --loop` now detects **5 different loop signals**:

| Signal | Severity | Description |
|--------|----------|-------------|
| **Fix-Chain** | warn | 3+ "fix" commits in last 15 commits |
| **Revert** | critical | Revert commits detected (A↔B toggling) |
| **File-Churn** | warn | Same file changed 5+ times |
| **Pendulum** | critical | Similar commit messages repeating |
| **Fix-No-Test** | warn | Fix commits without corresponding test changes |

```bash
pulse doctor --loop

# Example output:
# WARN: LOOP_SIGNAL: Loop signal: 3x "fix" commits in last 15 commits.
# WARN: LOOP_SIGNAL: Loop signal: File-Churn - .gitignore (5x)
# CRITICAL: LOOP_SIGNAL: Loop signal: Similar commits repeating.
```

**Files:**
- `packages/pulse-cli/src/lib/scanner.ts` (extended: `detectLoopSignals()`, `LoopSignal` type)
- `packages/pulse-cli/src/commands/doctor.ts` (adapted: uses new loop detection)

---

### 6. Auto-Promotion with `pulse learn`

Rules can now be automatically added to `.cursorrules`.

```bash
pulse learn
# Interactive: Enter problem, solution, rule
# At the end: "Add to .cursorrules? (y/n)"
```

**New Options:**
| Option | Description |
|--------|-------------|
| `--problem <text>` | What was the problem? |
| `--solution <text>` | What was the solution? |
| `--rule <text>` | Derived rule |
| `--reason <text>` | Why this rule? |
| `--no-promote` | Don't ask about .cursorrules update |

**Generated .cursorrules Snippet:**
```
# ┌────────────────────────────────────────────────────────────────────────────┐
# │ LEARNED RULE                                                               │
# └────────────────────────────────────────────────────────────────────────────┘
#
# Always check Migration Guide on Prisma updates
#
# Reason: Breaking changes in major versions
#
# Context: Prisma 5 changed findUnique behavior
#
```

**Files:**
- `packages/pulse-cli/src/commands/learn.ts` (completely revised)

---

## Minor Changes

### Improved Output for `pulse correct`

- New modes: `explain`, `narrow`, `milestone`
- Better formatting

### Version Bump

- `package.json`: `0.1.0` → `0.2.0`
- `src/index.ts`: `.version("0.2.0")`

---

## Changed Files (Overview)

| File | Change |
|------|--------|
| `commands/status.ts` | **NEW** |
| `commands/run.ts` | **NEW** |
| `lib/clipboard.ts` | **NEW** |
| `commands/start.ts` | `-C, --clipboard` added |
| `commands/escalate.ts` | `-C, --clipboard` added |
| `commands/correct.ts` | `-C, --clipboard` + new modes |
| `commands/init.ts` | Preset selection |
| `commands/learn.ts` | Auto-promotion |
| `commands/doctor.ts` | Extended loop detection |
| `lib/config.ts` | `PRESETS`, `getPresetNames()` |
| `lib/scanner.ts` | `detectLoopSignals()` + 5 signal types |
| `lib/types.ts` | `PresetName`, `PresetConfig` |
| `index.ts` | `registerStatusCommand`, `registerRunCommand` |
| `package.json` | Version 0.2.0 |

---

## Migration from v0.1.0

No breaking changes. All existing commands work as before.

**Recommended:**
1. `npm run build -w packages/pulse-cli`
2. `npm link -w packages/pulse-cli`
3. In projects: `pulse init --preset <type>` for new preset config

---

## Documentation

The complete updated documentation is in:
- `docs/tooling/pulse-cli.md` (v0.2.0)

---

*Changelog created: January 2026*
