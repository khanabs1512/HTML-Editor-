import React, { useState, useRef, useEffect } from 'react';
import { Project, ProjectFile, FileType, FileSortOption } from '../types/index';
import { detectFileType, downloadFile, exportProjectAsZip, importZipFile } from '../services/zipService';
import {
  FolderPlus,
  FilePlus,
  Upload,
  Download,
  Search,
  FileCode,
  FileText,
  FileJson,
  Image as ImageIcon,
  Trash2,
  Copy,
  Edit2,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Code2,
  FileBadge,
  MoveRight,
  ArrowUpDown,
  Check,
  X,
  FileCode2,
  Share2
} from 'lucide-react';

interface FileExplorerProps {
  project: Project;
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, path: string, content?: string) => void;
  onCreateFolder: (folderPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onRenameFolder: (oldFolderPath: string, newFolderPath: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onMoveFile: (fileId: string, newFolderPath: string) => void;
  onImportZip: (file: File) => void;
  onUploadAssets: (files: FileList) => void;
  onOpenImportModal?: () => void;
  onImportHtmlFile?: (file: File) => void;
  onImportFolder?: (files: FileList) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'file' | 'folder';
  file?: ProjectFile;
  folderPath?: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
  onDuplicateFile,
  onMoveFile,
  onImportZip,
  onUploadAssets,
  onOpenImportModal,
  onImportHtmlFile,
  onImportFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<FileSortOption>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createInFolder, setCreateInFolder] = useState<string>(''); // empty string means root
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  // Renaming state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingFolderPath, setEditingFolderPath] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Moving file modal
  const [movingFile, setMovingFile] = useState<ProjectFile | null>(null);

  // Collapsed folders state
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copyPathToast, setCopyPathToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on window click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  // Derive all unique folders from files + explicit project folders
  const allFolders = React.useMemo(() => {
    const folderSet = new Set<string>();
    if (project.folders) {
      project.folders.forEach((f) => folderSet.add(normalize(f)));
    }
    project.files.forEach((file) => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        parts.pop();
        let current = '';
        for (const p of parts) {
          current = current ? `${current}/${p}` : p;
          folderSet.add(normalize(current));
        }
      }
    });
    return Array.from(folderSet).sort();
  }, [project.files, project.folders]);

  const handleStartCreateFile = (folder = '') => {
    setCreateInFolder(folder);
    setIsCreatingFile(true);
    setIsCreatingFolder(false);
    setNewFileName('');
  };

  const handleStartCreateFolder = (parentFolder = '') => {
    setCreateInFolder(parentFolder);
    setIsCreatingFolder(true);
    setIsCreatingFile(false);
    setNewFolderName('');
  };

  const handleFinishCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFileName.trim();
    if (!cleanName) return;
    if (/[\\:*?"<>|]/.test(cleanName)) {
      alert('Invalid file name. Names cannot contain \\ / : * ? " < > |');
      return;
    }
    const finalPath = createInFolder ? `${createInFolder}/${cleanName}` : cleanName;
    if (project.files.some((f) => f.path.toLowerCase() === finalPath.toLowerCase())) {
      alert(`File "${finalPath}" already exists in this project.`);
      return;
    }
    onCreateFile(cleanName, finalPath);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const handleFinishCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;
    if (/[\\:*?"<>|]/.test(cleanName)) {
      alert('Invalid folder name. Names cannot contain \\ : * ? " < > |');
      return;
    }
    const finalFolder = createInFolder ? `${createInFolder}/${cleanName}` : cleanName;
    if (allFolders.some((f) => f.toLowerCase() === finalFolder.toLowerCase())) {
      alert(`Folder "${finalFolder}" already exists.`);
      return;
    }
    onCreateFolder(finalFolder);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleStartRenameFolder = (folderPath: string) => {
    setEditingFolderPath(folderPath);
    setEditingFolderName(folderPath.split('/').pop() || folderPath);
  };

  const handleFinishRenameFolder = (oldPath: string) => {
    if (editingFolderName.trim() && editingFolderName.trim() !== oldPath) {
      const parts = oldPath.split('/');
      parts.pop();
      const parent = parts.join('/');
      const newPath = parent ? `${parent}/${editingFolderName.trim()}` : editingFolderName.trim();
      onRenameFolder(oldPath, newPath);
    }
    setEditingFolderPath(null);
  };

  const handleMoveFileConfirm = (targetFolder: string) => {
    if (!movingFile) return;
    onMoveFile(movingFile.id, targetFolder);
    setMovingFile(null);
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopyPathToast(`Copied path: ${path}`);
    setTimeout(() => setCopyPathToast(null), 2000);
  };

  // Group files into root vs folders, applying the chosen sort order
  const sortFiles = (files: ProjectFile[]): ProjectFile[] => {
    return [...files].sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'type') {
        return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
      } else {
        return b.lastModified - a.lastModified;
      }
    });
  };

  const filesByFolder = React.useMemo(() => {
    const map = new Map<string, ProjectFile[]>();
    map.set('', []); // root files

    allFolders.forEach((f) => map.set(f, []));

    project.files.forEach((file) => {
      const parts = file.path.split('/');
      if (parts.length === 1) {
        map.get('')?.push(file);
      } else {
        const folder = parts.slice(0, -1).join('/');
        if (!map.has(folder)) map.set(folder, []);
        map.get(folder)?.push(file);
      }
    });

    // Apply sorting to every folder's list
    for (const [key, list] of map.entries()) {
      map.set(key, sortFiles(list));
    }

    return map;
  }, [project.files, allFolders, sortOption]);

  const filteredFiles = sortFiles(
    project.files.filter((f) => {
      if (!searchQuery.trim()) return true;
      return (
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 select-none relative">
      {/* Explorer Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-xs tracking-wide uppercase text-slate-300">Files</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
            {project.files.length}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartCreateFile('')}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="New File in Root"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartCreateFolder('')}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className={`p-1 rounded transition ${showSortMenu ? 'text-sky-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Sort Files"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenImportModal || (() => htmlInputRef.current?.click())}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Import HTML / Folder / ZIP"
            data-testid="open-import-modal-btn"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportProjectAsZip(project)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Export Project as ZIP"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sort Dropdown Menu */}
      {showSortMenu && (
        <div className="p-2 bg-slate-950 border-b border-slate-800 text-xs flex items-center justify-between animate-in fade-in">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Sort by:</span>
          <div className="flex gap-1">
            <button
              onClick={() => { setSortOption('name'); setShowSortMenu(false); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${sortOption === 'name' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Name
            </button>
            <button
              onClick={() => { setSortOption('type'); setShowSortMenu(false); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${sortOption === 'type' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Type
            </button>
            <button
              onClick={() => { setSortOption('modified'); setShowSortMenu(false); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${sortOption === 'modified' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Date
            </button>
          </div>
        </div>
      )}

      {/* Path Copy Toast Notification */}
      {copyPathToast && (
        <div className="bg-sky-500/20 text-sky-300 border-b border-sky-500/30 text-[11px] px-3 py-1.5 flex items-center gap-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-sky-400" />
          <span className="truncate">{copyPathToast}</span>
        </div>
      )}

      {/* Hidden file inputs with explicit value resets */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) onUploadAssets(e.target.files);
          e.target.value = '';
        }}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={zipInputRef}
        accept=".zip,application/zip"
        data-testid="explorer-zip-input"
        onChange={(e) => {
          if (e.target.files?.[0]) onImportZip(e.target.files[0]);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={htmlInputRef}
        accept=".html,.htm"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            if (onImportHtmlFile) onImportHtmlFile(e.target.files[0]);
            else onUploadAssets(e.target.files);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        onChange={(e) => {
          if (e.target.files) {
            if (onImportFolder) onImportFolder(e.target.files);
            else onUploadAssets(e.target.files);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search project files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Inline Create File / Folder Bar */}
      {isCreatingFile && (
        <form onSubmit={handleFinishCreateFile} className="p-2.5 bg-slate-950 border-b border-sky-500/40 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold mb-1">
            <FilePlus className="w-3.5 h-3.5" />
            <span>New File {createInFolder ? `in /${createInFolder}` : 'in Root'}</span>
          </div>
          <input
            type="text"
            autoFocus
            placeholder="filename.html, style.css, script.js"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="w-full bg-slate-800 text-xs px-2.5 py-1 rounded text-white border border-slate-700 focus:outline-none focus:border-sky-400"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsCreatingFile(false);
            }}
          />
          <div className="flex justify-end gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setIsCreatingFile(false)}
              className="text-[10px] px-2 py-0.5 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-[10px] px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {isCreatingFolder && (
        <form onSubmit={handleFinishCreateFolder} className="p-2.5 bg-slate-950 border-b border-amber-500/40 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-1">
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder {createInFolder ? `in /${createInFolder}` : 'in Root'}</span>
          </div>
          <input
            type="text"
            autoFocus
            placeholder="folder name (e.g. css, js, assets)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full bg-slate-800 text-xs px-2.5 py-1 rounded text-white border border-slate-700 focus:outline-none focus:border-amber-400"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsCreatingFolder(false);
            }}
          />
          <div className="flex justify-end gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="text-[10px] px-2 py-0.5 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-[10px] px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium"
            >
              Create Folder
            </button>
          </div>
        </form>
      )}

      {/* Main Files & Folders Tree */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {searchQuery.trim() ? (
          filteredFiles.map((file) => renderFileItem(file, activeFileId === file.id, false))
        ) : (
          <>
            {/* 1. Folders Tree */}
            {allFolders.map((folderPath) => {
              const isCollapsed = collapsedFolders.has(folderPath);
              const folderFiles = filesByFolder.get(folderPath) || [];
              const isEditing = editingFolderPath === folderPath;

              return (
                <div key={folderPath} className="space-y-0.5">
                  {/* Folder Item */}
                  <div
                    className="group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-slate-800/60 cursor-pointer transition"
                    onClick={() => toggleFolder(folderPath)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', folderPath });
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />

                      {isEditing ? (
                        <input
                          type="text"
                          value={editingFolderName}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onBlur={() => handleFinishRenameFolder(folderPath)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRenameFolder(folderPath);
                            if (e.key === 'Escape') setEditingFolderPath(null);
                          }}
                          className="bg-slate-950 border border-amber-500 px-1 py-0.5 rounded text-xs text-white"
                        />
                      ) : (
                        <span className="font-semibold text-slate-300 font-mono text-[11px] truncate">
                          {folderPath}
                        </span>
                      )}
                    </div>

                    {/* Folder Quick Actions & Mobile Menu trigger */}
                    <div
                      className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleStartCreateFile(folderPath)}
                        className="p-1 hover:text-white rounded"
                        title="Add file inside folder"
                      >
                        <FilePlus className="w-3 h-3 text-slate-400" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete folder "${folderPath}" and all files inside?`)) {
                            onDeleteFolder(folderPath);
                          }
                        }}
                        className="p-1 hover:text-rose-400 rounded text-slate-400"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({ x: rect.left, y: rect.bottom, type: 'folder', folderPath });
                        }}
                        className="p-1 hover:text-white rounded text-slate-400"
                        title="Folder options"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Folder Children Files */}
                  {!isCollapsed && (
                    <div className="pl-4 space-y-0.5 border-l border-slate-800/70 ml-2.5">
                      {folderFiles.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic py-1 px-2">Empty folder</div>
                      ) : (
                        folderFiles.map((file) => renderFileItem(file, activeFileId === file.id, true))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Root Files */}
            {(filesByFolder.get('') || []).map((file) =>
              renderFileItem(file, activeFileId === file.id, false)
            )}

            {/* Empty Project State */}
            {project.files.length === 0 && (
              <div className="p-4 text-center text-slate-500 space-y-3">
                <FolderOpen className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-medium text-slate-300">No files in project</p>
                <p className="text-[11px] text-slate-400">Create a file or import an existing website to start.</p>
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    onClick={() => handleStartCreateFile('')}
                    className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Create File</span>
                  </button>
                  <button
                    onClick={onOpenImportModal || (() => htmlInputRef.current?.click())}
                    className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Import Files</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Context Menu (Desktop Right-Click or Mobile More Button) */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded-xl py-1 shadow-2xl text-xs text-slate-200 min-w-44 animate-in fade-in zoom-in-95"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 240),
            left: Math.min(contextMenu.x, window.innerWidth - 180),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'file' && contextMenu.file && (
            <>
              <button
                onClick={() => { onSelectFile(contextMenu.file!.id); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
              >
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Open File</span>
              </button>
              <button
                onClick={() => { handleCopyPath(contextMenu.file!.path); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Path</span>
              </button>
              <button
                onClick={() => {
                  setEditingFileId(contextMenu.file!.id);
                  setEditingName(contextMenu.file!.name);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename File</span>
              </button>
              <button
                onClick={() => { onDuplicateFile(contextMenu.file!.id); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Duplicate File</span>
              </button>
              <button
                onClick={() => { setMovingFile(contextMenu.file!); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <MoveRight className="w-3.5 h-3.5 text-slate-400" />
                <span>Move to Folder...</span>
              </button>
              <button
                onClick={() => { downloadFile(contextMenu.file!); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Download File</span>
              </button>
              <div className="h-px bg-slate-800 my-1" />
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${contextMenu.file!.name}"?`)) {
                    onDeleteFile(contextMenu.file!.id);
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-600 hover:text-white text-rose-400 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File</span>
              </button>
            </>
          )}

          {contextMenu.type === 'folder' && contextMenu.folderPath && (
            <>
              <button
                onClick={() => { handleStartCreateFile(contextMenu.folderPath); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center gap-2"
              >
                <FilePlus className="w-3.5 h-3.5 text-sky-400" />
                <span>New File Inside</span>
              </button>
              <button
                onClick={() => { handleStartCreateFolder(contextMenu.folderPath); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>New Subfolder</span>
              </button>
              <button
                onClick={() => { handleCopyPath(contextMenu.folderPath!); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Folder Path</span>
              </button>
              <button
                onClick={() => { handleStartRenameFolder(contextMenu.folderPath!); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename Folder</span>
              </button>
              <div className="h-px bg-slate-800 my-1" />
              <button
                onClick={() => {
                  if (confirm(`Delete folder "${contextMenu.folderPath}" and all files inside?`)) {
                    onDeleteFolder(contextMenu.folderPath!);
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-600 hover:text-white text-rose-400 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Folder</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Move File Destination Modal */}
      {movingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MoveRight className="w-4 h-4 text-sky-400" />
                Move {movingFile.name} to:
              </span>
              <button onClick={() => setMovingFile(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto text-xs">
              <button
                onClick={() => handleMoveFileConfirm('')}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-sky-600 hover:text-white flex items-center gap-2 transition"
              >
                <FolderOpen className="w-4 h-4 text-sky-400" />
                <span>/ (Root Directory)</span>
              </button>
              {allFolders.map((f) => (
                <button
                  key={f}
                  onClick={() => handleMoveFileConfirm(f)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-sky-600 hover:text-white flex items-center gap-2 transition"
                >
                  <Folder className="w-4 h-4 text-amber-400" />
                  <span>/{f}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer Actions */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportModal || (() => htmlInputRef.current?.click())}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium transition"
            title="Import HTML, Folder or ZIP"
            data-testid="footer-import-btn"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => zipInputRef.current?.click()}
            className="flex items-center gap-1 hover:text-slate-200 transition"
            title="Direct Import ZIP"
          >
            <span>ZIP</span>
          </button>
        </div>
        <button
          onClick={() => exportProjectAsZip(project)}
          className="flex items-center gap-1 hover:text-sky-400 transition"
          title="Export Project as ZIP"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export ZIP</span>
        </button>
      </div>
    </div>
  );

  function renderFileItem(file: ProjectFile, isActive: boolean, isInsideFolder = false) {
    const isEditing = editingFileId === file.id;

    return (
      <div
        key={file.id}
        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
          isActive
            ? 'bg-sky-600/20 text-sky-300 font-medium border border-sky-500/30'
            : 'hover:bg-slate-800/70 text-slate-300'
        }`}
        onClick={() => onSelectFile(file.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', file });
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getFileIcon(file.type, file.name)}

          {isEditing ? (
            <input
              type="text"
              value={editingName}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => {
                if (editingName.trim()) onRenameFile(file.id, editingName.trim());
                setEditingFileId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingName.trim()) onRenameFile(file.id, editingName.trim());
                  setEditingFileId(null);
                }
                if (e.key === 'Escape') setEditingFileId(null);
              }}
              className="bg-slate-950 border border-sky-500 px-1 py-0.5 rounded text-xs text-white focus:outline-none w-full"
            />
          ) : (
            <span className="truncate font-mono text-[11px]">
              {isInsideFolder ? file.name : file.path}
            </span>
          )}
        </div>

        {/* Action buttons on file item & Mobile Menu button */}
        {!isEditing && (
          <div
            className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setEditingFileId(file.id);
                setEditingName(file.name);
              }}
              className="p-1 hover:text-white rounded"
              title="Rename File"
            >
              <Edit2 className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => onDuplicateFile(file.id)}
              className="p-1 hover:text-white rounded"
              title="Duplicate File"
            >
              <Copy className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => setMovingFile(file)}
              className="p-1 hover:text-sky-400 rounded"
              title="Move File to Folder"
            >
              <MoveRight className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete file "${file.name}"?`)) {
                  onDeleteFile(file.id);
                }
              }}
              className="p-1 hover:text-rose-400 rounded text-slate-400"
              title="Delete File"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setContextMenu({ x: rect.left, y: rect.bottom, type: 'file', file });
              }}
              className="p-1 hover:text-white rounded text-slate-400"
              title="More actions"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
};

function normalize(p: string): string {
  return p.replace(/^\.\//, '').replace(/^\//, '').replace(/\/+$/, '').trim();
}

function getFileIcon(type: FileType, filename: string): React.ReactNode {
  switch (type) {
    case 'html':
      return <Code2 className="w-4 h-4 text-orange-400 shrink-0" />;
    case 'css':
      return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'javascript':
      return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'image':
      return <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />;
    case 'markdown':
      return <FileBadge className="w-4 h-4 text-blue-400 shrink-0" />;
    default:
      return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  }
}
