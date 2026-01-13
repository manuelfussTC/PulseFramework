# Changelog
All notable changes to the **PULSE Framework** monorepo will be documented in this file.

This repository contains multiple packages:

- `pulse-framework-cli` (CLI, run by humans)
- `pulse-framework-mcp` (MCP server, called by Cursor agent tools)
- `pulse-framework` (VS Code/Cursor extension)

---

## CLI 0.4.6 / MCP 0.5.0 (2026-01-13)

### Added
- 🚀 **MCP Server published to npm** as `pulse-framework-mcp`
  - `npm install -g pulse-framework-mcp` now works!
  - `pulse init --mcp` auto-installs the MCP server

### Fixed
- `pulse init --mcp` no longer fails looking for unpublished package
- Updated install command from `@pulseframework/pulse-mcp` to `pulse-framework-mcp`

---

## Extension 0.5.3 (2026-01-13)

### Changed
- 📖 **Complete README rewrite** - Now properly describes full Pulse Framework
- Better OpenVSX marketplace presentation

---

## Extension 0.5.2 (2026-01-13)

### Added
- 📄 **Changelog visible on Marketplace** - CHANGELOG.md now included in package

---

## Extension 0.5.1 (2026-01-13)

### Added
- **Update Notifications**: Shows "What's New" popup after extension updates
- **Status Bar Update Hint**: Temporary "✨ Pulse updated to v0.5.1!" message (10s)
- **Changelog Quick Pick**: View recent changes across versions

### Notes
- First install: no notification (only on updates)
- Version stored in VS Code globalState

---

## Extension 0.5.0 (2026-01-13)

### Added
- **Welcome Notification**: Prominent "Setup Now" button when opening non-initialized projects
- **Status Bar Setup Button**: Shows "🚀 Setup Pulse" in status bar for new projects (replaces timer)
- **Explorer Panel**: New "Pulse" section in Explorer sidebar with quick actions:
  - Not initialized: "Setup Pulse" + "Custom Setup" buttons
  - Initialized: Start Task, Checkpoint, Doctor, Watcher, Escalate, Artifacts
- **Quick Setup Command**: `pulse.setupFull` for one-click full setup (hooks + MCP)

### Changed
- Setup flow is now more discoverable - three ways to initialize:
  1. Click status bar button
  2. Use Explorer panel  
  3. Welcome notification popup
- After init, status bar automatically switches from "Setup" to checkpoint timer

---

## 0.4.5 / Extension 0.4.0 (2026-01-12)

### Added (Extension)
- **Smart session detection**: Status bar now intelligently handles long breaks
  - Shows "Ready" (not warning) when >4h with no uncommitted changes
  - Shows ">4h (uncommitted!)" if old uncommitted changes exist
  - Auto-detects new day → fresh session
  - No more "770m ago" nonsense after leaving Cursor open overnight

### Improved (CLI)
- **Better error messaging in `pulse init`**:
  - `AGENTS.md` creation now shows specific error + actionable hints (permission denied, directory not found, disk full)
  - `.cursorrules` creation now catches and reports errors instead of silently failing
  - Helps users debug issues faster (e.g., "Permission denied → try sudo" or "Check write permissions")

---

## 0.4.4 (2026-01-12)

### Changed
- **English-only sweep**: Removed remaining German UI text from user-facing surfaces:
  - VS Code extension setup prompts/labels
  - CLI interactive prompts and `pulse run` output
  - MCP tool descriptions and `pulse_run` work-order output
  - Repo rule file `.cursor/rules/pulse.mdc`
  - Extension publishing guide (`packages/pulse-vscode/PUBLISHING.md`)

---

## 0.4.3 (2026-01-12)

### Added
- **npm Publishing**: CLI now published as `pulse-framework-cli` on npm
- **OpenVSX Publishing**: VS Code extension published as `pulse-framework` on OpenVSX
- **MCP Tool Triggers**: Added explicit guidance in `.cursorrules` for when to call each MCP tool
- **Changelog Protocol**: Added mandatory changelog documentation rules to `.cursorrules`
- **Publishing Protocol**: Added documentation for publishing CLI and Extension
- **Session Detection**: Timer now detects new sessions (>60 min without uncommitted changes)
  - MCP: Shows "🆕 NEW SESSION" instead of blocking
  - VS Code: Shows "Pulse: 5h (new session?)" instead of warning
  - Prevents false "overdue" warnings when opening Cursor after a break

### Changed
- Extension now calls `npx pulse-framework-cli` (npm package) instead of local CLI
- Updated `pulse.mdc` template with MCP tool triggers
- Checkpoint timer only blocks during active work (with uncommitted changes), not after breaks

---

## 0.4.2 (2026-01-12)

### Added
- **Initial npm release**: First public release of `pulse-framework-cli` on npm
- **Initial OpenVSX release**: First public release of VS Code extension

### Changed
- Package renamed from `@pulseframework/pulse-cli` to `pulse-framework-cli` for npm compatibility

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
