# Pulse Framework

> **Guardrails, checkpoints, and escalation for AI-assisted development.**

[![OpenVSX](https://img.shields.io/open-vsx/v/pulse-framework/pulse-framework)](https://open-vsx.org/extension/pulse-framework/pulse-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Pulse Framework is a **safety system for AI coding** with Cursor, Windsurf, Copilot and other AI assistants. It prevents common pitfalls like runaway agents, forgotten commits, accidental deletions, and endless debugging loops.

## 🎯 What Pulse Does

| Problem | Pulse Solution |
|---------|----------------|
| Agent works 2 hours without saving | ⏱️ **30-minute timer** with checkpoint reminders |
| Accidental file deletions | 🗑️ **Delete guard** requires confirmation |
| Secrets committed to repo | 🔐 **Secrets scanner** blocks commits |
| Stuck in debugging loops | 🔄 **Loop detection** triggers escalation |
| Lost context after breaks | 📋 **Session detection** shows "Ready" on new day |
| No idea what changed | 📊 **Status bar** shows time + changes at a glance |

## ✨ Features

### 🚀 One-Click Setup
Open any project → Click "Setup Pulse" in status bar or Explorer panel → Done!

### 📊 Smart Status Bar
- Shows time since last checkpoint
- Turns yellow after 30 minutes
- Shows "Ready" on new sessions (no false warnings!)
- Click to create checkpoint

### 📂 Explorer Panel
Quick access to all Pulse actions:
- Start Task, Checkpoint, Doctor, Watcher, Escalate, Artifacts

### 🔔 Update Notifications
See what's new after extension updates with "What's New" dialog.

### ⌨️ Commands
Access via Command Palette (`Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| **Pulse: Initialize Project** | Set up Pulse (creates .cursorrules, MCP, hooks) |
| **Pulse: Quick Setup (Full)** | One-click full setup |
| **Pulse: Start New Task** | Create structured task with 6-element prompt |
| **Pulse: Checkpoint Now** | Git commit with safeguard checks |
| **Pulse: Run Doctor** | Scan for secrets, deletes, loops |
| **Pulse: Create Escalation Package** | Export context for GPT-4/Claude |
| **Pulse: Start/Stop Watcher** | Toggle 30-min reminders |

## 📦 Installation

### From Cursor/VS Code
1. Open Extensions (`Cmd+Shift+X`)
2. Search **"Pulse Framework"**
3. Click Install
4. Open a project → Click "Setup Pulse" in status bar

### What Gets Installed
- `.pulse/` directory for artifacts
- `.cursorrules` with safeguard rules
- Git hooks (pre-commit, pre-push) for enforcement
- MCP server config for Cursor Agent Mode

## 🔧 Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `pulse.checkpointReminderMinutes` | `30` | Minutes between reminders |
| `pulse.showStatusBar` | `true` | Show status bar item |
| `pulse.autoStartWatcher` | `false` | Auto-start watcher |
| `pulse.notificationsEnabled` | `true` | Show notifications |

## 🤖 With Cursor Agent Mode

Pulse integrates with Cursor's Agent Mode via MCP (Model Context Protocol):

1. **Setup**: `Pulse: Initialize Project` with MCP option
2. **Agent sees**: Safeguard rules in `.cursorrules`
3. **Agent uses**: MCP tools (`pulse_status`, `pulse_doctor`, `pulse_checkpoint`)
4. **You see**: Status bar timer + notifications

### MCP Tools (for AI Agent)

| Tool | When Agent Calls It |
|------|---------------------|
| `pulse_status` | Before every response |
| `pulse_doctor` | After code changes |
| `pulse_checkpoint` | Every 5-10 minutes |
| `pulse_escalate` | When stuck after 2-3 attempts |

## 📚 Documentation

- [Pulse Framework Website](https://manuel-fuss.de/pulse)
- [GitHub Repository](https://github.com/manuelfussTC/PulseFramework)
- [CLI Documentation](https://github.com/manuelfussTC/PulseFramework/blob/main/docs/tooling/pulse-cli.md)
- [MCP Documentation](https://github.com/manuelfussTC/PulseFramework/blob/main/docs/tooling/pulse-mcp.md)

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/manuelfussTC/PulseFramework/issues)
- **Email**: [kontakt@manuel-fuss.de](mailto:kontakt@manuel-fuss.de)

## 📄 License

MIT © Manuel Fuß
