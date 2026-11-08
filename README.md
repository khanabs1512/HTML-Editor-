# CodeStudio – Professional HTML Viewer & Code Editor

CodeStudio is a powerful, 100% free, offline-first Progressive Web Application (PWA) and mobile-friendly IDE for HTML5, CSS3, and modern JavaScript. Inspired by professional desktop and mobile development tools, CodeStudio runs entirely inside the user's browser with native IndexedDB persistence, a sandboxed live preview engine, multi-tab editing, full ZIP/folder import/export, and zero mandatory subscriptions or server-side dependencies.

---

## Architecture Overview

- **Core Framework**: React 19, TypeScript, Vite 8
- **Editor Engine**: CodeMirror 6 with syntax highlighting (HTML, CSS, JavaScript, JSON, XML, Markdown), bracket matching, code folding, find & replace, auto-indentation, and themes (One Dark, VS Dark, Dracula, GitHub Light, Nord)
- **Local Persistence**: Native browser IndexedDB (`CodeStudioDB`) with multi-project management, auto-save debounce (800ms), and zero data loss
- **Live Preview Runtime**: Sandboxed `<iframe>` (`sandbox="allow-scripts allow-modals allow-forms"`, strictly omitting `allow-same-origin`) with Sucrase ES module transpilation, circular dependency detection, and bi-directional console bridge
- **PWA & Offline**: `vite-plugin-pwa` (Workbox) with auto-updating Service Worker, web manifest, maskable icons, and full offline execution
- **Deployment Target**: Cloudflare Pages (Static SPA) or any static web host

---

## A. Local Development

### Prerequisites
- **Node.js**: Version 22 (LTS) or higher (see `.nvmrc` / `.node-version`)
- **npm**: Version 10 or higher
- Modern Chromium, Safari, or Firefox browser

### Setup
Clone the repository and verify your Node.js environment:
```bash
git clone https://github.com/your-username/codestudio.git
cd codestudio
nvm use 22 # or fnm use
```

---

## B. Installing Dependencies

Install exact dependencies using npm:
```bash
npm ci
```
*Note: `package-lock.json` is committed to the repository to guarantee deterministic installs across local development and Cloudflare Pages build machines.*

---

## C. Running the Development Server

Start the local Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`. The development server supports live reloading and local IndexedDB sandboxing.

---

## D. Running Tests

CodeStudio comes with an automated test suite covering ES modules, browser workflows, import/export, deletion lifecycle, and Playwright Chromium automation:

```bash
# Run all automated test suites
npm test

# Run individual test suites:
npm run test:modules             # Sucrase module transpiler, specifier routing & circular imports
npm run test:e2e                 # Browser end-to-end simulation, security audit & stress test
npm run test:phase52:unit        # Import service, folder recursion, zero-state delete tests
npm run test:phase52:playwright   # Real Chromium headless browser E2E test suite
```

---

## E. Production Build

Compile the application into optimized static assets:
```bash
npm run build
```
The output is written to the `dist/` directory:
- `dist/index.html`: Optimized HTML entry point
- `dist/assets/`: Code-split JavaScript and Tailwind CSS chunks
- `dist/sw.js`: Workbox precache service worker
- `dist/manifest.webmanifest`: Progressive Web App manifest
- `dist/_headers`: Cloudflare Pages HTTP headers and immutable caching policies
- `dist/_redirects`: Cloudflare Pages SPA rewrite rules

To test the production build locally:
```bash
npm run preview
```

---

## F. GitHub Repository Setup

1. Create a new repository on [GitHub](https://github.com/new).
2. Push the local CodeStudio codebase to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: CodeStudio production release"
   git branch -M main
   git remote add origin https://github.com/your-username/codestudio.git
   git push -u origin main
   ```
3. The included GitHub Actions workflow (`.github/workflows/ci.yml`) will automatically run `npm ci`, `npm run lint`, core tests, and `npm run build` on every push to `main`.

---

## G. Cloudflare Pages Git Integration

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers) > Workers & Pages > Create application**.
3. Select the **Pages** tab and click **Connect to Git**.
4. Authorize Cloudflare to access your GitHub account and select your `codestudio` repository.
5. Click **Begin setup**.

