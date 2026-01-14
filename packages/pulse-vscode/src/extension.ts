import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Version & Changelog
const CURRENT_VERSION = "0.9.6";
const CHANGELOG: Record<string, string[]> = {
  "0.9.6": [
    "🐛 Fixed: Setup button now ALWAYS shows for uninitialized projects",
  ],
  "0.9.5": [
    "✨ Safeguard activity monitor: Reminds if pulse_status hasn't been called",
  ],
  "0.9.4": [
    "✨ Zero-friction Smart Checkpoint: Agent auto-executes on next message",
  ],
  "0.9.3": [
    "✨ Smart Checkpoint: Agent creates commit message from chat context",
  ],
  "0.9.2": [
    "🐛 Fixed reminder spam - now only notifies every 30 min, not every minute",
  ],
  "0.9.1": [
    "🐛 Fixed --profile → --preset flag for CLI compatibility",
  ],
  "0.9.0": [
    "🏥 Automatic health checks every 30 min (configurable)",
    "📊 Monitors uncommitted changes & warns on large changesets",
    "⚙️ New settings: autoHealthCheck, healthCheckIntervalMinutes",
  ],
  "0.8.0": [
    "🎯 Default profile is now 'fullstack' for quick setup",
    "🐛 Fixed '999 minutes' warning on new projects",
    "⚡ Setup runs without prompts - just click and go",
  ],
  "0.7.0": [
    "🔄 Auto-update CLI & MCP packages on extension update",
    "📦 Always uses latest pulse-framework-cli and pulse-framework-mcp",
  ],
  "0.6.0": [
    "🔧 Auto-repair: Detects and fixes missing MCP/rules on update",
    "🔔 Improved update notifications",
    "⚙️ New 'Pulse: Repair Installation' command",
  ],
  "0.5.3": [
    "📖 Complete README rewrite - now shows full framework features",
  ],
  "0.5.2": [
    "📄 Changelog now visible on OpenVSX/Marketplace",
  ],
  "0.5.1": [
    "🔔 Update notifications - see what's new after updates",
    "📊 Status bar shows version on update",
  ],
  "0.5.0": [
    "🚀 Welcome notification for new projects",
    "📌 Status bar 'Setup Pulse' button",
    "📂 Explorer panel with Pulse actions",
  ],
  "0.4.0": [
    "⏱️ Smart session detection (no more '770m ago')",
    "🔄 Auto-reset on new day",
  ],
};

// State
let statusBarItem: vscode.StatusBarItem | undefined;
let setupStatusBarItem: vscode.StatusBarItem | undefined;
let watcherInterval: NodeJS.Timeout | undefined;
let lastCheckpointAt: Date | null = null;
let isWatcherRunning = false;
let pulseTreeDataProvider: PulseTreeDataProvider | undefined;

