import { exec } from "child_process";
import { promisify } from "util";
import { chainResponse } from "../lib/chaining.js";

const execAsync = promisify(exec);

export function registerRunTool() {
  return {
    name: "pulse_run",
    description: `Startet einen PULSE Workflow: Erstellt Prompt + gibt Empfehlungen.
    
WANN NUTZEN:
- User sagt "neue Aufgabe", "starte Feature", "beginne mit..."
- Am Anfang einer Coding-Session

PARAMETER:
- action: Was soll gemacht werden (required)
- template: feature, bugfix, refactor, concept (optional, default: feature)

NACH AUFRUF:
- Prompt wird generiert
- Empfehlung für nächsten Schritt
- Reminder für Checkpoints`,
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
    const statusResult = await execAsync("pulse status --json", {
      timeout: 10000,
    });
    
    let status: {
      profile?: string;
      preset?: string;
      minutesSinceCheckpoint?: number;
      checkpointReminderMinutes?: number;
    } = {};
    
    try {
      status = JSON.parse(statusResult.stdout);
    } catch {
      // Ignore parse errors
    }
    
    // 2. Prompt generieren (quick mode)
    const startResult = await execAsync(
      `pulse start --template ${template} --action "${action.replace(/"/g, '\\"')}" --quick`,
      { timeout: 15000 }
    );
    
    // 3. Response zusammenbauen
    const profile = status.preset 
      ? `${status.preset}/${status.profile ?? "build"}` 
      : (status.profile ?? "build");
    
    const checkpointInterval = status.checkpointReminderMinutes ?? 15;
    
    const output = `
# 🚀 PULSE Run gestartet

## Workflow
- **Profil:** ${profile}
- **Template:** ${template}
- **ACTION:** ${action}

## Prompt erstellt
${startResult.stdout.includes("Gespeichert") ? "✅ Prompt wurde gespeichert" : ""}

## Nächste Schritte

1. **Jetzt:** Implementiere die Aufgabe
2. **Alle ${checkpointInterval} Min:** \`pulse_checkpoint\` aufrufen
3. **Bei Problemen:** \`pulse_escalate\` aufrufen
4. **Am Ende:** \`pulse_review\` aufrufen

## Safeguards aktiv
- ⏱️ Max 30 Min autonom
- 🗑️ Kein DELETE ohne Bestätigung
- 📤 Kein PUSH ohne Bestätigung
- 🔐 Keine Secrets im Code
`;

    return chainResponse({
      result: output.trim(),
      next_action: `Implementiere: "${action}". Checkpoint in ${checkpointInterval} Min.`,
      safeguards_active: true,
      recommendation: `Nach Änderungen: pulse_checkpoint aufrufen`,
    });
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    
    return chainResponse({
      result: `❌ Fehler bei pulse run: ${errMsg}`,
      next_action: "Prüfe ob pulse-cli installiert ist: pulse --version",
      safeguards_active: true,
      recommendation: "pulse init ausführen falls nicht initialisiert",
    });
  }
}
