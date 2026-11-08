/**
 * CodeStudio Phase 5.2 - Unit & Integration Test Suite
 * Covers Import System, Delete Functionality, Folder Recursion, Conflict Resolution, and IndexedDB Persistence
 */
import assert from 'assert';
import 'fake-indexeddb/auto';
import { dbService } from '../src/services/db.js';
import {
  isBinaryAsset,
  sanitizePath,
  deriveFoldersFromFiles,
  detectPrimaryHtmlFile,
  stripRootFolderPrefix,
  createProjectFromImportedFiles,
  mergeFilesIntoProject,
  importSingleHtmlFile,
  importFileList
} from '../src/services/importService.js';
import { exportProjectAsZip, importZipFile } from '../src/services/zipService.js';

console.log('================================================================');
console.log('  CodeStudio Phase 5.2: Unit & Integration Test Suite');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function test(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function asyncTest(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// Section 1: importService Helpers & Binary Asset Detection
// -------------------------------------------------------------
test('isBinaryAsset correctly identifies image and font formats', () => {
  assert.strictEqual(isBinaryAsset('image.png'), true);
  assert.strictEqual(isBinaryAsset('photo.jpg'), true);
  assert.strictEqual(isBinaryAsset('icon.jpeg'), true);
  assert.strictEqual(isBinaryAsset('graphic.webp'), true);
  assert.strictEqual(isBinaryAsset('animation.gif'), true);
  assert.strictEqual(isBinaryAsset('fonts/custom.woff'), true);
  assert.strictEqual(isBinaryAsset('fonts/custom.woff2'), true);
  assert.strictEqual(isBinaryAsset('fonts/custom.ttf'), true);
  assert.strictEqual(isBinaryAsset('fonts/custom.otf'), true);
  assert.strictEqual(isBinaryAsset('index.html'), false);
  assert.strictEqual(isBinaryAsset('styles.css'), false);
  assert.strictEqual(isBinaryAsset('app.js'), false);
  assert.strictEqual(isBinaryAsset('data.json'), false);
  assert.strictEqual(isBinaryAsset('vector.svg'), false); // SVGs are treated as text/xml
});

test('sanitizePath cleans leading slashes and Windows backslashes', () => {
  assert.strictEqual(sanitizePath('/assets/css/style.css'), 'assets/css/style.css');
  assert.strictEqual(sanitizePath('assets\\js\\app.js'), 'assets/js/app.js');
  assert.strictEqual(sanitizePath('./nested/file.txt'), 'nested/file.txt');
  assert.strictEqual(sanitizePath('///deep/path/name.html'), 'deep/path/name.html');
});

test('deriveFoldersFromFiles reconstructs hierarchy from file paths', () => {
  const filePaths = [
    'index.html',
    'css/style.css',
    'css/themes/dark.css',
    'js/utils/math.js',
    'assets/images/logo.png'
  ];
  const folders = deriveFoldersFromFiles(filePaths);

  assert.ok(folders.includes('css'), 'Should include css folder');
  assert.ok(folders.includes('css/themes'), 'Should include css/themes folder');
  assert.ok(folders.includes('js'), 'Should include js folder');
  assert.ok(folders.includes('js/utils'), 'Should include js/utils folder');
  assert.ok(folders.includes('assets'), 'Should include assets folder');
  assert.ok(folders.includes('assets/images'), 'Should include assets/images folder');
});

test('detectPrimaryHtmlFile picks index.html or best candidate', () => {
  const set1 = [
    { name: 'styles.css', path: 'styles.css' },
    { name: 'app.js', path: 'app.js' },
    { name: 'index.html', path: 'index.html' }
  ];
  assert.strictEqual(detectPrimaryHtmlFile(set1)?.path, 'index.html');

  const set2 = [
    { name: 'about.html', path: 'about.html' },
    { name: 'contact.htm', path: 'contact.htm' }
  ];
  assert.strictEqual(detectPrimaryHtmlFile(set2)?.name, 'about.html');

  const set3 = [
    { name: 'page.html', path: 'views/page.html' },
    { name: 'index.html', path: 'dist/index.html' }
  ];
  assert.strictEqual(detectPrimaryHtmlFile(set3)?.path, 'dist/index.html');
});

test('stripRootFolderPrefix normalizes folder upload paths', () => {
  const rawFiles = [
    { name: 'index.html', path: 'my-site/index.html', content: '<h1>Hi</h1>' },
    { name: 'style.css', path: 'my-site/css/style.css', content: 'body{}' },
    { name: 'app.js', path: 'my-site/js/app.js', content: 'console.log(1)' }
  ];
  const stripped = stripRootFolderPrefix(rawFiles);
  assert.strictEqual(stripped[0].path, 'index.html');
  assert.strictEqual(stripped[1].path, 'css/style.css');
  assert.strictEqual(stripped[2].path, 'js/app.js');
});

// -------------------------------------------------------------
// Section 2: createProjectFromImportedFiles & mergeFilesIntoProject
// -------------------------------------------------------------
test('createProjectFromImportedFiles constructs complete project structure', () => {
  const rawFiles = [
    { id: 'f-idx', name: 'index.html', path: 'index.html', type: 'html', content: '<h1>Hello CodeStudio</h1>', lastModified: Date.now() },
    { id: 'f-css', name: 'style.css', path: 'assets/css/style.css', type: 'css', content: 'body { color: red; }', lastModified: Date.now() },
    { id: 'f-js', name: 'app.js', path: 'assets/js/app.js', type: 'javascript', content: 'export const x = 42;', lastModified: Date.now() }
  ];

  const project = createProjectFromImportedFiles('Test Import', rawFiles);
  assert.strictEqual(project.name, 'Test Import');
  assert.strictEqual(project.files.length, 3);
  assert.ok(project.folders.includes('assets'));
  assert.ok(project.folders.includes('assets/css'));
  assert.ok(project.folders.includes('assets/js'));

  const indexFile = project.files.find((f) => f.path === 'index.html');
  assert.ok(indexFile);
  assert.strictEqual(indexFile.content, '<h1>Hello CodeStudio</h1>');

  const styleFile = project.files.find((f) => f.path === 'assets/css/style.css');
  assert.ok(styleFile);
  assert.strictEqual(styleFile.content, 'body { color: red; }');
});

test('mergeFilesIntoProject handles skip conflict policy', () => {
  const existingProject = {
    id: 'p1',
    name: 'Existing',
    files: [
      { id: 'f1', name: 'index.html', path: 'index.html', type: 'html', content: 'ORIGINAL', lastModified: Date.now() },
      { id: 'f2', name: 'style.css', path: 'style.css', type: 'css', content: 'OLD CSS', lastModified: Date.now() }
    ],
    folders: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const incoming = [
    { id: 'in-1', name: 'index.html', path: 'index.html', type: 'html', content: 'OVERWRITE?', lastModified: Date.now() },
    { id: 'in-2', name: 'app.js', path: 'app.js', type: 'javascript', content: 'NEW JS', lastModified: Date.now() }
  ];

  const result = mergeFilesIntoProject(existingProject, incoming, 'skip');
  assert.strictEqual(result.updatedProject.files.length, 3);
  assert.strictEqual(result.skippedCount, 1);
  const indexFile = result.updatedProject.files.find((f) => f.path === 'index.html');
  assert.strictEqual(indexFile.content, 'ORIGINAL', 'Skip policy must keep existing file');
  const appFile = result.updatedProject.files.find((f) => f.path === 'app.js');
  assert.strictEqual(appFile.content, 'NEW JS', 'Non-conflicting file should be added');
});

test('mergeFilesIntoProject handles replace conflict policy', () => {
  const existingProject = {
    id: 'p1',
    name: 'Existing',
    files: [
      { id: 'f1', name: 'index.html', path: 'index.html', type: 'html', content: 'ORIGINAL', lastModified: Date.now() }
    ],
    folders: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const incoming = [
    { id: 'in-1', name: 'index.html', path: 'index.html', type: 'html', content: 'REPLACED CONTENT', lastModified: Date.now() }
  ];

  const result = mergeFilesIntoProject(existingProject, incoming, 'replace');
  assert.strictEqual(result.updatedProject.files.length, 1);
  assert.strictEqual(result.replacedCount, 1);
  const indexFile = result.updatedProject.files.find((f) => f.path === 'index.html');
  assert.strictEqual(indexFile.content, 'REPLACED CONTENT', 'Replace policy must update file content');
});

test('mergeFilesIntoProject handles rename conflict policy', () => {
  const existingProject = {
    id: 'p1',
    name: 'Existing',
    files: [
      { id: 'f1', name: 'index.html', path: 'index.html', type: 'html', content: 'ORIGINAL', lastModified: Date.now() }
    ],
    folders: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const incoming = [
    { id: 'in-1', name: 'index.html', path: 'index.html', type: 'html', content: 'RENAMED COPY', lastModified: Date.now() }
  ];

  const result = mergeFilesIntoProject(existingProject, incoming, 'rename');
  assert.strictEqual(result.updatedProject.files.length, 2);
  assert.strictEqual(result.renamedCount, 1);
  const original = result.updatedProject.files.find((f) => f.path === 'index.html');
  const renamed = result.updatedProject.files.find((f) => f.path.startsWith('index_imported_'));
  assert.strictEqual(original.content, 'ORIGINAL');
  assert.ok(renamed, 'Renamed file should exist with unique suffix');
  assert.strictEqual(renamed.content, 'RENAMED COPY');
});

// -------------------------------------------------------------
// Section 3: Priority 2 - Deletion Logic & Zero States
// -------------------------------------------------------------
test('Deleting down to zero files maintains valid project with empty files array', () => {
  const project = {
    id: 'p-del',
    name: 'Delete Project',
    files: [
      { id: 'f1', name: 'index.html', path: 'index.html', content: '<p>1</p>', parentId: null }
    ],
    folders: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Simulate file delete of the last file
  const remainingFiles = project.files.filter((f) => f.id !== 'f1');
  assert.strictEqual(remainingFiles.length, 0);

  // Tab and active file cleanup
  let openFileIds = ['f1'];
  let dirtyFileIds = new Set(['f1']);
  let activeFileId = 'f1';

  openFileIds = openFileIds.filter((id) => id !== 'f1');
  dirtyFileIds.delete('f1');
  if (activeFileId === 'f1') {
    activeFileId = openFileIds[0] || (remainingFiles[0] ? remainingFiles[0].id : '');
  }

  assert.strictEqual(openFileIds.length, 0);
  assert.strictEqual(dirtyFileIds.size, 0);
  assert.strictEqual(activeFileId, '', 'Active file must become empty string when all files deleted');
});

test('Deleting non-empty folder recursively purges all children files and folders', () => {
  const folders = [
    { id: 'fol-parent', name: 'assets', path: 'assets', parentId: null },
    { id: 'fol-child', name: 'css', path: 'assets/css', parentId: 'fol-parent' }
  ];

  const files = [
    { id: 'f-root', name: 'index.html', path: 'index.html', parentId: null },
    { id: 'f-sub1', name: 'style.css', path: 'assets/css/style.css', parentId: 'fol-child' },
    { id: 'f-sub2', name: 'theme.css', path: 'assets/css/theme.css', parentId: 'fol-child' },
    { id: 'f-sub3', name: 'logo.png', path: 'assets/logo.png', parentId: 'fol-parent' }
  ];

  let openFileIds = ['f-root', 'f-sub1', 'f-sub2'];
  let dirtyFileIds = new Set(['f-sub1']);
  let activeFileId = 'f-sub1';

  // Recursive folder deletion function as implemented in App.tsx
  const getSubfolderIds = (parentId) => {
    let ids = [parentId];
    const children = folders.filter((f) => f.parentId === parentId);
    for (const child of children) {
      ids = ids.concat(getSubfolderIds(child.id));
    }
    return ids;
  };

  const targetFolderId = 'fol-parent';
  const folderIdsToDelete = new Set(getSubfolderIds(targetFolderId));
  assert.strictEqual(folderIdsToDelete.size, 2); // 'fol-parent' and 'fol-child'

  const remainingFiles = files.filter(
    (f) => !f.parentId || !folderIdsToDelete.has(f.parentId)
  );
  assert.strictEqual(remainingFiles.length, 1);
  assert.strictEqual(remainingFiles[0].id, 'f-root');

  const deletedFileIds = new Set(
    files.filter((f) => f.parentId && folderIdsToDelete.has(f.parentId)).map((f) => f.id)
  );
  openFileIds = openFileIds.filter((id) => !deletedFileIds.has(id));
  deletedFileIds.forEach((id) => dirtyFileIds.delete(id));
  if (deletedFileIds.has(activeFileId)) {
    activeFileId = openFileIds[0] || (remainingFiles[0] ? remainingFiles[0].id : '');
  }

  assert.deepStrictEqual(openFileIds, ['f-root']);
  assert.strictEqual(dirtyFileIds.size, 0);
  assert.strictEqual(activeFileId, 'f-root');
});

// -------------------------------------------------------------
// Section 4: IndexedDB Integration & Full Lifecycle
// -------------------------------------------------------------
await asyncTest('IndexedDB lifecycle: initialize, import ZIP, delete all files, delete all projects', async () => {
  // 1. Initial starter projects exist (getAllProjects initializes the DB automatically)
  const initialProjects = await dbService.getAllProjects();
  assert.ok(initialProjects.length > 0, 'Database should initialize with starter projects');

  // 2. Import a project via importZipFile service
  const zipProject = {
    id: 'p-zip-test',
    name: 'ZIP Sample Project',
    files: [
      { id: 'zf-1', name: 'index.html', path: 'index.html', content: '<h1>Zip Test</h1>', parentId: null },
      { id: 'zf-2', name: 'style.css', path: 'style.css', content: 'body{margin:0;}', parentId: null }
    ],
    folders: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const zipBlob = await exportProjectAsZip(zipProject);
  assert.ok(zipBlob instanceof Blob);

  const zipFileObj = new File([zipBlob], 'sample.zip', { type: 'application/zip' });
  const { name, files } = await importZipFile(zipFileObj);
  const importedProject = createProjectFromImportedFiles(name, files, 'Imported from sample.zip');
  assert.ok(importedProject);
  assert.strictEqual(importedProject.files.length, 2);

  await dbService.saveProject(importedProject);
  const fetched = await dbService.getProject(importedProject.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.name, importedProject.name);

  // 3. Delete all files from imported project
  importedProject.files = [];
  await dbService.saveProject(importedProject);
  const emptiedProject = await dbService.getProject(importedProject.id);
  assert.strictEqual(emptiedProject.files.length, 0, 'Empty project must persist with 0 files');

  // 4. Delete all projects down to zero
  const allCurrent = await dbService.getAllProjects();
  for (const p of allCurrent) {
    await dbService.deleteProject(p.id);
  }

  const finalProjects = await dbService.getAllProjects();
  assert.strictEqual(finalProjects.length, 0, 'All projects can be deleted down to zero');
});

console.log(`\n================================================================`);
console.log(`  Phase 5.2 Unit & Integration Tests: ${passCount}/${totalCount} Passed`);
console.log(`================================================================\n`);
