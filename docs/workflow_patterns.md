# Pulse Workflow Patterns

Different engineering tasks require different Loop Structures. Do not use a "one size fits all" approach.

## 1. The Feature Expansion Loop
*Goal: Add functionality to existing code.*

**The Flow:**
1.  **Context (Layer 1):** Read the existing file. Ask: "What is the pattern here?"
2.  **Start Pulse (Layer 2):** "Implement feature X using the same pattern as feature Y."
3.  **Correction Pulse:** Adjust for edge cases.
4.  **Review Pulse:** Verify against requirements.

**Prompt Starter:**
> "Role: Senior Frontend Dev. Context: We are in `App.tsx`. Action: Add a new route for `/settings`. Use the same layout wrapper as the `/profile` route. Output: Code only."

---

## 2. The Bug Fix Loop
*Goal: Resolve a known error.*

**The Flow:**
1.  **Reproduction (Layer 1):** Create a failing test case or reproduction script. **Never start fixing without this.**
2.  **Start Pulse (Layer 2):** "Make this test pass."
3.  **Review Pulse:** Ensure the fix didn't break other tests.

**Prompt Starter:**
> "Context: The test `auth.test.ts` is failing with `401 Unauthorized`. Input: The `login()` function in `auth.ts`. Action: Fix the logic to handle the token expiration correctly. Ensure the test passes."

---

## 3. The Analysis Loop (Read-Only)
*Goal: Understand complex code or plan a refactor.*

**The Flow:**
1.  **Constraint:** Agent is NOT allowed to write code.
2.  **Start Pulse:** "Analyze file X and explain how data flows to Y."
3.  **Output:** A Markdown summary or a Diagram.

**Prompt Starter:**
> "Role: Lead Architect. Task: Audit `payment.ts`. Identify any potential race conditions in the transaction flow. Output: A bulleted list of risks. Do not generate code."

---

## 4. The Refactor Loop
*Goal: Improve structure without changing behavior.*

**The Flow:**
1.  **Safety:** Commit before starting.
2.  **Start Pulse:** "Extract this logic. Strict constraint: logic must remain identical."
3.  **Review Pulse:** Diff check. Did logic change?

**Prompt Starter:**
> "Action: Refactor the `processData` function. Extract the validation steps into a separate file `validators.ts`. Constraint: The external API of `processData` must remain exactly the same."

