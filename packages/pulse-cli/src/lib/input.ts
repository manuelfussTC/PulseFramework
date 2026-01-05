import readline from "node:readline/promises";

/**
 * Prompt for text input with optional default value
 */
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

/**
 * Prompt for selection from a list of choices
 */
export async function promptSelect(
  label: string,
  choices: Array<{ value: string; label: string }>,
  defaultValue?: string
): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // eslint-disable-next-line no-console
    console.log(`${label}:\n`);

    choices.forEach((choice, index) => {
      const marker = defaultValue === choice.value ? " (default)" : "";
      // eslint-disable-next-line no-console
      console.log(`  ${index + 1}. ${choice.label}${marker}`);
    });

    // eslint-disable-next-line no-console
    console.log("");

    const ans = await rl.question("Nummer wählen: ");
    const num = parseInt(ans.trim(), 10);

    if (num >= 1 && num <= choices.length) {
      const choice = choices[num - 1];
      if (choice) return choice.value;
    }

    // If user typed the value directly
    const found = choices.find(
      (c) => c.value.toLowerCase() === ans.trim().toLowerCase()
    );
    if (found) {
      return found.value;
    }

    // Return default or first choice
    if (defaultValue) return defaultValue;
    const first = choices[0];
    return first ? first.value : "";
  } finally {
    rl.close();
  }
}

/**
 * Prompt for yes/no confirmation
 */
export async function promptConfirm(label: string, defaultYes = false): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const hint = defaultYes ? "(J/n)" : "(j/N)";
    const ans = await rl.question(`${label} ${hint}: `);
    const v = ans.trim().toLowerCase();

    if (v === "j" || v === "y" || v === "ja" || v === "yes") return true;
    if (v === "n" || v === "nein" || v === "no") return false;

    return defaultYes;
  } finally {
    rl.close();
  }
}
