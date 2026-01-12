import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// State
let statusBarItem: vscode.StatusBarItem | undefined;
let watcherInterval: NodeJS.Timeout | undefined;
let lastCheckpointAt: Date | null = null;
let isWatcherRunning = false;

// -------------------------------------------------------------------
// Activation
// -------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
  console.log("Pulse Framework extension activated");

  // Check if this is a Pulse project
  const workspaceRoot = getWorkspaceRoot();
  if (workspaceRoot) {
    const pulseDir = path.join(workspaceRoot, ".pulse");
    const configFile = path.join(workspaceRoot, "pulse.config.json");
    const cursorrules = path.join(workspaceRoot, ".cursorrules");
    const isInitialized = fs.existsSync(pulseDir) || fs.existsSync(configFile);
    vscode.commands.executeCommand("setContext", "pulse.initialized", isInitialized);

    if (isInitialized) {
      loadLastCheckpointTime(workspaceRoot);
    } else {
      // Check if user said "never" for this project
      const ignoreFile = path.join(workspaceRoot, ".pulse-ignore");
      if (fs.existsSync(ignoreFile)) {
        return; // User doesn't want Pulse here
      }

      // Check if this looks like a dev project (has package.json, .git, etc.)
      const hasPackageJson = fs.existsSync(path.join(workspaceRoot, "package.json"));
      const hasGit = fs.existsSync(path.join(workspaceRoot, ".git"));
      const hasCursorrules = fs.existsSync(cursorrules);
      
      if (hasPackageJson || hasGit) {
        // This looks like a project - offer to initialize Pulse (with slight delay for better UX)
        setTimeout(() => promptPulseSetup(workspaceRoot, hasCursorrules), 2000);
      }
    }
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("pulse.init", cmdInit),
    vscode.commands.registerCommand("pulse.start", cmdStart),
    vscode.commands.registerCommand("pulse.checkpoint", cmdCheckpoint),
    vscode.commands.registerCommand("pulse.doctor", cmdDoctor),
    vscode.commands.registerCommand("pulse.review", cmdReview),
    vscode.commands.registerCommand("pulse.escalate", cmdEscalate),
    vscode.commands.registerCommand("pulse.watch.start", cmdWatchStart),
    vscode.commands.registerCommand("pulse.watch.stop", cmdWatchStop),
    vscode.commands.registerCommand("pulse.profile.concept", () => cmdSetProfile("concept")),
    vscode.commands.registerCommand("pulse.profile.build", () => cmdSetProfile("build")),
    vscode.commands.registerCommand("pulse.profile.escalation", () => cmdSetProfile("escalation")),
    vscode.commands.registerCommand("pulse.openArtifacts", cmdOpenArtifacts)
  );

  // Create status bar
  const config = vscode.workspace.getConfiguration("pulse");
  if (config.get<boolean>("showStatusBar", true)) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = "pulse.checkpoint";
    statusBarItem.tooltip = "Click to create a Pulse checkpoint";
    context.subscriptions.push(statusBarItem);
    updateStatusBar();
    statusBarItem.show();

    // Update status bar every minute
    const statusInterval = setInterval(updateStatusBar, 60_000);
    context.subscriptions.push({ dispose: () => clearInterval(statusInterval) });
  }

  // Auto-start watcher if configured
  if (config.get<boolean>("autoStartWatcher", false)) {
    cmdWatchStart();
  }

  // Watch for file changes to detect checkpoints
  const watcher = vscode.workspace.createFileSystemWatcher("**/.pulse/state.json");
  const reloadState = () => {
    const root = getWorkspaceRoot();
    if (root) {
      loadLastCheckpointTime(root);
      vscode.commands.executeCommand("setContext", "pulse.initialized", true);
    }
  };
  watcher.onDidChange(reloadState);
  watcher.onDidCreate(reloadState); // Also trigger when file is first created
  context.subscriptions.push(watcher);
}

export function deactivate() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = undefined;
  }
}

// -------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function loadLastCheckpointTime(workspaceRoot: string) {
  const statePath = path.join(workspaceRoot, ".pulse", "state.json");
  try {
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      if (state.lastCheckpointAt) {
        lastCheckpointAt = new Date(state.lastCheckpointAt);
        updateStatusBar();
      }
    }
  } catch {
    // Ignore errors
  }
}

