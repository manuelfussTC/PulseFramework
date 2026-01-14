import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import type { Command } from "commander";
import { ensurePulseDirs } from "../lib/artifacts.js";
import { DEFAULT_CONFIG, PRESETS, getPresetNames } from "../lib/config.js";
import { configFile, findRepoRoot } from "../lib/paths.js";
import { installHooks } from "../hooks/install.js";
import { promptSelect, promptConfirm } from "../lib/input.js";
import type { PresetName, PulseConfig } from "../lib/types.js";

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function packageRoot(): string {
  // dist/index.js -> dist/.. (package root)
  return path.resolve(__dirname, "..", "..");
}

// ════════════════════════════════════════════════════════════════════════════
// Helper Functions for MCP Setup
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get absolute path to Node.js executable
 */
function getNodePath(): string {
  try {
    return execSync("which node", { encoding: "utf8" }).trim();
  } catch {
    // Fallback for common locations
    const fallbacks = [
      "/usr/local/bin/node",
      "/opt/homebrew/bin/node",
      `${os.homedir()}/.nvm/current/bin/node`,
    ];
    for (const p of fallbacks) {
      try {
        execSync(`${p} --version`, { encoding: "utf8" });
        return p;
      } catch {
        continue;
      }
    }
    throw new Error("Node.js not found. Please ensure node is in your PATH.");
  }
}

/**
 * Find pulse-mcp, install if not found
 */
async function ensurePulseMcpInstalled(): Promise<string> {
  // First check if already installed
  try {
    const mcpPath = execSync("which pulse-mcp", { encoding: "utf8" }).trim();
    if (mcpPath) return mcpPath;
  } catch {
    // Not in PATH, continue to check other locations
  }

  // Check common npm global locations
  const globalLocations = [
    `${os.homedir()}/.npm-global/bin/pulse-mcp`,
    "/usr/local/bin/pulse-mcp",
    `${os.homedir()}/.pulse/node_modules/.bin/pulse-mcp`,
  ];

  for (const loc of globalLocations) {
    if (await fileExists(loc)) {
      return loc;
    }
  }

  // Check if we're in the PulseFramework monorepo (development)
  const monorepoBin = path.resolve(__dirname, "..", "..", "..", "pulse-mcp", "dist", "index.js");
  if (await fileExists(monorepoBin)) {
    return monorepoBin;
  }

  // Not found - try to install
  // eslint-disable-next-line no-console
  console.log("\n⚠️  pulse-mcp not found. Attempting to install...\n");

  try {
    // Install from npm
    execSync("npm install -g pulse-framework-mcp", {
      encoding: "utf8",
      stdio: "inherit",
    });
    
    const newPath = execSync("which pulse-mcp", { encoding: "utf8" }).trim();
    // eslint-disable-next-line no-console
    console.log(`✅ pulse-mcp installed: ${newPath}\n`);
    return newPath;
  } catch (installError) {
    // eslint-disable-next-line no-console
    console.log("\n⚠️  Could not auto-install pulse-mcp.");
    // eslint-disable-next-line no-console
    console.log("   Please run manually:");
    // eslint-disable-next-line no-console
    console.log("   npm install -g pulse-framework-mcp");
    // eslint-disable-next-line no-console
    console.log("");
    throw new Error("pulse-mcp installation failed");
  }
}

/**
 * Detect if we're in a subdirectory of a Cursor workspace
 * Returns the workspace root if found, null otherwise
 */
async function detectCursorWorkspace(repoRoot: string): Promise<string | null> {
  let current = path.dirname(repoRoot);
  
  // Walk up the directory tree
  while (current !== "/" && current !== path.dirname(current)) {
    const cursorDir = path.join(current, ".cursor");
    if (await fileExists(cursorDir)) {
      return current;
    }
    current = path.dirname(current);
  }
  
  return null;
}

/**
 * Get the global Cursor MCP config path
 */
