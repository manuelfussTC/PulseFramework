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
    .description("Start a new Pulse with 6-element prompt")
    .option("-t, --template <id>", "Template: feature, bugfix, refactor, concept, analyze, review")
    .option("-q, --quick", "Quick-Mode: Ask only for ACTION")
    .option("--role <text>", "ROLE")
    .option("--context <text>", "CONTEXT")
    .option("--input <text>", "INPUT")
    .option("--action <text>", "ACTION")
    .option("--output <text>", "OUTPUT")
    .option("--examples <text>", "EXAMPLES")
    .option("--ist <text>", "AS-IS state (for AS-IS/TO-BE prompt)")
    .option("--soll <text>", "TO-BE state (for AS-IS/TO-BE prompt)")
    .option("-C, --clipboard", "Copy prompt to clipboard")
    .option("--no-branch-check", "Skip branch check (for MCP/Automation)")
    .action(async (opts: {
      template?: string;
      quick?: boolean;
      role?: string;
      context?: string;
      input?: string;
      action?: string;
      output?: string;
      examples?: string;
      ist?: string;
      soll?: string;
      clipboard?: boolean;
      branchCheck?: boolean;
    }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not in a git repository.");

      const [state, config] = await Promise.all([loadState(repoRoot), loadConfig(repoRoot)]);

      // eslint-disable-next-line no-console
      console.log("\n🎯 PULSE Start\n");

      // ══════════════════════════════════════════════════════════════════════
      // Branch check: Warning on main/master (only interactive, not with --quick)
      // ══════════════════════════════════════════════════════════════════════
      const skipBranchCheck = opts.branchCheck === false || opts.quick;
      
      if (!skipBranchCheck) {
        const currentBranch = await gitCurrentBranch(repoRoot);
        const isMain = await gitIsMainBranch(repoRoot);
        
        if (isMain) {
          // eslint-disable-next-line no-console
          console.log(`⚠️  You are on '${currentBranch}' – Feature branch recommended!\n`);
          
          const createBranch = await promptConfirm("Create feature branch?", true);
          
          if (createBranch) {
            const branchName = await promptText(
              "Branch name (e.g., feature/user-dashboard)",
              "feature/"
            );
            
            if (branchName && branchName !== "feature/") {
              const success = await gitCreateBranch(repoRoot, branchName);
              if (success) {
                // eslint-disable-next-line no-console
                console.log(`✅ Branch created: ${branchName}\n`);
              } else {
                // eslint-disable-next-line no-console
                console.log(`❌ Could not create branch\n`);
              }
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(`ℹ️  Working on '${currentBranch}' (not recommended)\n`);
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // AS-IS/TO-BE Quick Prompt (for quick bug fixes)
      // ══════════════════════════════════════════════════════════════════════
      if (opts.ist || opts.soll) {
        const ist = opts.ist ?? (await promptText("AS-IS (current state)", ""));
        const soll = opts.soll ?? (await promptText("TO-BE (desired state)", ""));
        const error = await promptText("ERROR log (optional, Enter to skip)", "");

        const prompt = renderIstSollPrompt({ ist, soll, error, context: opts.context });
        await saveAndPrint(repoRoot, "istsoll", prompt, undefined, opts.clipboard);
        return;
      }

      // ══════════════════════════════════════════════════════════════════════
      // Template selection (interactive or via flag)
      // ══════════════════════════════════════════════════════════════════════
      let template = opts.template ? getTemplateById(opts.template) : undefined;
      let layer: PulseLayer = state.profile;

      // If no template and no flags → interactive selection
      if (!template && countProvidedElements(opts) < 2 && !opts.quick) {
        // eslint-disable-next-line no-console
        console.log("What do you want to do?\n");

        const choices = PROMPT_TEMPLATES.map((t) => ({
          value: t.id,
          label: `${t.name} - ${t.description}`,
        }));

        const selectedId = await promptSelect("Choose template", choices, "feature");
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
        el.action = el.action ?? (await promptText("⚡ ACTION (what needs to be done?)", ""));
      } else if (countProvidedElements(el) < 3) {
        // Guided Mode: Die wichtigsten Elemente abfragen
        // eslint-disable-next-line no-console
        console.log("\n📝 Create 6-element prompt\n");

        if (!el.action?.trim()) {
          el.action = await promptText(
            "⚡ ACTION (What should the AI do?)",
            ""
          );
        }

        if (!el.context?.trim()) {
          el.context = await promptText(
            "📍 CONTEXT (Project, Stack, Situation)",
            el.context ?? ""
          );
        }

        if (!el.role?.trim()) {
          el.role = await promptText(
            "👤 ROLE (Who should the AI be?)",
            el.role ?? "Senior Software Engineer"
          );
        }

        // Optional: Mehr Details?
        const wantMore = await promptText("Enter more details? (y/n)", "n");
        if (wantMore.toLowerCase() === "j" || wantMore.toLowerCase() === "y") {
          if (!el.input?.trim()) {
            el.input = await promptText("📥 INPUT (Code, Error, Screenshot description)", "");
          }
          if (!el.output?.trim()) {
            el.output = await promptText("📤 OUTPUT (What is the expected outcome?)", "");
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // Generate and save prompt
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

// Helper: Save and output
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
    meta?.template ? `- Template: **${meta.template}**` : "",
    meta?.elementCount ? `- Elements: **${meta.elementCount}/6**` : "",
    meta?.actionWarning ? `- ⚠️ ${meta.actionWarning}` : "",
    ``,
    `## Prompt (copy and paste into Cursor/ChatGPT)`,
    ``,
    "```",
    prompt.trimEnd(),
    "```",
    ``,
    `## Tips`,
    `- Observe safeguards: MAX 30 min autonomous`,
    `- Git commit every 5-10 min`,
    `- If stuck: \`pulse escalate\``,
    ``,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const p = await writeArtifact(repoRoot, "pulses", filename, content);

  // eslint-disable-next-line no-console
  console.log(`\n✅ Saved: ${p}`);
  
  // Clipboard
  if (clipboard) {
    const clipboardMsg = await copyAndNotify(prompt);
    // eslint-disable-next-line no-console
    console.log(clipboardMsg);
  }
  
  // eslint-disable-next-line no-console
  console.log(`\n${"─".repeat(60)}`);
  // eslint-disable-next-line no-console
  console.log(`\n📋 PROMPT${clipboard ? " (copied)" : " (copy)"}:\n`);
  // eslint-disable-next-line no-console
  console.log(prompt.trimEnd());
  // eslint-disable-next-line no-console
  console.log(`\n${"─".repeat(60)}\n`);
}
