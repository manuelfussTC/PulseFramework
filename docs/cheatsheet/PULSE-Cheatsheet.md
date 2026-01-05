# PULSE Cheat-Sheet

> "Der Loop läuft. Du setzt die Impulse."

Quick Reference für kontrollierte KI-gestützte Entwicklung.

---

## 01 · Der Kern: Kontrollierte Loops

KI läuft autonom im Loop. Du steuerst nur an entscheidenden Punkten.

`Start-Pulse → Loop → Korrektur → Loop → Review`

**Merksatz:** KI-Entwicklung ist nicht den perfekten Prompt finden, sondern ein gutes Gespräch mit der KI führen.

---

## 02 · Die 3-Ebenen-Architektur

Jedes Tool hat seine Rolle. Nicht mischen.

| Ebene | Tool | Zweck |
|-------|------|-------|
| 1: Konzept | ChatGPT / Claude | Denken, nicht Bauen |
| 2: Build | Cursor | Bauen, nicht Denken |
| 3: Eskalation | GPT-5 / Opus | Wenn der Loop kippt |

---

## 03 · Das 6-Elemente-Framework

Minimum 3-4 Elemente pro Prompt. Eine Action pro Prompt.

| Element | Frage |
|---------|-------|
| Rolle | Wer ist die KI? |
| Kontext | Was ist die Situation? |
| Input | Was gibst du mit? |
| Output | Was soll rauskommen? |
| Action | Was soll die KI TUN? |
| Beispiele | Wie soll es (nicht) aussehen? |

---

## 04 · Die 30-Minuten-Regel

Die wichtigste Regel aus 10.000+ Stunden Agent Mode.

⚠️ **NIEMALS** Agent Mode länger als 30 Min unbeaufsichtigt lassen.

Nach 30 Min:
- Kontext verloren
- Baut in falsche Richtung
- Überschreibt funktionierende Sachen

**Action:** Timer stellen → Zuschauen → Alle 30 Min: Checkpoint

---

## 05 · Die 5 Critical Safeguards

Non-negotiable Regeln für .cursorrules

1. DELETE nur nach Nachfrage
2. GIT PUSH nur nach Nachfrage
3. Erst lokal testen, dann deployen
4. Keine Breaking Changes ohne Warning
5. Keine Secrets im Code

---

## 06 · Loop Detection

Die 4 häufigsten Loop-Typen erkennen und handeln.

| Loop-Typ | Action |
|----------|--------|
| "ist gefixt" aber nicht | STOP → Reject → Eskaliere |
| Hin-und-Her A↔B | Git Reset → Klare Entscheidung |
| Versteht Problem nicht | Chat: "Erkläre was du verstehst" |
| Macht zu viel auf einmal | Kleinere Milestones geben |

---

## 07 · 3-Stufen-Eskalation

Nicht Panik, sondern Prozess.

| Stufe | Wann | Was tun |
|-------|------|---------|
| 1 (80%) | Erster Versuch | "Erkläre unser Problem" |
| 2 (15%) | Cursor hängt | ChatGPT/Claude fragen |
| 3 (5%) | Sehr komplex | Model-Switch: GPT-5/Opus |

---

## 08 · Git als Sicherheitsnetz

Git ist nicht nur Versionskontrolle. Es ist dein wichtigstes Safety-Tool.

| Wann | Was |
|------|-----|
| Vor Start | `git checkout -b feature/xyz` |
| Alle 5-10 Min | Commit (kontrollieren!) |
| Bei Problem | `git reset --hard HEAD~1` |
| Nach Feature | Push + PR (außerhalb Cursor) |

---

## 09 · .cursorrules als Gedächtnis

Jedes gelöste Problem macht dein Projekt schlauer.

**Workflow:**
Problem gelöst → "Dokumentiere in .cursorrules" → Nächstes Mal automatisch richtig

✓ Selbstlernendes System  
✓ Neue Devs profitieren automatisch  
✓ Konsistente Code-Qualität im Team

---

## 10 · Review-Checklist

Nach jeder Agent-Mode-Session oder alle 30 Min.

| Bereich | Fragen |
|---------|--------|
| Code | Verstehe ich es? Naming ok? |
| Funktion | Funktioniert es? Lokal getestet? |
| Security | Keine Secrets? Input-Validation? |
| Git | Commit-Messages klar? |

---

## 11 · Red Flags – Sofort Action

Wenn du das siehst: STOP und handeln.

🚩 Code den du nicht verstehst  
🚩 Hunderte Zeilen in einem Commit  
🚩 Dependencies die du nicht kennst  
🚩 Gelöschte Files ohne Rückfrage  
🚩 Production-URLs im Code  
🚩 "Ich kann nichts mehr ohne KI"

---

## 12 · Die 3 größten Anfänger-Fehler

Was Devs falsch machen – und wie es richtig geht.

| Fehler | Lösung |
|--------|--------|
| Ungeduld | KI-Entwicklung IST Iteration |
| Zu vage | Konkret: Was, Wie, Warum |
| Eigene Maßstäbe | Ergebnis korrigieren, nicht Weg |

**Denk dran:** KI ohne Entwickler ist Mist. Entwickler ohne KI auch. Zusammen: unschlagbar.

---

## Mehr

- **Vollständiges Framework:** [PULSE Framework](https://github.com/manuelfussTC/PulseFramework)
- **Website:** [manuel-fuss.de](https://manuel-fuss.de)
- **Fragen?** kontakt@manuel-fuss.de

---

*© 2025 Manuel Fuß · RSLT.DIGITAL*
