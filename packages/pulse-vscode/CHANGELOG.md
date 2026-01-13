# Changelog

All notable changes to the **Pulse Framework** VS Code/Cursor extension.

## [0.5.3] - 2026-01-13

### Changed
- 📖 **Complete README rewrite** - Now properly describes full Pulse Framework
  - Was: "Checkpoint Timer" badge
  - Now: Full feature overview, MCP integration, setup guide
- Better OpenVSX marketplace presentation

---

## [0.5.2] - 2026-01-13

### Added
- 📄 **Changelog visible on Marketplace** - CHANGELOG.md now included in package

---

## [0.5.1] - 2026-01-13

### Added
- 🔔 **Update Notifications** - "What's New" popup after extension updates
- ✨ **Status Bar Update Hint** - Shows "Pulse updated to vX.Y.Z!" for 10 seconds
- 📋 **Changelog Quick Pick** - View recent changes across versions

## [0.5.0] - 2026-01-13

### Added
- 🚀 **Welcome Notification** - Prominent "Setup Now" button for new projects
- 📌 **Status Bar Setup Button** - Shows "🚀 Setup Pulse" for uninitialized projects
- 📂 **Explorer Panel** - New "Pulse" section in sidebar with quick actions:
  - Not initialized: Setup buttons
  - Initialized: Start Task, Checkpoint, Doctor, Watcher, Escalate, Artifacts
- ⚡ **Quick Setup Command** - One-click full setup (hooks + MCP)

### Changed
- Status bar auto-switches from "Setup" to checkpoint timer after initialization

## [0.4.0] - 2026-01-12

### Added
- ⏱️ **Smart Session Detection** - No more "770m ago" after leaving Cursor open
- 🔄 **Auto-Reset on New Day** - Fresh session detection
- 🧹 **Clean State Detection** - Shows "Ready" if no uncommitted changes after 4h

### Changed
- Timer now shows ">4h (uncommitted!)" if old changes exist
- Removed false warnings for new sessions

## [0.3.1] - 2026-01-12

### Changed
- 🌍 **English-only UI** - All prompts and labels translated to English

## [0.3.0] - 2026-01-12

### Added
- 🎯 **Auto-Setup Prompt** - Detects uninitialized projects and offers setup
- 🔧 **Setup Options** - Basic, Git Hooks, MCP, or Full setup
- ⏰ **Checkpoint Timer** - Status bar shows time since last checkpoint
- 👁️ **Watcher Mode** - 30-minute checkpoint reminders
- 🎚️ **Profile Switching** - Concept/Build/Escalation layers

### Commands
- `Pulse: Initialize Project` - Set up Pulse in your project
- `Pulse: Start New Task` - Create a Start Pulse with 6-element framework
- `Pulse: Checkpoint Now` - Create a checkpoint (git context + warnings)
- `Pulse: Run Doctor` - Run safeguard checks
- `Pulse: Create Review Checklist` - Generate review artifacts
- `Pulse: Create Escalation Package` - Prepare for external model
- `Pulse: Start/Stop Watcher` - Toggle 30-min reminders

---

For CLI and MCP changes, see the [main CHANGELOG](https://github.com/manuelfussTC/PulseFramework/blob/main/CHANGELOG.md).
