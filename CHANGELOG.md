# Changelog
All notable changes to the **PULSE Framework** monorepo will be documented in this file.

This repository contains multiple packages:

- `@pulseframework/pulse-cli` (CLI, run by humans)
- `@pulseframework/pulse-mcp` (MCP server, called by Cursor agent tools)
- `pulse-framework` (VS Code extension)

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

