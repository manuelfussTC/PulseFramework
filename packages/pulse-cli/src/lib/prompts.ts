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
// TEMPLATE 1: 6-Element Prompt (from PULSE Framework Documentation)
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
  // │ 6-ELEMENTS (exactly as documented in Framework)
  // └─────────────────────────────────────────────────────────────────────────

  // 1. ROLE
  lines.push("**ROLE:** " + (el.role?.trim() || "[Who should the AI be? Senior Dev, Architect, Code-Reviewer?]"));
  lines.push("");

  // 2. CONTEXT  
  lines.push("**CONTEXT:** " + (el.context?.trim() || "[Where are you? What happened? Which project?]"));
  lines.push("");

  // 3. INPUT
  lines.push("**INPUT:** " + (el.input?.trim() || "[What is given? Code, Screenshot, Error, Concept?]"));
  lines.push("");

  // 4. OUTPUT
  lines.push("**OUTPUT:** " + (el.output?.trim() || "[What should be the result? Code, Docs, Explanation, File?]"));
  lines.push("");

  // 5. ACTION
  lines.push("**ACTION:** " + (el.action?.trim() || "[What should the AI do? Build, analyze, fix, explain?]"));
  lines.push("");

  // 6. EXAMPLES
  if (el.examples?.trim()) {
    lines.push("**EXAMPLES:**");
    lines.push("✅ How it should be: " + el.examples.trim());
    lines.push("❌ How it should NOT be: [Negative Example]");
    lines.push("");
  }

  // ┌─────────────────────────────────────────────────────────────────────────
  // │ SAFEGUARDS (from .cursorrules)
  // └─────────────────────────────────────────────────────────────────────────
  if (layer === "build") {
    lines.push("---");
    lines.push("");
    lines.push("⚠️ **SAFEGUARDS** (non-negotiable):");
    lines.push("- ⏱️ MAX 30 min autonomous, then STOP + ask user");
    lines.push("- 🗑️ NO DELETE without confirmation");
    lines.push("- 📤 NO PUSH without confirmation");
    lines.push("- 🔐 NO Secrets in code");
    lines.push("- 📋 Git commit every 5-10 min");
    lines.push("");
  }

  lines.push("---");
  lines.push("Did you understand? Then let's proceed step by step.");

  return lines.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: AS-IS/TO-BE Prompt (for quick bug fixes)
// ════════════════════════════════════════════════════════════════════════════

export function renderIstSollPrompt(options: {
  ist: string;
  soll: string;
  error?: string;
  context?: string;
}): string {
  const lines: string[] = [];

  lines.push("# AS-IS/TO-BE Bug Fix");
  lines.push("");
  lines.push("**AS-IS:** " + options.ist.trim());
  lines.push("");
  lines.push("**TO-BE:** " + options.soll.trim());
  lines.push("");

  if (options.error?.trim()) {
    lines.push("**ERROR Log:**");
    lines.push("```");
    lines.push(options.error.trim());
    lines.push("```");
    lines.push("");
  }

  if (options.context?.trim()) {
    lines.push("**CONTEXT:** " + options.context.trim());
    lines.push("");
  }

  lines.push("---");
  lines.push("⚠️ Safeguards: No delete without confirmation, commit after fix.");

  return lines.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: Escalation Prompt (for external models like GPT-5/Opus)
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

  lines.push("# Escalation: Cursor is stuck");
  lines.push("");
  lines.push("My developer (Cursor) is stuck on the following problem:");
  lines.push("");
  lines.push("**Problem Description:**");
  lines.push(options.cursorExplanation.trim() || "[Cursor's explanation of the problem here]");
  lines.push("");

  // What Cursor tried
  lines.push("**What Cursor tried:**");
  if (options.attempts && options.attempts.length > 0) {
    options.attempts.forEach((attempt, i) => {
      lines.push(`• ${attempt}`);
    });
  } else {
    lines.push("• (Not documented)");
  }
  lines.push("");

  // Error logs
  if (options.errorText?.trim()) {
    lines.push("**Error Message:**");
    lines.push("```");
    lines.push(options.errorText.trim());
    lines.push("```");
    lines.push("");
  }

  // Code Context
  if (options.codeSnippets?.trim()) {
    lines.push("**Code Context:**");
    lines.push("```");
    lines.push(options.codeSnippets.trim());
    lines.push("```");
    lines.push("");
  }

  // Git Context
  if (options.gitLog?.trim()) {
    lines.push("**Git Log (recent commits):**");
    lines.push("```");
    lines.push(options.gitLog.trim());
    lines.push("```");
    lines.push("");
  }

  if (options.gitDiff?.trim()) {
    lines.push("**Git Diff:**");
    lines.push("```");
    lines.push(options.gitDiff.trim());
    lines.push("```");
    lines.push("");
  }

  // Call to action
  lines.push("---");
  lines.push("");
  lines.push("**My Question:** " + (options.question.trim() || "What is the root cause and how do I fix it?"));
  lines.push("");
  lines.push("**Give me a solution that I can provide to my developer (Cursor) as instructions.**");
  lines.push("");
  lines.push("Format:");
  lines.push("1. Root Cause (one line)");
  lines.push("2. Step-by-step instructions for Cursor");
  lines.push("3. Code snippet if needed");

  return lines.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES (for interactive selection)
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
    name: "🚀 Build Feature",
    description: "Implement new feature",
    layer: "build",
    defaults: {
      role: "Senior Full-Stack Developer",
      output: "Working implementation with tests",
    },
  },
  {
    id: "bugfix",
    name: "🐛 Fix Bug",
    description: "Analyze and fix error",
    layer: "build",
    defaults: {
      role: "Experienced Debugger and Code Analyst",
      output: "1. Root Cause\n2. Fix\n3. Test that it works",
    },
  },
  {
    id: "refactor",
    name: "♻️ Refactoring",
    description: "Improve code without changing functionality",
    layer: "build",
    defaults: {
      role: "Code Quality Expert",
      output: "Clean, maintainable code. Same functionality.",
    },
  },
  {
    id: "concept",
    name: "📋 Create Concept",
    description: "Plan first, then build",
    layer: "concept",
    defaults: {
      role: "Software Architect",
      output: "Markdown document with plan, architecture, risks",
    },
  },
  {
    id: "analyze",
    name: "🔍 Analyze Code",
    description: "Understand and document project",
    layer: "concept",
    defaults: {
      role: "Senior Developer onboarding to the project",
      output: "Structured analysis: What exists, how it works, what is missing",
    },
  },
  {
    id: "review",
    name: "👀 Code Review",
    description: "Review changes",
    layer: "concept",
    defaults: {
      role: "Code Reviewer with Security focus",
      output: "List of findings: Critical, High, Medium, Low",
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
        hint: "🧠 You are in Concept Mode. NO CODE. Only analysis, planning, documentation.",
      };
    case "build":
      return {
        title: "BUILD MODE",
        hint: "🔨 You are in Build Mode. Implement EXACTLY what is requested. No more, no less.",
      };
    case "escalation":
      return {
        title: "ESCALATION MODE",
        hint: "🚨 Escalation active. Analyze the problem and provide instructions for the builder.",
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
    return "⚠️ ACTION contains multiple points. Better: One action per Pulse.";
  }
  
  const andCount = (a.match(/\b(und|and)\b/gi) ?? []).length;
  if (andCount >= 2) {
    return "⚠️ ACTION contains multiple 'and'. Better: Split into milestones.";
  }
  
  return null;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}
