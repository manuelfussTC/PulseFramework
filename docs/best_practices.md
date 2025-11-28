# Pulse Framework: Best Practices & Wisdom

This document captures the "Hard Truths" of AI-assisted engineering. These learnings come from hundreds of hours of production usage.

## Part 1: The Art of Prompting (6 Elements Deep Dive)

Effective prompts are not magic; they are structured data.

### 1. Role (Who?)
*   **Bad:** "You are a coder."
*   **Good:** "You are a Senior React Engineer specialized in Performance Optimization."
*   *Why:* Sets the vocabulary and priority (e.g., speed vs. readability).

### 2. Context (Where?)
*   **Bad:** "Fix this file."
*   **Good:** "We are in the `auth-service`. This module handles JWT validation. We use `passport.js`."
*   *Why:* Prevents hallucination of libraries you don't use.

### 3. Input (What?)
*   **Bad:** "The login function."
*   **Good:** "The `validateUser` function in `src/auth.ts`, lines 50-85."
*   *Why:* Narrows the edit scope, reducing "drive-by" refactoring risks.

### 4. Action (How?)
*   **Bad:** "Refactor it."
*   **Good:** "Extract the validation logic into a helper function `isValid()`. Do not change the function signature."
*   *Why:* Defines the *shape* of the change.

### 5. Output (Format?)
*   **Bad:** "Show me code."
*   **Good:** "Return a unified diff. No explanation text needed."
*   *Why:* Saves energy (tokens) and makes it easier to copy-paste.

### 6. Examples (Like what?)
*   **Bad:** (None)
*   **Good:** "See `src/utils/validation.ts` for the expected error handling pattern."
*   *Why:* One-shot learning significantly reduces style drift.

---

## Part 2: The Debugging Protocol

When the Agent fails, do not just type "Try again". Follow this protocol:

### The 3-Step Debug Workflow
1.  **Analyze (Layer 3):** Before asking for a fix, ask the model to *explain* why it failed.
    *   *Prompt:* "Don't fix it yet. Explain why the previous code caused a RangeError."
2.  **Hypothesize:** Formulate a theory.
3.  **Direct:** Instruct the Agent to fix based on the theory.

### The 50/50 Rule (Rollback vs. Fix)
When facing a broken build after an Agent edit:
*   **Case A (50%):** You understand the error (e.g., missing import). -> **Fix Forward.**
*   **Case B (50%):** The code looks "magical" or complex, and you don't know why it fails. -> **Rollback Immediately.** Never debug code you don't understand.

---

## Part 3: Red Flags (When to Stop)

If you feel any of these, **STOP**. You have lost control of the loop.

1.  **"I just copy what the AI says."** -> You are passive. The AI is the driver. Dangerous.
2.  **"I don't understand this regex, but it works."** -> You are introducing tech debt.
3.  **"Everything is getting slower."** -> You are burning out. Take a break.

