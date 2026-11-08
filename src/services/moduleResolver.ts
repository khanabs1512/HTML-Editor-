import { transform } from 'sucrase';
import { Project, ProjectFile } from '../types/index.ts';
import { resolveRelativePath, normalizePath, escapeHtml } from './previewBundler.ts';

export interface ModuleAnalysis {
  filePath: string;
  hasEsSyntax: boolean;
  importedSpecifiers: string[];
  bareImports: string[];
  cdnImports: string[];
  resolvedLocalDeps: string[];
  missingDeps: string[];
}

export interface ModuleResolutionResult {
  hasModules: boolean;
  analyses: Map<string, ModuleAnalysis>;
  circularCycles: string[][];
  errors: string[];
  warnings: string[];
  bundledRuntimeScript: string;
}

/**
 * Checks if a specifier is an external CDN URL (https:// or //)
 */
export function isCdnUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('//');
}

/**
 * Checks if a specifier is a bare package import (e.g. 'lodash', 'react', '@types/node')
 */
export function isBareSpecifier(specifier: string): boolean {
  if (isCdnUrl(specifier)) return false;
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  if (specifier.startsWith('data:') || specifier.startsWith('blob:')) return false;
  return true;
}

/**
 * Resolves a module specifier against the project file map.
 * Supports extension omission (.js, .mjs, .json) and folder index resolution.
 */
export function resolveModulePath(
  baseFilePath: string,
  specifier: string,
  fileMap: Map<string, ProjectFile>
): string | null {
  const resolved = normalizePath(resolveRelativePath(baseFilePath, specifier));

  // 1. Exact match
  if (fileMap.has(resolved)) return resolved;

  // 2. Try with .js, .mjs, .ts, .json
  const extensions = ['.js', '.mjs', '.ts', '.json'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fileMap.has(withExt)) return withExt;
  }

  // 3. Try directory index: /index.js, /index.mjs
  for (const ext of extensions) {
    const withIndex = resolved + '/index' + ext;
    if (fileMap.has(withIndex)) return withIndex;
  }

  // 4. Try basename fallback
  const baseName = specifier.split('/').pop() || specifier;
  if (fileMap.has(baseName)) return baseName;
  for (const ext of extensions) {
    if (fileMap.has(baseName + ext)) return baseName + ext;
  }

  return null;
}

/**
 * Detects circular dependencies across the project module graph using DFS.
 */
export function detectCircularDependencies(analyses: Map<string, ModuleAnalysis>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack: string[] = [];

  function dfs(current: string) {
    if (recursionStack.includes(current)) {
      const cycleStart = recursionStack.indexOf(current);
      const cycle = [...recursionStack.slice(cycleStart), current];
      cycles.push(cycle);
      return;
    }

    if (visited.has(current)) return;
    visited.add(current);

    recursionStack.push(current);
    const analysis = analyses.get(current);
    if (analysis) {
      for (const dep of analysis.resolvedLocalDeps) {
        dfs(dep);
      }
    }
    recursionStack.pop();
  }

  for (const node of analyses.keys()) {
    dfs(node);
  }

  return cycles;
}

/**
 * Analyzes imports in JavaScript code using static AST/pattern scanning.
 */
