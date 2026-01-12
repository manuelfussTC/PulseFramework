# PULSE CLI v0.4.0 - Changelog

> **Release:** v0.4.0  
> **Date:** January 12, 2026  
> **Previous Version:** v0.3.0

---

## Summary

This release brings **3 major improvements**:

1. **One-Shot MCP Setup** – Fully automated setup with `pulse init --global`
2. **Full Internationalization** – All CLI output now in English
3. **MCP Reliability Fixes** – Resolved cwd and executable detection issues

---

## New Features

### 1. One-Shot MCP Setup

The `pulse init` command now supports fully automated MCP server setup.

```bash
# Global installation (recommended)
pulse init --global

# Project-local installation
pulse init
```

**New `--global` Flag:**

| Behavior | Description |
|----------|-------------|
| Auto-install | Installs `pulse-mcp` via npm if not found |
| Workspace detection | Detects mismatch between CWD and workspace |
| Dual-location rules | Installs `.cursorrules` in both locations if needed |
| Wrapper script | Creates wrapper for cwd resolution issues |
| Post-validation | Verifies installation with clear error messages |

**Environment Support:**
```bash
# MCP server respects this env var for project root
PULSE_PROJECT_ROOT=/path/to/project
```

**Files:**
- `packages/pulse-cli/src/commands/init.ts` (major refactor)
- `packages/pulse-mcp/src/lib/cli.ts` (new centralized runner)

---

### 2. Full Internationalization (DE → EN)

All CLI commands, prompts, and templates are now in English for better international adoption.

**Before (v0.3.0):**
```
🎯 PULSE Start
⚠️  Du bist auf 'main' – Feature-Branch empfohlen!
Feature-Branch erstellen? (y/n)
```

**After (v0.4.0):**
```
🎯 PULSE Start
⚠️  You are on 'main' – Feature branch recommended!
Create feature branch? (y/n)
```

**Affected Components:**

| Component | Changes |
|-----------|---------|
| CLI Commands | All prompts, messages, errors |
| Templates | `.cursorrules`, `pulse.mdc`, role templates |
| MCP Responses | Chaining, error messages, recommendations |
| Prompts | 6-element prompt structure |

**Files:**
- `packages/pulse-cli/src/commands/*.ts` (all commands)
- `packages/pulse-cli/src/lib/prompts.ts`
- `packages/pulse-cli/src/lib/briefing.ts`
- `packages/pulse-cli/templates/.cursorrules`
- `packages/pulse-cli/templates/cursor/pulse.mdc`
- `packages/pulse-mcp/src/lib/chaining.ts`

---

## Bug Fixes

### 3. MCP Reliability Fixes

**Fixed: Stale CWD in MCP Server**

The MCP server was caching `process.cwd()` at module load time, causing it to run in the wrong directory.

```typescript
// Before (broken)
const cwd = process.cwd(); // Cached at import

// After (fixed)
function handleRunTool() {
  const cwd = process.cwd(); // Fresh on each call
}
```

**Fixed: Executable Detection**

The CLI now properly detects whether `pulse-mcp` is installed as an executable or needs to be run via `node`.

```typescript
// Detects and uses correct invocation
const hasBinary = await commandExists("pulse-mcp");
if (hasBinary) {
  return "pulse-mcp";
} else {
  return `node ${mcpPath}`;
}
```

**Files:**
- `packages/pulse-mcp/src/index.ts`
- `packages/pulse-mcp/src/tools/*.ts` (all tools)

---

## Changed Files (Overview)

| File | Change |
|------|--------|
| `commands/init.ts` | One-shot MCP setup |
| `commands/start.ts` | i18n (EN) |
| `commands/correct.ts` | i18n (EN) |
| `commands/doctor.ts` | i18n (EN) |
| `commands/escalate.ts` | i18n (EN) |
| `commands/learn.ts` | i18n (EN) |
| `commands/reset.ts` | i18n (EN) |
| `commands/review.ts` | i18n (EN) |
| `commands/run.ts` | i18n (EN) |
| `commands/status.ts` | i18n (EN) |
| `lib/prompts.ts` | i18n (EN) |
| `lib/briefing.ts` | i18n (EN) |
| `lib/scanner.ts` | i18n (EN) |
| `lib/clipboard.ts` | i18n (EN) |
| `templates/.cursorrules` | i18n (EN) |
| `templates/cursor/pulse.mdc` | i18n (EN) |

---

## Migration from v0.3.0

No breaking changes. All existing commands work as before.

**Recommended:**
1. `npm run build -w packages/pulse-cli`
2. `npm link -w packages/pulse-cli`
3. Re-run `pulse init --global` to get updated templates

**Note:** If you have customized German templates, you may want to update them to English or keep your customizations.

---

## Documentation

Updated documentation:
- `docs/tooling/pulse-cli.md` (new `--global` flag)
- `docs/tooling/pulse-mcp.md` (comprehensive MCP guide)
- `README.md` (installation guide)
- `spec/pulse-spec-v1.md` (versioning clarification)

---

*Changelog created: January 12, 2026*
