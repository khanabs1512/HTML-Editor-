import React, { useState, useRef } from 'react';
import { Project, ProjectFile } from '../types/index';
import {
  X,
  FileCode,
  FolderOpen,
  Archive,
  Files,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  ConflictResolution,
  importSingleHtmlFile,
  importFileList,
  createProjectFromImportedFiles,
  mergeFilesIntoProject,
  detectPrimaryHtmlFile
} from '../services/importService';
import { importZipFile } from '../services/zipService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  onImportAsNewProject: (project: Project, primaryFileId?: string) => Promise<void>;
  onAddFilesToProject: (
    updatedProject: Project,
    summary: { added: number; replaced: number; skipped: number; renamed: number }
  ) => Promise<void>;
}

type ImportType = 'html' | 'folder' | 'multifiles' | 'zip';
type ImportDestination = 'new_project' | 'current_project';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onImportAsNewProject,
  onAddFilesToProject,
}) => {
  const [activeTab, setActiveTab] = useState<ImportType>('html');
  const [destination, setDestination] = useState<ImportDestination>('new_project');
  const [conflictPolicy, setConflictPolicy] = useState<ConflictResolution>('replace');
  const [customProjectName, setCustomProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const htmlInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetStatus = () => {
    setStatusMessage(null);
  };

  // 1. Single HTML File Import
  const handleHtmlFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    resetStatus();

    try {
      if (destination === 'new_project' || !currentProject) {
        const newProj = await importSingleHtmlFile(file);
        if (customProjectName.trim()) {
          newProj.name = customProjectName.trim();
        }
        await onImportAsNewProject(newProj, newProj.files[0]?.id);
        setStatusMessage({ type: 'success', text: `Imported HTML project "${newProj.name}" successfully!` });
        setTimeout(() => onClose(), 800);
      } else {
        // Add to current project
        const { files } = await importFileList([file]);
        const result = mergeFilesIntoProject(currentProject, files, conflictPolicy);
        await onAddFilesToProject(result.updatedProject, {
          added: files.length - result.replacedCount - result.skippedCount,
          replaced: result.replacedCount,
          skipped: result.skippedCount,
          renamed: result.renamedCount,
        });
        setStatusMessage({
          type: 'success',
          text: `Added ${file.name} to "${currentProject.name}" (Replaced: ${result.replacedCount}, Skipped: ${result.skippedCount}).`,
        });
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to import HTML file.' });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // 2. Folder (Directory) Import
  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsLoading(true);
    resetStatus();

    try {
      const { files, folders, primaryHtml } = await importFileList(fileList);
      if (files.length === 0) throw new Error('No valid files found in selected directory.');

      const firstSeg = fileList[0].webkitRelativePath?.split('/')[0];
      const folderName = customProjectName.trim() || firstSeg || 'Imported Website';

      if (destination === 'new_project' || !currentProject) {
        const newProj = createProjectFromImportedFiles(folderName, files, `Imported website folder with ${files.length} files`);
        await onImportAsNewProject(newProj, primaryHtml?.id);
        setStatusMessage({
          type: 'success',
          text: `Imported website folder "${newProj.name}" (${files.length} files, ${folders.length} folders)!`,
        });
        setTimeout(() => onClose(), 900);
      } else {
        const result = mergeFilesIntoProject(currentProject, files, conflictPolicy);
        await onAddFilesToProject(result.updatedProject, {
          added: files.length - result.replacedCount - result.skippedCount,
          replaced: result.replacedCount,
          skipped: result.skippedCount,
          renamed: result.renamedCount,
        });
        setStatusMessage({
          type: 'success',
          text: `Merged ${files.length} files into "${currentProject.name}" (Replaced: ${result.replacedCount}, Skipped: ${result.skippedCount}).`,
        });
        setTimeout(() => onClose(), 900);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to import folder.' });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // 3. Multi-file Supporting Assets Import
  const handleMultiFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsLoading(true);
    resetStatus();

    try {
      const { files, folders, primaryHtml } = await importFileList(fileList);
      if (files.length === 0) throw new Error('No valid files selected.');

      const projName = customProjectName.trim() || primaryHtml?.name.replace(/\.html?$/i, '') || 'Imported Website';

      if (destination === 'new_project' || !currentProject) {
        const newProj = createProjectFromImportedFiles(projName, files, `Imported ${files.length} files`);
        await onImportAsNewProject(newProj, primaryHtml?.id);
        setStatusMessage({
          type: 'success',
          text: `Created new project "${newProj.name}" with ${files.length} files!`,
        });
        setTimeout(() => onClose(), 900);
      } else {
        const result = mergeFilesIntoProject(currentProject, files, conflictPolicy);
        await onAddFilesToProject(result.updatedProject, {
          added: files.length - result.replacedCount - result.skippedCount,
          replaced: result.replacedCount,
          skipped: result.skippedCount,
          renamed: result.renamedCount,
        });
        setStatusMessage({
          type: 'success',
          text: `Merged ${files.length} files into "${currentProject.name}".`,
        });
        setTimeout(() => onClose(), 900);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to import files.' });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // 4. ZIP Archive Import
  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    resetStatus();

    try {
      const { name, files, folders } = await importZipFile(file);
      const projName = customProjectName.trim() || name;
      const primaryHtml = detectPrimaryHtmlFile(files);

      if (destination === 'new_project' || !currentProject) {
        const newProj = createProjectFromImportedFiles(projName, files, `Imported from ${file.name}`);
        await onImportAsNewProject(newProj, primaryHtml?.id);
        setStatusMessage({
          type: 'success',
          text: `Imported ZIP project "${newProj.name}" (${files.length} files, ${folders.length} folders)!`,
        });
        setTimeout(() => onClose(), 900);
      } else {
        const result = mergeFilesIntoProject(currentProject, files, conflictPolicy);
        await onAddFilesToProject(result.updatedProject, {
          added: files.length - result.replacedCount - result.skippedCount,
          replaced: result.replacedCount,
          skipped: result.skippedCount,
          renamed: result.renamedCount,
        });
        setStatusMessage({
          type: 'success',
          text: `Extracted ${files.length} files from ZIP into "${currentProject.name}".`,
        });
        setTimeout(() => onClose(), 900);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to extract ZIP archive.' });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Import Website or Files</h3>
              <p className="text-[11px] text-slate-400">Import HTML pages, website folders, assets, or ZIP archives</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden File Inputs with Explicit Reset Attributes */}
        <input
          type="file"
          ref={htmlInputRef}
          accept=".html,.htm"
          onChange={handleHtmlFileChange}
          data-testid="modal-html-file-input"
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderChange}
          data-testid="modal-folder-file-input"
          className="hidden"
        />
        <input
          type="file"
          ref={multiFileInputRef}
          multiple
          accept=".html,.htm,.css,.js,.mjs,.cjs,.json,.xml,.svg,.png,.jpg,.jpeg,.gif,.webp,.woff,.woff2,.ttf,.otf"
          onChange={handleMultiFilesChange}
          data-testid="modal-multi-file-input"
          className="hidden"
        />
        <input
          type="file"
          ref={zipInputRef}
          accept=".zip,application/zip"
          onChange={handleZipChange}
          data-testid="modal-zip-file-input"
          className="hidden"
        />

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Destination Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Import Destination:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDestination('new_project')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  destination === 'new_project'
                    ? 'bg-sky-600/20 border-sky-500/60 text-white shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="font-bold text-xs flex items-center gap-1.5 text-sky-400">
                  <Layers className="w-3.5 h-3.5" />
                  Create New Project
                </span>
                <span className="text-[10px] text-slate-400">
                  Creates an independent project saved to IndexedDB.
                </span>
              </button>

              <button
                type="button"
                disabled={!currentProject}
                onClick={() => setDestination('current_project')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  destination === 'current_project'
                    ? 'bg-sky-600/20 border-sky-500/60 text-white shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                } ${!currentProject ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                  <Files className="w-3.5 h-3.5" />
                  Add to Current Project
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {currentProject ? `Merge into "${currentProject.name}"` : 'No active project available'}
                </span>
              </button>
            </div>
          </div>

          {/* Conflict Policy (Only if adding to current project) */}
          {destination === 'current_project' && currentProject && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Filename & Path Conflict Policy:</span>
              </div>
              <p className="text-[11px] text-slate-300">
                If an imported file already exists in <strong>{currentProject.name}</strong>:
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConflictPolicy('replace')}
                  className={`px-2 py-1.5 rounded-lg border text-center text-[11px] font-medium transition ${
                    conflictPolicy === 'replace'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Overwrite / Replace
                </button>
                <button
                  type="button"
                  onClick={() => setConflictPolicy('skip')}
                  className={`px-2 py-1.5 rounded-lg border text-center text-[11px] font-medium transition ${
                    conflictPolicy === 'skip'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Skip Existing
                </button>
                <button
                  type="button"
                  onClick={() => setConflictPolicy('rename')}
                  className={`px-2 py-1.5 rounded-lg border text-center text-[11px] font-medium transition ${
                    conflictPolicy === 'rename'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Auto Rename
                </button>
              </div>
            </div>
          )}

          {/* Custom Project Name (Optional for New Project) */}
          {destination === 'new_project' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Project Name (Optional - defaults to file/folder name):
              </label>
              <input
                type="text"
                placeholder="e.g. My Awesome Site"
                value={customProjectName}
                onChange={(e) => setCustomProjectName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Import Modes Grid */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Choose Source Format:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Direct HTML File */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => htmlInputRef.current?.click()}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-sky-500/50 transition flex items-start gap-3 group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30 group-hover:scale-105 transition">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-sky-300 transition">Import Single HTML</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Pick an ordinary standalone <code>.html</code> or <code>.htm</code> file directly.
                  </p>
                </div>
              </button>

              {/* Option 2: Entire Website Folder */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => folderInputRef.current?.click()}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-sky-500/50 transition flex items-start gap-3 group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-emerald-300 transition">Import Website Folder</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Preserves nested folders, CSS, JavaScript, and asset directories automatically.
                  </p>
                </div>
              </button>

              {/* Option 3: Multiple Files Fallback */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => multiFileInputRef.current?.click()}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-sky-500/50 transition flex items-start gap-3 group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30 group-hover:scale-105 transition">
                  <Files className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-sky-300 transition">Import Multiple Files</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Select loose files simultaneously into root. Use <strong>Website Folder</strong> to preserve nested subdirectories.
                  </p>
                </div>
              </button>

              {/* Option 4: ZIP Archive */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => zipInputRef.current?.click()}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-purple-500/50 transition flex items-start gap-3 group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 group-hover:scale-105 transition">
                  <Archive className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition">Import ZIP Archive</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Extract complete project structures with binary images and nested folders.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Feedback & Loading Indicator */}
          {isLoading && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center gap-2.5 text-sky-300">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Reading and importing files into IndexedDB...</span>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          )}

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              Imported files are stored in your device’s local IndexedDB. Works 100% offline with zero cloud uploads or external API requirements.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
