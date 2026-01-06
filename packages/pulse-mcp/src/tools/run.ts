import { exec } from "child_process";
import { promisify } from "util";
import { chainResponse } from "../lib/chaining.js";

const execAsync = promisify(exec);

export function registerRunTool() {
  return {
    name: "pulse_run",
    description: `Startet einen PULSE Workflow: Erstellt Branch + gibt Arbeitsauftrag.

WICHTIG: 
- Erstellt automatisch Feature-Branch (wenn auf main/master)
- Nach diesem Tool DIREKT mit Implementierung beginnen!

WANN NUTZEN:
- User sagt "neue Aufgabe", "starte Feature", "beginne mit..."
- Am Anfang einer Coding-Session

NACH AUFRUF:
- Feature-Branch wird erstellt
- Du erhältst den Arbeitsauftrag
- BEGINNE SOFORT mit der Implementierung`,
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
  const action = args.action ?? "Neue Aufgabe";
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
      });
      status = JSON.parse(statusResult.stdout);
    } catch {
      // Ignore status errors
    }
    
    // 2. Branch erstellen wenn auf main/master
    let branchInfo = "";
    let currentBranch = "";
    
    try {
      const branchResult = await execAsync("git rev-parse --abbrev-ref HEAD", {
        timeout: 5000,
      });
      currentBranch = branchResult.stdout.trim();
      
      const protectedBranches = ["main", "master", "develop", "development"];
      
      if (protectedBranches.includes(currentBranch.toLowerCase())) {
        // Generiere Branch-Namen aus Action oder nutze übergebenen Namen
        const branchName = args.branch ?? generateBranchName(action, template);
        
        try {
          await execAsync(`git checkout -b ${branchName}`, { timeout: 5000 });
          branchInfo = `✅ Branch erstellt: \`${branchName}\``;
          currentBranch = branchName;
        } catch {
          branchInfo = `⚠️ Branch konnte nicht erstellt werden (evtl. existiert er bereits)`;
        }
      } else {
        branchInfo = `📍 Auf Branch: \`${currentBranch}\``;
      }
    } catch {
      branchInfo = "⚠️ Git-Status konnte nicht geprüft werden";
    }
    
    // 3. Worklog speichern (im Hintergrund, nicht blockierend)
    const safeAction = action
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
    
    // Speichere Worklog für später, aber warte nicht darauf
    execAsync(
      `pulse start --template ${template} --action "${safeAction}" --quick`,
      { timeout: 15000 }
    ).catch(() => {
      // Ignore errors - worklog ist nice-to-have
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

Du bist der Agent. Beginne DIREKT mit der Implementierung.
NICHT "Prompt kopieren" - DU arbeitest jetzt.

## Deine Aufgabe

Implementiere: **${action}**

Template: ${template}
Profil: ${profile}
Branch: ${currentBranch}

## Während der Arbeit

- ⏱️ **Checkpoint alle ${checkpointInterval} Min:** \`pulse_checkpoint\` aufrufen
- 🔍 **Nach Code-Änderungen:** \`pulse_doctor\` aufrufen
- ❌ **Bei Problemen nach 2-3 Versuchen:** \`pulse_escalate\`

## Safeguards (IMMER beachten)

- 🗑️ **KEIN DELETE** ohne User-Bestätigung
- 📤 **KEIN PUSH** ohne User-Bestätigung
- 🔐 **Keine Secrets** im Code
- ⏱️ **Max 30 Min** autonom, dann STOP

---

**BEGINNE JETZT MIT DER IMPLEMENTIERUNG.**
`;

    return chainResponse({
      result: output.trim(),
      next_action: `JETZT IMPLEMENTIEREN: "${action}"`,
      safeguards_active: true,
      recommendation: `Beginne sofort. Checkpoint in ${checkpointInterval} Min.`,
    });
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    
    return chainResponse({
      result: `❌ Fehler: ${errMsg}\n\nTrotzdem anfangen mit: ${action}`,
      next_action: `Implementiere: "${action}"`,
      safeguards_active: true,
      recommendation: "Starte trotzdem mit der Aufgabe",
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
