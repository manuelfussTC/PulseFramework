# Reddit Post - Copy/Paste Ready

**Subreddit:** r/cursor, r/ChatGPTCoding, r/artificial

---

## Title (copy this):

I built safeguards for Cursor's Agent Mode - here's what it does (open source)

---

## Body (copy everything below this line):

After losing hours of work to runaway AI agents (twice 😅), I built **Pulse Framework** - a safety system for AI-assisted coding.

**The problem:** Cursor's Agent Mode is powerful but dangerous. Agents can:

- Work for hours without saving
- Delete files without asking  
- Get stuck in infinite debugging loops
- Commit secrets to your repo

**What Pulse does:**

⏱️ **30-minute checkpoint reminders** - Agent works 2 hours without saving? Not anymore.

🛡️ **Delete guard** - Requires confirmation before any deletion

🔐 **Secrets scanner** - Blocks commits with API keys/passwords

🔄 **Loop detection** - Detects fix-chains and triggers escalation

📋 **Session detection** - Shows "Ready" on new day (no false "999 min ago" warnings)

🏥 **Auto health checks** - Every 30 min checks git status & change size

**How it works:**

1. Install the VS Code/Cursor extension
2. Click "Setup Pulse" 
3. Done - safeguards are active

The extension adds a status bar timer, automatic health checks, and MCP integration so the AI itself follows the safety rules.

**321 downloads in the first day** 📈

**Links:**

- Extension: [OpenVSX](https://open-vsx.org/extension/pulse-framework/pulse-framework)
- GitHub: [PulseFramework](https://github.com/manuelfussTC/PulseFramework)
- MIT licensed, completely free

Would love feedback! What safety features would you add?

---

## ALTERNATIVE: Shorter version

**Title:** Open source safeguards for Cursor Agent Mode - 321 downloads in day 1

**Body:**

Built this after losing work to runaway agents twice. Pulse Framework adds:

⏱️ 30-min checkpoint reminders

🛡️ Delete confirmation guards

🔐 Secrets scanner

🔄 Loop detection

🏥 Auto health checks every 30 min

One-click setup in Cursor. MIT licensed.

Links:

- Extension: https://open-vsx.org/extension/pulse-framework/pulse-framework
- GitHub: https://github.com/manuelfussTC/PulseFramework

What safety features would you add?