export function analyzeModule(
  code: string,
  filePath: string,
  fileMap: Map<string, ProjectFile>
): ModuleAnalysis {
  const importedSpecifiers: string[] = [];
  const bareImports: string[] = [];
  const cdnImports: string[] = [];
  const resolvedLocalDeps: string[] = [];
  const missingDeps: string[] = [];

  // Check if code contains ES Module syntax
  const hasImport = /(?:^|\n)\s*import\b/.test(code);
  const hasExport = /(?:^|\n)\s*export\b/.test(code);
  const hasEsSyntax = hasImport || hasExport;

  // Scan import specifiers
  const staticImportFromRegex = /(?:^|\n)\s*import\s+(?:[\s\S]*?)\s+from\s*['"]([^'"]+)['"]\s*;?/g;
  const sideEffectImportRegex = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]\s*;?/g;
  const reExportRegex = /(?:^|\n)\s*export\s+(?:[\s\S]*?)\s+from\s*['"]([^'"]+)['"]\s*;?/g;
  const dynamicImportRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  const extractSpecifiers = (regex: RegExp) => {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(code)) !== null) {
      const spec = m[1].trim();
      if (!importedSpecifiers.includes(spec)) {
        importedSpecifiers.push(spec);
      }
    }
  };

  extractSpecifiers(staticImportFromRegex);
  extractSpecifiers(sideEffectImportRegex);
  extractSpecifiers(reExportRegex);
  extractSpecifiers(dynamicImportRegex);

  for (const spec of importedSpecifiers) {
    if (isCdnUrl(spec)) {
      cdnImports.push(spec);
    } else if (isBareSpecifier(spec)) {
      const localCandidate = fileMap.get(normalizePath(spec)) || fileMap.get(normalizePath(spec + '.js'));
      if (localCandidate) {
        resolvedLocalDeps.push(localCandidate.path);
      } else {
        bareImports.push(spec);
      }
    } else {
      const resolved = resolveModulePath(filePath, spec, fileMap);
      if (resolved) {
        resolvedLocalDeps.push(resolved);
      } else {
        missingDeps.push(spec);
      }
    }
  }

  return {
    filePath,
    hasEsSyntax,
    importedSpecifiers,
    bareImports: Array.from(new Set(bareImports)),
    cdnImports: Array.from(new Set(cdnImports)),
    resolvedLocalDeps: Array.from(new Set(resolvedLocalDeps)),
    missingDeps: Array.from(new Set(missingDeps)),
  };
}

/**
 * Transforms an ES Module using Sucrase AST transpiler for 100% compliant CommonJS/interop code.
 */
export function transformModuleWithSucrase(
  code: string,
  filePath: string
): { code: string; hasEsSyntax: boolean; error?: string } {
  const hasImport = /(?:^|\n)\s*import\b/.test(code);
  const hasExport = /(?:^|\n)\s*export\b/.test(code);

  if (!hasImport && !hasExport) {
    return { code, hasEsSyntax: false };
  }

  try {
    const transformed = transform(code, {
      transforms: ['imports'],
      filePath,
    });
    return { code: transformed.code, hasEsSyntax: true };
  } catch (err: any) {
    return {
      code,
      hasEsSyntax: true,
      error: `Syntax or parse error in ${filePath}: ${err.message || err}`,
    };
  }
}

/**
 * Builds the complete project module system, resolving dependencies,
 * detecting cycles, preloading CDN imports, and generating the runtime module registry.
 */
