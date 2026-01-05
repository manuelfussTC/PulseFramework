import type { PulseLayer } from "./types.js";

export type SixElements = {
  role?: string;
  context?: string;
  input?: string;
  action?: string;
  output?: string;
  examples?: string;
};

const LAYER_HEADERS: Record<PulseLayer, string> = {
  concept: `# LAYER 1: CONCEPT MODE
Du bist im Konzept-Modus. NICHT CODEN. Nur denken und planen.

## Deine Aufgabe
- Analysiere das Problem
- Erstelle einen Plan
- Output: Markdown, Diagramme, Pseudo-Code, Architektur-Entscheidungen

## Regeln
- KEIN ausführbarer Code
- Stelle Rückfragen wenn etwas unklar ist
- Identifiziere Risiken und Alternativen`,

  build: `# LAYER 2: BUILD MODE
Du bist im Build-Modus. Implementiere mit striktem Scope.

## Deine Aufgabe
- Implementiere GENAU was gefordert ist
- Nicht mehr, nicht weniger
- Output: Funktionierende Code-Änderungen

## KRITISCHE REGELN (aus .cursorrules)
⏱️ MAX 30 MINUTEN autonom arbeiten, dann Checkpoint + Rückfrage
🔒 KEINE Deletes ohne Bestätigung
🔒 KEIN Push ohne Bestätigung  
🔒 KEINE Secrets im Code
📋 Commit alle 5-10 Minuten

## Bei Problemen
- Wenn etwas >2x nicht funktioniert: STOP und erkläre das Problem
- Wenn du unsicher bist: FRAGE
- Wenn zu komplex: Schlage kleinere Milestones vor`,

  escalation: `# LAYER 3: ESCALATION MODE
Du bist im Eskalations-Modus. Der Builder (Cursor) ist stuck.

## Deine Aufgabe
- Analysiere die Root Cause
- Erstelle eine klare Diagnose
- Output: Analyse + konkrete Anweisungen für den Builder

## Output-Format
1. **Problem-Analyse**: Was ist das eigentliche Problem?
2. **Root Cause**: Warum tritt es auf?
3. **Lösung**: Schritt-für-Schritt Anweisungen
4. **Code-Snippet**: Falls nötig, minimales Beispiel`,
};

export function renderSixElementPrompt(layer: PulseLayer, el: SixElements): string {
  const header = LAYER_HEADERS[layer];

  const sections: string[] = [
    header,
    "",
    "---",
    "",
  ];

  // Role
  sections.push("## [ROLE] Deine Rolle");
  sections.push(el.role?.trim() || "(Nicht angegeben - verwende dein Urteilsvermögen)");
  sections.push("");

  // Context
  sections.push("## [CONTEXT] Projekt-Kontext");
  if (el.context?.trim()) {
    sections.push(el.context.trim());
  } else {
    sections.push("(Lies die relevanten Dateien im Projekt um den Kontext zu verstehen)");
  }
  sections.push("");

  // Input
  sections.push("## [INPUT] Zusätzliche Informationen");
  if (el.input?.trim()) {
    sections.push(el.input.trim());
  } else {
    sections.push("(Keine zusätzlichen Informationen)");
  }
  sections.push("");

  // Action - THE MOST IMPORTANT PART
  sections.push("## [ACTION] ⚡ Was du tun sollst");
  sections.push("**WICHTIG: Fokussiere dich NUR auf diese eine Aktion.**");
  sections.push("");
  if (el.action?.trim()) {
    sections.push(`> ${el.action.trim()}`);
  } else {
    sections.push("> (Keine Aktion angegeben - frage nach!)");
  }
  sections.push("");

  // Output
  sections.push("## [OUTPUT] Erwartetes Ergebnis");
  if (el.output?.trim()) {
    sections.push(el.output.trim());
  } else {
    sections.push("- Funktionierende Code-Änderungen");
    sections.push("- Klare Commit-Messages");
    sections.push("- Kurze Zusammenfassung was gemacht wurde");
  }
  sections.push("");

  // Examples
  if (el.examples?.trim()) {
    sections.push("## [EXAMPLES] Beispiele / Referenzen");
    sections.push(el.examples.trim());
    sections.push("");
  }

  // Footer with reminders
  sections.push("---");
  sections.push("");
  sections.push("## Erinnerung");
  sections.push("- ⏱️ Nach 30 Min: STOP und frage ob du fortfahren sollst");
  sections.push("- 📋 Commit alle 5-10 Min");
  sections.push("- 🛑 Bei Unsicherheit: FRAGE statt rate");
  sections.push("- 🔄 Bei Loop (>2 Versuche): STOP und erkläre das Problem");

  return sections.join("\n");
}

export function countProvidedElements(el: SixElements): number {
  return Object.values(el).filter((v) => typeof v === "string" && v.trim().length > 0).length;
}

export function validateOneAction(action: string | undefined): string | null {
  const a = (action ?? "").trim();
  if (!a) return "Missing [ACTION].";
  // heuristic: multiple bullet lines = likely multiple actions
  const bulletLines = a.split("\n").filter((l) => /^\s*[-*]\s+/.test(l)).length;
  if (bulletLines >= 2) return "ACTION looks like multiple actions (multiple bullets). Prefer one action per pulse.";
  const andCount = (a.match(/\band\b/gi) ?? []).length;
  if (andCount >= 3) return "ACTION likely contains multiple actions. Prefer splitting into milestones.";
  return null;
}

/**
 * Generate an escalation prompt with full problem description
 */
export function renderEscalationPrompt(options: {
  cursorExplanation: string;
  errorText: string;
  gitLog: string;
  gitDiff: string;
  question: string;
  codeSnippets?: string;
}): string {
  return `# ESKALATION: Builder Agent ist stuck

## Situation
Mein Builder Agent (Cursor AI) arbeitet an einem Problem und kommt nicht weiter.
Ich brauche deine Analyse und konkrete Anweisungen, die ich zurück an Cursor geben kann.

---

## Was Cursor versucht hat (Agent-Erklärung)
${options.cursorExplanation.trim() || "(Keine Erklärung vom Agent)"}

---

## Fehlermeldung / Logs
\`\`\`
${options.errorText.trim() || "(Keine Fehlermeldung)"}
\`\`\`

---

## Git-Kontext

### Letzte Commits
\`\`\`
${options.gitLog.trim() || "(Keine Commits)"}
\`\`\`

### Aktuelle Änderungen (Diff Summary)
\`\`\`
${options.gitDiff.trim() || "(Keine Änderungen)"}
\`\`\`

${options.codeSnippets ? `---

## Relevante Code-Snippets
\`\`\`
${options.codeSnippets.trim()}
\`\`\`
` : ""}

---

## Meine konkrete Frage
> ${options.question.trim() || "Was ist die Root Cause und wie löse ich das Problem?"}

---

## Gewünschtes Output-Format

Bitte antworte mit:

### 1. Problem-Analyse
Was ist das eigentliche Problem? (Nicht nur das Symptom)

### 2. Root Cause
Warum tritt dieses Problem auf?

### 3. Lösung
Schritt-für-Schritt Anweisungen, die ich an Cursor geben kann:
1. ...
2. ...
3. ...

### 4. Code-Snippet (falls nötig)
Minimales Beispiel das zeigt wie es richtig geht.

### 5. Vermeidung
Wie vermeide ich dieses Problem in Zukunft?
`;
}