async function promptPulseSetup(workspaceRoot: string, hasCursorrules: boolean) {
  const message = hasCursorrules
    ? "Pulse detected. Do you want to run the full setup?"
    : "This project is not using Pulse yet. Set it up now?";

  const action = await vscode.window.showInformationMessage(
    message,
    "Start setup",
    "Later",
    "Never for this project"
  );

  if (action === "Start setup") {
    // Show setup options
    const setupOption = await vscode.window.showQuickPick(
      [
        {
          label: "$(rocket) Standard setup",
          description: "Creates .cursorrules and .pulse/ directory",
          value: "basic",
        },
        {
          label: "$(git-branch) With Git hooks",
          description: "Standard + pre-commit hooks for safeguards",
          value: "hooks",
        },
        {
          label: "$(plug) With MCP server",
          description: "Standard + MCP configuration for Cursor",
          value: "mcp",
        },
        {
          label: "$(package) Full",
          description: "Everything: hooks + MCP + auto-watcher",
          value: "full",
        },
      ],
      { placeHolder: "Choose your setup" }
    );

    if (!setupOption) return;

    let cmd = "npx pulse-framework-cli init";
    
    switch (setupOption.value) {
      case "hooks":
        cmd += " --hooks";
        break;
      case "mcp":
        cmd += " --mcp";
        break;
      case "full":
        cmd += " --hooks --mcp";
        break;
    }

    // Run the init command
    const terminal = vscode.window.createTerminal({
      name: "Pulse Setup",
      cwd: workspaceRoot,
    });
    terminal.show();
    terminal.sendText(cmd);

    // Update context after a delay (give init time to complete)
    setTimeout(() => {
      const pulseDir = path.join(workspaceRoot, ".pulse");
      if (fs.existsSync(pulseDir)) {
        vscode.commands.executeCommand("setContext", "pulse.initialized", true);
        vscode.window.showInformationMessage(
          "✅ Pulse setup complete! Use Cmd+Shift+P → 'Pulse:' to access all commands."
        );
        
        // Ask to start watcher
        vscode.window
          .showInformationMessage(
            "Enable the 30-minute checkpoint reminder?",
            "Yes, enable",
            "No"
          )
          .then((answer) => {
            if (answer === "Yes, enable") {
              vscode.commands.executeCommand("pulse.watch.start");
            }
          });
      }
    }, 5000);

  } else if (action === "Never for this project") {
    // Create a marker file to not ask again
    const markerPath = path.join(workspaceRoot, ".pulse-ignore");
    fs.writeFileSync(markerPath, "# Pulse is disabled for this project\n");
    vscode.window.showInformationMessage(
      "OK. Pulse will not be offered for this project. Delete .pulse-ignore to re-enable."
    );
  }
}

function updateStatusBar() {
  if (!statusBarItem) return;

  const config = vscode.workspace.getConfiguration("pulse");
  const reminderMinutes = config.get<number>("checkpointReminderMinutes", 30);

  if (!lastCheckpointAt) {
    statusBarItem.text = "$(pulse) Pulse: No checkpoint";
    statusBarItem.backgroundColor = undefined;
    return;
  }

  const minutesAgo = Math.floor((Date.now() - lastCheckpointAt.getTime()) / 60_000);

  if (minutesAgo < 1) {
    statusBarItem.text = "$(check) Pulse: Just now";
    statusBarItem.backgroundColor = undefined;
  } else if (minutesAgo < reminderMinutes) {
    statusBarItem.text = `$(clock) Pulse: ${minutesAgo}m ago`;
    statusBarItem.backgroundColor = undefined;
  } else if (minutesAgo > 60) {
    // Session detection: >60 min is likely a new session, show friendly message
    const hoursAgo = Math.floor(minutesAgo / 60);
    const display = hoursAgo >= 24 ? `${Math.floor(hoursAgo / 24)}d` : `${hoursAgo}h`;
    statusBarItem.text = `$(refresh) Pulse: ${display} (new session?)`;
    statusBarItem.backgroundColor = undefined; // Don't show warning for new session
  } else {
    statusBarItem.text = `$(warning) Pulse: ${minutesAgo}m ago`;
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  }

  // Add watcher indicator
  if (isWatcherRunning) {
    statusBarItem.text += " $(eye)";
  }
}

async function runPulseCommand(
  cmd: string,
  options?: { showOutput?: boolean; interactive?: boolean }
): Promise<string | undefined> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Pulse: No workspace folder open.");
    return;
  }

  const showOutput = options?.showOutput ?? true;
  const interactive = options?.interactive ?? false;

  try {
    if (interactive) {
      // Run in terminal for interactive commands
      const terminal = vscode.window.createTerminal({
        name: "Pulse",
        cwd: workspaceRoot,
      });
      terminal.show();
      terminal.sendText(cmd);
      return;
    }

    // Run silently and capture output
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    if (showOutput && stdout) {
      const output = vscode.window.createOutputChannel("Pulse");
      output.clear();
      output.appendLine(`> ${cmd}\n`);
      output.appendLine(stdout);
      if (stderr) output.appendLine(stderr);
      output.show(true);
    }

    return stdout;
  } catch (error: any) {
    const message = error.stderr || error.message || String(error);
    vscode.window.showErrorMessage(`Pulse: ${message}`);
    return undefined;
  }
}

// -------------------------------------------------------------------
// Commands
// -------------------------------------------------------------------

