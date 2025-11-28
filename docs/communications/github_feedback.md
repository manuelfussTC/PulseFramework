# RFC / Feedback for GitHub Next (Copilot Workspace)

**Subject:** "Copilot Workspace" violates 3-Layer Architecture principles
**To:** next@github.com

---

**Context:**
We are evaluating Copilot Workspace against the **Pulse Framework** (our internal standard for controlled AI development). While we admire the "Task-centric" approach, the current implementation encourages a "One-Shot" workflow that is dangerous for complex software.

**The Problem: Collapsed Layers**
Copilot Workspace tries to go from "Issue" (Concept) to "Plan" to "Code" (Build) in one continuous flow.
In **Pulse**, we strictly separate **Layer 1 (Concept/Plan)** from **Layer 2 (Build/Code)**.
Why? because hallucinations in the Plan phase ("I will use library X") propagate into the Build phase before the human can verify if library X is the right choice.

**The Technical Challenge / Request:**
We need a **"Stop-at-Plan" Configuration**.

1.  **Mandatory Gate:** A setting where the Agent *cannot* generate code until the Human has explicitly approved the "Plan" step. Currently, it feels too easy to "Run all".
2.  **Layer Separation:** The model used for Planning (Reasoning) should be distinct from the model used for Coding (Token prediction). Allow us to configure specific reasoning models (e.g., o1) for the Plan step and execution models for the Code step.
3.  **Pulse Integration:** We want to define a "Definition of Done" (e.g., "Passes CI") that automatically triggers a "Review Pulse" notification.

**Reference:**
See our spec on "The 3-Layer Architecture": [GitHub: PulseFramework/spec/pulse-spec-v1.md]

We believe GitHub is uniquely positioned to enforce these standards via the PR workflow.

Best,
[Your Name]

