import fs from "node:fs/promises";
import type { Command } from "commander";
import { timestampId, writeArtifact } from "../lib/artifacts.js";
import { promptText, promptConfirm } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitDiffStat, gitDiffText, gitDiffNameStatus, gitLogOneline } from "../lib/git.js";
import { renderEscalationPrompt } from "../lib/prompts.js";
import { copyAndNotify } from "../lib/clipboard.js";
import {
  exportFiles,
  autoDetectFiles,
  renderContextExportXml,
} from "../lib/context-export.js";

async function readOptionalFile(p?: string): Promise<string> {
  if (!p) return "";
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return "";
  }
}

export function registerEscalateCommand(program: Command): void {
  program
    .command("escalate")
    .alias("e")
    .description("Eskalation erstellen: Problem für externes Model (GPT-5/Claude/Opus) aufbereiten")
    .option("--problem <text>", "Was ist das Problem?")
    .option("--tried <text>", "Was hat Cursor bereits versucht?")
    .option("--error <text>", "Fehlermeldung / Logs")
    .option("--error-file <path>", "Pfad zu Log-Datei")
    .option("--code <text>", "Relevanter Code")
    .option("--code-file <path>", "Pfad zu Code-Datei")
    .option("--question <text>", "Deine konkrete Frage")
    .option("--detailed", "Vollständiges Diff inkludieren (nicht nur Summary)")
    .option("-C, --clipboard", "Prompt in Zwischenablage kopieren")
    .option("--include <patterns...>", "Dateien inkludieren (glob patterns)")
    .option("--auto-include", "Relevante Dateien automatisch aus Git-Diff inkludieren")
    .action(async (opts) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

      // eslint-disable-next-line no-console
      console.log("\n🚨 PULSE Eskalation\n");
      // eslint-disable-next-line no-console
      console.log("Erstelle Eskalations-Paket für externes Reasoning Model (GPT-5/Claude/Opus)\n");

      // ══════════════════════════════════════════════════════════════════════
      // Informationen sammeln (interaktiv wenn nicht per Flag)
      // ══════════════════════════════════════════════════════════════════════

      const cursorExplanation =
        opts.problem ??
        opts.tried ??
        (await promptText(
          "Was ist das Problem? (Was hat Cursor versucht, wo hängt er?)",
          ""
        ));

      // Versuche sammeln
      const attempts: string[] = [];
      if (opts.tried) {
        attempts.push(opts.tried);
      } else {
        // eslint-disable-next-line no-console
        console.log("\nWas hat Cursor bereits versucht? (Enter wenn fertig)\n");

        for (let i = 1; i <= 5; i++) {
          const attempt = await promptText(`  Versuch ${i}`, "");
          if (!attempt.trim()) break;
          attempts.push(attempt);
        }
      }

      // Error
      const errorText =
        opts.error ??
        (opts.errorFile
          ? await readOptionalFile(opts.errorFile)
          : await promptText("Fehlermeldung / Logs (optional)", ""));

      // Code (legacy option)
      let codeSnippets =
        opts.code ??
        (opts.codeFile ? await readOptionalFile(opts.codeFile) : "");

      // Frage
      const question =
        opts.question ??
        (await promptText(
          "Deine konkrete Frage",
          "Was ist die Root Cause und wie löse ich das Problem?"
        ));

      // ══════════════════════════════════════════════════════════════════════
      // Git-Kontext sammeln
      // ══════════════════════════════════════════════════════════════════════
      // eslint-disable-next-line no-console
      console.log("\n📊 Sammle Git-Kontext...");

      const [log, stat, diff, nameStatus] = await Promise.all([
        gitLogOneline(repoRoot, 10),
        gitDiffStat(repoRoot),
        opts.detailed ? gitDiffText(repoRoot, { maxLines: 300 }) : Promise.resolve(""),
        gitDiffNameStatus(repoRoot),
      ]);

      // ══════════════════════════════════════════════════════════════════════
      // Kontext-Export (Dateien inkludieren)
      // ══════════════════════════════════════════════════════════════════════
      let contextExportXml = "";

      if (opts.include && opts.include.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`📁 Exportiere Dateien: ${opts.include.join(", ")}`);
        
        const ctx = await exportFiles(repoRoot, opts.include);
        contextExportXml = renderContextExportXml(ctx);
        
        // eslint-disable-next-line no-console
        console.log(`   → ${ctx.totalFiles} Dateien, ~${ctx.totalLines} Zeilen`);
        if (ctx.truncated) {
          // eslint-disable-next-line no-console
          console.log(`   ⚠️ Truncated (Limit erreicht)`);
        }
      } else if (opts.autoInclude) {
        // eslint-disable-next-line no-console
        console.log("📁 Auto-Detect relevante Dateien...");
        
        const files = await autoDetectFiles(repoRoot, nameStatus);
        
        if (files.length > 0) {
          // eslint-disable-next-line no-console
          console.log(`   Gefunden: ${files.join(", ")}`);
          
          const doInclude = await promptConfirm(`Diese ${files.length} Dateien inkludieren?`, true);
          
          if (doInclude) {
            const ctx = await exportFiles(repoRoot, files);
            contextExportXml = renderContextExportXml(ctx);
            
            // eslint-disable-next-line no-console
            console.log(`   → ${ctx.totalFiles} Dateien, ~${ctx.totalLines} Zeilen`);
          }
        } else {
          // eslint-disable-next-line no-console
          console.log("   Keine relevanten Dateien gefunden.");
        }
      } else if (!codeSnippets && !opts.code && !opts.codeFile) {
        // Ask if user wants to include files
        const wantInclude = await promptConfirm("Möchtest du Dateien inkludieren?", false);
        
        if (wantInclude) {
          const files = await autoDetectFiles(repoRoot, nameStatus);
          
          if (files.length > 0) {
            // eslint-disable-next-line no-console
            console.log(`   Auto-detected: ${files.join(", ")}`);
            
            const useAuto = await promptConfirm("Diese Dateien verwenden?", true);
            
            if (useAuto) {
              const ctx = await exportFiles(repoRoot, files);
              contextExportXml = renderContextExportXml(ctx);
              // eslint-disable-next-line no-console
              console.log(`   → ${ctx.totalFiles} Dateien, ~${ctx.totalLines} Zeilen`);
            } else {
              const pattern = await promptText("Glob-Pattern eingeben (z.B. src/**/*.ts)", "");
              if (pattern) {
                const ctx = await exportFiles(repoRoot, [pattern]);
                contextExportXml = renderContextExportXml(ctx);
                // eslint-disable-next-line no-console
                console.log(`   → ${ctx.totalFiles} Dateien, ~${ctx.totalLines} Zeilen`);
              }
            }
          }
        }
      }

      // Merge context export with code snippets
      if (contextExportXml) {
        codeSnippets = contextExportXml + (codeSnippets ? `\n\n${codeSnippets}` : "");
      }

      // ══════════════════════════════════════════════════════════════════════
      // Eskalations-Prompt generieren
      // ══════════════════════════════════════════════════════════════════════
      const prompt = renderEscalationPrompt({
        cursorExplanation,
        errorText,
        gitLog: log,
        gitDiff: opts.detailed ? diff : stat,
        question,
        codeSnippets: codeSnippets || undefined,
        attempts: attempts.length > 0 ? attempts : undefined,
      });

      // ══════════════════════════════════════════════════════════════════════
      // Speichern
      // ══════════════════════════════════════════════════════════════════════
      const ts = timestampId();
      const filename = `${ts}-escalate.md`;
      const content = [
        `# Eskalation (${ts})`,
        ``,
        `## Anleitung`,
        ``,
        `1. **Kopiere** den Prompt unten`,
        `2. **Füge ein** in ChatGPT, Claude, GPT-5 oder Opus`,
        `3. **Lies** die Analyse und Schritt-für-Schritt Anweisungen`,
        `4. **Gib** die Anweisungen an Cursor weiter (NICHT blind Code kopieren!)`,
        ``,
        `---`,
        ``,
        `## Prompt`,
        ``,
        "```",
        prompt,
        "```",
        ``,
        `---`,
        ``,
        `## Metadaten`,
        `- Erstellt: ${new Date().toISOString()}`,
        `- Versuche dokumentiert: ${attempts.length}`,
        `- Git-Context: ${log ? "✅" : "❌"}`,
        `- Dateien inkludiert: ${contextExportXml ? "✅" : "❌"}`,
        ``,
      ].join("\n");

      const p = await writeArtifact(repoRoot, "escalations", filename, content);

      // ══════════════════════════════════════════════════════════════════════
      // Ausgabe
      // ══════════════════════════════════════════════════════════════════════
      // eslint-disable-next-line no-console
      console.log(`\n✅ Gespeichert: ${p}`);

      // Clipboard
      if (opts.clipboard) {
        const clipboardMsg = await copyAndNotify(prompt);
        // eslint-disable-next-line no-console
        console.log(clipboardMsg);
      }

      // eslint-disable-next-line no-console
      console.log(`\n${"═".repeat(60)}`);
      // eslint-disable-next-line no-console
      console.log(`\n📋 ESKALATIONS-PROMPT${opts.clipboard ? " (kopiert)" : ""}:\n`);
      // eslint-disable-next-line no-console
      console.log(prompt);
      // eslint-disable-next-line no-console
      console.log(`\n${"═".repeat(60)}`);
      // eslint-disable-next-line no-console
      console.log(`\n💡 Tipp: Die Antwort enthält Schritt-für-Schritt Anweisungen für Cursor.\n`);
    });
}
