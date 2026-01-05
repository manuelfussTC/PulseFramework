import type { PulseLayer } from "./types.js";

export type SixElements = {
  role?: string;
  context?: string;
  input?: string;
  action?: string;
  output?: string;
  examples?: string;
};

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: 6-Elemente-Prompt (aus PULSE Framework Dokumentation)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generates a 6-Element prompt exactly as specified in the PULSE Framework.
 * This is the core template that should be copy-pasted into AI tools.
 */
export function renderSixElementPrompt(layer: PulseLayer, el: SixElements): string {
  const layerHint = getLayerHint(layer);
  
  const lines: string[] = [];

  // Header with layer context
  lines.push(`# PULSE: ${layerHint.title}`);
  lines.push("");
  lines.push(layerHint.hint);
  lines.push("");
  lines.push("---");
  lines.push("");

  // ┌─────────────────────────────────────────────────────────────────────────
  // │ 6-ELEMENTE (exakt wie im Framework dokumentiert)
  // └─────────────────────────────────────────────────────────────────────────

  // 1. ROLLE
  lines.push("**ROLLE:** " + (el.role?.trim() || "[Wer soll die KI sein? Senior Dev, Architekt, Code-Reviewer?]"));
  lines.push("");

  // 2. KONTEXT  
  lines.push("**KONTEXT:** " + (el.context?.trim() || "[Wo bist du? Was ist passiert? Welches Projekt?]"));
  lines.push("");

  // 3. INPUT
  lines.push("**INPUT:** " + (el.input?.trim() || "[Was liegt vor? Code, Screenshot, Error, Konzept?]"));
  lines.push("");

  // 4. OUTPUT
  lines.push("**OUTPUT:** " + (el.output?.trim() || "[Was soll rauskommen? Code, Doku, Erklärung, Datei?]"));
  lines.push("");

  // 5. ACTION
  lines.push("**ACTION:** " + (el.action?.trim() || "[Was soll die KI tun? Bauen, analysieren, fixen, erklären?]"));
  lines.push("");

  // 6. BEISPIELE
  if (el.examples?.trim()) {
    lines.push("**BEISPIELE:**");
    lines.push("✅ Wie es sein soll: " + el.examples.trim());
    lines.push("❌ Wie es NICHT sein soll: [Negativ-Beispiel]");
    lines.push("");
  }

  // ┌─────────────────────────────────────────────────────────────────────────
  // │ SAFEGUARDS (aus .cursorrules)
  // └─────────────────────────────────────────────────────────────────────────
  if (layer === "build") {
    lines.push("---");
    lines.push("");
    lines.push("⚠️ **SAFEGUARDS** (non-negotiable):");
    lines.push("- ⏱️ MAX 30 Min autonom, dann STOP + Rückfrage");
    lines.push("- 🗑️ KEIN DELETE ohne Nachfrage");
    lines.push("- 📤 KEIN PUSH ohne Confirmation");
    lines.push("- 🔐 KEINE Secrets im Code");
    lines.push("- 📋 Git-Commit alle 5-10 Min");
    lines.push("");
  }

  lines.push("---");
  lines.push("Hast du das verstanden? Dann lass uns Schritt für Schritt vorgehen.");

  return lines.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: IST/SOLL-Prompt (für schnelle Bug-Fixes)
// ════════════════════════════════════════════════════════════════════════════

export function renderIstSollPrompt(options: {
  ist: string;
  soll: string;
  error?: string;
  context?: string;
}): string {
  const lines: string[] = [];

  lines.push("# IST/SOLL Bug-Fix");
  lines.push("");
  lines.push("**IST:** " + options.ist.trim());
  lines.push("");
  lines.push("**SOLL:** " + options.soll.trim());
  lines.push("");

  if (options.error?.trim()) {
    lines.push("**ERROR-Log:**");
    lines.push("```");
    lines.push(options.error.trim());
    lines.push("```");
    lines.push("");
  }

  if (options.context?.trim()) {
    lines.push("**KONTEXT:** " + options.context.trim());
    lines.push("");
  }

  lines.push("---");
  lines.push("⚠️ Safeguards: Kein Delete ohne Nachfrage, Commit nach Fix.");

  return lines.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: Eskalations-Prompt (für externe Models wie GPT-5/Opus)
// ════════════════════════════════════════════════════════════════════════════

export function renderEscalationPrompt(options: {
  cursorExplanation: string;
  errorText: string;
  gitLog: string;
  gitDiff: string;
  question: string;
  codeSnippets?: string;
  attempts?: string[];
}): string {
  const lines: string[] = [];

  lines.push("# Eskalation: Cursor ist stuck");
  lines.push("");
  lines.push("Mein Entwickler (Cursor) hängt bei folgendem Problem:");
  lines.push("");
  lines.push("**Problem-Beschreibung:**");
  lines.push(options.cursorExplanation.trim() || "[Cursor's Erklärung des Problems hier]");
  lines.push("");

  // Was Cursor versucht hat
  lines.push("**Was Cursor versucht hat:**");
  if (options.attempts && options.attempts.length > 0) {
    options.attempts.forEach((attempt, i) => {
      lines.push(`• ${attempt}`);
    });
  } else {
    lines.push("• (Nicht dokumentiert)");
  }
  lines.push("");

  // Error-Logs
  if (options.errorText?.trim()) {
    lines.push("**Fehlermeldung:**");
    lines.push("```");
    lines.push(options.errorText.trim());
    lines.push("```");
    lines.push("");
  }

  // Code-Context
  if (options.codeSnippets?.trim()) {
    lines.push("**Code-Context:**");
    lines.push("```");
    lines.push(options.codeSnippets.trim());
    lines.push("```");
    lines.push("");
  }

  // Git Context
  if (options.gitLog?.trim()) {
    lines.push("**Git-Log (letzte Commits):**");
    lines.push("```");
    lines.push(options.gitLog.trim());
    lines.push("```");
    lines.push("");
  }

  if (options.gitDiff?.trim()) {
    lines.push("**Git-Diff:**");
    lines.push("```");
    lines.push(options.gitDiff.trim());
    lines.push("```");
    lines.push("");
  }

  // Call to action
  lines.push("---");
  lines.push("");
  lines.push("**Meine Frage:** " + (options.question.trim() || "Was ist die Root Cause und wie löse ich das?"));
  lines.push("");
  lines.push("**Gib mir eine Lösung, die ich meinem Entwickler (Cursor) als Anweisung geben kann.**");
  lines.push("");
  lines.push("Format:");
  lines.push("1. Root Cause (eine Zeile)");
  lines.push("2. Schritt-für-Schritt Anweisungen für Cursor");
  lines.push("3. Code-Snippet falls nötig");

  return lines.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
// PROMPT VORLAGEN (für interaktive Auswahl)
// ════════════════════════════════════════════════════════════════════════════

export type PromptTemplate = {
  id: string;
  name: string;
  description: string;
  layer: PulseLayer;
  defaults: Partial<SixElements>;
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "feature",
    name: "🚀 Feature bauen",
    description: "Neues Feature implementieren",
    layer: "build",
    defaults: {
      role: "Senior Full-Stack Developer",
      output: "Funktionierende Implementierung mit Tests",
    },
  },
  {
    id: "bugfix",
    name: "🐛 Bug fixen",
    description: "Fehler analysieren und beheben",
    layer: "build",
    defaults: {
      role: "Erfahrener Debugger und Code-Analyst",
      output: "1. Root Cause\n2. Fix\n3. Test dass es funktioniert",
    },
  },
  {
    id: "refactor",
    name: "♻️ Refactoring",
    description: "Code verbessern ohne Funktionalität zu ändern",
    layer: "build",
    defaults: {
      role: "Code-Quality-Experte",
      output: "Sauberer, wartbarer Code. Gleiche Funktionalität.",
    },
  },
  {
    id: "concept",
    name: "📋 Konzept erstellen",
    description: "Erst planen, dann bauen",
    layer: "concept",
    defaults: {
      role: "Software-Architekt",
      output: "Markdown-Dokument mit Plan, Architektur, Risiken",
    },
  },
  {
    id: "analyze",
    name: "🔍 Code analysieren",
    description: "Projekt verstehen und dokumentieren",
    layer: "concept",
    defaults: {
      role: "Senior Developer der das Projekt übernimmt",
      output: "Strukturierte Analyse: Was ist da, wie funktioniert es, was fehlt",
    },
  },
  {
    id: "review",
    name: "👀 Code Review",
    description: "Änderungen prüfen",
    layer: "concept",
    defaults: {
      role: "Code-Reviewer mit Security-Fokus",
      output: "Liste von Findings: Critical, High, Medium, Low",
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function getLayerHint(layer: PulseLayer): { title: string; hint: string } {
  switch (layer) {
    case "concept":
      return {
        title: "CONCEPT MODE",
        hint: "🧠 Du bist im Konzept-Modus. KEIN CODE. Nur Analyse, Planung, Dokumentation.",
      };
    case "build":
      return {
        title: "BUILD MODE",
        hint: "🔨 Du bist im Build-Modus. Implementiere GENAU was gefordert ist. Nicht mehr, nicht weniger.",
      };
    case "escalation":
      return {
        title: "ESCALATION MODE",
        hint: "🚨 Eskalation aktiv. Analysiere das Problem und gib Anweisungen für den Builder.",
      };
  }
}

export function countProvidedElements(el: SixElements): number {
  return Object.values(el).filter((v) => typeof v === "string" && v.trim().length > 0).length;
}

export function validateOneAction(action: string | undefined): string | null {
  const a = (action ?? "").trim();
  if (!a) return "Missing [ACTION].";
  
  // Heuristic: multiple bullet lines = likely multiple actions
  const bulletLines = a.split("\n").filter((l) => /^\s*[-*]\s+/.test(l)).length;
  if (bulletLines >= 3) {
    return "⚠️ ACTION enthält mehrere Punkte. Besser: Eine Aktion pro Pulse.";
  }
  
  const andCount = (a.match(/\b(und|and)\b/gi) ?? []).length;
  if (andCount >= 2) {
    return "⚠️ ACTION enthält mehrere 'und'. Besser: In Milestones aufteilen.";
  }
  
  return null;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}
