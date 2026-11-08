import { Project, ProjectFile } from '../types/index.ts';
import { buildProjectModuleSystem, transformModuleWithSucrase } from './moduleResolver.ts';

/**
 * Resolves a relative path given a base file's path.
 * Examples:
 * resolveRelativePath('css/style.css', '../assets/logo.png') => 'assets/logo.png'
 * resolveRelativePath('index.html', 'css/main.css') => 'css/main.css'
 * resolveRelativePath('pages/sub/page.html', '../../style.css') => 'style.css'
 */
export function resolveRelativePath(baseFilePath: string, relativePath: string): string {
  // If external CDN, data, blob, or absolute URL, return as-is
  if (/^(?:[a-z]+:|\/\/)/i.test(relativePath) || relativePath.startsWith('data:') || relativePath.startsWith('blob:')) {
    return relativePath;
  }

  const baseParts = baseFilePath.split('/');
  baseParts.pop(); // remove base filename, keep directory

  const cleanRel = relativePath.replace(/^\.\//, '');
  const relParts = cleanRel.split('/');

  for (const part of relParts) {
    if (part === '.' || part === '') {
      continue;
    } else if (part === '..') {
      if (baseParts.length > 0) baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

/**
 * Normalizes paths by removing leading slashes and dot-slashes.
 */
export function normalizePath(p: string): string {
  return p.replace(/^\.\//, '').replace(/^\//, '').trim();
}

/**
 * Escapes characters for safe HTML injection.
 */
export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * PreviewBundler takes a Project and:
 * 1. Resolves relative file references for HTML, CSS, JavaScript, fonts, and images.
 * 2. Links modern ES modules (import/export, relative paths, nested folders, circular dependency checks).
 * 3. Inlines local assets securely as Base64 data URIs.
 * 4. Injects real-time console communication bridge and preview runtime error overlay.
 */
export function buildPreviewHTML(project: Project, targetHtmlPath = 'index.html'): string {
  // Find target HTML file or first HTML file in project
  let htmlFile = project.files.find(
    (f) => f.path === targetHtmlPath || f.name.toLowerCase() === targetHtmlPath.toLowerCase()
  );
  if (!htmlFile) {
    htmlFile = project.files.find((f) => f.type === 'html' || f.name.endsWith('.html'));
  }

  if (!htmlFile) {
    return `<!DOCTYPE html>
<html>
<head><style>body{background:#0f172a;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;}</style></head>
<body><div><h2>No HTML File Found</h2><p>Create an <code>index.html</code> file in the file explorer to preview your project.</p></div></body>
</html>`;
  }

  const baseHtmlPath = htmlFile.path || 'index.html';
  let html = htmlFile.content;

  // Build a lookup map of normalized paths and file names
  const fileMap = new Map<string, ProjectFile>();
  for (const f of project.files) {
    fileMap.set(normalizePath(f.path), f);
    fileMap.set(normalizePath(f.name), f);
    fileMap.set(f.name.toLowerCase(), f);
  }

  const findFile = (relPath: string, basePath: string): ProjectFile | undefined => {
    const resolved = normalizePath(resolveRelativePath(basePath, relPath));
    if (fileMap.has(resolved)) return fileMap.get(resolved);

    const clean = normalizePath(relPath);
    if (fileMap.has(clean)) return fileMap.get(clean);

    const filenameOnly = clean.split('/').pop() || clean;
    if (fileMap.has(filenameOnly)) return fileMap.get(filenameOnly);
    if (fileMap.has(filenameOnly.toLowerCase())) return fileMap.get(filenameOnly.toLowerCase());

    return undefined;
  };

  // Build modern module registry & static analyses for project scripts
  const moduleSystem = buildProjectModuleSystem(project);

  // 1. Replace <link rel="stylesheet" href="..."> and variations
  html = html.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
    if (!match.includes('stylesheet')) return match;
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      return match; // external CDN, preserve
    }
    const linkedFile = findFile(href, baseHtmlPath);
    if (linkedFile) {
      const inlinedCss = inlineCssAssets(linkedFile.content, linkedFile.path, fileMap);
      return `<style data-source="${escapeHtml(href)}">\n/* Embedded from ${escapeHtml(href)} */\n${inlinedCss}\n</style>`;
    }
    return `<script>console.warn("CodeStudio: Stylesheet not found in project: ${escapeHtml(href)}");</script>`;
  });

  // Also catch <link ... href="..." ...> where rel="stylesheet" is after href
  html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi, (match) => {
    if (match.includes('<style')) return match; // already inlined
    const hrefMatch = match.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return match;
    const href = hrefMatch[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      return match;
    }
    const linkedFile = findFile(href, baseHtmlPath);
    if (linkedFile) {
      const inlinedCss = inlineCssAssets(linkedFile.content, linkedFile.path, fileMap);
      return `<style data-source="${escapeHtml(href)}">\n/* Embedded from ${escapeHtml(href)} */\n${inlinedCss}\n</style>`;
    }
    return match;
  });

  // 2. Inline local images: <img src="...">
  html = html.replace(/<img\s+([^>]*src=["']([^"']+)["'][^>]*)>/gi, (match, rest, src) => {
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//') || src.startsWith('blob:')) {
      return match;
    }
    const imgFile = findFile(src, baseHtmlPath);
    if (imgFile) {
      const dataUri = imgFile.dataUri || `data:image/${getAssetFormat(imgFile.name)};base64,${btoa(imgFile.content)}`;
      return match.replace(src, dataUri);
    }
    return match;
  });

  // 3. Process script tags: <script src="..."> and <script type="module">
  html = html.replace(/<script\s+([^>]*src=["']([^"']+)["'][^>]*)>(?:\s*<\/script>)?/gi, (match, rest, src) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      return match; // external CDN, preserve
    }
    const isModule = /type=["']module["']/i.test(rest);
    const jsFile = findFile(src, baseHtmlPath);

    if (jsFile) {
      if (isModule || moduleSystem.hasModules) {
        // Module execution via runtime module registry
        const normPath = normalizePath(jsFile.path);
        return `<script data-source="${escapeHtml(src)}">
window.addEventListener('DOMContentLoaded', async function() {
  if (window.__cs_preload_cdns__) {
    try { await window.__cs_preload_cdns__(); } catch (e) {}
  }
  if (window.__cs_require__) {
    try {
      window.__cs_require__(${JSON.stringify(normPath)}, ${JSON.stringify(baseHtmlPath)});
    } catch (err) {
      console.error("Module error in ${escapeHtml(src)}:", err.message || err);
    }
  }
});
</script>`;
      } else {
        // Standard script execution
        return `<script data-source="${escapeHtml(src)}">\n// Embedded from ${escapeHtml(src)}\ntry {\n${jsFile.content}\n} catch (err) {\n  console.error("Error in ${escapeHtml(src)}:", err.message || err);\n}\n</script>`;
      }
    }
    return `<script>console.warn("CodeStudio: Script not found in project: ${escapeHtml(src)}");</script>`;
  });

  // 4. Process inline <script type="module">...code...</script>
  html = html.replace(/<script\s+[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi, (match, code) => {
    const { code: transformedCode, error } = transformModuleWithSucrase(code, baseHtmlPath);
    if (error) {
      return `<script>console.error(${JSON.stringify(error)});</script>`;
    }
    return `<script type="text/javascript">
window.addEventListener('DOMContentLoaded', async function() {
  if (window.__cs_preload_cdns__) {
    try { await window.__cs_preload_cdns__(); } catch (e) {}
  }
  try {
    var exports = {};
    var module = { exports: exports };
    var require = function(spec) {
      return window.__cs_require__(spec, ${JSON.stringify(baseHtmlPath)});
    };
    require.resolve = function(spec) {
      return window.__cs_resolve__(spec, ${JSON.stringify(baseHtmlPath)});
    };
${transformedCode}
  } catch (err) {
    console.error("Inline module error:", err.message || err);
  }
});
</script>`;
  });

  // 5. Pre-compile warnings or errors from module resolution
  let staticErrorsScript = '';
  if (moduleSystem.errors.length > 0) {
    const escapedErrors = moduleSystem.errors.map((e) => JSON.stringify(e)).join(', ');
    staticErrorsScript += `<script>
[${escapedErrors}].forEach(function(msg) {
  console.error(msg);
  if (window.__cs_show_error__) window.__cs_show_error__("Module Resolution Error", msg);
});
</script>\n`;
  }
  if (moduleSystem.warnings.length > 0) {
    const escapedWarns = moduleSystem.warnings.map((w) => JSON.stringify(w)).join(', ');
    staticErrorsScript += `<script>
[${escapedWarns}].forEach(function(msg) {
  console.warn(msg);
});
</script>\n`;
  }

  // 6. Inject Devtools Console Bridge, Error Interceptor, REPL, and Visual Error Overlay
  const consoleAndErrorBridge = `
<!-- CodeStudio Modern Runtime, Console Bridge & Visual Error Overlay -->
<style id="__cs_runtime_styles__">
#__cs_error_overlay__ {
  position: fixed;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: #1e1b2e;
  border: 1px solid #f43f5e;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7);
  color: #fda4af;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  padding: 12px 14px;
  z-index: 999999;
  display: none;
  animation: __cs_slide_up 0.25s ease-out;
}
#__cs_error_overlay__.visible {
  display: block;
}
#__cs_error_overlay__ .__cs_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: 700;
  color: #fff;
}
#__cs_error_overlay__ .__cs_badge {
  background: #e11d48;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 6px;
}
#__cs_error_overlay__ .__cs_msg {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
}
#__cs_error_overlay__ .__cs_close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
}
#__cs_error_overlay__ .__cs_close:hover {
  color: #fff;
}
@keyframes __cs_slide_up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>

<div id="__cs_error_overlay__">
  <div class="__cs_header">
    <div style="display:flex;align-items:center;">
      <span class="__cs_badge" id="__cs_err_type__">Runtime Error</span>
      <span id="__cs_err_title__">Error in Preview</span>
    </div>
    <button class="__cs_close" onclick="document.getElementById('__cs_error_overlay__').classList.remove('visible')">&times;</button>
  </div>
  <div class="__cs_msg" id="__cs_err_msg__"></div>
</div>

<script>
(function() {
  function serialize(obj, depth) {
    depth = depth || 0;
    if (depth > 3) return "[Deep Object]";
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj === "function") return "ƒ " + (obj.name || "anonymous") + "()";
    if (obj instanceof Error) return obj.name + ": " + obj.message + (obj.stack ? "\\n" + obj.stack : "");
    if (typeof obj === "object") {
      try {
        if (Array.isArray(obj)) {
          return "[" + obj.map(function(item) { return serialize(item, depth + 1); }).join(", ") + "]";
        }
        var copy = {};
        for (var k in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, k)) {
            copy[k] = typeof obj[k] === "object" ? serialize(obj[k], depth + 1) : String(obj[k]);
          }
        }
        return JSON.stringify(copy);
      } catch (e) {
        return String(obj);
      }
    }
    return String(obj);
  }

  function sendLog(level, args, line, source) {
    try {
      var safeArgs = Array.prototype.slice.call(args).map(function(a) {
        return serialize(a);
      });
      window.parent.postMessage({
        type: 'CODESTUDIO_CONSOLE',
        level: level,
        args: safeArgs,
        timestamp: Date.now(),
        line: line,
        source: source
      }, '*');
    } catch(e) {}
  }

  window.__cs_show_error__ = function(type, msg, source, line) {
    var overlay = document.getElementById('__cs_error_overlay__');
    var badge = document.getElementById('__cs_err_type__');
    var title = document.getElementById('__cs_err_title__');
    var msgEl = document.getElementById('__cs_err_msg__');
    if (overlay && badge && title && msgEl) {
      badge.textContent = type || 'Runtime Error';
      title.textContent = source ? (source + (line ? ':' + line : '')) : 'Preview Error';
      msgEl.textContent = msg;
      overlay.classList.add('visible');
    }
  };

  var origLog = console.log;
  var origInfo = console.info;
  var origWarn = console.warn;
  var origError = console.error;

  console.log = function() {
    origLog.apply(console, arguments);
    sendLog('log', arguments);
  };
  console.info = function() {
    origInfo.apply(console, arguments);
    sendLog('info', arguments);
  };
  console.warn = function() {
    origWarn.apply(console, arguments);
    sendLog('warn', arguments);
  };
  console.error = function() {
    origError.apply(console, arguments);
    sendLog('error', arguments);
    var firstArg = arguments[0];
    var msg = (firstArg instanceof Error) ? (firstArg.message || firstArg.name) : String(firstArg);
    window.__cs_show_error__('Console Error', msg);
  };

  window.addEventListener('error', function(event) {
    var msg = event.message || "Uncaught Error";
    sendLog('error', [msg], event.lineno, event.filename);
    window.__cs_show_error__('Uncaught Exception', msg, event.filename, event.lineno);
  });

  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    var msg = reason ? (reason.message || String(reason)) : "Unhandled Promise Rejection";
    sendLog('error', ["Unhandled Promise Rejection: " + msg]);
    window.__cs_show_error__('Promise Rejection', msg);
  });

  // Listen for interactive REPL evaluations from the parent CodeStudio console
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'EVAL_CODE') {
      try {
        var result = (0, eval)(event.data.code);
        console.log("=>", result);
      } catch (err) {
        console.error("Evaluation Error:", err.message || err);
      }
    }
  });
})();
</script>
`;

  // Inject module system runtime script and console/error bridges right after <head> or at start
  const fullInjection = consoleAndErrorBridge + moduleSystem.bundledRuntimeScript + staticErrorsScript;

  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>' + fullInjection);
  } else if (html.includes('<html>')) {
    html = html.replace('<html>', '<html><head>' + fullInjection + '</head>');
  } else {
    html = fullInjection + html;
  }

  return html;
}

