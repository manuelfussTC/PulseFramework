/**
 * Context Export - Selective file export for escalation
 */

import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";

export type FileExport = {
  path: string;
  content: string;
  lines: number;
};

export type ContextExport = {
  files: FileExport[];
  totalFiles: number;
  totalLines: number;
  truncated: boolean;
};

const MAX_LINES_PER_FILE = 500;
const MAX_TOTAL_LINES = 2000;

/**
 * Read and export specific files
 */
export async function exportFiles(
  repoRoot: string,
  patterns: string[]
): Promise<ContextExport> {
  const files: FileExport[] = [];
  let totalLines = 0;
  let truncated = false;

  for (const pattern of patterns) {
    // Resolve glob pattern
    const matches = await glob(pattern, {
      cwd: repoRoot,
      nodir: true,
      ignore: ["node_modules/**", ".git/**", "dist/**", "build/**", ".pulse/**"],
    });

    for (const match of matches) {
      if (totalLines >= MAX_TOTAL_LINES) {
        truncated = true;
        break;
      }

      try {
        const fullPath = path.join(repoRoot, match);
        const content = await fs.readFile(fullPath, "utf8");
        const lines = content.split("\n").length;

        // Truncate if too long
        let exportContent = content;
        if (lines > MAX_LINES_PER_FILE) {
          const truncLines = content.split("\n").slice(0, MAX_LINES_PER_FILE);
          exportContent = truncLines.join("\n") + `\n\n// ... truncated (${lines - MAX_LINES_PER_FILE} more lines)`;
          truncated = true;
        }

        files.push({
          path: match,
          content: exportContent,
          lines: Math.min(lines, MAX_LINES_PER_FILE),
        });

        totalLines += Math.min(lines, MAX_LINES_PER_FILE);
      } catch {
        // Skip files that can't be read
      }
    }

    if (truncated) break;
  }

  return {
    files,
    totalFiles: files.length,
    totalLines,
    truncated,
  };
}

/**
 * Auto-detect relevant files from git diff
 */
export async function autoDetectFiles(
  repoRoot: string,
  diffNameStatus: string
): Promise<string[]> {
  const files: string[] = [];
  
  for (const line of diffNameStatus.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;
    
    const status = parts[0];
    const file = parts[1];
    
    // Include modified and added files
    if ((status === "M" || status === "A") && file) {
      // Skip non-code files
      if (isCodeFile(file)) {
        files.push(file);
      }
    }
  }
  
  return files;
}

/**
 * Check if file is a code file
 */
function isCodeFile(filepath: string): boolean {
  const codeExtensions = [
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".rs", ".java", ".kt",
    ".c", ".cpp", ".h", ".hpp", ".cs",
    ".vue", ".svelte", ".astro",
    ".json", ".yaml", ".yml", ".toml",
    ".sql", ".graphql", ".gql",
    ".sh", ".bash", ".zsh",
    ".css", ".scss", ".less",
    ".html", ".xml",
  ];
  
  const ext = path.extname(filepath).toLowerCase();
  return codeExtensions.includes(ext);
}

/**
 * Render context export as markdown
 */
export function renderContextExport(ctx: ContextExport): string {
  const lines: string[] = [];
  
  lines.push(`## Kontext-Export`);
  lines.push(``);
  lines.push(`**${ctx.totalFiles} Dateien, ~${ctx.totalLines} Zeilen**`);
  if (ctx.truncated) {
    lines.push(`⚠️ Truncated (Limit: ${MAX_TOTAL_LINES} Zeilen)`);
  }
  lines.push(``);
  
  for (const file of ctx.files) {
    const ext = path.extname(file.path).slice(1) || "txt";
    lines.push(`### \`${file.path}\` (${file.lines} Zeilen)`);
    lines.push(``);
    lines.push("```" + ext);
    lines.push(file.content);
    lines.push("```");
    lines.push(``);
  }
  
  return lines.join("\n");
}

/**
 * Render context export in XML-style for AI models
 */
export function renderContextExportXml(ctx: ContextExport): string {
  const lines: string[] = [];
  
  lines.push(`<context_export files="${ctx.totalFiles}" lines="${ctx.totalLines}"${ctx.truncated ? ' truncated="true"' : ''}>`);
  lines.push(``);
  
  for (const file of ctx.files) {
    lines.push(`<file path="${file.path}" lines="${file.lines}">`);
    lines.push(file.content);
    lines.push(`</file>`);
    lines.push(``);
  }
  
  lines.push(`</context_export>`);
  
  return lines.join("\n");
}
