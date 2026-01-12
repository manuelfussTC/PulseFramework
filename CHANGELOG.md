# Changelog
All notable changes to the **PULSE Framework** monorepo will be documented in this file.

This repository contains multiple packages:

- `pulse-framework-cli` (CLI, run by humans)
- `@pulseframework/pulse-mcp` (MCP server, called by Cursor agent tools)
- `pulse-framework` (VS Code extension)

---

## 0.4.2 (2026-01-12)

### Added
- **Explicit MCP tool triggers**: All tools now have clear, concrete triggers in rules:
  - `pulse_learn` → after solving non-trivial problem
  - `pulse_review` → before "done", PR, or merge  
  - `pulse_escalate` → after 2-3 failed attempts
  - `pulse_correct` → when user says "wrong"
  - `pulse_run` → for multi-step tasks (>3 steps)
- **"After Success" section** in rules to remind agents to call `pulse_learn`
- **MCP TOOL TRIGGERS section** in `.cursorrules` template
- **Post-commit hook** to auto-reset checkpoint timer on every git commit
- **Checkpoint overdue blocking**: `pulse_status` now returns `isError: true` when >30 min without checkpoint

### Changed
- **Package renamed**: `@pulseframework/pulse-cli` → `pulse-framework-cli` (for npm publishing)
- **VS Code extension** commands now use `npx pulse-framework-cli` 
- **Pre-commit hook** now only blocks on CRITICAL (exit 2), allows warnings (exit 1)
- **All MCP tool descriptions** now in English with clear trigger hints

### Fixed
- **CI workflow**: Updated package name reference after rename
- **Exit code consistency**: Pre-commit hook now preserves exit code 2 for critical findings
- **Agent ignoring Critical**: `pulse_status` now sets `isError: true` to force agent to stop

---

## 0.4.1 (2026-01-12)

### Fixed
- **MCP project-root resolution**: `pulse-mcp` now normalizes `PULSE_PROJECT_ROOT` / `cwd` to the git top-level to prevent tools from scanning the wrong repository (reduces false loop/critical reports).
- **Anti-verification loop guidance**: Updated templates (`pulse.mdc`, `.cursorrules`) to stop agents from getting stuck in repeated status/check cycles and to enforce "implement → verify" behavior.

### Changed
- **MCP chaining output** now uses fully English wording for "next step" and safeguard reminders.

---

## 0.4.0 (2026-01-12)

### Added
- **One-Shot MCP Setup** (`pulse init --global`):
  - Auto-install `pulse-mcp` if not found
  - Workspace detection with dual-location rule installation
  - Wrapper script generation for cwd issues
  - `PULSE_PROJECT_ROOT` env support in MCP server
  - Post-init validation with clear error messages
- **Cursor MCP config template** for easy project integration
- **Centralized `runCli()`** in `lib/cli.ts` for all MCP tools

### Changed
- **Full Internationalization: German → English**
  - All CLI commands, prompts, and messages now in English
  - All templates (`.cursorrules`, `pulse.mdc`) now in English
  - MCP chaining responses now in English
  - Documentation examples updated to English
- **Spec document** now clearly distinguishes Specification version (v1.0) from Toolkit version (v0.4.0)

### Fixed
- **MCP cwd bug**: Moved `cwd` assignment inside `handleRunTool` to avoid stale values
- **Executable detection**: Properly detect `pulse-mcp` executable vs JS entry point

### Documentation
- Updated `README.md` with detailed MCP installation guide
- Updated `docs/tooling/pulse-cli.md` with new `--global` flag docs
- Added comprehensive `docs/tooling/pulse-mcp.md`

---

## 0.3.0 (2026-01-06)

### Added
- **MCP server package** (`@pulseframework/pulse-mcp`) to integrate PULSE tools into Cursor via Model Context Protocol.
- **MCP tool surface** for agent-driven workflows (e.g. `pulse_status`, `pulse_doctor`, `pulse_checkpoint`, `pulse_run`, `pulse_escalate`, `pulse_review`, `pulse_learn`, `pulse_profile`, `pulse_reset`).
- **Documentation split** for the two interfaces:
  - `docs/tooling/pulse-cli.md` (CLI reference, v0.3.0)
  - `docs/tooling/pulse-mcp.md` (MCP reference, v0.3.0)
  - `docs/PULSE-Technical-Reference-2026-01-06.md` (combined reference, v0.3.0)

### Changed
- Monorepo documentation updated to clearly distinguish **CLI (human)** vs **MCP (agent)** usage and installation paths.

---

## 0.2.0 (January 2026)

### Notes
- CLI-focused release; detailed notes live in `docs/CLI-CHANGELOG-v0.2.0.md`.