// -------------------------------------------------------------------
// Activation
// -------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
  console.log("Pulse Framework extension activated");

  // Check for version update and show notification
  checkForUpdate(context);

  // Check if this is a Pulse project
  const workspaceRoot = getWorkspaceRoot();
  let isInitialized = false;
  
  if (workspaceRoot) {
    const pulseDir = path.join(workspaceRoot, ".pulse");
    const configFile = path.join(workspaceRoot, "pulse.config.json");
    const cursorrules = path.join(workspaceRoot, ".cursorrules");
    isInitialized = fs.existsSync(pulseDir) || fs.existsSync(configFile);
    vscode.commands.executeCommand("setContext", "pulse.initialized", isInitialized);

    if (isInitialized) {
      loadLastCheckpointTime(workspaceRoot);
    } else {
      // Check if user said "never" for this project
      const ignoreFile = path.join(workspaceRoot, ".pulse-ignore");
      if (!fs.existsSync(ignoreFile)) {
        // Check if this looks like a dev project (has package.json, .git, etc.)
        const hasPackageJson = fs.existsSync(path.join(workspaceRoot, "package.json"));
        const hasGit = fs.existsSync(path.join(workspaceRoot, ".git"));
        const hasCursorrules = fs.existsSync(cursorrules);
        
        if (hasPackageJson || hasGit) {
          // Show welcome notification with prominent button
          setTimeout(() => showWelcomeNotification(workspaceRoot, hasCursorrules), 1500);
        }
      }
    }
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("pulse.init", cmdInit),
    vscode.commands.registerCommand("pulse.setupFull", cmdSetupFull),
    vscode.commands.registerCommand("pulse.repair", cmdRepair),
    vscode.commands.registerCommand("pulse.updatePackages", () => updatePulsePackages()),
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
  const showStatusBar = config.get<boolean>("showStatusBar", true);
  
  if (isInitialized && showStatusBar) {
    // Show checkpoint timer status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = "pulse.checkpoint";
    statusBarItem.tooltip = "Click to create a Pulse checkpoint";
    context.subscriptions.push(statusBarItem);
    updateStatusBar();
    statusBarItem.show();

    // Update status bar every minute
    const statusInterval = setInterval(updateStatusBar, 60_000);
    context.subscriptions.push({ dispose: () => clearInterval(statusInterval) });
  } else if (!isInitialized && workspaceRoot) {
    // ALWAYS show setup button for uninitialized projects (regardless of showStatusBar setting)
    setupStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    setupStatusBarItem.command = "pulse.setupFull";
    setupStatusBarItem.text = "$(rocket) Setup Pulse";
    setupStatusBarItem.tooltip = "Click to initialize Pulse Framework in this project";
    setupStatusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    context.subscriptions.push(setupStatusBarItem);
    setupStatusBarItem.show();
    
    console.log("Pulse: Showing setup button for uninitialized project");
  }

  // Create Explorer Tree View
  pulseTreeDataProvider = new PulseTreeDataProvider(isInitialized);
  const treeView = vscode.window.createTreeView("pulseExplorer", {
    treeDataProvider: pulseTreeDataProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  // Auto-start watcher if configured
  if (config.get<boolean>("autoStartWatcher", false) && isInitialized) {
    cmdWatchStart();
  }

  // Watch for file changes to detect checkpoints and initialization
  const watcher = vscode.workspace.createFileSystemWatcher("**/.pulse/state.json");
  const pulseWatcher = vscode.workspace.createFileSystemWatcher("**/.pulse");
  
  const reloadState = () => {
    const root = getWorkspaceRoot();
    if (root) {
      loadLastCheckpointTime(root);
      vscode.commands.executeCommand("setContext", "pulse.initialized", true);
      
      // Switch from setup button to timer status bar
      if (setupStatusBarItem) {
        setupStatusBarItem.dispose();
        setupStatusBarItem = undefined;
      }
      if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.command = "pulse.checkpoint";
        statusBarItem.tooltip = "Click to create a Pulse checkpoint";
        context.subscriptions.push(statusBarItem);
        updateStatusBar();
        statusBarItem.show();
      }
      
      // Update tree view
      if (pulseTreeDataProvider) {
        pulseTreeDataProvider.setInitialized(true);
      }
    }
  };
  
  watcher.onDidChange(reloadState);
  watcher.onDidCreate(reloadState);
  pulseWatcher.onDidCreate(reloadState);
  context.subscriptions.push(watcher, pulseWatcher);
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

/**
 * Update CLI and MCP packages globally
 */
async function updatePulsePackages(): Promise<boolean> {
  const terminal = vscode.window.createTerminal({
    name: "Pulse Update",
  });
  terminal.show();
  
  // Update both packages to latest
  terminal.sendText("echo '🔄 Updating Pulse Framework packages...'");
  terminal.sendText("npm install -g pulse-framework-cli@latest pulse-framework-mcp@latest");
  terminal.sendText("echo ''");
  terminal.sendText("echo '✅ Pulse packages updated! You may close this terminal.'");
  
  return true;
}

/**
 * Show changelog in a quick pick
 */
async function showChangelog() {
  const items: vscode.QuickPickItem[] = [];
  
  // Add current version's changes
  const currentChanges = CHANGELOG[CURRENT_VERSION] || [];
  for (const change of currentChanges) {
    items.push({ label: change, description: `v${CURRENT_VERSION}` });
  }
  
  // Add previous versions' highlights
  const previousVersions = Object.keys(CHANGELOG)
    .filter((v) => v !== CURRENT_VERSION)
    .slice(0, 3);
  
  for (const version of previousVersions) {
    items.push({ label: "", description: `─── v${version} ───` });
    for (const change of CHANGELOG[version]) {
      items.push({ label: change, description: `v${version}` });
    }
  }

  await vscode.window.showQuickPick(items, {
    placeHolder: `What's new in Pulse Framework v${CURRENT_VERSION}`,
    canPickMany: false,
  });
}

/**
 * Check what Pulse components are missing
 */
function checkMissingComponents(workspaceRoot: string): string[] {
  const missing: string[] = [];

  if (!fs.existsSync(path.join(workspaceRoot, ".pulse"))) {
    missing.push(".pulse/ directory");
  }
  if (!fs.existsSync(path.join(workspaceRoot, ".cursorrules"))) {
    missing.push(".cursorrules");
  }
  if (!fs.existsSync(path.join(workspaceRoot, ".cursor", "rules", "pulse.mdc"))) {
    missing.push(".cursor/rules/pulse.mdc");
  }
  if (!fs.existsSync(path.join(workspaceRoot, ".cursor", "mcp.json"))) {
    missing.push(".cursor/mcp.json (MCP Server)");
  }

  return missing;
}

/**
 * Check if pulse_status was called recently (safeguards active)
 */
function checkSafeguardStatus(workspaceRoot: string, thresholdMinutes: number): { active: boolean; minutesAgo: number | null } {
  const statusFile = path.join(workspaceRoot, ".pulse", "last-status");
  
  if (!fs.existsSync(statusFile)) {
    return { active: false, minutesAgo: null };
  }
  
  try {
    const content = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
    const timestamp = new Date(content.timestamp);
    const minutesAgo = Math.floor((Date.now() - timestamp.getTime()) / 60_000);
    
    return {
      active: minutesAgo < thresholdMinutes,
      minutesAgo
    };
  } catch {
    return { active: false, minutesAgo: null };
  }
}

/**
 * Check if extension was updated and show notification
 */
async function checkForUpdate(context: vscode.ExtensionContext) {
  const lastVersion = context.globalState.get<string>("pulse.lastVersion");
  const workspaceRoot = getWorkspaceRoot();
  const isVersionChange = lastVersion !== CURRENT_VERSION;
  
  // Always store current version
  if (isVersionChange) {
    await context.globalState.update("pulse.lastVersion", CURRENT_VERSION);
  }
  
  // On version change (not first install), update CLI & MCP packages
  if (isVersionChange && lastVersion) {
    const action = await vscode.window.showInformationMessage(
      `✨ Pulse Framework updated to v${CURRENT_VERSION}! Update CLI & MCP packages to latest?`,
      "Update Now",
      "Later",
      "What's New"
    );
    
    if (action === "Update Now") {
      await updatePulsePackages();
      
      // Also check for missing components
      if (workspaceRoot) {
        const missing = checkMissingComponents(workspaceRoot);
        if (missing.length > 0) {
          setTimeout(async () => {
            const repairAction = await vscode.window.showWarningMessage(
              `Missing components: ${missing.slice(0, 3).join(", ")}. Repair?`,
              "Repair",
              "Skip"
            );
            if (repairAction === "Repair") {
              await cmdRepair();
            }
          }, 3000);
        }
      }
      return;
    } else if (action === "What's New") {
      showChangelog();
    }
    return;
  }
  
  // Check for missing components in initialized projects (on every activation)
  if (workspaceRoot) {
    const pulseDir = path.join(workspaceRoot, ".pulse");
    const isInitialized = fs.existsSync(pulseDir);
    
    if (isInitialized) {
      const missing = checkMissingComponents(workspaceRoot);
      
      if (missing.length > 0) {
        // Show repair prompt
        const missingList = missing.slice(0, 3).join(", ");
        const action = await vscode.window.showWarningMessage(
          `Pulse: Missing components detected (${missingList}). Repair installation?`,
          "Repair Now",
          "Later"
        );
        
        if (action === "Repair Now") {
          await cmdRepair();
          return;
        }
      }
    }
  }
  
  // Skip further notifications on first install
  if (!lastVersion) {
    return;
  }
  
  // Show update notification if version changed (fallback, shouldn't reach here)
  if (isVersionChange) {
    // Show status bar message briefly
    const updateStatusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      101
    );
    updateStatusBar.text = `$(sparkle) Pulse updated to v${CURRENT_VERSION}!`;
    updateStatusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.prominentBackground");
    updateStatusBar.show();
    
    // Hide after 15 seconds
    setTimeout(() => updateStatusBar.dispose(), 15000);

    // Show "What's New" notification
    const changes = CHANGELOG[CURRENT_VERSION] || [];
    const message = `✨ Pulse Framework updated to v${CURRENT_VERSION}!`;
    
    const action = await vscode.window.showInformationMessage(
      message,
      "What's New",
      "Dismiss"
    );

    if (action === "What's New") {
      // Show changelog in a quick pick
      const items = changes.map((change) => ({
        label: change,
        description: `v${CURRENT_VERSION}`,
      }));
      
      // Add previous versions' highlights
      const previousVersions = Object.keys(CHANGELOG)
        .filter((v) => v !== CURRENT_VERSION)
        .slice(0, 2);
      
      for (const version of previousVersions) {
        items.push({ label: "", description: `─── v${version} ───` });
        for (const change of CHANGELOG[version]) {
          items.push({ label: change, description: `v${version}` });
        }
      }

      await vscode.window.showQuickPick(items, {
        placeHolder: `What's new in Pulse Framework v${CURRENT_VERSION}`,
        canPickMany: false,
      });
    }
  }
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

/**
 * Show a prominent welcome notification for new projects
 */
async function showWelcomeNotification(workspaceRoot: string, hasCursorrules: boolean) {
  const message = "🚀 Pulse Framework: Protect your AI coding with safeguards, checkpoints & timers!";
  
  const action = await vscode.window.showInformationMessage(
    message,
    { modal: false },
    "Setup Now",
    "Show Options",
    "Not Now"
  );

  if (action === "Setup Now") {
    // Quick full setup
    await runFullSetup(workspaceRoot);
  } else if (action === "Show Options") {
    // Show the detailed setup options
    await promptPulseSetup(workspaceRoot, hasCursorrules);
  }
  // "Not Now" just dismisses - will show again next time
}

/**
 * Run full setup (hooks + MCP)
 */
async function runFullSetup(workspaceRoot: string) {
  const terminal = vscode.window.createTerminal({
    name: "Pulse Setup",
    cwd: workspaceRoot,
  });
  terminal.show();
  terminal.sendText("npx pulse-framework-cli init --hooks --mcp --preset fullstack");

  // Update context after a delay
  setTimeout(async () => {
    const pulseDir = path.join(workspaceRoot, ".pulse");
    if (fs.existsSync(pulseDir)) {
      vscode.commands.executeCommand("setContext", "pulse.initialized", true);
      
      // Set initial checkpoint time to now (new project starts fresh)
      lastCheckpointAt = new Date();
      updateStatusBar();
      
      vscode.window.showInformationMessage(
        "✅ Pulse is ready! Safeguards active. Use Cmd+Shift+P → 'Pulse:' for all commands.",
        "Start Watcher"
      ).then((answer) => {
        if (answer === "Start Watcher") {
          vscode.commands.executeCommand("pulse.watch.start");
        }
      });
    }
  }, 8000);
}

// -------------------------------------------------------------------
// Explorer Tree View
// -------------------------------------------------------------------

class PulseTreeDataProvider implements vscode.TreeDataProvider<PulseTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PulseTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private initialized: boolean;

  constructor(initialized: boolean) {
    this.initialized = initialized;
  }

  setInitialized(value: boolean) {
    this.initialized = value;
    this._onDidChangeTreeData.fire(undefined);
  }

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PulseTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): PulseTreeItem[] {
    if (!this.initialized) {
      // Not initialized - show setup options
      return [
        new PulseTreeItem(
          "🚀 Setup Pulse",
          "Initialize Pulse in this project",
          "pulse.setupFull",
          vscode.TreeItemCollapsibleState.None,
          "rocket"
        ),
        new PulseTreeItem(
          "⚙️ Custom Setup...",
          "Choose setup options",
          "pulse.init",
          vscode.TreeItemCollapsibleState.None,
          "gear"
        ),
      ];
    }

    // Initialized - show Pulse actions
    return [
      new PulseTreeItem(
        "$(play) Start Task",
        "Begin a new Pulse workflow",
        "pulse.start",
        vscode.TreeItemCollapsibleState.None,
        "play"
      ),
      new PulseTreeItem(
        "$(save) Checkpoint",
        "Create a checkpoint now",
        "pulse.checkpoint",
        vscode.TreeItemCollapsibleState.None,
        "save"
      ),
      new PulseTreeItem(
        "$(shield) Doctor",
        "Run safeguard checks",
        "pulse.doctor",
        vscode.TreeItemCollapsibleState.None,
        "shield"
      ),
      new PulseTreeItem(
        "$(eye) Start Watcher",
        "Enable 30-min reminders",
        "pulse.watch.start",
        vscode.TreeItemCollapsibleState.None,
        "eye"
      ),
      new PulseTreeItem(
        "$(warning) Escalate",
        "Create escalation package",
        "pulse.escalate",
        vscode.TreeItemCollapsibleState.None,
        "warning"
      ),
      new PulseTreeItem(
        "$(folder) Artifacts",
        "Open .pulse folder",
        "pulse.openArtifacts",
        vscode.TreeItemCollapsibleState.None,
        "folder"
      ),
    ];
  }
}

class PulseTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    tooltip: string,
    commandId: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    icon: string
  ) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
    this.command = {
      command: commandId,
      title: label,
    };
    this.iconPath = new vscode.ThemeIcon(icon);
  }
}

async function hasUncommittedChanges(): Promise<boolean> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return false;

  try {
    const { stdout } = await execAsync("git status --porcelain", { cwd: workspaceRoot });
    return stdout.trim().length > 0;
  } catch {
    return false; // Not a git repo or error
  }
}

function isNewDay(lastDate: Date): boolean {
  const now = new Date();
  return (
    lastDate.getDate() !== now.getDate() ||
    lastDate.getMonth() !== now.getMonth() ||
    lastDate.getFullYear() !== now.getFullYear()
  );
}

async function updateStatusBar() {
  if (!statusBarItem) return;

  const config = vscode.workspace.getConfiguration("pulse");
  const reminderMinutes = config.get<number>("checkpointReminderMinutes", 30);
  const sessionThresholdMinutes = 240; // 4 hours = new session threshold

  if (!lastCheckpointAt) {
    statusBarItem.text = "$(pulse) Pulse: Ready";
    statusBarItem.backgroundColor = undefined;
    return;
  }

  const minutesAgo = Math.floor((Date.now() - lastCheckpointAt.getTime()) / 60_000);

  // Case 1: Just checkpointed
  if (minutesAgo < 1) {
    statusBarItem.text = "$(check) Pulse: Just now";
    statusBarItem.backgroundColor = undefined;
  }
  // Case 2: Within reminder threshold - all good
  else if (minutesAgo < reminderMinutes) {
    statusBarItem.text = `$(clock) Pulse: ${minutesAgo}m ago`;
    statusBarItem.backgroundColor = undefined;
  }
  // Case 3: New day OR >4h - likely a new session
  else if (isNewDay(lastCheckpointAt) || minutesAgo >= sessionThresholdMinutes) {
    // Check for uncommitted changes to decide the message
    const hasChanges = await hasUncommittedChanges();
    
    if (hasChanges) {
      // Has uncommitted changes from before - show capped warning
      statusBarItem.text = "$(warning) Pulse: >4h (uncommitted!)";
      statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    } else {
      // No changes - this is a fresh session, auto-reset the mental model
      statusBarItem.text = "$(rocket) Pulse: Ready";
      statusBarItem.backgroundColor = undefined;
    }
  }
  // Case 4: Between reminder threshold and 4h - show warning
  else {
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

  // Show setup options
  await promptPulseSetup(workspaceRoot, fs.existsSync(path.join(workspaceRoot, ".cursorrules")));
}

async function cmdSetupFull() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Pulse: No workspace folder open.");
    return;
  }

  await runFullSetup(workspaceRoot);
}

