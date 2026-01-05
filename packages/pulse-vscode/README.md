# Pulse Framework - VSCode/Cursor Extension

> Guardrails, checkpoints, and escalation for AI-assisted development with Cursor Agent Mode.

![Pulse Status Bar](https://img.shields.io/badge/Pulse-Checkpoint%20Timer-blue)

## Features

### 🕐 Status Bar Timer
Shows time since your last checkpoint — turns **yellow** after 30 minutes to remind you to checkpoint.

![Status Bar](./docs/statusbar.png)

### ⌨️ Commands
Access all Pulse commands from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Description |
|---------|-------------|
| **Pulse: Initialize Project** | Set up Pulse in your project |
| **Pulse: Start New Task** | Create a Start Pulse with 6-element framework |
| **Pulse: Checkpoint Now** | Create a checkpoint (git context + warnings) |
| **Pulse: Run Doctor** | Scan for safeguards and red flags |
| **Pulse: Create Review Checklist** | Generate review checklist |
| **Pulse: Create Escalation Package** | Build package for external model |
| **Pulse: Start Watcher** | Enable 30-min reminder timer |
| **Pulse: Stop Watcher** | Disable reminder timer |
| **Pulse: Set Profile → Concept/Build/Escalation** | Switch layers |

### 🔔 Checkpoint Reminders
When the watcher is running, you'll get notifications when it's time to checkpoint:

> ⚠️ Pulse: 32 minutes since last checkpoint. Time to checkpoint!

### 🔒 Mixed Enforcement
Works with `pulse doctor` to scan for:
- Secrets in code
- Mass deletions
- Production URLs
- Loop patterns (repeated "fix" commits)

## Installation

### From VSIX (Local)
```bash
cd packages/pulse-vscode
npm install
npm run build
npm run package
# Install the generated .vsix file
```

### From Marketplace (Coming Soon)
Search for "Pulse Framework" in the Extensions marketplace.

## Requirements

- **Pulse CLI** must be installed (`npm install -g @pulseframework/pulse-cli` or available via `npx`)
- **Git** repository (Pulse uses git for checkpoints)

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `pulse.checkpointReminderMinutes` | `30` | Minutes between checkpoint reminders |
| `pulse.showStatusBar` | `true` | Show status bar item |
| `pulse.autoStartWatcher` | `false` | Auto-start watcher on project open |
| `pulse.notificationsEnabled` | `true` | Show notification reminders |

## Usage with Cursor Agent Mode

### 1. Start a Session
1. Open Command Palette → **Pulse: Set Profile → Build**
2. **Pulse: Start New Task** → Fill in Role, Context, Action
3. Copy the generated prompt into Cursor Agent Mode

### 2. During Agent Mode
- Status bar shows time since last checkpoint
- **Pulse: Start Watcher** for automatic reminders
- Click status bar or run **Pulse: Checkpoint Now** every 5-10 minutes

### 3. When Stuck
1. **Pulse: Run Doctor** with loop detection
2. If STOP recommended: **Pulse: Create Escalation Package**
3. Paste into ChatGPT/Claude → get instructions → paste back into Cursor

### 4. Before Merge
- **Pulse: Create Review Checklist**
- Fill the checklist in `.pulse/reviews/`

## Keyboard Shortcuts (Suggested)

Add to your `keybindings.json`:

```json
[
  {
    "key": "cmd+shift+c",
    "command": "pulse.checkpoint",
    "when": "pulse.initialized"
  },
  {
    "key": "cmd+shift+d",
    "command": "pulse.doctor",
    "when": "pulse.initialized"
  }
]
```

## Related

- [Pulse CLI Documentation](../../docs/tooling/pulse-cli.md)
- [PULSE Cheatsheet](../../docs/cheatsheet/PULSE-Cheatsheet.md)
- [Pulse Spec v1](../../spec/pulse-spec-v1.md)

## License

MIT
