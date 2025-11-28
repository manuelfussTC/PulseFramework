# RFC / Feedback for GitHub Next (Copilot Workspace)

**Subject:** Architectural Flaw: "One-Shot" Workflow vs. Model Specialization
**To:** next@github.com

---

**Context:**
We are evaluating Copilot Workspace against the **Pulse Framework**. We appreciate the task-centric approach, but the current implementation treats "Plan" and "Code" as a single continuous stream.

**The Problem: Model Collapse**
You are likely using the same model class (or a blend) for both Planning and Coding.
In **Pulse**, we strictly separate **Layer 1 (Reasoning)** from **Layer 2 (Execution)**.
Using a fast model for planning leads to hallucinated dependencies. Using a slow reasoning model for coding leads to timeouts and verbosity.

**The Feature Request (Strategic):**
We need **Explicit Model Binding per Step**.

1.  **The Plan Step:** Must force the use of a Reasoning Model (e.g., **GPT-5.1** or **o1-class** logic). It should not write code, only spec.
2.  **The Code Step:** Must switch to a High-Velocity Model (e.g., **GPT-4o** or **Sonnet**).
3.  **The Gate:** The user *must* approve the Plan (Layer 1) before the Code Model (Layer 2) is even instantiated.

**Why this matters:**
This prevents "Cascading Hallucination". If the Plan is wrong, the Code *will* be wrong. We need a hard stop between them.

**Reference:**
[GitHub: PulseFramework/spec/pulse-spec-v1.md]

Best,
[Your Name]
