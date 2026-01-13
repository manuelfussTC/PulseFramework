# Reddit Post - Copy/Paste Ready

**Subreddit:** r/cursor, r/ChatGPTCoding, r/artificial

**Title:**
```
I built safeguards for Cursor's Agent Mode - here's what it does (open source)
```

---

**Body:**

After losing hours of work to runaway AI agents (twice 😅), I built **Pulse Framework** - a safety system for AI-assisted coding.

**The problem:** Cursor's Agent Mode is powerful but dangerous. Agents can:
- Work for hours without saving
- Delete files without asking
- Get stuck in infinite debugging loops
- Commit secrets to your repo

**What Pulse does:**

| Problem | Pulse Solution |
|---------|----------------|
| Agent works 2 hours without saving | ⏱️ 30-minute checkpoint reminders |
| Accidental deletions | 🛡️ Delete guard requires confirmation |
| Secrets in commits | 🔐 Secrets scanner blocks commits |
| Stuck in loops | 🔄 Loop detection triggers escalation |
| Lost context after breaks | 📋 Session detection shows "Ready" on new day |

**How it works:**
1. Install the VS Code/Cursor extension
2. Click "Setup Pulse" 
3. Done - safeguards are active

The extension adds a status bar timer, automatic health checks every 30 min, and MCP integration so the AI itself follows the safety rules.

**321 downloads in the first day** 📈 *(see screenshot)*

**Links:**
- 🔗 Extension: https://open-vsx.org/extension/pulse-framework/pulse-framework
- 📦 GitHub: https://github.com/manuelfussTC/PulseFramework
- MIT licensed, completely free

Would love feedback! What safety features would you add?

---

## Alternative shorter version

**Title:**
```
Open source safeguards for Cursor Agent Mode - 321 downloads in day 1
```

**Body:**

Built this after losing work to runaway agents twice. Pulse Framework adds:

✅ 30-min checkpoint reminders  
✅ Delete confirmation guards  
✅ Secrets scanner  
✅ Loop detection  
✅ Auto health checks  

One-click setup in Cursor. MIT licensed.

Extension: https://open-vsx.org/extension/pulse-framework/pulse-framework  
GitHub: https://github.com/manuelfussTC/PulseFramework

What safety features would you add?
