# RFC / Feedback for OpenAI (Canvas Team)

**Subject:** Feature Request: Explicit "Context Locking" for Canvas
**To:** devrel@openai.com (or via Developer Forum)

---

**Context:**
We use Canvas as the primary "Layer 2" (Build Environment) in our **Pulse Framework**. While Canvas is great for drafting, it lacks the "State Management" required for complex engineering loops.

**The Problem: Drift**
As a conversation grows, the model loses track of the initial constraints ("Use TypeScript interfaces, not types"). It drifts. We currently have to copy-paste constraints into every 3rd message.

**The Feature Request (Technically Feasible):**
We need **Explicit State Locking**.

1.  **"Pin as Spec" Button:** Allow us to highlight a text block (e.g., the initial prompt or a requirements list) and mark it as **Immutable Context**.
2.  **Behavior:** The model must check this "Pinned Spec" before generating *any* code, regardless of how long the chat becomes.
3.  **Visual Indicator:** Show us that the model is "Aligning with Pinned Spec".

**Why this matters:**
This feature turns Canvas from a "Drafting Tool" into a "Maintenance Tool". It enables long-running refactoring sessions without context decay.

**Reference:**
[GitHub: PulseFramework/CHALLENGES.md]

Best,
[Your Name]
