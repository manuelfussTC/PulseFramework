# Changelog
All notable changes to the **PULSE Framework** monorepo will be documented in this file.

This repository contains multiple packages:

- `@pulseframework/pulse-cli` (CLI, run by humans)
- `@pulseframework/pulse-mcp` (MCP server, called by Cursor agent tools)
- `pulse-framework` (VS Code extension)

---

## 0.4.3 (2026-01-12)

### Added
- **npm Publishing**: CLI now published as `pulse-framework-cli` on npm
- **OpenVSX Publishing**: VS Code extension published as `pulse-framework` on OpenVSX
- **MCP Tool Triggers**: Added explicit guidance in `.cursorrules` for when to call each MCP tool
- **Changelog Protocol**: Added mandatory changelog documentation rules to `.cursorrules`
- **Publishing Protocol**: Added documentation for publishing CLI and Extension

### Changed
- Extension now calls `npx pulse-framework-cli` (npm package) instead of local CLI
- Updated `pulse.mdc` template with MCP tool triggers

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
