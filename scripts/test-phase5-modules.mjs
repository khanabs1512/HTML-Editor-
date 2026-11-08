import assert from 'assert';
import { buildPreviewHTML } from '../src/services/previewBundler.ts';
import {
  analyzeModule,
  detectCircularDependencies,
  transformModuleWithSucrase,
  buildProjectModuleSystem,
  isBareSpecifier,
  isCdnUrl,
  resolveModulePath
} from '../src/services/moduleResolver.ts';

console.log('=== Running Phase 5.1: Modern Web Runtime & ES Module Support Tests ===\n');

// -------------------------------------------------------------
// Test 1: Specifier Classification (CDN vs Bare vs Relative)
// -------------------------------------------------------------
console.log('Test 1: Testing specifier classification...');
assert(isCdnUrl('https://esm.sh/canvas-confetti'), 'https:// URL should be CDN');
assert(isCdnUrl('https://cdn.jsdelivr.net/npm/chart.js'), 'https:// CDN should be CDN');
assert(isCdnUrl('//unpkg.com/three'), '// URL should be CDN');
assert(!isCdnUrl('./math.js'), './ should not be CDN');
assert(!isCdnUrl('../utils/calc.js'), '../ should not be CDN');
assert(!isCdnUrl('lodash'), 'bare lodash should not be CDN');

assert(isBareSpecifier('lodash'), 'lodash is a bare specifier');
assert(isBareSpecifier('@types/node'), '@types/node is a bare specifier');
assert(!isBareSpecifier('./math.js'), './math.js is not bare');
assert(!isBareSpecifier('../calc.js'), '../calc.js is not bare');
assert(!isBareSpecifier('/app.js'), '/app.js is not bare');
assert(!isBareSpecifier('https://esm.sh/lodash'), 'CDN is not bare');
console.log('✓ PASS: Specifier classification accurately distinguishes CDN, bare, and relative paths.');

// -------------------------------------------------------------
// Test 2: AST Module Transpilation via Sucrase
// -------------------------------------------------------------
console.log('\nTest 2: Testing Sucrase AST module transpilation (named, default, namespace, re-exports, destructuring)...');
const sampleModuleCode = `
import defaultCalc, { add, multiply as mult } from './utils/math.js';
import * as helpers from '../common/helpers.js';
import confetti from 'https://esm.sh/canvas-confetti';
import './sideEffect.js';

export const PI = 3.14159, E = 2.71828;
export const { floor, ceil } = Math;
export function calculate(a, b) {
  return mult(add(a, b), PI);
}
export default calculate;
export { helperA, helperB as b } from './reExports.js';
export * from './allExports.js';
`;

const fileMap = new Map([
  ['utils/math.js', { id: '1', name: 'math.js', path: 'utils/math.js', type: 'javascript', content: '' }],
  ['common/helpers.js', { id: '2', name: 'helpers.js', path: 'common/helpers.js', type: 'javascript', content: '' }],
  ['sideEffect.js', { id: '3', name: 'sideEffect.js', path: 'sideEffect.js', type: 'javascript', content: '' }],
  ['reExports.js', { id: '4', name: 'reExports.js', path: 'reExports.js', type: 'javascript', content: '' }],
  ['allExports.js', { id: '5', name: 'allExports.js', path: 'allExports.js', type: 'javascript', content: '' }],
]);

const analysis = analyzeModule(sampleModuleCode, 'app.js', fileMap);
assert.strictEqual(analysis.cdnImports.length, 1);
assert.strictEqual(analysis.cdnImports[0], 'https://esm.sh/canvas-confetti');
assert.strictEqual(analysis.resolvedLocalDeps.length, 5);

const transpiled = transformModuleWithSucrase(sampleModuleCode, 'src/app.js');
assert(transpiled.hasEsSyntax, 'Must detect ES module syntax');
assert(/exports\.\s*default\s*=\s*calculate/.test(transpiled.code), 'Default export must be properly assigned');
assert(transpiled.code.includes('exports.PI ='), 'Named export PI must be exported');
assert(transpiled.code.includes('E = 2.71828'), 'Multiple declarations must be declared');
assert(transpiled.code.includes('require('), 'Imports must be compiled to require calls');

console.log('✓ PASS: Sucrase transpilation successfully handles complex modern ES module patterns.');

// -------------------------------------------------------------
// Test 3: Relative Path Resolution Across Nested Folders
// -------------------------------------------------------------
console.log('\nTest 3: Testing nested relative path resolution...');
const nestedFileMap = new Map([
  ['src/core/math.js', { id: 'm1', name: 'math.js', path: 'src/core/math.js', type: 'javascript', content: '' }],
  ['src/utils/format.js', { id: 'm2', name: 'format.js', path: 'src/utils/format.js', type: 'javascript', content: '' }],
  ['index.js', { id: 'm3', name: 'index.js', path: 'index.js', type: 'javascript', content: '' }],
]);

const resolvedCoreMath = resolveModulePath('src/utils/format.js', '../core/math.js', nestedFileMap);
assert.strictEqual(resolvedCoreMath, 'src/core/math.js');

const resolvedOmittedExt = resolveModulePath('src/utils/format.js', '../core/math', nestedFileMap);
assert.strictEqual(resolvedOmittedExt, 'src/core/math.js');

