# Publishing Pulse Framework Extension

This guide explains how to publish the Pulse Framework extension to **OpenVSX** (for Cursor) and optionally to the **VS Code Marketplace**.

---

## Build a VSIX (local install)

Build and package the extension:

```bash
cd packages/pulse-vscode
npm install
npm run build
npx @vscode/vsce package
```

### Local install (Cursor / VS Code)

1. Open Cursor or VS Code
2. Extensions (Cmd+Shift+X)
3. `...` → **Install from VSIX...**
4. Select the generated `.vsix`

---

## Publish to OpenVSX (for Cursor)

Cursor uses the [OpenVSX marketplace](https://open-vsx.org/) as an extension source.

### 1. Create an OpenVSX account

1. Go to `https://open-vsx.org/`
2. **Log in with GitHub**
3. Authorize the app

### 2. Generate an access token

1. After login: Profile → **Access Tokens**
2. **Generate Token**
3. Save the token (shown once)

### 3. Create the namespace (once)

```bash
npm install -g ovsx
npx ovsx create-namespace pulse-framework -p <OPENVSX_TOKEN>
```

### 4. Publish the extension

```bash
cd packages/pulse-vscode
npx ovsx publish *.vsix -p <OPENVSX_TOKEN>
```

The extension will be available at:
- **URL:** `https://open-vsx.org/extension/pulse-framework/pulse-framework`
- **In Cursor:** Extensions → search “Pulse Framework”

---

## VS Code Marketplace (optional)

If you also want to publish to the official VS Code Marketplace:

### 1. Azure DevOps account

1. Go to `https://dev.azure.com/`
2. Create an organization (if needed)
3. **User settings** → **Personal Access Tokens**
4. Create a token with scope: **Marketplace → Manage**

### 2. Create a publisher

1. Go to `https://marketplace.visualstudio.com/manage`
2. **Create Publisher**
3. Use `pulse-framework` as the publisher ID

### 3. Publish

```bash
cd packages/pulse-vscode
npx @vscode/vsce publish -p <AZURE_PAT>
```

---

## Publishing updates

### Bump version

```bash
cd packages/pulse-vscode
npm version patch  # 0.3.0 → 0.3.1
```

### Rebuild and publish

```bash
npm run build
npx @vscode/vsce package

# OpenVSX
npx ovsx publish *.vsix -p <OPENVSX_TOKEN>

# VS Code Marketplace (optional)
npx @vscode/vsce publish -p <AZURE_PAT>
```

---

## Pre-publish checklist

- [ ] Version in `package.json` updated
- [ ] CHANGELOG updated (if applicable)
- [ ] README is up to date
- [ ] `npm run build` runs without errors
- [ ] Extension tested locally

---

## Links

- OpenVSX: `https://open-vsx.org/`
- VS Code Marketplace: `https://marketplace.visualstudio.com/`
- vsce docs: `https://code.visualstudio.com/api/working-with-extensions/publishing-extension`
- ovsx docs: `https://github.com/eclipse/openvsx/wiki/Publishing-Extensions`

---

## Notes

1. **Publisher name:** `publisher` in `package.json` must match the OpenVSX namespace.

2. **Cursor compatibility:** Keep `engines.vscode` reasonably low for Cursor compatibility.

3. **Token safety:** Never commit tokens. Use environment variables:

```bash
export OVSX_PAT="your-token"
npx ovsx publish *.vsix -p "$OVSX_PAT"
```
