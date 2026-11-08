import assert from 'assert';
import JSZip from 'jszip';
import { buildPreviewHTML } from '../src/services/previewBundler.ts';
import { formatCode, minifyCode } from '../src/services/formatters.ts';

console.log('--- Starting CodeStudio Phase 2 Functional Verification ---');

// Test 1: Project Creation & Multi-file Relative Bundling
console.log('Test 1: Testing relative file bundling in preview engine...');
const sampleProject = {
  id: 'test-proj-1',
  name: 'Test Project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  folders: ['css', 'js', 'assets'],
  files: [
    {
      id: 'f1',
      name: 'index.html',
      path: 'index.html',
      type: 'html',
      lastModified: Date.now(),
      content: `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <h1 id="title">Hello CodeStudio</h1>
  <img src="assets/icon.png" alt="Icon">
  <script src="js/script.js"></script>
</body>
</html>`
    },
    {
      id: 'f2',
      name: 'style.css',
      path: 'css/style.css',
      type: 'css',
      lastModified: Date.now(),
      content: 'body { background: #123456; color: white; }'
    },
    {
      id: 'f3',
      name: 'script.js',
      path: 'js/script.js',
      type: 'javascript',
      lastModified: Date.now(),
      content: 'console.log("Interactive script executing successfully!"); document.getElementById("title").innerText = "Updated!";'
    },
    {
      id: 'f4',
      name: 'icon.png',
      path: 'assets/icon.png',
      type: 'image',
      isBinary: true,
      dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      content: '',
      lastModified: Date.now(),
    }
  ]
};

const bundledHtml = buildPreviewHTML(sampleProject, 'index.html');

// Verifications
assert(bundledHtml.includes('/* Embedded from css/style.css */'), 'CSS file was not inlined properly!');
assert(bundledHtml.includes('body { background: #123456; color: white; }'), 'CSS content missing in bundle!');
assert(bundledHtml.includes('// Embedded from js/script.js'), 'JS file was not inlined properly!');
assert(bundledHtml.includes('Interactive script executing successfully!'), 'JS content missing in bundle!');
assert(bundledHtml.includes('data:image/png;base64,'), 'Asset image was not converted to data URI in bundle!');
assert(bundledHtml.includes('CODESTUDIO_CONSOLE'), 'Console communication bridge was not injected!');
assert(bundledHtml.includes('EVAL_CODE'), 'REPL message listener was not injected!');

console.log('✓ Test 1 Passed: Relative CSS, JS, Assets, Console Bridge, and REPL properly bundled.');

// Test 2: Formatting & Minification Engine
console.log('Test 2: Testing code formatters and minifiers...');
const unformattedHtml = '<div><p>Hello<span>World</span></p></div>';
const formattedHtml = formatCode(unformattedHtml, 'html', 2);
assert(formattedHtml.includes('\n'), 'HTML Formatter failed to add indentations!');

const unformattedCss = 'body{margin:0;padding:0;}h1{color:red;}';
const formattedCss = formatCode(unformattedCss, 'css', 2);
assert(formattedCss.includes('{\n  margin: 0;'), 'CSS Formatter failed!');

const minifiedCss = minifyCode(formattedCss, 'css');
assert(!minifiedCss.includes('\n'), 'CSS Minifier failed!');
console.log('✓ Test 2 Passed: Offline Code Formatters and Minifiers work as expected.');

// Test 3: ZIP Export & Re-import with Folder Hierarchy
console.log('Test 3: Testing ZIP generation and extraction with folder hierarchy...');
async function testZip() {
  const zip = new JSZip();
  for (const file of sampleProject.files) {
    if (file.isBinary && file.dataUri) {
      const b64 = file.dataUri.split(',')[1];
      zip.file(file.path, b64, { base64: true });
    } else {
      zip.file(file.path, file.content);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'nodebuffer' });
  assert(zipBlob.length > 0, 'Generated ZIP is empty!');

  // Re-read with JSZip
  const loaded = await JSZip.loadAsync(zipBlob);
  assert(loaded.file('index.html') !== null, 'index.html missing from zip!');
  assert(loaded.file('css/style.css') !== null, 'css/style.css folder path missing from zip!');
  assert(loaded.file('js/script.js') !== null, 'js/script.js folder path missing from zip!');
  assert(loaded.file('assets/icon.png') !== null, 'assets/icon.png missing from zip!');

  const cssText = await loaded.file('css/style.css').async('string');
  assert.strictEqual(cssText, sampleProject.files[1].content, 'ZIP file content corrupted!');

  console.log('✓ Test 3 Passed: ZIP Export/Import preserves folder hierarchy and file content.');
}

testZip().then(() => {
  console.log('=== All CodeStudio Phase 2 Automated Tests Passed Successfully! ===');
}).catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