/**
 * Inlines CSS assets (images, fonts, nested @import) relative to the CSS file's location.
 */
function inlineCssAssets(css: string, cssFilePath: string, fileMap: Map<string, ProjectFile>): string {
  // 1. Resolve url(...) relative to cssFilePath (images and local fonts)
  let processed = css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi, (match, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('//') || url.startsWith('blob:')) {
      return match;
    }
    const resolvedPath = normalizePath(resolveRelativePath(cssFilePath, url));
    const asset = fileMap.get(resolvedPath) || fileMap.get(url.split('/').pop() || '');
    if (asset) {
      if (asset.dataUri) {
        return `url("${asset.dataUri}")`;
      } else if (asset.content) {
        const mime = getAssetMimeType(asset.name);
        return `url("data:${mime};base64,${btoa(asset.content)}")`;
      }
    }
    return match;
  });

  // 2. Resolve @import "..." relative to cssFilePath
  processed = processed.replace(/@import\s+['"]([^'"]+)['"]\s*;/gi, (match, importPath) => {
    if (importPath.startsWith('http://') || importPath.startsWith('https://') || importPath.startsWith('//')) {
      return match;
    }
    const resolvedPath = normalizePath(resolveRelativePath(cssFilePath, importPath));
    const importedFile = fileMap.get(resolvedPath) || fileMap.get(importPath.split('/').pop() || '');
    if (importedFile) {
      return `/* Embedded @import ${importPath} */\n` + inlineCssAssets(importedFile.content, importedFile.path, fileMap);
    }
    return `/* Missing @import: ${importPath} */`;
  });

  return processed;
}

function getAssetFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'svg') return 'svg+xml';
  if (ext === 'png') return 'png';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (ext === 'gif') return 'gif';
  if (ext === 'webp') return 'webp';
  return 'png';
}

function getAssetMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'svg': return 'image/svg+xml';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'woff': return 'font/woff';
    case 'woff2': return 'font/woff2';
    case 'ttf': return 'font/ttf';
    case 'otf': return 'font/otf';
    case 'eot': return 'application/vnd.ms-fontobject';
    default: return 'application/octet-stream';
  }
}