async function cmdInit() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Pulse: No workspace folder open.");
    return;
  }

  const installHooks = await vscode.window.showQuickPick(["Yes", "No"], {
    placeHolder: "Install git hooks (mixed enforcement)?",
  });

  const hookFlag = installHooks === "Yes" ? " --hooks" : "";
  await runPulseCommand(`npx pulse-framework-cli init${hookFlag}`, { interactive: true });

  // Update context
  vscode.commands.executeCommand("setContext", "pulse.initialized", true);
  vscode.window.showInformationMessage("Pulse initialized! Run `pulse start` to begin.");
}

async function cmdStart() {
  // Open terminal for interactive start
  await runPulseCommand("npx pulse-framework-cli start", { interactive: true });
}

async function cmdCheckpoint() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return;

  // Quick pick for checkpoint options
  const option = await vscode.window.showQuickPick(
    [
      { label: "$(save) Quick Checkpoint", description: "Create checkpoint artifact", value: "" },
      { label: "$(git-commit) Checkpoint + Commit", description: "Create checkpoint and commit", value: "commit" },
      { label: "$(history) Inspect Latest Commit", description: "Review auto-committed changes", value: "inspect" },
      { label: "$(beaker) Run Tests", description: "Checkpoint with test run", value: "test" },
    ],
    { placeHolder: "Checkpoint options" }
  );

  if (!option) return;

  let cmd = "npx pulse-framework-cli checkpoint";
  if (option.value === "commit") {
    const message = await vscode.window.showInputBox({
      prompt: "Commit message",
      placeHolder: "feat: ...",
    });
    if (!message) return;
    cmd += ` -m "${message}"`;
  } else if (option.value === "inspect") {
    cmd += " --inspect-latest";
  } else if (option.value === "test") {
    cmd += " --run-tests";
  }

  await runPulseCommand(cmd);

  // Update last checkpoint time
  lastCheckpointAt = new Date();
  updateStatusBar();

  vscode.window.showInformationMessage("Pulse: Checkpoint created!");
}

async function cmdDoctor() {
  const option = await vscode.window.showQuickPick(
    [
      { label: "$(shield) Scan Working Tree", description: "Check uncommitted changes", value: "" },
      { label: "$(git-commit) Scan Staged", description: "Check staged changes only", value: "--staged" },
      { label: "$(sync) Include Loop Detection", description: "Add loop heuristics", value: "--loop" },
    ],
    { placeHolder: "Doctor scan options" }
  );

  if (!option) return;

  await runPulseCommand(`npx pulse-framework-cli doctor ${option.value}`);
}

async function cmdReview() {
  await runPulseCommand("npx pulse-framework-cli review");
  vscode.window.showInformationMessage("Pulse: Review checklist created in .pulse/reviews/");
}

async function cmdEscalate() {
  await runPulseCommand("npx pulse-framework-cli escalate", { interactive: true });
}

async function cmdSetProfile(profile: "concept" | "build" | "escalation") {
  await runPulseCommand(`npx pulse-framework-cli profile ${profile}`, { showOutput: false });
  vscode.window.showInformationMessage(`Pulse: Profile set to ${profile}`);
}

async function cmdWatchStart() {
  if (isWatcherRunning) {
    vscode.window.showInformationMessage("Pulse: Watcher is already running.");
    return;
  }

  const config = vscode.workspace.getConfiguration("pulse");
  const minutes = config.get<number>("checkpointReminderMinutes", 30);
  const notificationsEnabled = config.get<boolean>("notificationsEnabled", true);

  isWatcherRunning = true;
  updateStatusBar();

  vscode.window.showInformationMessage(`Pulse: Watcher started (${minutes}min reminders)`);

  // Start internal timer for reminders
  watcherInterval = setInterval(() => {
    if (!notificationsEnabled) return;

    const minutesAgo = lastCheckpointAt
      ? Math.floor((Date.now() - lastCheckpointAt.getTime()) / 60_000)
      : 999;

    if (minutesAgo >= minutes) {
      vscode.window
        .showWarningMessage(
          `Pulse: ${minutesAgo} minutes since last checkpoint. Time to checkpoint!`,
          "Checkpoint Now",
          "Dismiss"
        )
        .then((action) => {
          if (action === "Checkpoint Now") {
            cmdCheckpoint();
          }
        });
    }
  }, 60_000); // Check every minute

  updateStatusBar();
}

async function cmdWatchStop() {
  if (!isWatcherRunning) {
    vscode.window.showInformationMessage("Pulse: Watcher is not running.");
    return;
  }

  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = undefined;
  }

  isWatcherRunning = false;
  updateStatusBar();

  vscode.window.showInformationMessage("Pulse: Watcher stopped.");
}

async function cmdOpenArtifacts() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return;

  const pulseDir = path.join(workspaceRoot, ".pulse");
  if (!fs.existsSync(pulseDir)) {
    vscode.window.showErrorMessage("Pulse: .pulse directory not found. Run `pulse init` first.");
    return;
  }

  const uri = vscode.Uri.file(pulseDir);
  await vscode.commands.executeCommand("revealInExplorer", uri);
}
