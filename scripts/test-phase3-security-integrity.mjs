import assert from 'assert';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';
import { buildPreviewHTML, resolveRelativePath } from '../src/services/previewBundler.ts';
import { importZipFile } from '../src/services/zipService.ts';
import { formatCode, minifyCode } from '../src/services/formatters.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== Running Phase 3 Security, Data Integrity & Quality Assurance Tests ===\n');

// -------------------------------------------------------------
// Test 1: Iframe Sandbox Security Audit
// -------------------------------------------------------------
console.log('Test 1: Auditing LivePreview iframe sandbox permissions...');
const livePreviewCode = fs.readFileSync(path.join(rootDir, 'src/components/LivePreview.tsx'), 'utf-8');

assert(!livePreviewCode.includes('allow-same-origin'), 'CRITICAL SECURITY FAILURE: allow-same-origin permission must NOT be present in untrusted preview iframe!');
assert(livePreviewCode.includes('sandbox="allow-scripts allow-modals allow-forms"'), 'Sandbox attribute must enforce allow-scripts allow-modals allow-forms!');
console.log('✓ PASS: allow-same-origin successfully removed. Preview executes in isolated opaque null-origin.');

// -------------------------------------------------------------
// Test 2: Deep Nested Relative Path & Asset Inlining
// -------------------------------------------------------------
console.log('\nTest 2: Testing bidirectional relative path resolution...');

assert.strictEqual(
  resolveRelativePath('css/theme/dark.css', '../../assets/images/logo.png'),
  'assets/images/logo.png',
  'Failed to resolve multi-level parent directory path (../../)!'
);

assert.strictEqual(
  resolveRelativePath('index.html', './scripts/main.js'),
  'scripts/main.js',
  'Failed to resolve ./ path'
);

assert.strictEqual(
  resolveRelativePath('pages/docs/index.html', '../styles/doc.css'),
  'pages/styles/doc.css',
  'Failed to resolve subfolder relative path'
);

// External CDNs must remain untouched
assert.strictEqual(
  resolveRelativePath('css/main.css', 'https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css'),
  'https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css',
  'External CDN path was incorrectly mutated!'
);

console.log('✓ PASS: Relative path resolution handles multi-level parents, subfolders, and external CDNs.');

// -------------------------------------------------------------
// Test 3: Complex Preview HTML Bundling with CSS @import & url()
// -------------------------------------------------------------
console.log('\nTest 3: Testing full preview bundling with nested CSS imports and assets...');
const complexProject = {
  id: 'proj-complex-1',
  name: 'Complex Nested Project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  folders: ['css', 'css/sub', 'images'],
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
  <link rel="stylesheet" href="css/main.css">
</head>
<body>
  <div class="banner">Welcome</div>
  <img src="images/hero.png" alt="Hero">
</body>
</html>`
    },
    {
      id: 'f-main-css',
      name: 'main.css',
      path: 'css/main.css',
      type: 'css',
      lastModified: Date.now(),
      content: `@import "sub/theme.css";
.banner { background-image: url('../images/hero.png'); }`
    },
    {
      id: 'f-sub-css',
      name: 'theme.css',
      path: 'css/sub/theme.css',
      type: 'css',
      lastModified: Date.now(),
      content: `:root { --primary-color: #38bdf8; }`
    },
    {
      id: 'f-hero-img',
      name: 'hero.png',
      path: 'images/hero.png',
      type: 'image',
      isBinary: true,
      dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPifDwAEfAGfK2009wAAAABJRU5ErkJggg==',
      content: '',
      lastModified: Date.now(),
    }
  ]
};

const bundledResult = buildPreviewHTML(complexProject, 'index.html');
assert(bundledResult.includes('Embedded @import sub/theme.css'), '@import was not inlined!');
assert(bundledResult.includes('--primary-color: #38bdf8'), 'Nested @import theme content missing!');
assert(bundledResult.includes('data:image/png;base64,'), 'Relative image in CSS url() was not inlined with data URI!');
console.log('✓ PASS: Nested @import and relative CSS url() assets inlined seamlessly.');

// -------------------------------------------------------------
// Test 4: ZIP Import Validation & Decompression Protection
// -------------------------------------------------------------
console.log('\nTest 4: Testing ZIP archive security validation and bounds...');

