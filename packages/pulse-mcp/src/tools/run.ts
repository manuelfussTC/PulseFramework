import { exec } from "child_process";
import { promisify } from "util";
import { chainResponse } from "../lib/chaining.js";

const execAsync = promisify(exec);

export function registerRunTool() {
  return {
    name: "pulse_run",
    description: `Startet einen PULSE Workflow und gibt dir den Arbeitsauftrag.

WICHTIG: Nach diesem Tool sollst du DIREKT mit der Implementierung beginnen!
Nicht "Prompt kopieren" - DU bist der Agent, DU arbeitest jetzt.

WANN NUTZEN:
- User sagt "neue Aufgabe", "starte Feature", "beginne mit..."
- Am Anfang einer Coding-Session

NACH AUFRUF:
- Du erhältst den Arbeitsauftrag
- BEGINNE SOFORT mit der Implementierung
- Checkpoint alle 5-10 Min`,
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
      },
      required: ["action"],
    },
  };
}

export async function handleRunTool(args: { 
  action?: string; 
  template?: string;
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
    
    // 2. Worklog speichern (im Hintergrund, nicht blockierend)
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
    
    // 3. Response: DIREKTE ARBEITSANWEISUNG
    const profile = status.preset 
      ? `${status.preset}/${status.profile ?? "build"}` 
      : (status.profile ?? "build");
    
    const checkpointInterval = status.checkpointReminderMinutes ?? 15;
    
    const output = `
# 🚀 ARBEITSAUFTRAG

**ACTION:** ${action}

## JETZT SOFORT ANFANGEN

Du bist der Agent. Beginne DIREKT mit der Implementierung.
NICHT "Prompt kopieren" - DU arbeitest jetzt.

## Deine Aufgabe

Implementiere: **${action}**

Template: ${template}
Profil: ${profile}

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
