import readline from "node:readline/promises";

export async function promptText(label: string, defaultValue = ""): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const q = defaultValue ? `${label} (default: ${defaultValue}): ` : `${label}: `;
    const ans = await rl.question(q);
    const v = ans.trim();
    return v.length ? v : defaultValue;
  } finally {
    rl.close();
  }
}