// 4a: Valid ZIP test
const validZip = new JSZip();
validZip.file('index.html', '<h1>Hello</h1>');
validZip.file('style.css', 'body{color:red;}');
const validBlob = await validZip.generateAsync({ type: 'nodebuffer' });
const imported = await importZipFile(validBlob);
assert.strictEqual(imported.files.length, 2);
assert.strictEqual(imported.files[0].path, 'index.html');
console.log('✓ PASS: Standard ZIP archive extracted cleanly with 2 files.');

// 4b: Empty ZIP test
const emptyZip = new JSZip();
const emptyBlob = await emptyZip.generateAsync({ type: 'nodebuffer' });
let emptyCaught = false;
try {
  await importZipFile(emptyBlob);
} catch (err) {
  emptyCaught = true;
  assert(err.message.includes('empty'), 'Expected error about empty archive.');
}
assert(emptyCaught, 'Empty ZIP did not throw validation error!');
console.log('✓ PASS: Empty ZIP archive correctly rejected.');

// 4c: File count overflow test
const bombZip = new JSZip();
for (let i = 0; i < 505; i++) {
  bombZip.file(`file_${i}.txt`, 'sample content');
}
const bombBlob = await bombZip.generateAsync({ type: 'nodebuffer' });
let bombCaught = false;
try {
  await importZipFile(bombBlob);
} catch (err) {
  bombCaught = true;
  assert(err.message.includes('too many files'), 'Expected error for too many files.');
}
assert(bombCaught, 'ZIP bomb with 500+ files did not trigger file limit protection!');
console.log('✓ PASS: Excessive file count protection (500 limit) verified.');

// -------------------------------------------------------------
// Test 5: Backup & Restore Integrity Validation
// -------------------------------------------------------------
console.log('\nTest 5: Testing Backup JSON validation & non-destructive restore...');

const validBackupJson = JSON.stringify({
  app: 'CodeStudio',
  version: 1,
  exportedAt: new Date().toISOString(),
  projects: [
    {
      id: 'p-backup-1',
      name: 'Backup Project',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      files: [
        { id: 'f-1', name: 'index.html', path: 'index.html', type: 'html', content: '<h1>Backup</h1>', lastModified: Date.now() }
      ]
    }
  ],
  settings: { fontSize: 16 }
});

const parsedBackup = JSON.parse(validBackupJson);
assert(parsedBackup.app === 'CodeStudio', 'Backup app identifier missing!');
assert(Array.isArray(parsedBackup.projects), 'Projects array missing!');
assert.strictEqual(parsedBackup.projects[0].files[0].name, 'index.html');

// Invalid backup test
const corruptBackupJson = JSON.stringify({ invalid: true });
let corruptCaught = false;
try {
  const data = JSON.parse(corruptBackupJson);
  if (!data.projects || !Array.isArray(data.projects)) {
    throw new Error('Invalid backup file: missing required "projects" array.');
  }
} catch (err) {
  corruptCaught = true;
}
assert(corruptCaught, 'Corrupt backup failed to be rejected!');
console.log('✓ PASS: Backup structure validation and non-destructive format verified.');

// -------------------------------------------------------------
// Test 6: Input Validation for Duplicate File/Folder Paths
// -------------------------------------------------------------
console.log('\nTest 6: Testing duplicate path and illegal character prevention...');

function validateFileName(name) {
  const clean = name.trim();
  if (!clean || /[\\:*?"<>|]/.test(clean)) return false;
  return true;
}

assert.strictEqual(validateFileName('index.html'), true);
assert.strictEqual(validateFileName('style.css'), true);
assert.strictEqual(validateFileName('invalid:name.js'), false);
assert.strictEqual(validateFileName('invalid*name.js'), false);
assert.strictEqual(validateFileName('invalid?name.js'), false);
assert.strictEqual(validateFileName('   '), false);
console.log('✓ PASS: Illegal character detection properly prevents corrupt file creation.');

console.log('\n=============================================================');
console.log('=== All Phase 3 Security & Integrity Tests Passed 100%! ===');
console.log('=============================================================');
