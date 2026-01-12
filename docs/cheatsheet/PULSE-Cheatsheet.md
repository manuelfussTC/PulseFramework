# PULSE Cheat-Sheet

> "The loop runs. You set the impulses."

Quick Reference for controlled AI-assisted development.

---

## 01 · The Core: Controlled Loops

AI runs autonomously in a loop. You steer only at crucial points.

`Start-Pulse → Loop → Correction → Loop → Review`

**Key insight:** AI development isn't about finding the perfect prompt, but about having a good conversation with the AI.

---

## 02 · The 3-Layer Architecture

Each tool has its role. Don't mix them.

| Layer | Tool | Purpose |
|-------|------|---------|
| 1: Concept | ChatGPT / Claude | Think, don't build |
| 2: Build | Cursor | Build, don't think |
| 3: Escalation | GPT-5 / Opus | When the loop breaks |

---

## 03 · The 6-Element Framework

Minimum 3-4 elements per prompt. One action per prompt.

| Element | Question |
|---------|----------|
| Role | Who is the AI? |
| Context | What's the situation? |
| Input | What are you providing? |
| Output | What should come out? |
| Action | What should the AI DO? |
| Examples | How should it (not) look? |

---

## 04 · The 30-Minute Rule

The most important rule from 10,000+ hours of Agent Mode.

⚠️ **NEVER** leave Agent Mode unsupervised for more than 30 min.

After 30 min:
- Context lost
- Builds in wrong direction
- Overwrites working things

**Action:** Set timer → Watch → Every 30 min: Checkpoint

---

## 05 · The 5 Critical Safeguards

Non-negotiable rules for .cursorrules

1. DELETE only after confirmation
2. GIT PUSH only after confirmation
3. Test locally first, then deploy
4. No breaking changes without warning
5. No secrets in code

---

## 06 · Loop Detection

Recognize and act on the 4 most common loop types.

| Loop Type | Action |
|-----------|--------|
| "is fixed" but not | STOP → Reject → Escalate |
| Back-and-forth A↔B | Git Reset → Clear decision |
| Doesn't understand problem | Chat: "Explain what you understand" |
| Doing too much at once | Give smaller milestones |

---

## 07 · 3-Stage Escalation

Not panic, but process.

| Stage | When | What to do |
|-------|------|------------|
| 1 (80%) | First attempt | "Explain our problem" |
| 2 (15%) | Cursor is stuck | Ask ChatGPT/Claude |
| 3 (5%) | Very complex | Model-Switch: GPT-5/Opus |

---

## 08 · Git as Safety Net

Git isn't just version control. It's your most important safety tool.

| When | What |
|------|------|
| Before start | `git checkout -b feature/xyz` |
| Every 5-10 min | Commit (review it!) |
| On problem | `git reset --hard HEAD~1` |
| After feature | Push + PR (outside Cursor) |

---

## 09 · .cursorrules as Memory

Every solved problem makes your project smarter.

**Workflow:**
Problem solved → "Document in .cursorrules" → Next time automatically correct

✓ Self-learning system  
✓ New devs benefit automatically  
✓ Consistent code quality in team

---

## 10 · Review Checklist

After every Agent Mode session or every 30 min.

| Area | Questions |
|------|-----------|
| Code | Do I understand it? Naming ok? |
| Function | Does it work? Tested locally? |
| Security | No secrets? Input validation? |
| Git | Commit messages clear? |

---

## 11 · Red Flags – Immediate Action

When you see this: STOP and act.

🚩 Code you don't understand  
🚩 Hundreds of lines in one commit  
🚩 Dependencies you don't know  
🚩 Deleted files without asking  
🚩 Production URLs in code  
🚩 "I can't do anything without AI anymore"

---

## 12 · The 3 Biggest Beginner Mistakes

What devs do wrong – and how to do it right.

| Mistake | Solution |
|---------|----------|
| Impatience | AI development IS iteration |
| Too vague | Be concrete: What, How, Why |
| Own standards | Correct the result, not the path |

**Remember:** AI without developers is garbage. Developers without AI too. Together: unbeatable.

---

## More

- **Full Framework:** [PULSE Framework](https://github.com/manuelfussTC/PulseFramework)
- **Website:** [manuel-fuss.de](https://manuel-fuss.de)
- **Questions?** kontakt@manuel-fuss.de

---

*© 2025 Manuel Fuß · RSLT.DIGITAL*
