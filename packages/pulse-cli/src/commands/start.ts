import type { Command } from "commander";
import { loadState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { loadConfig } from "../lib/config.js";
import { promptText, promptSelect, promptConfirm } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { copyAndNotify } from "../lib/clipboard.js";
import { gitCurrentBranch, gitIsMainBranch, gitCreateBranch } from "../lib/git.js";
import {
  countProvidedElements,
  renderSixElementPrompt,
  renderIstSollPrompt,
  validateOneAction,
  PROMPT_TEMPLATES,
  getTemplateById,
} from "../lib/prompts.js";
import type { SixElements } from "../lib/prompts.js";
import type { PulseLayer } from "../lib/types.js";

export function registerStartCommand(program: Command): void {
  program
    .command("start")
    .alias("s") // Kurzform: pulse s
    .description("Starte einen neuen Pulse mit 6-Elemente-Prompt")
    .option("-t, --template <id>", "Vorlage: feature, bugfix, refactor, concept, analyze, review")
    .option("-q, --quick", "Quick-Mode: Nur ACTION abfragen")
    .option("--role <text>", "ROLLE")
    .option("--context <text>", "KONTEXT")
    .option("--input <text>", "INPUT")
    .option("--action <text>", "ACTION")
    .option("--output <text>", "OUTPUT")
    .option("--examples <text>", "BEISPIELE")
    .option("--ist <text>", "IST-Zustand (für IST/SOLL-Prompt)")
    .option("--soll <text>", "SOLL-Zustand (für IST/SOLL-Prompt)")
    .option("-C, --clipboard", "Prompt in Zwischenablage kopieren")
    .action(async (opts) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

      const [state, config] = await Promise.all([loadState(repoRoot), loadConfig(repoRoot)]);

      // eslint-disable-next-line no-console
      console.log("\n🎯 PULSE Start\n");

      // ══════════════════════════════════════════════════════════════════════
      // Branch-Check: Warnung bei main/master
      // ══════════════════════════════════════════════════════════════════════
      const currentBranch = await gitCurrentBranch(repoRoot);
      const isMain = await gitIsMainBranch(repoRoot);
      
      if (isMain) {
        // eslint-disable-next-line no-console
        console.log(`⚠️  Du bist auf '${currentBranch}' – Feature-Branch empfohlen!\n`);
        
        const createBranch = await promptConfirm("Feature-Branch erstellen?", true);
        
        if (createBranch) {
          const branchName = await promptText(
            "Branch-Name (z.B. feature/user-dashboard)",
            "feature/"
          );
          
          if (branchName && branchName !== "feature/") {
            const success = await gitCreateBranch(repoRoot, branchName);
            if (success) {
              // eslint-disable-next-line no-console
              console.log(`✅ Branch erstellt: ${branchName}\n`);
            } else {
              // eslint-disable-next-line no-console
              console.log(`❌ Branch konnte nicht erstellt werden\n`);
            }
          }
        } else {
          // eslint-disable-next-line no-console
          console.log(`ℹ️  Arbeite auf '${currentBranch}' (nicht empfohlen)\n`);
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // IST/SOLL Quick-Prompt (für schnelle Bug-Fixes)
      // ══════════════════════════════════════════════════════════════════════
      if (opts.ist || opts.soll) {
        const ist = opts.ist ?? (await promptText("IST (aktueller Zustand)", ""));
        const soll = opts.soll ?? (await promptText("SOLL (gewünschter Zustand)", ""));
        const error = await promptText("ERROR-Log (optional, Enter zum Überspringen)", "");

        const prompt = renderIstSollPrompt({ ist, soll, error, context: opts.context });
        await saveAndPrint(repoRoot, "istsoll", prompt, undefined, opts.clipboard);
        return;
      }

      // ══════════════════════════════════════════════════════════════════════
      // Template-Auswahl (interaktiv oder per Flag)
      // ══════════════════════════════════════════════════════════════════════
      let template = opts.template ? getTemplateById(opts.template) : undefined;
      let layer: PulseLayer = state.profile;

      // Wenn kein Template und keine Flags → interaktive Auswahl
      if (!template && countProvidedElements(opts) < 2 && !opts.quick) {
        // eslint-disable-next-line no-console
        console.log("Was möchtest du machen?\n");

        const choices = PROMPT_TEMPLATES.map((t) => ({
          value: t.id,
          label: `${t.name} - ${t.description}`,
        }));

        const selectedId = await promptSelect("Vorlage wählen", choices, "feature");
        template = getTemplateById(selectedId);
      }

      // Merge template defaults
      const el: SixElements = {
        role: opts.role ?? template?.defaults.role,
        context: opts.context ?? template?.defaults.context,
        input: opts.input ?? template?.defaults.input,
        action: opts.action ?? template?.defaults.action,
        output: opts.output ?? template?.defaults.output,
        examples: opts.examples ?? template?.defaults.examples,
      };

      if (template) {
        layer = template.layer;
      }

      // ══════════════════════════════════════════════════════════════════════
      // Interaktive Abfrage der fehlenden Elemente
      // ══════════════════════════════════════════════════════════════════════
      if (opts.quick) {
        // Quick Mode: Nur ACTION
        el.action = el.action ?? (await promptText("⚡ ACTION (was soll gemacht werden?)", ""));
      } else if (countProvidedElements(el) < 3) {
        // Guided Mode: Die wichtigsten Elemente abfragen
        // eslint-disable-next-line no-console
        console.log("\n📝 6-Elemente-Prompt erstellen\n");

        if (!el.action?.trim()) {
          el.action = await promptText(
            "⚡ ACTION (Was soll die KI tun?)",
            ""
          );
        }

        if (!el.context?.trim()) {
          el.context = await promptText(
            "📍 KONTEXT (Projekt, Stack, Situation)",
            el.context ?? ""
          );
        }

        if (!el.role?.trim()) {
          el.role = await promptText(
            "👤 ROLLE (Wer soll die KI sein?)",
            el.role ?? "Senior Software Engineer"
          );
        }

        // Optional: Mehr Details?
        const wantMore = await promptText("Mehr Details eingeben? (j/n)", "n");
        if (wantMore.toLowerCase() === "j" || wantMore.toLowerCase() === "y") {
          if (!el.input?.trim()) {
            el.input = await promptText("📥 INPUT (Code, Error, Screenshot-Beschreibung)", "");
          }
          if (!el.output?.trim()) {
            el.output = await promptText("📤 OUTPUT (Was soll rauskommen?)", "");
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // Prompt generieren und speichern
      // ══════════════════════════════════════════════════════════════════════
      const prompt = renderSixElementPrompt(layer, el);
      const actionWarning = validateOneAction(el.action);

      await saveAndPrint(repoRoot, "start", prompt, {
        layer,
        elementCount: countProvidedElements(el),
        actionWarning,
        template: template?.name,
      }, opts.clipboard);

      if (config.enforcement !== "advisory" && actionWarning) {
        // eslint-disable-next-line no-console
        console.log(`\n⚠️  ${actionWarning}`);
      }
    });
}

// Helper: Speichern und Ausgeben
async function saveAndPrint(
  repoRoot: string,
  type: string,
  prompt: string,
  meta?: {
    layer?: PulseLayer;
    elementCount?: number;
    actionWarning?: string | null;
    template?: string;
  },
  clipboard?: boolean
): Promise<void> {
  const ts = timestampId();
  const filename = `${ts}-${type}.md`;

  const content = [
    `# Pulse: ${type.toUpperCase()} (${ts})`,
    ``,
    meta?.layer ? `- Layer: **${meta.layer}**` : "",
    meta?.template ? `- Vorlage: **${meta.template}**` : "",
    meta?.elementCount ? `- Elemente: **${meta.elementCount}/6**` : "",
    meta?.actionWarning ? `- ⚠️ ${meta.actionWarning}` : "",
    ``,
    `## Prompt (kopieren und in Cursor/ChatGPT einfügen)`,
    ``,
    "```",
    prompt.trimEnd(),
    "```",
    ``,
    `## Tipps`,
    `- Safeguards beachten: MAX 30 Min autonom`,
    `- Git-Commit alle 5-10 Min`,
    `- Bei Problemen: \`pulse escalate\``,
    ``,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const p = await writeArtifact(repoRoot, "pulses", filename, content);

  // eslint-disable-next-line no-console
  console.log(`\n✅ Gespeichert: ${p}`);
  
  // Clipboard
  if (clipboard) {
    const clipboardMsg = await copyAndNotify(prompt);
    // eslint-disable-next-line no-console
    console.log(clipboardMsg);
  }
  
  // eslint-disable-next-line no-console
  console.log(`\n${"─".repeat(60)}`);
  // eslint-disable-next-line no-console
  console.log(`\n📋 PROMPT${clipboard ? " (kopiert)" : " (kopieren)"}:\n`);
  // eslint-disable-next-line no-console
  console.log(prompt.trimEnd());
  // eslint-disable-next-line no-console
  console.log(`\n${"─".repeat(60)}\n`);
}
