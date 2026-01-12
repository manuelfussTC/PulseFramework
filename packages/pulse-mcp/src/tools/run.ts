import { exec } from "child_process";
import { promisify } from "util";
import { chainResponse } from "../lib/chaining.js";
import { getProjectRoot } from "../lib/cli.js";

const execAsync = promisify(exec);

export function registerRunTool() {
  return {
    name: "pulse_run",
    description: `Starts a PULSE workflow: Creates branch + gives work order.

WICHTIG: 
- Auto-creates feature branch (if on main/master)
- After this tool, START implementation IMMEDIATELY!

WANN NUTZEN:
- User says "new task", "start feature", "begin with..."
- Am Anfang einer Coding-Session

NACH AUFRUF:
- Feature-Branch wird erstellt
- Du erhältst den Arbeitsauftrag
- START IMMEDIATELY with implementation`,
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          description: "Was soll gemacht werden? (z.B. 'User-Dashboard implementieren')",
        },
        template: {
          type: "string",
          enum: ["feature", "bugfix", "refactor", "concept", "analyze"],
          description: "Vorlage (default: feature)",
        },
        branch: {
          type: "string",
          description: "Branch-Name (optional, wird automatisch generiert)",
        },
      },
      required: ["action"],
    },
  };
}

export async function handleRunTool(args: { 
  action?: string; 
  template?: string;
  branch?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Get project root at call time (not module load time)
  const cwd = getProjectRoot();
  
  const action = args.action ?? "New task";
  const template = args.template ?? "feature";
  
  try {
    // 1. Status holen
    let status: {
      profile?: string;
      preset?: string;
      minutesSinceCheckpoint?: number;
      checkpointReminderMinutes?: number;
    } = {};
    
    try {
      const statusResult = await execAsync("pulse status --json", {
        timeout: 10000,
        cwd,
      });
      status = JSON.parse(statusResult.stdout);
    } catch {
      // Ignore status errors
    }
    
    // 2. Create branch if on main/master
    let branchInfo = "";
    let currentBranch = "";
    
    try {
      const branchResult = await execAsync("git rev-parse --abbrev-ref HEAD", {
        timeout: 5000,
        cwd,
      });
      currentBranch = branchResult.stdout.trim();
      
      const protectedBranches = ["main", "master", "develop", "development"];
      
      if (protectedBranches.includes(currentBranch.toLowerCase())) {
        // Generate branch name from action or use provided name
        const branchName = args.branch ?? generateBranchName(action, template);
        
        try {
          await execAsync(`git checkout -b ${branchName}`, { timeout: 5000, cwd });
          branchInfo = `✅ Branch erstellt: \`${branchName}\``;
          currentBranch = branchName;
        } catch {
          branchInfo = `⚠️ Branch could not be created (may already exist)`;
        }
      } else {
        branchInfo = `📍 Auf Branch: \`${currentBranch}\``;
      }
    } catch {
      branchInfo = "⚠️ Git status could not be checked";
    }
    
    // 3. Save worklog (in background, non-blocking)
    const safeAction = action
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
    
    // Save worklog for later, but don't wait for it
    execAsync(
      `pulse start --template ${template} --action "${safeAction}" --quick`,
      { timeout: 15000, cwd }
    ).catch(() => {
      // Ignore errors - worklog is nice-to-have
    });
    
    // 4. Response: DIREKTE ARBEITSANWEISUNG
    const profile = status.preset 
      ? `${status.preset}/${status.profile ?? "build"}` 
      : (status.profile ?? "build");
    
    const checkpointInterval = status.checkpointReminderMinutes ?? 15;
    
    const output = `
# 🚀 ARBEITSAUFTRAG

${branchInfo}

**ACTION:** ${action}

## JETZT SOFORT ANFANGEN

You are the agent. Start DIRECTLY with implementation.
NICHT "Prompt kopieren" - DU arbeitest jetzt.

## Deine Aufgabe

Implementiere: **${action}**

Template: ${template}
Profile: ${profile}
Branch: ${currentBranch}

## Während der Arbeit

- ⏱️ **Checkpoint every ${checkpointInterval} min:** call \`pulse_checkpoint\`
- 🔍 **Nach Code-Änderungen:** \`pulse_doctor\` aufrufen
- ❌ **Bei Problemen nach 2-3 Versuchen:** \`pulse_escalate\`

## Safeguards (IMMER beachten)

- 🗑️ **KEIN DELETE** ohne User-Bestätigung
- 📤 **KEIN PUSH** ohne User-Bestätigung
- 🔐 **No Secrets** in code
- ⏱️ **Max 30 Min** autonom, dann STOP

---

**BEGINNE JETZT MIT DER IMPLEMENTIERUNG.**
`;

    return chainResponse({
      result: output.trim(),
      next_action: `JETZT IMPLEMENTIEREN: "${action}"`,
      safeguards_active: true,
      recommendation: `Start immediately. Checkpoint in ${checkpointInterval} min.`,
    });
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    
    return chainResponse({
      result: `❌ Error: ${errMsg}\n\nStart anyway with: ${action}`,
      next_action: `Implementiere: "${action}"`,
      safeguards_active: true,
      recommendation: "Start with the task anyway",
    });
  }
}

/**
 * Generate a branch name from action text
 * "User Dashboard implementieren" → "feature/user-dashboard"
 */
function generateBranchName(action: string, template: string): string {
  const prefix = template === "bugfix" ? "fix" : 
                 template === "refactor" ? "refactor" : "feature";
  
  // Normalisiere: lowercase, entferne Sonderzeichen, ersetze Leerzeichen
  const slug = action
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] ?? c)
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 40) // Max 40 Zeichen
    .replace(/-+$/, ""); // Trailing dashes entfernen
  
  return `${prefix}/${slug}`;
}