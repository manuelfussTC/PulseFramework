# RFC / Feedback for OpenAI (Canvas Team)

**Subject:** Architectural Gaps in "Canvas" for rigorous Engineering Loops
**To:** devrel@openai.com (or via Developer Forum)

---

**Context:**
We are testing "Canvas" as a potential implementation of the **Pulse Framework** (Layer 2 Build Environment). Canvas excels at "One-Shot" tasks but currently fails to support "Controlled Loops" required for serious engineering.

**The Problem: Lack of Correction Pulse State**
In our **Pulse Methodology**, a "Correction Pulse" is a distinct state where a human guides a diverging agent back to the spec. Canvas treats every interaction as a linear chat. There is no concept of "Revert to State A, keep Context B."

**The Pulse Solution:**
We currently have to copy-paste context manually between chats to simulate a "clean retry."

**The Technical Challenge / Request:**
We need **Branching Conversations** in the UI.

1.  **Checkpointing:** Allow us to mark a specific state in Canvas as a "Checkpoint."
2.  **Escalation Trigger:** If we ask for a revision 3 times, Canvas should automatically suggest switching the underlying model context window or strategy (e.g., "Do you want to plan this step-by-step before coding?"), mirroring our **Layer 3 Escalation** protocol.
3.  **Diff Visibility:** We need to see a unified diff of *changes since the last checkpoint*, not just the current snapshot. This is the only way to implement a **Review Pulse**.

**Reference:**
See our "State Drift" challenge in [GitHub: PulseFramework/CHALLENGES.md].

Canvas has the potential to be the default Build Layer, but only if it respects engineering rigor over conversational fluency.

Best,
[Your Name]

