# Publishing Pulse Framework Extension

Diese Anleitung erklärt, wie du die Pulse Framework Extension auf **OpenVSX** (für Cursor) und optional auf dem **VS Code Marketplace** veröffentlichst.

---

## 📦 VSIX-Datei ist bereit

Die Extension wurde bereits gebaut und verpackt:

```
packages/pulse-vscode/pulse-framework-0.1.0.vsix
```

### Lokale Installation (Cursor/VS Code)

1. Öffne Cursor oder VS Code
2. Gehe zu Extensions (Cmd+Shift+X)
3. Klicke auf `...` → **Install from VSIX...**
4. Wähle `pulse-framework-0.1.0.vsix`

---

## 🌐 OpenVSX Publishing (für Cursor)

Cursor nutzt seit April 2025 den [OpenVSX Marketplace](https://open-vsx.org/) als Extension-Quelle.

### 1. OpenVSX Account erstellen

1. Gehe zu https://open-vsx.org/
2. Klicke **Log in with GitHub**
3. Autorisiere die App

### 2. Access Token generieren

1. Nach dem Login: Klicke auf dein Profil → **Access Tokens**
2. Klicke **Generate Token**
3. Speichere den Token sicher (wird nur einmal angezeigt!)

### 3. Publisher erstellen

```bash
# Installiere ovsx CLI
npm install -g ovsx

# Erstelle Publisher (einmalig)
npx ovsx create-namespace pulse-framework -p <YOUR_TOKEN>
```

### 4. Extension veröffentlichen

```bash
cd packages/pulse-vscode

# Veröffentlichen
npx ovsx publish pulse-framework-0.1.0.vsix -p <YOUR_TOKEN>
```

### 5. Fertig! 🎉

Die Extension ist jetzt unter verfügbar:
- **URL:** https://open-vsx.org/extension/pulse-framework/pulse-framework
- **In Cursor:** Extensions → Suche "Pulse Framework"

---

## 🔷 VS Code Marketplace (Optional)

Falls du auch auf dem offiziellen VS Code Marketplace veröffentlichen möchtest:

### 1. Azure DevOps Account

1. Gehe zu https://dev.azure.com/
2. Erstelle eine Organisation (falls nicht vorhanden)
3. Gehe zu **User Settings** → **Personal Access Tokens**
4. Erstelle Token mit Scope: **Marketplace → Manage**

### 2. Publisher erstellen

1. Gehe zu https://marketplace.visualstudio.com/manage
2. Klicke **Create Publisher**
3. Gib `pulse-framework` als Publisher ID ein

### 3. Veröffentlichen

```bash
cd packages/pulse-vscode

# Mit vsce publishen
npx @vscode/vsce publish -p <AZURE_PAT>
```

---

## 🔄 Updates veröffentlichen

### Version erhöhen

```bash
# Version in package.json erhöhen
npm version patch  # 0.1.0 → 0.1.1
# oder
npm version minor  # 0.1.0 → 0.2.0
# oder
npm version major  # 0.1.0 → 1.0.0
```

### Neu bauen und publishen

```bash
# Neu verpacken
npm run build
npx @vscode/vsce package

# OpenVSX
npx ovsx publish pulse-framework-0.1.1.vsix -p <TOKEN>

# VS Code Marketplace (optional)
npx @vscode/vsce publish -p <AZURE_PAT>
```

---

## 📋 Checkliste vor dem Publishing

- [ ] Version in `package.json` aktualisiert
- [ ] CHANGELOG aktualisiert (falls vorhanden)
- [ ] README ist aktuell
- [ ] `npm run build` läuft ohne Fehler
- [ ] Extension lokal getestet

---

## 🔗 Links

- **OpenVSX:** https://open-vsx.org/
- **VS Code Marketplace:** https://marketplace.visualstudio.com/
- **vsce Docs:** https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **ovsx Docs:** https://github.com/eclipse/openvsx/wiki/Publishing-Extensions

---

## ⚠️ Wichtige Hinweise

1. **Publisher Name:** Der `publisher` in `package.json` muss mit dem registrierten Publisher-Namen übereinstimmen.

2. **Cursor Kompatibilität:** Die Extension wurde für VS Code Engine `^1.85.0` entwickelt, was mit aktuellen Cursor-Versionen kompatibel ist.

3. **Token Sicherheit:** Speichere Tokens niemals in Git! Nutze Environment Variables:
   ```bash
   export OVSX_PAT="your-token"
   npx ovsx publish *.vsix -p $OVSX_PAT
   ```