export function buildProjectModuleSystem(project: Project): ModuleResolutionResult {
  const fileMap = new Map<string, ProjectFile>();
  for (const f of project.files) {
    fileMap.set(normalizePath(f.path), f);
    fileMap.set(normalizePath(f.name), f);
  }

  const jsFiles = project.files.filter(
    (f) => !f.isBinary && (f.type === 'javascript' || f.name.endsWith('.js') || f.name.endsWith('.mjs'))
  );

  const analyses = new Map<string, ModuleAnalysis>();
  const errors: string[] = [];
  const warnings: string[] = [];
  const allCdnUrls = new Set<string>();
  let hasModules = false;

  for (const jsFile of jsFiles) {
    const analysis = analyzeModule(jsFile.content, jsFile.path, fileMap);
    analyses.set(jsFile.path, analysis);

    if (analysis.hasEsSyntax || analysis.importedSpecifiers.length > 0) {
      hasModules = true;
    }

    for (const cdn of analysis.cdnImports) {
      allCdnUrls.add(cdn);
    }

    // Bare imports validation
    for (const bare of analysis.bareImports) {
      errors.push(
        `Unsupported bare package specifier "${bare}" in "${jsFile.path}". ` +
        `In an offline browser environment, use an HTTPS CDN URL (e.g. "https://esm.sh/${bare}") ` +
        `or import a local file (e.g. "./${bare}.js").`
      );
    }

    // Missing local dependencies
    for (const missing of analysis.missingDeps) {
      errors.push(`Module not found: Could not resolve "${missing}" from "${jsFile.path}".`);
    }
  }

  // Detect circular dependencies
  const circularCycles = detectCircularDependencies(analyses);
  for (const cycle of circularCycles) {
    warnings.push(
      `Circular dependency detected: ${cycle.join(' -> ')}. ` +
      `Ensure mutual module references do not access uninitialized variables.`
    );
  }

  // Compile module definitions using Sucrase
  let modulesObjStr = '{\n';
  for (const jsFile of jsFiles) {
    const { code: transformedCode, error } = transformModuleWithSucrase(jsFile.content, jsFile.path);
    if (error) {
      errors.push(error);
    }

    const normPath = normalizePath(jsFile.path);
    modulesObjStr += `  ${JSON.stringify(normPath)}: function(exports, require, module, __filename, __dirname) {\n${transformedCode}\n  },\n`;

    if (jsFile.path !== jsFile.name) {
      modulesObjStr += `  ${JSON.stringify(normalizePath(jsFile.name))}: function(exports, require, module, __filename, __dirname) {\n${transformedCode}\n  },\n`;
    }
  }
  modulesObjStr += '}';

  const cdnListJson = JSON.stringify(Array.from(allCdnUrls));

  const runtimeScript = `
<script>
(function() {
  window.__cs_modules__ = ${modulesObjStr};
  window.__cs_module_cache__ = {};
  window.__cs_cdn_cache__ = {};
  var __cs_cdn_urls__ = ${cdnListJson};

  // Preload external CDN modules asynchronously before executing local modules
  window.__cs_preload_cdns__ = async function() {
    if (!__cs_cdn_urls__ || __cs_cdn_urls__.length === 0) return;
    await Promise.all(__cs_cdn_urls__.map(async function(url) {
      try {
        var mod = await import(url);
        window.__cs_cdn_cache__[url] = mod;
      } catch (err) {
        console.error('Failed to load CDN module "' + url + '":', err.message || err);
      }
    }));
  };

  window.__cs_resolve__ = function(specifier, fromFile) {
    if (/^https?:\\/\\//i.test(specifier) || specifier.startsWith('//')) return specifier;
    var baseParts = (fromFile || 'index.html').split('/');
    baseParts.pop();
    var clean = specifier.replace(/^\\.\\//, '');
    var parts = clean.split('/');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '..') {
        if (baseParts.length > 0) baseParts.pop();
      } else if (parts[i] !== '.' && parts[i] !== '') {
        baseParts.push(parts[i]);
      }
    }
    var candidate = baseParts.join('/');
    if (window.__cs_modules__[candidate]) return candidate;
    var exts = ['.js', '.mjs', '/index.js'];
    for (var j = 0; j < exts.length; j++) {
      if (window.__cs_modules__[candidate + exts[j]]) return candidate + exts[j];
    }
    var filename = candidate.split('/').pop();
    if (window.__cs_modules__[filename]) return filename;
    return candidate;
  };

  window.__cs_require__ = function(specifier, fromFile) {
    if (/^https?:\\/\\//i.test(specifier) || specifier.startsWith('//')) {
      if (window.__cs_cdn_cache__[specifier]) {
        return window.__cs_cdn_cache__[specifier];
      }
      throw new Error('CDN module "' + specifier + '" is not loaded. Preload required.');
    }

    var resolved = window.__cs_resolve__(specifier, fromFile);
    if (!resolved || !window.__cs_modules__[resolved]) {
      throw new Error('CodeStudio Module Error: Cannot find module "' + specifier + '" from "' + fromFile + '"');
    }

    if (window.__cs_module_cache__[resolved]) {
      return window.__cs_module_cache__[resolved].exports;
    }

    var module = {
      id: resolved,
      exports: {},
      loaded: false
    };
    // Cache immediately to handle circular dependencies cleanly without recursion
    window.__cs_module_cache__[resolved] = module;

    var boundRequire = function(subSpec) {
      return window.__cs_require__(subSpec, resolved);
    };
    boundRequire.resolve = function(subSpec) {
      return window.__cs_resolve__(subSpec, resolved);
    };

    var dirname = resolved.split('/').slice(0, -1).join('/') || '.';
    try {
      window.__cs_modules__[resolved](module.exports, boundRequire, module, resolved, dirname);
      module.loaded = true;
      return module.exports;
    } catch (err) {
      console.error('Module execution error in ' + resolved + ':', err);
      throw err;
    }
  };

  // Dynamic import helper
  window.__cs_import_async__ = async function(specifier, fromFile) {
    if (/^https?:\\/\\//i.test(specifier) || specifier.startsWith('//')) {
      return await import(specifier);
    }
    return window.__cs_require__(specifier, fromFile);
  };
})();
</script>
`;

  return {
    hasModules,
    analyses,
    circularCycles,
    errors,
    warnings,
    bundledRuntimeScript: runtimeScript,
  };
}
