# Pulse Framework: The "Short-List" Prompt Recipes
# Copy-paste these into your agent for instant Pulse-compliance.

## 1. The "Start Pulse" (Initialization)
> "Act as a [Role]. Context: [Project/File]. Task: [Action]. Constraints: Follow Pulse Spec v1.0. Do NOT delete files without confirmation. Step 1: Analyze the requirement and provide a Strategy (Layer 1) before writing any code. Examples: [Optional]."

## 2. The "Correction Pulse" (Steering)
> "Stop. You are deviating from the Layer 1 Strategy. The logic in [File] violates the [Constraint]. Revert the last change and suggest a new approach that respects the original architecture. Do not refactor unrelated code."

## 3. The "Review Pulse" (Verification)
> "The implementation is complete. Now perform a Review Pulse. 
> 1. Run all relevant tests.
> 2. Check for 'Any' types or tech debt.
> 3. Summarize the changes in a technical log format.
> 4. Ask me: 'Do you understand this code?' before I commit."

## 4. The "Escalation Pulse" (Stuck)
> "We have failed this task twice. Stop the Build Loop. Provide a root cause analysis (Layer 3). Why is the agent looping? Is the requirement contradictory? What reasoning-model should we use to solve this?"

