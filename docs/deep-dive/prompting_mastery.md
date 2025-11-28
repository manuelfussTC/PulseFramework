# Pulse Deep Dive: Prompting Mastery

The difference between a Junior Agent User and a Pulse Engineer is the prompt structure.
We do not chat. We dispatch commands.

## The 6-Element Framework

### 1. Role (The "Who")
Sets the persona and priority.
*   **Junior:** "You are an expert coder."
*   **Pulse:** "You are a Senior Security Engineer focusing on OWASP vulnerabilities."

### 2. Context (The "Where")
Prevents hallucination.
*   **Pulse:** "We are in the `user-service`. We use `PostgreSQL` with `Prisma`. We do NOT use raw SQL."

### 3. Input (The "What")
Defines the scope.
*   **Pulse:** "The `registerUser` function in `src/auth/controller.ts`."

### 4. Action (The "How")
Defines the transformation.
*   **Pulse:** "Add a rate limiter to this function. Use the existing `RateLimitMiddleware`."

### 5. Output (The "Format")
Saves tokens and time.
*   **Pulse:** "Output only the modified function. No explanation."

### 6. Examples (The "Guide")
One-shot learning.
*   **Pulse:** "See `src/auth/login.ts` for how we handle rate limiting there."

---

## The 3 Biggest Beginner Mistakes

### Mistake 1: Impatience + "Set in Stone"
*   **Scenario:** You dump a massive 500-line requirement and expect it to work instantly.
*   **Result:** The Agent generates garbage. You spend 2 hours fixing it.
*   **Pulse Fix:** Iterative Development. Build the skeleton first. Then fill the logic. Then add error handling.

### Mistake 2: Vague Assumptions
*   **Scenario:** "Make it look better."
*   **Result:** The Agent rewrites your entire CSS architecture.
*   **Pulse Fix:** Be specific. "Increase the padding to 16px and change the border color to #333."

### Mistake 3: Sticking to your own Standards
*   **Scenario:** You fight the Agent to write code *exactly* how you would.
*   **Result:** You waste energy on trivial style preferences.
*   **Pulse Fix:** If it works, is readable, and safe -> Accept it. Don't bikeshed.

---

## The Iterative Principle: Developing Together
Pulse is not "Fire and Forget". It is a tennis match.
1.  **Serve (Start Pulse):** You define the task.
2.  **Return (Agent Code):** Agent generates V1.
3.  **Volley (Correction Pulse):** You spot a bug. "Fix the null check."
4.  **Return (Agent Fix):** Agent generates V2.
5.  **Smash (Review Pulse):** You merge it.

