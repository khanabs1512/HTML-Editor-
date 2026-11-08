/**
 * CodeStudio Phase 5.2 - Real Chromium Browser Automation Test Suite (Playwright)
 * Tests Real Browser UI for HTML Import, ZIP Import, Re-selection, Deletion, Mobile Parity, and Sandbox Security
 */
import { chromium } from '@playwright/test';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import JSZip from 'jszip';

console.log('================================================================');
console.log('  CodeStudio Phase 5.2: Real Browser E2E Suite (Playwright)');
console.log('================================================================\n');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runBrowserTestSuite() {
  const defaultExecutable = '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
  const executablePath = fs.existsSync(defaultExecutable) ? defaultExecutable : undefined;

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  // Auto-accept any confirmation dialogs (e.g. confirm file/folder/project deletion)
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  const tempFilesToCleanup = [];

  try {
    // -------------------------------------------------------------
    // Scenario 1: Initial Page Load & UI Layout Verification
    // -------------------------------------------------------------
    console.log(`[Scenario 1] Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('header', { timeout: 10000 });

    const title = await page.title();
    console.log(`  Page Title: "${title}"`);
    assert(title.includes('CodeStudio'), `Title should mention CodeStudio, found "${title}"`);

    const hasHeader = await page.locator('header').isVisible();
    assert(hasHeader, 'Header must be visible');
    console.log('  ✓ PASS: CodeStudio workspace mounted successfully.');

    // -------------------------------------------------------------
    // Scenario 2: Direct Single HTML File Import via UI
    // -------------------------------------------------------------
    console.log('\n[Scenario 2] Testing Direct Single HTML File Import via ImportModal...');
    const sampleHtmlContent = `<!DOCTYPE html>
<html>
<head><title>My Direct Import</title></head>
<body><h1>Imported HTML Success</h1><p>Running in CodeStudio</p></body>
</html>`;
    const tempHtmlPath = path.join(os.tmpdir(), 'direct-sample.html');
    fs.writeFileSync(tempHtmlPath, sampleHtmlContent, 'utf-8');
    tempFilesToCleanup.push(tempHtmlPath);

    // Click Import button in top bar or footer
    const importModalTrigger = page.locator('[data-testid="open-import-modal-btn"]').or(page.locator('[data-testid="footer-import-btn"]')).first();
    await importModalTrigger.click();

    // Verify modal is open
    await page.waitForSelector('text=Import Website or Files', { timeout: 10000 });
    console.log('  Import Modal opened.');

    // Set file input on single HTML picker inside modal
    const htmlFileInput = page.locator('[data-testid="modal-html-file-input"]');
    await htmlFileInput.setInputFiles(tempHtmlPath);

    // Wait for auto-processing and modal to close completely
    await page.waitForSelector('text=Import Website or Files', { state: 'detached', timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify the project header reflects the imported project
    const activeProjectName = await page.locator('header').innerText();
    console.log(`  Header after import: ${activeProjectName.replace(/\n+/g, ' ')}`);
    assert(
      activeProjectName.toLowerCase().includes('direct-sample') ||
      activeProjectName.toLowerCase().includes('html') ||
      activeProjectName.toLowerCase().includes('import'),
      'Header should show newly imported project name'
    );

    // Verify file content inside editor
    await page.waitForTimeout(500);
    const editorText = await page.locator('.cm-content').innerText();
    assert(editorText.includes('Imported HTML Success'), 'CodeMirror editor must display imported HTML');
    console.log('  ✓ PASS: Direct single HTML file imported into new project and loaded in editor.');

    // -------------------------------------------------------------
    // Scenario 3: Consecutive Re-selection of the Identical File
    // -------------------------------------------------------------
    console.log('\n[Scenario 3] Testing Consecutive Re-selection of Identical File (.value = "" reset)...');
    // Open import modal again
    await importModalTrigger.click();
    await page.waitForSelector('text=Import Website or Files', { timeout: 10000 });

    // Select the EXACT same file again to verify that .value = '' allowed re-triggering
    await htmlFileInput.setInputFiles(tempHtmlPath);
    await page.waitForSelector('text=Import Website or Files', { state: 'detached', timeout: 10000 });
    await page.waitForTimeout(500);

    const reimportedHeader = await page.locator('header').innerText();
    assert(reimportedHeader.length > 0);
    console.log('  ✓ PASS: Consecutive re-selection of the same file verified.');

    // -------------------------------------------------------------
    // Scenario 4: ZIP Import via File Explorer Action
    // -------------------------------------------------------------
    console.log('\n[Scenario 4] Testing ZIP Import via File Explorer action...');
    const zip = new JSZip();
    zip.file('index.html', '<!DOCTYPE html><html><body><h1>Zip Project Page</h1></body></html>');
    zip.file('css/style.css', 'body { background: #111; color: #fff; }');
    zip.file('js/main.js', 'console.log("From zip main.js");');

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const tempZipPath = path.join(os.tmpdir(), 'archive-test.zip');
    fs.writeFileSync(tempZipPath, zipBuffer);
    tempFilesToCleanup.push(tempZipPath);

    // Target the hidden ZIP input in FileExplorer
    const zipInput = page.locator('[data-testid="explorer-zip-input"]');
    await zipInput.setInputFiles(tempZipPath);

    await page.waitForTimeout(1500);

    // Verify project name updated to archive-test
    const currentHeader = await page.locator('header').innerText();
    console.log(`  Current header: ${currentHeader.replace(/\n+/g, ' ')}`);
    assert(
      currentHeader.toLowerCase().includes('archive-test') ||
      currentHeader.toLowerCase().includes('import'),
      'Imported zip should be active'
    );

    // Verify files appear in explorer
    const hasIndexHtml = await page.locator('text=index.html').first().isVisible();
    assert(hasIndexHtml, 'index.html must be present in File Explorer');
    console.log('  ✓ PASS: ZIP archive successfully imported from File Explorer.');

    // -------------------------------------------------------------
    // Scenario 5: Delete Individual Files Down to 0 & Empty State
    // -------------------------------------------------------------
    console.log('\n[Scenario 5] Testing File Deletion Down to 0 & Empty State in Editor...');
    let deleteBtns = await page.locator('button[title="Delete File"]').all();
    while (deleteBtns.length > 0) {
      await deleteBtns[0].click();
      await page.waitForTimeout(400);
      deleteBtns = await page.locator('button[title="Delete File"]').all();
    }

    let folderDeleteBtns = await page.locator('button[title="Delete Folder"]').all();
    while (folderDeleteBtns.length > 0) {
      await folderDeleteBtns[0].click();
      await page.waitForTimeout(400);
      folderDeleteBtns = await page.locator('button[title="Delete Folder"]').all();
    }

    // Now all files are deleted! Verify empty project UI
    await page.waitForTimeout(600);
    const emptyNotice = page.locator('text=No files in project').or(page.locator('text=This project is currently empty')).first();
    assert(await emptyNotice.isVisible(), 'Empty project state should display when 0 files remain');

    // Verify "Create File" button is present and clickable in empty state
    const createFileBtn = page.locator('[data-testid="editor-empty-create-file-btn"]').first();
    assert(await createFileBtn.isVisible(), '"Create File" button must be visible in empty project');
    await createFileBtn.click();
    await page.waitForTimeout(800);

    // Verify index.html was recreated
    const recreatedIndex = await page.locator('text=index.html').first().isVisible();
    assert(recreatedIndex, 'index.html should be created and visible');
    console.log('  ✓ PASS: File deletion down to 0 files and restoration verified.');

    // -------------------------------------------------------------
    // Scenario 6: Deleting All Projects Down to 0 & Empty Workspace State
    // -------------------------------------------------------------
    console.log('\n[Scenario 6] Testing Project Deletion Down to 0 & Empty Workspace View...');
    const projectManagerBtn = page.locator('button[title="Switch or manage projects"]').first();
    await projectManagerBtn.click();
    await page.waitForSelector('text=Project Manager', { timeout: 5000 });

    let projectDeleteBtns = await page.locator('button[title="Delete Project"]').all();
    console.log(`  Found ${projectDeleteBtns.length} projects to delete.`);

    while (projectDeleteBtns.length > 0) {
      await projectDeleteBtns[0].click();
      await page.waitForTimeout(400);
      projectDeleteBtns = await page.locator('button[title="Delete Project"]').all();
    }

    const closeProjModalBtn = page.locator('button[title="Close"]').or(page.locator('button:has-text("Close")')).first();
    if (await closeProjModalBtn.isVisible()) {
      await closeProjModalBtn.click();
      await page.waitForTimeout(400);
    }

    // Verify Empty Workspace view ("No Active Project")
    const noActiveProjHeading = await page.locator('text=No Active Project').isVisible();
    assert(noActiveProjHeading, 'Empty workspace state "No Active Project" must render when 0 projects exist');
    console.log('  Empty workspace state "No Active Project" verified.');

    // Test "Restore Starter Projects"
    const restoreBtn = page.locator('button:has-text("Restore Starter Projects")');
    assert(await restoreBtn.isVisible(), '"Restore Starter Projects" button must be available');
    await restoreBtn.click();
    await page.waitForTimeout(1200);

    // Verify starter project restored
    const restoredHeader = await page.locator('header').innerText();
    console.log(`  Header after restore: ${restoredHeader.replace(/\n+/g, ' ')}`);
    assert(
      restoredHeader.includes('Particle') || restoredHeader.includes('Canvas') || restoredHeader.includes('CodeStudio') || restoredHeader.includes('Synthesizer'),
      'Starter projects should be restored'
    );
    console.log('  ✓ PASS: Zero-project deletion, empty workspace view, and starter restoration verified.');

    // -------------------------------------------------------------
    // Scenario 7: Mobile Viewport Touch Parity (iPhone 15: 390x844)
    // -------------------------------------------------------------
    console.log('\n[Scenario 7] Testing Mobile Touch Action Visibility (iPhone Viewport 390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    const filesTabBtn = page.locator('button:has-text("Files")').first();
    if (await filesTabBtn.isVisible()) {
      await filesTabBtn.click();
      await page.waitForTimeout(400);
    }

    const fileActionBtns = await page.locator('button[title="Delete File"]').or(page.locator('button[title="More actions"]')).all();
    assert(fileActionBtns.length > 0, 'File action buttons must exist in the DOM');

    const firstActionBtn = fileActionBtns[0];
    const isVisible = await firstActionBtn.isVisible();
    assert(isVisible, 'File action buttons must be visible on mobile touch viewports without hover');
    console.log('  ✓ PASS: Mobile touch action accessibility verified on 390x844 viewport.');

    // -------------------------------------------------------------
    // Scenario 8: Preview Sandbox Security Verification
    // -------------------------------------------------------------
    console.log('\n[Scenario 8] Verifying Strict Preview Iframe Sandbox Security...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    const iframeElement = page.locator('iframe[title="Live Preview"]').first();
    assert(await iframeElement.isVisible(), 'Preview iframe must be present');

    const sandboxAttr = await iframeElement.getAttribute('sandbox');
    console.log(`  LivePreview iframe sandbox: "${sandboxAttr}"`);

    assert(sandboxAttr.includes('allow-scripts'), 'Sandbox must allow scripts for preview execution');
    assert(!sandboxAttr.includes('allow-same-origin'), 'Sandbox MUST NOT contain allow-same-origin (strict security)');
    console.log('  ✓ PASS: LivePreview iframe sandbox is strictly hardened without allow-same-origin.');

    console.log(`\nCaptured page errors: ${pageErrors.length}`);
    assert.strictEqual(pageErrors.length, 0, 'There should be 0 unexpected browser console errors');

    console.log('\n================================================================');
    console.log('  ✓ ALL PLAYWRIGHT BROWSER E2E SCENARIOS PASSED WITH ZERO ERRORS');
    console.log('================================================================\n');

  } finally {
    for (const f of tempFilesToCleanup) {
      try { fs.unlinkSync(f); } catch {}
    }
    await browser.close();
  }
}

runBrowserTestSuite().catch((err) => {
  console.error('\n✗ PLAYWRIGHT SUITE FAILED:');
  console.error(err);
  process.exit(1);
});