function getGlobalMcpConfigPath(): string {
  return path.join(os.homedir(), ".cursor", "mcp.json");
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize project for PULSE (.pulse/, Config, MCP, Cursor Rules)")
    .option("-p, --path <path>", "Target path (default: cwd)")
    .option("--hooks", "Install Git hooks (pre-commit, pre-push)")
    .option("--preset <name>", "Preset: frontend, backend, fullstack, monorepo, custom")
    .option("--mcp", "Install MCP + Cursor Rules")
    .option("--global", "Install MCP config globally (~/.cursor/mcp.json)")
    .option("--agents", "Create AGENTS.md (universal for all editors)")
    .option("--no-interactive", "No interactive prompts")
    .action(async (opts: { 
      path?: string; 
      hooks?: boolean; 
      preset?: string; 
      mcp?: boolean;
      global?: boolean;
      agents?: boolean;
      interactive?: boolean;
    }) => {
      const start = path.resolve(opts.path ?? process.cwd());
      let repoRoot = await findRepoRoot(start);
      
      if (!repoRoot) {
        // Not a git repo - offer to initialize
        console.log("⚠️  Not a git repository.\n");
        console.log("Pulse uses Git for checkpoints, commits, and safeguards.\n");
        console.log("💡 Tip: If you have multiple projects in subfolders,");
        console.log("   open the specific project folder, not the parent.\n");
        console.log("   Example: Open /projects/myapp (with .git inside)");
        console.log("   Not:     Open /projects (containing multiple repos)\n");
        
        const shouldInitGit = opts.interactive !== false 
          ? await promptConfirm("Initialize Git repository now?", true)
          : true; // Auto-init in non-interactive mode
          
        if (shouldInitGit) {
          const { execSync } = await import("child_process");
          try {
            execSync("git init", { cwd: start, stdio: "inherit" });
            console.log("✅ Git repository initialized\n");
            repoRoot = start;
          } catch {
            console.log("❌ Failed to initialize Git. Continuing without Git...\n");
            repoRoot = start; // Use start as fallback
          }
        } else {
          console.log("⚠️  Continuing without Git (limited functionality)\n");
          repoRoot = start;
        }
      }

      // eslint-disable-next-line no-console
      console.log("\n🎯 PULSE Init\n");

      await ensurePulseDirs(repoRoot);
      // eslint-disable-next-line no-console
      console.log(`✅ .pulse/ directory created`);

      // ════════════════════════════════════════════════════════════════════════
      // Preset Auswahl
      // ════════════════════════════════════════════════════════════════════════
      let preset: PresetName = "custom";
      
      if (opts.preset && getPresetNames().includes(opts.preset as PresetName)) {
        preset = opts.preset as PresetName;
      } else if (opts.interactive !== false) {
        // eslint-disable-next-line no-console
        console.log("\n📦 Choose a preset for your project:\n");
        
        const choices = [
          { value: "frontend", label: "🎨 Frontend - React/Vue/Angular (stricter limits)" },
          { value: "backend", label: "⚙️ Backend - API/Services (moderate limits)" },
          { value: "fullstack", label: "🔄 Fullstack - Frontend + Backend" },
          { value: "monorepo", label: "📦 Monorepo - Multiple packages (looser limits)" },
          { value: "custom", label: "⚙️ Custom - Standard settings" },
        ];
        
        preset = await promptSelect("Preset", choices, "fullstack") as PresetName;
      }

      // ════════════════════════════════════════════════════════════════════════
      // Create config
      // ════════════════════════════════════════════════════════════════════════
      const cfgPath = configFile(repoRoot);
      
      if (!(await fileExists(cfgPath))) {
        const presetConfig = PRESETS[preset];
        const config: PulseConfig = {
          ...DEFAULT_CONFIG,
          preset,
          thresholds: {
            warnMaxFilesChanged: presetConfig.warnMaxFilesChanged,
            warnMaxLinesChanged: presetConfig.warnMaxLinesChanged,
            warnMaxDeletions: presetConfig.warnMaxDeletions,
          },
          checkpointReminderMinutes: presetConfig.checkpointReminderMinutes,
        };
        
        await fs.writeFile(cfgPath, JSON.stringify(config, null, 2) + "\n", "utf8");
        // eslint-disable-next-line no-console
        console.log(`✅ Config created: ${cfgPath} (Preset: ${preset})`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`ℹ️ Config exists: ${cfgPath}`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // .cursorrules copy (Fallback without MCP)
      // ════════════════════════════════════════════════════════════════════════
      const cursorrulesDst = path.join(repoRoot, ".cursorrules");
      if (!(await fileExists(cursorrulesDst))) {
        const src = path.join(packageRoot(), "templates", ".cursorrules");
        try {
          if (await fileExists(src)) {
            await fs.copyFile(src, cursorrulesDst);
            // eslint-disable-next-line no-console
            console.log(`✅ .cursorrules created (Fallback rules)`);
          } else {
            // eslint-disable-next-line no-console
            console.log(`⚠️ .cursorrules template not found: ${src}`);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.log(`❌ Failed to create .cursorrules: ${errMsg}`);
          // eslint-disable-next-line no-console
          console.log(`   💡 Check write permissions for: ${repoRoot}`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`ℹ️ .cursorrules exists`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // MCP + Cursor Rules (interactive or via flag)
      // ════════════════════════════════════════════════════════════════════════
      let installMcp = opts.mcp === true || opts.global === true;
      const useGlobalMcp = opts.global === true;
      
      if (!installMcp && opts.interactive !== false) {
        // eslint-disable-next-line no-console
        console.log("");
        installMcp = await promptConfirm("Install MCP + Cursor Rules? (recommended for Cursor IDE)", true);
      }

      if (installMcp) {
        await installCursorIntegration(repoRoot, useGlobalMcp);
      }

      // ════════════════════════════════════════════════════════════════════════
      // AGENTS.md (Universal for other editors)
      // ════════════════════════════════════════════════════════════════════════
      let installAgents = opts.agents === true;
      
      if (!installAgents && !installMcp && opts.interactive !== false) {
        // eslint-disable-next-line no-console
        console.log("");
        installAgents = await promptConfirm(
          "Create AGENTS.md? (universal for Windsurf, Copilot, etc.)", 
          true
        );
      }

      if (installAgents) {
        await installAgentsMd(repoRoot);
      }

      // ════════════════════════════════════════════════════════════════════════
      // Role Templates kopieren
      // ════════════════════════════════════════════════════════════════════════
      const rolesSrcDir = path.join(packageRoot(), "templates", "roles");
      const rolesDstDir = path.join(repoRoot, ".pulse", "templates", "roles");
      if (await fileExists(rolesSrcDir)) {
        await fs.mkdir(rolesDstDir, { recursive: true });
        const roleFiles = await fs.readdir(rolesSrcDir);
        for (const f of roleFiles) {
          if (!f.endsWith(".cursorrules")) continue;
          await fs.copyFile(path.join(rolesSrcDir, f), path.join(rolesDstDir, f));
        }
        // eslint-disable-next-line no-console
        console.log(`✅ Role templates copied`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // Git Hooks
      // ════════════════════════════════════════════════════════════════════════
      if (opts.hooks) {
        await installHooks(repoRoot);
        // eslint-disable-next-line no-console
        console.log(`✅ Git hooks installed`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // Summary
      // ════════════════════════════════════════════════════════════════════════
      // eslint-disable-next-line no-console
      console.log(`\n${"─".repeat(50)}`);
      // eslint-disable-next-line no-console
      console.log(`\n✨ PULSE initialized!\n`);
      // eslint-disable-next-line no-console
      console.log(`Preset: ${preset}`);
      // eslint-disable-next-line no-console
      console.log(`Max Lines: ${PRESETS[preset].warnMaxLinesChanged}`);
      // eslint-disable-next-line no-console
      console.log(`Checkpoint: ${PRESETS[preset].checkpointReminderMinutes} min`);
      // eslint-disable-next-line no-console
      console.log(`MCP: ${installMcp ? "✅ Installed" : "❌ Not installed"}`);
      // eslint-disable-next-line no-console
      console.log(`AGENTS.md: ${installAgents ? "✅ Created" : "❌ Not created"}\n`);

      if (installMcp) {
        // eslint-disable-next-line no-console
        console.log(`📋 Next steps for MCP:`);
        // eslint-disable-next-line no-console
        console.log(`   1. Restart Cursor (MCP loads automatically)`);
        // eslint-disable-next-line no-console
        console.log(`   2. In Cursor: Settings > Features > Enable MCP`);
        // eslint-disable-next-line no-console
        console.log(`   3. Test: pulse status\n`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`Next steps:`);
        // eslint-disable-next-line no-console
        console.log(`  1. pulse status      - Check current state`);
        // eslint-disable-next-line no-console
        console.log(`  2. pulse run         - Start workflow`);
        // eslint-disable-next-line no-console
        console.log(`  3. pulse s           - Create single prompt\n`);
      }
    });
}

/**
 * Install Cursor MCP integration
 * Creates .cursor/rules/pulse.mdc and .cursor/mcp.json (or global ~/.cursor/mcp.json)
 */
async function installCursorIntegration(repoRoot: string, useGlobal: boolean): Promise<void> {
  // ────────────────────────────────────────────────────────────────────────────
  // 0. Workspace Detection - check if Git root differs from Cursor workspace
  // ────────────────────────────────────────────────────────────────────────────
  const workspaceRoot = await detectCursorWorkspace(repoRoot);
  const installLocations = [repoRoot];
  
  if (workspaceRoot && workspaceRoot !== repoRoot) {
    // eslint-disable-next-line no-console
    console.log(`\n⚠️  Workspace mismatch detected:`);
    // eslint-disable-next-line no-console
    console.log(`   Git root:        ${repoRoot}`);
    // eslint-disable-next-line no-console
    console.log(`   Cursor workspace: ${workspaceRoot}`);
    // eslint-disable-next-line no-console
    console.log(`   → Installing rules in BOTH locations\n`);
    installLocations.push(workspaceRoot);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Install Cursor Rules in all locations
  // ────────────────────────────────────────────────────────────────────────────
  for (const location of installLocations) {
    const cursorDir = path.join(location, ".cursor");
    const rulesDir = path.join(cursorDir, "rules");
    await fs.mkdir(rulesDir, { recursive: true });
    
    const rulesDst = path.join(rulesDir, "pulse.mdc");
    const rulesSrc = path.join(packageRoot(), "templates", "cursor", "pulse.mdc");
    
    if (await fileExists(rulesSrc)) {
      await fs.copyFile(rulesSrc, rulesDst);
    } else {
      await fs.writeFile(rulesDst, generatePulseRules(), "utf8");
    }
    
    const relPath = path.relative(process.cwd(), rulesDst);
    // eslint-disable-next-line no-console
    console.log(`✅ Cursor rules: ${relPath}`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. MCP Config with absolute paths
  // ────────────────────────────────────────────────────────────────────────────
  let nodePath: string;
  let pulseMcpPath: string;
  
  try {
    nodePath = getNodePath();
    pulseMcpPath = await ensurePulseMcpInstalled();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`\n❌ MCP setup failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  // Determine MCP config location
  const mcpDst = useGlobal 
    ? getGlobalMcpConfigPath()
    : path.join(repoRoot, ".cursor", "mcp.json");
  
  // Ensure directory exists
  await fs.mkdir(path.dirname(mcpDst), { recursive: true });

  // Check if we need a wrapper script (for workspace mismatch)
  let mcpCommand = nodePath;
  let mcpArgs = [pulseMcpPath];
  
  if (!useGlobal && workspaceRoot && workspaceRoot !== repoRoot) {
    // Create wrapper script that changes to the correct directory
    const wrapperPath = path.join(repoRoot, ".pulse", "run-mcp.sh");
    
    // Determine how to execute pulse-mcp:
    // - If it's a .js file, use node to run it
    // - If it's an executable (from npm global bin), run it directly
    const isJsFile = pulseMcpPath.endsWith(".js");
    const execCommand = isJsFile 
      ? `exec "${nodePath}" "${pulseMcpPath}"`
      : `exec "${pulseMcpPath}"`;
    
    const wrapperContent = `#!/bin/bash
# PULSE MCP Wrapper - ensures correct working directory
cd "${repoRoot}"
${execCommand}
`;
    await fs.writeFile(wrapperPath, wrapperContent, "utf8");
    await fs.chmod(wrapperPath, 0o755);
    
    mcpCommand = wrapperPath;
    mcpArgs = [];
    
    // eslint-disable-next-line no-console
    console.log(`✅ Wrapper script: .pulse/run-mcp.sh (fixes workspace mismatch)`);
  }

  // Build MCP config
  const mcpConfig: Record<string, unknown> = {
    mcpServers: {
      pulse: {
        command: mcpCommand,
        args: mcpArgs,
        env: {
          PULSE_PROJECT_ROOT: repoRoot,
        },
      },
    },
  };

  // Merge with existing config if present
  if (await fileExists(mcpDst)) {
    try {
      const existing = JSON.parse(await fs.readFile(mcpDst, "utf8")) as Record<string, unknown>;
      if (existing.mcpServers && typeof existing.mcpServers === "object") {
        mcpConfig.mcpServers = {
          ...existing.mcpServers as Record<string, unknown>,
          pulse: (mcpConfig.mcpServers as Record<string, unknown>).pulse,
        };
      }
    } catch {
      // Ignore parse errors, overwrite
    }
  }

  await fs.writeFile(mcpDst, JSON.stringify(mcpConfig, null, 2) + "\n", "utf8");
  
  const mcpLocation = useGlobal ? "~/.cursor/mcp.json (global)" : ".cursor/mcp.json (local)";
  // eslint-disable-next-line no-console
  console.log(`✅ MCP config: ${mcpLocation}`);

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Post-Init Validation
  // ────────────────────────────────────────────────────────────────────────────
  await validateMcpSetup(nodePath, pulseMcpPath, mcpDst);
}

/**
 * Validate MCP setup after installation
 */
async function validateMcpSetup(nodePath: string, pulseMcpPath: string, mcpConfigPath: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n🔍 Validating MCP setup...\n`);
  
  let allOk = true;

  // Check 1: Node executable
  try {
    execSync(`"${nodePath}" --version`, { encoding: "utf8" });
    // eslint-disable-next-line no-console
    console.log(`   ✅ Node: ${nodePath}`);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`   ❌ Node not executable: ${nodePath}`);
    allOk = false;
  }

  // Check 2: pulse-mcp executable
  if (await fileExists(pulseMcpPath)) {
    // eslint-disable-next-line no-console
    console.log(`   ✅ pulse-mcp: ${pulseMcpPath}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`   ❌ pulse-mcp not found: ${pulseMcpPath}`);
    allOk = false;
  }

  // Check 3: MCP config exists
  if (await fileExists(mcpConfigPath)) {
    // eslint-disable-next-line no-console
    console.log(`   ✅ MCP config: ${mcpConfigPath}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`   ❌ MCP config missing: ${mcpConfigPath}`);
    allOk = false;
  }

  if (allOk) {
    // eslint-disable-next-line no-console
    console.log(`\n   ✨ All checks passed!`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`\n   ⚠️  Some checks failed. See above for details.`);
  }
}

/**
 * Generate pulse.mdc rules content (fallback if template not found)
 */
function generatePulseRules(): string {
  return `---
description: PULSE Framework - Automated safeguards for every message
globs: *
alwaysApply: true
---

# PULSE Framework Safeguards

## MANDATORY: Before every answer

**Before you answer, run the following MCP tools:**

1. **\`pulse_status\`**
   - Shows: Profile, time since checkpoint, changes, findings
   - If >15 min since checkpoint → Recommend checkpoint

2. **\`pulse_doctor\`** (if you changed code)
   - Checks: Secrets, deletes, scope, loop signals
   - Critical findings → STOP

## Safeguards (non-negotiable)

- ⏱️ **MAX 30 min autonomous** - Then STOP + ask user
- 🗑️ **NO DELETE** without explicit confirmation
- 📤 **NO GIT PUSH** without confirmation
- 🔐 **NO Secrets** in code
- 📋 **Git commit every 5-10 min** via \`pulse_checkpoint\`

## In case of problems

If you get stuck after 2-3 attempts:
1. **STOP** - No further changes
2. **\`pulse_escalate\`**
3. Wait for user instruction

## MCP Tools

| Tool | When |
|------|------|
| \`pulse_status\` | BEFORE EVERY ANSWER |
| \`pulse_checkpoint\` | After changes (5-10 min) |
| \`pulse_doctor\` | Before commits |
| \`pulse_escalate\` | When stuck |
`;
}

/**
 * Install AGENTS.md (universal format for all AI editors)
 */
async function installAgentsMd(repoRoot: string): Promise<void> {
  const agentsDst = path.join(repoRoot, "AGENTS.md");
  const agentsSrc = path.join(packageRoot(), "templates", "AGENTS.md");
  
  if (await fileExists(agentsDst)) {
    // eslint-disable-next-line no-console
    console.log(`ℹ️ AGENTS.md already exists`);
    return;
  }

  try {
    if (await fileExists(agentsSrc)) {
      await fs.copyFile(agentsSrc, agentsDst);
    } else {
      // Fallback: Minimal inline version
      const content = `# AI Agent Instructions

> Universal agent configuration for PULSE Framework.

## Critical Safeguards

1. 🗑️ **DELETE Guard** - Never delete without confirmation
2. 📤 **PUSH Guard** - Never push without confirmation  
3. 🔐 **SECRETS Guard** - Never commit secrets
4. ⏱️ **30-Min Rule** - Stop after 30 min autonomous work

## Commands

| Command | When |
|---------|------|
| \`pulse status\` | Check state before work |
| \`pulse checkpoint\` | After changes (5-10 min) |
| \`pulse doctor\` | Before commits |
| \`pulse escalate\` | When stuck |
| \`pulse reset\` | To go back |

*Generated by PULSE Framework*
`;
      await fs.writeFile(agentsDst, content, "utf8");
    }
    
    // eslint-disable-next-line no-console
    console.log(`✅ AGENTS.md created (universal for all AI editors)`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.log(`❌ Failed to create AGENTS.md: ${errMsg}`);
    
    // Provide helpful hints based on error type
    if (errMsg.includes("EACCES") || errMsg.includes("permission")) {
      // eslint-disable-next-line no-console
      console.log(`   💡 Permission denied. Try: sudo pulse init --agents`);
    } else if (errMsg.includes("ENOENT")) {
      // eslint-disable-next-line no-console
      console.log(`   💡 Directory not found. Make sure you're in your project root.`);
    } else if (errMsg.includes("ENOSPC")) {
      // eslint-disable-next-line no-console
      console.log(`   💡 No space left on disk.`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`   💡 Check write permissions for: ${repoRoot}`);
    }
  }
}