---

## H. Cloudflare Build Configuration

In the Cloudflare Pages deployment configuration screen, configure the following exact settings:

| Setting | Value |
|---|---|
| **Framework preset** | `React (Vite)` |
| **Production branch** | `main` |
| **Root directory** | `/` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

### Environment Variables
Under **Environment variables (advanced)**, specify:
- `NODE_VERSION`: `22`

Click **Save and Deploy**. Cloudflare Pages will clone the repo, run `npm ci`, execute `npm run build`, and deploy the contents of `dist` to a global CDN edge URL (`*.pages.dev`).

---

## I. Updating the Deployed Application

CodeStudio uses Git-driven continuous deployment:
1. Make your code changes locally.
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "fix: improve styling"
   git push origin main
   ```
3. Cloudflare Pages automatically detects the commit, runs the build, and publishes the new release.
4. Because the Service Worker is configured with `registerType: 'autoUpdate'` and `Cache-Control: public, max-age=0, must-revalidate` on `/sw.js`, active users will receive the update automatically on their next page load without getting stuck with stale assets.

---

## J. PWA Installation

CodeStudio meets all Progressive Web App criteria:
- **Desktop (Chrome, Edge, Brave)**: Click the **Install** icon in the browser address bar.
- **Android (Chrome)**: Tap the banner or open the three-dot menu and tap **Add to Home screen**.
- **iOS / iPadOS (Safari)**: Tap the **Share** button (box with upward arrow) and select **Add to Home Screen**.

Once installed, CodeStudio opens in standalone mode without browser URL bars, providing a native app experience.

---

## K. Offline Behavior

CodeStudio is built from the ground up to be offline-first:
- **Service Worker Precaching**: All HTML, JavaScript, CSS, and UI icons are precached in the browser cache upon initial load.
- **IndexedDB Storage**: Project files, user settings, editor state, and binary assets are stored in native IndexedDB (`CodeStudioDB`). No internet connection is required to create, edit, run, or preview code.
- **In-Browser Runtime**: The live preview engine compiles and bundles HTML, CSS, and modern JavaScript modules entirely in the client using Sucrase AST transpilation.

---

## L. Backup and Restore (Storage Migration)

### Domain Storage Isolation
Browser security partitions IndexedDB storage by origin (`protocol://domain:port`). Projects stored on `localhost:3000` or the AI Studio preview domain will **not** automatically appear on your deployed Cloudflare Pages domain (`https://codestudio.pages.dev`).

### Transferring Projects to Cloudflare Pages
1. On your existing instance, open the **Project Manager** (click the project title in the top header).
2. Click **Export ZIP** on individual projects, or open **Tools & Storage** and select **Export JSON Backup** to create a complete backup of all projects and editor settings.
3. Open your deployed Cloudflare Pages URL.
4. In the Project Manager, click **Import** or **Restore Backup** and select your exported ZIP or JSON archive. All projects, folders, and files will immediately be imported into the new domain's IndexedDB.

---

## M. Troubleshooting Common Deployment Failures

| Issue | Cause | Solution |
|---|---|---|
| **Build fails with `ERESOLVE could not resolve`** | Conflicting peer dependencies in npm | Ensure `package-lock.json` generated with Node 22 is committed. Do not manually edit dependency versions in `package.json`. |
| **Node.js version mismatch** | Cloudflare Pages default Node version is older than 22 | Set environment variable `NODE_VERSION=22` in Cloudflare Pages settings, or ensure `.nvmrc` containing `22` is in the repository root. |
| **Page returns 404 on refresh** | Missing SPA rewrite rule | Ensure `public/_redirects` contains `/* /index.html 200` (automatically copied to `dist/_redirects` during `vite build`). |
| **Stale service worker after deploy** | `sw.js` cached with long TTL | Verify `public/_headers` sets `Cache-Control: public, max-age=0, must-revalidate` for `/sw.js` and `/manifest.webmanifest`. |
| **Assets 404 or white screen** | Incorrect Vite base path | Verify `vite.config.ts` sets `base: '/'`. |

---

## License

CodeStudio is 100% free and open source.
