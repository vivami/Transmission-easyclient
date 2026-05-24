# Transmission easy client

This is a fork of [Feverqwe/Transmission-easyclient](https://github.com/Feverqwe/Transmission-easyclient)
(original author: Anton). The original was built on an end-of-life toolchain
and Manifest V2. This fork modernizes the project and hardens its security
while keeping the behavior the same.

## What changed in this fork

- **Manifest V2 → V3.** Works on current Chrome (background **service worker**)
  and Firefox (background **event page**). Periodic polling moved from
  `setInterval` to `chrome.alarms`; tab fetching moved to `chrome.scripting`.
- **Build: webpack 4 → 5** (asset modules, `css-minimizer`, updated loaders),
  Node-core polyfills removed. Browser/mode selected via env vars (`cross-env`).
  Opera target dropped — now **Firefox + Chrome**.
- **Runtime libraries:** React 16 → 18, MobX 5 → 6, mobx-state-tree 3 → 6,
  `d3` slimmed to granular packages, `whatwg-fetch` dropped for native `fetch`.
- **Security:** `npm audit` removed 89 vulnerabilities → 0; a strict MV3
  Content-Security-Policy (`script-src 'self'`); credentials are no longer
  embedded in the Web-UI link.

## Build from source

Requires Node 18+.

```bash
npm install
npm run build         # Chrome  → dist/chrome/src
npm run buildFirefox  # Firefox → dist/firefox/src
npm run release       # both, plus packaged .zip in dist/<browser>/
```

## Install (personal use, unsigned)

**Chrome** — `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select `dist/chrome/src`.

**Firefox** — either load temporarily (`about:debugging` → **This Firefox** →
**Load Temporary Add-on** → pick `dist/firefox/src/manifest.json`), or produce a
permanently-installable signed `.xpi` for self-distribution:

```bash
npm run buildFirefox
npx web-ext sign --channel=unlisted --source-dir dist/firefox/src
# needs a free AMO API key/secret in WEB_EXT_API_KEY / WEB_EXT_API_SECRET
```

then install the `.xpi` via `about:addons` → ⚙️ → **Install Add-on From File**.

> The Firefox add-on ID lives in `webpack.config.js`
> (`browser_specific_settings.gecko.id`). Change it if you sign under your own
> AMO account.