const resolvedMissing = resolveModulePath('src/utils/format.js', '../nonexistent.js', nestedFileMap);
assert.strictEqual(resolvedMissing, null);

console.log('✓ PASS: Nested path resolution handles multi-level directories and extension omission.');

// -------------------------------------------------------------
// Test 4: Circular Dependency Detection
// -------------------------------------------------------------
console.log('\nTest 4: Testing circular dependency detection and error reporting...');
const cyclicAnalyses = new Map([
  ['a.js', { filePath: 'a.js', hasEsSyntax: true, importedSpecifiers: ['./b.js'], bareImports: [], cdnImports: [], resolvedLocalDeps: ['b.js'], missingDeps: [] }],
  ['b.js', { filePath: 'b.js', hasEsSyntax: true, importedSpecifiers: ['./c.js'], bareImports: [], cdnImports: [], resolvedLocalDeps: ['c.js'], missingDeps: [] }],
  ['c.js', { filePath: 'c.js', hasEsSyntax: true, importedSpecifiers: ['./a.js'], bareImports: [], cdnImports: [], resolvedLocalDeps: ['a.js'], missingDeps: [] }],
]);

const cycles = detectCircularDependencies(cyclicAnalyses);
assert.strictEqual(cycles.length, 1);
assert.deepStrictEqual(cycles[0], ['a.js', 'b.js', 'c.js', 'a.js']);
console.log(`✓ PASS: Circular dependency detected: ${cycles[0].join(' -> ')}`);

// -------------------------------------------------------------
// Test 5: End-to-End ES Module Project Bundling
// -------------------------------------------------------------
console.log('\nTest 5: Testing full multi-file ES module project bundling...');
const moduleProject = {
  id: 'proj-modules',
  name: 'Modern ES Modules Project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  folders: ['js'],
  files: [
    {
      id: 'f-index',
      name: 'index.html',
      path: 'index.html',
      type: 'html',
      lastModified: Date.now(),
      content: `<!DOCTYPE html>
<html>
<head>
  <title>ES Modules Test</title>
</head>
<body>
  <div id="output">Calculating...</div>
  <script type="module" src="js/app.js"></script>
</body>
</html>`
    },
    {
      id: 'f-app',
      name: 'app.js',
      path: 'js/app.js',
      type: 'javascript',
      lastModified: Date.now(),
      content: `import { add, multiply } from './math.js';
import formatResult from './formatter.js';
import confetti from 'https://esm.sh/canvas-confetti';

const res = multiply(add(5, 5), 2);
document.getElementById('output').textContent = formatResult(res);
console.log('Computed result:', res);`
    },
    {
      id: 'f-math',
      name: 'math.js',
      path: 'js/math.js',
      type: 'javascript',
      lastModified: Date.now(),
      content: `export function add(a, b) { return a + b; }
export function multiply(a, b) { return a * b; }`
    },
    {
      id: 'f-formatter',
      name: 'formatter.js',
      path: 'js/formatter.js',
      type: 'javascript',
      lastModified: Date.now(),
      content: `export default function format(val) {
  return 'Result = ' + val;
}`
    }
  ]
};

const bundledHtml = buildPreviewHTML(moduleProject, 'index.html');

assert(bundledHtml.includes('window.__cs_modules__'), 'Module registry must be present');
assert(bundledHtml.includes('window.__cs_require__'), 'Runtime linker must be present');
assert(bundledHtml.includes('js/app.js'), 'app.js must be in registry');
assert(bundledHtml.includes('js/math.js'), 'math.js must be in registry');
assert(bundledHtml.includes('js/formatter.js'), 'formatter.js must be in registry');
assert(bundledHtml.includes('https://esm.sh/canvas-confetti'), 'External CDN URL must be preserved');
assert(bundledHtml.includes('id="__cs_error_overlay__"'), 'Runtime error overlay must be injected');

console.log('✓ PASS: Multi-file ES module project bundled cleanly with registry, error overlay, and CDN preservation.');

// -------------------------------------------------------------
// Test 6: Bare Specifier Error Detection in Bundling
// -------------------------------------------------------------
console.log('\nTest 6: Testing clear error for unsupported bare package specifiers...');
const bareProject = {
  id: 'proj-bare',
  name: 'Bare Import Project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  folders: [],
  files: [
    {
      id: 'f-index',
      name: 'index.html',
      path: 'index.html',
      type: 'html',
      lastModified: Date.now(),
      content: `<!DOCTYPE html><html><body><script type="module" src="app.js"></script></body></html>`
    },
    {
      id: 'f-app',
      name: 'app.js',
      path: 'app.js',
      type: 'javascript',
      lastModified: Date.now(),
      content: `import lodash from 'lodash';\nconsole.log(lodash);`
    }
  ]
};

const bareBundled = buildPreviewHTML(bareProject, 'index.html');
assert(bareBundled.includes('Unsupported bare package specifier'), 'Bare specifier error message must be injected');
assert(bareBundled.includes('https://esm.sh/lodash'), 'Helpful CDN recommendation must be suggested');

console.log('✓ PASS: Bare module specifiers produce clear, actionable diagnostic errors in preview.');

console.log('\n=============================================================');
console.log('ALL PHASE 5.1 MODERN RUNTIME & MODULE TESTS PASSED (6/6) ✓');
console.log('=============================================================');
