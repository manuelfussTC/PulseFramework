# Pulse Deep Dive: Git as a Safety Net

In Agentic Development, Git is not just for version control. It is your **Save Point**.

Agents are powerful but volatile. They can delete 500 lines of code in a second because they "thought it was better." If you don't have a clean state to revert to, you are dead.

## The Checkpoint Strategy

### 1. The 5-10 Minute Rule
**Never let an Agent run for more than 10 minutes without a commit.**
Even if the feature isn't done. Even if the code is messy.
Commit with a WIP tag: `wip: agent checkpoint`.

**Why?**
If the Agent hallucinates in minute 12 and destroys the project structure, you want to revert to minute 10, not minute 0.

### 2. The "Pre-Prompt" Save
**Rule:** Before you write a complex prompt (e.g., "Refactor the entire auth module"), **COMMIT.**
This is your "Undo Button". If the Agent messes up the refactor (which happens 30% of the time), you can simply `git reset --hard`.

### 3. Branching for Experiments
**Pattern:**
- `main`: Stable.
- `feature/xyz`: Your active work.
- `experiment/agent-refactor`: A throwaway branch for big Agent tasks.

**Workflow:**
1. `git checkout -b experiment/try-new-ui`
2. "Agent, rewrite the UI to use Tailwind."
3. Review.
4. If good -> Merge to `feature/xyz`.
5. If bad -> Delete branch. No harm done.

## Commit Message Standards
Pulse Commits are detailed (because English is the programming language).

**Bad:**
`fix stuff`

**Good:**
`refactor(auth): extract validation logic to helper (Agent Pulse 2)`

**Why?**
You need to know *which* Pulse cycle introduced a change when debugging later.

