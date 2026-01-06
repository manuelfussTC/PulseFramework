import fs from "node:fs/promises";
import path from "node:path";
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

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Projekt für PULSE initialisieren (.pulse/, Config, MCP, Cursor Rules)")
    .option("-p, --path <path>", "Zielpfad (default: cwd)")
    .option("--hooks", "Git-Hooks installieren (pre-commit, pre-push)")
    .option("--preset <name>", "Preset: frontend, backend, fullstack, monorepo, custom")
    .option("--mcp", "MCP + Cursor Rules installieren")
    .option("--agents", "AGENTS.md erstellen (universal für alle Editoren)")
    .option("--no-interactive", "Keine interaktive Abfrage")
    .action(async (opts: { 
      path?: string; 
      hooks?: boolean; 
      preset?: string; 
      mcp?: boolean;
      agents?: boolean;
      interactive?: boolean;
    }) => {
      const start = path.resolve(opts.path ?? process.cwd());
      const repoRoot = await findRepoRoot(start);
      if (!repoRoot) {
        throw new Error(`Nicht in einem Git-Repository: ${start}`);
      }

      // eslint-disable-next-line no-console
      console.log("\n🎯 PULSE Init\n");

      await ensurePulseDirs(repoRoot);
      // eslint-disable-next-line no-console
      console.log(`✅ .pulse/ Verzeichnis erstellt`);

      // ════════════════════════════════════════════════════════════════════════
      // Preset Auswahl
      // ════════════════════════════════════════════════════════════════════════
      let preset: PresetName = "custom";
      
      if (opts.preset && getPresetNames().includes(opts.preset as PresetName)) {
        preset = opts.preset as PresetName;
      } else if (opts.interactive !== false) {
        // eslint-disable-next-line no-console
        console.log("\n📦 Wähle ein Preset für dein Projekt:\n");
        
        const choices = [
          { value: "frontend", label: "🎨 Frontend - React/Vue/Angular (strengere Limits)" },
          { value: "backend", label: "⚙️ Backend - API/Services (moderate Limits)" },
          { value: "fullstack", label: "🔄 Fullstack - Frontend + Backend" },
          { value: "monorepo", label: "📦 Monorepo - Mehrere Packages (lockere Limits)" },
          { value: "custom", label: "⚙️ Custom - Standard-Einstellungen" },
        ];
        
        preset = await promptSelect("Preset", choices, "fullstack") as PresetName;
      }

      // ════════════════════════════════════════════════════════════════════════
      // Config erstellen
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
        console.log(`✅ Config erstellt: ${cfgPath} (Preset: ${preset})`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`ℹ️ Config existiert: ${cfgPath}`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // .cursorrules kopieren (Fallback ohne MCP)
      // ════════════════════════════════════════════════════════════════════════
      const cursorrulesDst = path.join(repoRoot, ".cursorrules");
      if (!(await fileExists(cursorrulesDst))) {
        const src = path.join(packageRoot(), "templates", ".cursorrules");
        if (await fileExists(src)) {
          await fs.copyFile(src, cursorrulesDst);
          // eslint-disable-next-line no-console
          console.log(`✅ .cursorrules erstellt (Fallback-Regeln)`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`⚠️ .cursorrules Template nicht gefunden: ${src}`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`ℹ️ .cursorrules existiert`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // MCP + Cursor Rules (interaktiv oder per Flag)
      // ════════════════════════════════════════════════════════════════════════
      let installMcp = opts.mcp === true;
      
      if (!installMcp && opts.interactive !== false) {
        // eslint-disable-next-line no-console
        console.log("");
        installMcp = await promptConfirm("MCP + Cursor Rules installieren? (empfohlen für Cursor IDE)", true);
      }

      if (installMcp) {
        await installCursorIntegration(repoRoot);
      }

      // ════════════════════════════════════════════════════════════════════════
      // AGENTS.md (Universal für andere Editoren)
      // ════════════════════════════════════════════════════════════════════════
      let installAgents = opts.agents === true;
      
      if (!installAgents && !installMcp && opts.interactive !== false) {
        // eslint-disable-next-line no-console
        console.log("");
        installAgents = await promptConfirm(
          "AGENTS.md erstellen? (universal für Windsurf, Copilot, etc.)", 
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
        console.log(`✅ Role-Templates kopiert`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // Git Hooks
      // ════════════════════════════════════════════════════════════════════════
      if (opts.hooks) {
        await installHooks(repoRoot);
        // eslint-disable-next-line no-console
        console.log(`✅ Git-Hooks installiert`);
      }

      // ════════════════════════════════════════════════════════════════════════
      // Summary
      // ════════════════════════════════════════════════════════════════════════
      // eslint-disable-next-line no-console
      console.log(`\n${"─".repeat(50)}`);
      // eslint-disable-next-line no-console
      console.log(`\n✨ PULSE initialisiert!\n`);
      // eslint-disable-next-line no-console
      console.log(`Preset: ${preset}`);
      // eslint-disable-next-line no-console
      console.log(`Max Lines: ${PRESETS[preset].warnMaxLinesChanged}`);
      // eslint-disable-next-line no-console
      console.log(`Checkpoint: ${PRESETS[preset].checkpointReminderMinutes} Min`);
      // eslint-disable-next-line no-console
      console.log(`MCP: ${installMcp ? "✅ Installiert" : "❌ Nicht installiert"}`);
      // eslint-disable-next-line no-console
      console.log(`AGENTS.md: ${installAgents ? "✅ Erstellt" : "❌ Nicht erstellt"}\n`);

      if (installMcp) {
        // eslint-disable-next-line no-console
        console.log(`📋 Nächste Schritte für MCP:`);
        // eslint-disable-next-line no-console
        console.log(`   1. Cursor neu starten (MCP wird automatisch geladen)`);
        // eslint-disable-next-line no-console
        console.log(`   2. In Cursor: Settings > Features > MCP aktivieren`);
        // eslint-disable-next-line no-console
        console.log(`   3. Testen: pulse status\n`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`Nächste Schritte:`);
        // eslint-disable-next-line no-console
        console.log(`  1. pulse status      - Aktuellen Stand prüfen`);
        // eslint-disable-next-line no-console
        console.log(`  2. pulse run         - Workflow starten`);
        // eslint-disable-next-line no-console
        console.log(`  3. pulse s           - Einzelnen Prompt erstellen\n`);
      }
    });
}

/**
 * Install Cursor MCP integration
 * Creates .cursor/rules/pulse.mdc and .cursor/mcp.json
 */
async function installCursorIntegration(repoRoot: string): Promise<void> {
  const cursorDir = path.join(repoRoot, ".cursor");
  const rulesDir = path.join(cursorDir, "rules");
  
  // Create directories
  await fs.mkdir(rulesDir, { recursive: true });
  
  // ────────────────────────────────────────────────────────────────────────────
  // 1. Cursor Rules (.cursor/rules/pulse.mdc)
  // ────────────────────────────────────────────────────────────────────────────
  const rulesDst = path.join(rulesDir, "pulse.mdc");
  const rulesSrc = path.join(packageRoot(), "templates", "cursor", "pulse.mdc");
  
  if (await fileExists(rulesSrc)) {
    await fs.copyFile(rulesSrc, rulesDst);
    // eslint-disable-next-line no-console
    console.log(`✅ Cursor Rules erstellt: .cursor/rules/pulse.mdc (alwaysApply: true)`);
  } else {
    // Fallback: Create inline
    const rulesContent = `---
description: PULSE Framework - Automatische Safeguards bei jeder Nachricht
globs: *
alwaysApply: true
---

# PULSE Framework Safeguards

## PFLICHT: Vor jeder Antwort

**Bevor du antwortest, führe folgende MCP-Tools aus:**

1. **\`pulse_status\`** aufrufen
   - Zeigt: Profil, Zeit seit Checkpoint, Änderungen, Findings
   - Wenn >15 Min seit Checkpoint → Checkpoint empfehlen

2. **\`pulse_doctor\`** aufrufen wenn du Code änderst
   - Prüft: Secrets, Deletes, Scope, Loop-Signale
   - Bei Critical Findings → STOP

## Safeguards (non-negotiable)

- ⏱️ **MAX 30 Min autonom** - Danach STOP + Rückfrage
- 🗑️ **KEIN DELETE** ohne explizite Bestätigung
- 📤 **KEIN GIT PUSH** ohne Confirmation
- 🔐 **KEINE Secrets** im Code
- 📋 **Git-Commit alle 5-10 Min** via \`pulse_checkpoint\`

## Bei Problemen

Wenn du nach 2-3 Versuchen nicht weiterkommst:
1. **STOP** - Keine weiteren Änderungen
2. **\`pulse_escalate\`** aufrufen
3. Warte auf User-Instruktion

## MCP-Tools

| Tool | Wann |
|------|------|
| \`pulse_status\` | VOR JEDER ANTWORT |
| \`pulse_checkpoint\` | Nach Änderungen (5-10 Min) |
| \`pulse_doctor\` | Vor Commits |
| \`pulse_escalate\` | Bei Problemen |
`;
    await fs.writeFile(rulesDst, rulesContent, "utf8");
    // eslint-disable-next-line no-console
    console.log(`✅ Cursor Rules erstellt: .cursor/rules/pulse.mdc`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. MCP Config (.cursor/mcp.json)
  // ────────────────────────────────────────────────────────────────────────────
  const mcpDst = path.join(cursorDir, "mcp.json");
  const mcpSrc = path.join(packageRoot(), "templates", "cursor", "mcp.json");
  
  if (!(await fileExists(mcpDst))) {
    if (await fileExists(mcpSrc)) {
      await fs.copyFile(mcpSrc, mcpDst);
    } else {
      // Fallback: Create inline
      const mcpConfig = {
        mcpServers: {
          pulse: {
            command: "npx",
            args: ["@pulseframework/pulse-mcp"],
            env: {},
          },
        },
      };
      await fs.writeFile(mcpDst, JSON.stringify(mcpConfig, null, 2) + "\n", "utf8");
    }
    // eslint-disable-next-line no-console
    console.log(`✅ MCP Config erstellt: .cursor/mcp.json`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`ℹ️ MCP Config existiert: .cursor/mcp.json`);
  }
}

/**
 * Install AGENTS.md (universal format for all AI editors)
 */
async function installAgentsMd(repoRoot: string): Promise<void> {
  const agentsDst = path.join(repoRoot, "AGENTS.md");
  const agentsSrc = path.join(packageRoot(), "templates", "AGENTS.md");
  
  if (await fileExists(agentsDst)) {
    // eslint-disable-next-line no-console
    console.log(`ℹ️ AGENTS.md existiert bereits`);
    return;
  }
  
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
  console.log(`✅ AGENTS.md erstellt (universal für alle AI-Editoren)`);
}
