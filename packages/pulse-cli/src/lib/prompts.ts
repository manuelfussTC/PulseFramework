import type { PulseLayer } from "./types.js";

export type SixElements = {
  role?: string;
  context?: string;
  input?: string;
  action?: string;
  output?: string;
  examples?: string;
};

export function renderSixElementPrompt(layer: PulseLayer, el: SixElements): string {
  const header =
    layer === "concept"
      ? "You are in Layer 1 (Concept). Think, don’t build code. Output: Markdown/diagrams/spec."
      : layer === "escalation"
        ? "You are in Layer 3 (Escalation). Diagnose root cause. Output: analysis + instructions for the Builder."
        : "You are in Layer 2 (Build). Implement with strict scope. Output: code changes as requested.";

  return [
    header,
    "",
    "[ROLE]",
    el.role?.trim() || "",
    "",
    "[CONTEXT]",
    el.context?.trim() || "",
    "",
    "[INPUT]",
    el.input?.trim() || "",
    "",
    "[ACTION]",
    el.action?.trim() || "",
    "",
    "[OUTPUT]",
    el.output?.trim() || "",
    "",
    "[EXAMPLES]",
    el.examples?.trim() || "",
    "",
  ].join("\n");
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