async function cmdRepair() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Pulse: No workspace folder open.");
    return;
  }

  const missing = checkMissingComponents(workspaceRoot);
  
  if (missing.length === 0) {
    vscode.window.showInformationMessage("✅ Pulse installation is complete - nothing to repair.");
    return;
  }

  // Show what's missing
  const missingText = missing.map(m => `• ${m}`).join("\n");
  
  const action = await vscode.window.showWarningMessage(
    `Missing Pulse components:\n${missing.join(", ")}\n\nRepair will run 'pulse init --mcp' to install missing files.`,
    { modal: true },
    "Repair",
    "Cancel"
  );

  if (action !== "Repair") {
    return;
  }

  // Run repair - this re-runs init which is idempotent (won't overwrite existing files)
  const terminal = vscode.window.createTerminal({
    name: "Pulse Repair",
    cwd: workspaceRoot,
  });
  terminal.show();
  terminal.sendText("npx pulse-framework-cli init --hooks --mcp --preset fullstack");

  // Verify after delay
  setTimeout(async () => {
    const stillMissing = checkMissingComponents(workspaceRoot);
    if (stillMissing.length === 0) {
      vscode.window.showInformationMessage(
        "✅ Pulse repair complete! Restart Cursor to activate MCP server."
      );
    } else {
      vscode.window.showWarningMessage(
        `⚠️ Some components still missing: ${stillMissing.join(", ")}`
      );
    }
  }, 8000);
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
      { label: "$(sparkle) Smart Checkpoint", description: "Agent creates commit from chat context (recommended)", value: "smart" },
      { label: "$(save) Quick Checkpoint", description: "Create checkpoint artifact (no commit)", value: "" },
      { label: "$(git-commit) Manual Commit", description: "Enter commit message manually", value: "commit" },
      { label: "$(history) Inspect Latest Commit", description: "Review auto-committed changes", value: "inspect" },
    ],
    { placeHolder: "Checkpoint options" }
  );

  if (!option) return;

  // Smart checkpoint: Write trigger file for agent to pick up
  if (option.value === "smart") {
    const triggerPath = path.join(workspaceRoot, ".pulse", "checkpoint-requested");
    const pulseDir = path.join(workspaceRoot, ".pulse");
    
    // Ensure .pulse directory exists
    if (!fs.existsSync(pulseDir)) {
      fs.mkdirSync(pulseDir, { recursive: true });
    }
    
    // Write trigger file with timestamp
    fs.writeFileSync(triggerPath, JSON.stringify({
      requestedAt: new Date().toISOString(),
      reason: "User requested checkpoint via extension"
    }, null, 2));
    
    vscode.window.showInformationMessage(
      "✨ Checkpoint requested! Agent will create commit on next message."
    );
    return;
  }

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

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showWarningMessage("Pulse: No workspace folder open.");
    return;
  }

  const config = vscode.workspace.getConfiguration("pulse");
  const minutes = config.get<number>("checkpointReminderMinutes", 30);
  const notificationsEnabled = config.get<boolean>("notificationsEnabled", true);
  const autoHealthCheck = config.get<boolean>("autoHealthCheck", true);
  const healthCheckIntervalMinutes = config.get<number>("healthCheckIntervalMinutes", 30);

  isWatcherRunning = true;
  updateStatusBar();

  vscode.window.showInformationMessage(
    `Pulse: Watcher started (${minutes}min reminders${autoHealthCheck ? `, health check every ${healthCheckIntervalMinutes}min` : ""})`
  );

  let lastHealthCheck = Date.now();
  let lastReminderShown = 0; // Track when we last showed a reminder
  let lastSafeguardReminder = 0; // Track safeguard reminder

  // Start internal timer for reminders and health checks
  watcherInterval = setInterval(async () => {
    const now = Date.now();
    
    // Health check every X minutes
    if (autoHealthCheck && (now - lastHealthCheck) >= healthCheckIntervalMinutes * 60_000) {
      lastHealthCheck = now;
      await runPeriodicHealthCheck();
    }
    
    // Check if pulse_status has been called recently (safeguards active)
    const safeguardCheckMinutes = config.get<number>("safeguardCheckMinutes", 5);
    
    // Only check if enabled (> 0)
    if (safeguardCheckMinutes > 0) {
      const safeguardStatus = checkSafeguardStatus(workspaceRoot, safeguardCheckMinutes);
      const minutesSinceSafeguardReminder = Math.floor((now - lastSafeguardReminder) / 60_000);
      
      if (!safeguardStatus.active && minutesSinceSafeguardReminder >= safeguardCheckMinutes) {
        lastSafeguardReminder = now;
        
        const timeText = safeguardStatus.minutesAgo !== null 
          ? `last call: ${safeguardStatus.minutesAgo} min ago` 
          : "never called";
        
        vscode.window.showWarningMessage(
          `⚠️ Pulse safeguards inactive (${timeText}). Send a message in Agent chat to activate.`,
          "OK"
        );
      }
    }

    if (!notificationsEnabled) return;

    // Skip checkpoint reminder if no checkpoint ever made (new project)
    if (!lastCheckpointAt) {
      return;
    }
    
    const minutesAgo = Math.floor((now - lastCheckpointAt.getTime()) / 60_000);
    const minutesSinceReminder = Math.floor((now - lastReminderShown) / 60_000);

    // Only show reminder if:
    // 1. We're past the threshold (e.g., 30 min)
    // 2. We haven't shown a reminder in the last 30 min
    if (minutesAgo >= minutes && minutesSinceReminder >= minutes) {
      lastReminderShown = now;
      
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

/**
 * Run periodic health check in background
 */
async function runPeriodicHealthCheck() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return;

  try {
    // Check git status
    const { stdout: gitStatus } = await execAsync("git status --porcelain", { cwd: workspaceRoot });
    const uncommittedFiles = gitStatus.trim().split("\n").filter(l => l.length > 0).length;
    
    // Check for large uncommitted changes
    const { stdout: diffStat } = await execAsync("git diff --stat HEAD 2>/dev/null || echo ''", { cwd: workspaceRoot });
    const diffLines = diffStat.trim().split("\n");
    const lastLine = diffLines[diffLines.length - 1] || "";
    const insertionsMatch = lastLine.match(/(\d+) insertion/);
    const deletionsMatch = lastLine.match(/(\d+) deletion/);
    const totalChanges = (insertionsMatch ? parseInt(insertionsMatch[1]) : 0) + 
                         (deletionsMatch ? parseInt(deletionsMatch[1]) : 0);

    // Determine health status
    let status: "ok" | "warning" | "critical" = "ok";
    let message = "";

    if (totalChanges > 500) {
      status = "critical";
      message = `⚠️ Large uncommitted changes: ${totalChanges} lines across ${uncommittedFiles} files. Consider checkpointing!`;
    } else if (uncommittedFiles > 10) {
      status = "warning";
      message = `${uncommittedFiles} uncommitted files. Consider a checkpoint.`;
    } else if (totalChanges > 200) {
      status = "warning";
      message = `${totalChanges} lines changed. Good time for a checkpoint.`;
    }

    // Show notification only for warnings/critical
    if (status === "critical") {
      const action = await vscode.window.showWarningMessage(
        `Pulse Health Check: ${message}`,
        "Checkpoint Now",
        "Run Doctor",
        "Dismiss"
      );
      if (action === "Checkpoint Now") {
        cmdCheckpoint();
      } else if (action === "Run Doctor") {
        cmdDoctor();
      }
    } else if (status === "warning") {
      // Just update status bar, don't interrupt
      vscode.window.setStatusBarMessage(`$(pulse) Health: ${message}`, 10000);
    }

  } catch (error) {
    // Silently ignore errors in background check
  }
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
