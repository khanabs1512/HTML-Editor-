import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Project,
  ProjectFile,
  EditorSettings,
  ConsoleLogMessage,
  ActiveMobileTab,
  FileType,
  SaveStatus
} from './types';
import { dbService } from './services/db';
import { Header } from './components/Header';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { LivePreview } from './components/LivePreview';
import { ConsolePanel } from './components/ConsolePanel';
import { BottomNavigation } from './components/BottomNavigation';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { DeveloperToolsModal } from './components/DeveloperToolsModal';
import { SSHArchitectureModal } from './components/SSHArchitectureModal';
import { SettingsModal } from './components/SettingsModal';
import { ImportModal } from './components/ImportModal';
import { detectFileType } from './services/zipService';
import {
  importSingleHtmlFile,
  importFileList,
  createProjectFromImportedFiles,
  detectPrimaryHtmlFile
} from './services/importService';
import { importZipFile } from './services/zipService';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Terminal,
  Play,
  Code2,
  Columns,
  FolderOpen,
  Loader2,
  Plus,
  Upload,
  Database
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<number>(Date.now());

  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 14,
    theme: 'one-dark',
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    foldGutter: true,
    autoCloseBrackets: true,
    autoSave: true,
    autoSaveDelay: 600,
    appTheme: 'dark',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [desktopLayout, setDesktopLayout] = useState<'split' | 'editor' | 'preview'>('split');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConsoleDrawerOpen, setIsConsoleDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<ActiveMobileTab>('editor');

  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogMessage[]>([]);
  const [evalCodeTrigger, setEvalCodeTrigger] = useState<{ code: string; timestamp: number } | null>(null);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSSHModalOpen, setIsSSHModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Screen size detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initial Data Load
  useEffect(() => {
    async function loadData() {
      try {
        const loadedProjects = await dbService.getAllProjects();
        const loadedSettings = await dbService.getSettings();

        setProjects(loadedProjects);
        setSettings(loadedSettings);

        if (loadedProjects.length > 0) {
          const firstProj = loadedProjects[0];
          setActiveProjectId(firstProj.id);
          const firstFile = firstProj.files[0];
          if (firstFile) {
            setActiveFileId(firstFile.id);
            setOpenFileIds([firstFile.id]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(new Set());

  // Current Active Project & File
  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  const currentFile = currentProject?.files.find((f) => f.id === activeFileId) || currentProject?.files[0] || null;

  // Auto-Save debounced effect
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveProjectRef = useRef(currentProject);
  saveProjectRef.current = currentProject;

  const triggerAutoSave = useCallback(() => {
    if (!settings.autoSave) return;
    setSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        if (saveProjectRef.current) {
          await dbService.saveProject(saveProjectRef.current);
          setSaveStatus('saved');
          setDirtyFileIds(new Set());
          setLastSavedTime(Date.now());
        }
      } catch (err) {
        console.error('Auto-save error:', err);
        setSaveStatus('error');
      }
    }, settings.autoSaveDelay || 600);
  }, [settings.autoSave, settings.autoSaveDelay]);

  // Manual Instant Save Handler
  const handleManualSave = useCallback(async () => {
    if (!currentProject) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus('saving');
    try {
      await dbService.saveProject(currentProject);
      setSaveStatus('saved');
      setDirtyFileIds(new Set());
      setLastSavedTime(Date.now());
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
  }, [currentProject]);

  // Handle validated preview console messages passed from LivePreview
  const handleConsoleMessage = useCallback((msg: ConsoleLogMessage) => {
    setConsoleLogs((prev) => [...prev.slice(-150), msg]);
  }, []);

  // File Handlers with Integrity Validation
  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    if (!openFileIds.includes(fileId)) {
      setOpenFileIds((prev) => [...prev, fileId]);
    }
    if (isMobile) {
      setMobileTab('editor');
    }
  };

  const handleSelectFileByPath = (filePath: string, _line?: number) => {
    if (!currentProject) return;
    const clean = filePath.replace(/^\.\//, '').replace(/^\//, '').toLowerCase();
    const target = currentProject.files.find(
      (f) => f.path.toLowerCase() === clean || f.name.toLowerCase() === clean
    );
    if (target) {
      handleSelectFile(target.id);
    }
  };

  const handleCloseTab = (fileId: string) => {
    const nextOpen = openFileIds.filter((id) => id !== fileId);
    setOpenFileIds(nextOpen);
    setDirtyFileIds((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
    if (activeFileId === fileId) {
      if (nextOpen.length > 0) {
        setActiveFileId(nextOpen[nextOpen.length - 1]);
      } else {
        const fallback = currentProject?.files.find((f) => f.id !== fileId);
        if (fallback) {
          setActiveFileId(fallback.id);
          setOpenFileIds([fallback.id]);
        } else {
          setActiveFileId('');
          setOpenFileIds([]);
        }
      }
    }
  };

  const handleUpdateContent = (newContent: string) => {
    if (!currentProject || !currentFile) return;

    setDirtyFileIds((prev) => {
      const next = new Set(prev);
      next.add(currentFile.id);
      return next;
    });

    const updatedFiles = currentProject.files.map((f) =>
      f.id === currentFile.id ? { ...f, content: newContent, lastModified: Date.now() } : f
    );

    const updatedProject: Project = {
      ...currentProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    triggerAutoSave();
  };

  const handleCreateFile = (name: string, path: string, content = '') => {
    if (!currentProject) return;

    const cleanName = name.trim();
    if (!cleanName || /[\\:*?"<>|]/.test(cleanName)) {
      alert('Invalid file name. Names cannot contain \\ / : * ? " < > |');
      return;
    }

    const cleanPath = (path || cleanName).replace(/^\.\//, '').replace(/^\//, '').trim();

    // Check for duplicate path in project
    const duplicate = currentProject.files.some(
      (f) => f.path.toLowerCase() === cleanPath.toLowerCase()
    );
    if (duplicate) {
      alert(`A file with path "${cleanPath}" already exists in this project.`);
      return;
    }

    const type = detectFileType(cleanName);
    const newFile: ProjectFile = {
      id: 'file-' + Math.random().toString(36).substring(2, 9),
      name: cleanName,
      path: cleanPath,
      content,
      type,
      lastModified: Date.now(),
    };

    const updatedProject: Project = {
      ...currentProject,
      files: [...currentProject.files, newFile],
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setActiveFileId(newFile.id);
    setOpenFileIds((prev) => [...prev, newFile.id]);
    dbService.saveProject(updatedProject);
    setSaveStatus('saved');
    if (isMobile) setMobileTab('editor');
  };

  const handleCreateFolder = (folderPath: string) => {
    if (!currentProject) return;
    const cleanFolder = folderPath.replace(/^\.\//, '').replace(/^\//, '').replace(/\/+$/, '').trim();
    if (!cleanFolder || /[\\:*?"<>|]/.test(cleanFolder)) {
      alert('Invalid folder name. Names cannot contain \\ : * ? " < > |');
      return;
    }

    const existing = new Set(currentProject.folders || []);
    if (existing.has(cleanFolder)) {
      alert(`Folder "${cleanFolder}" already exists.`);
      return;
    }
    existing.add(cleanFolder);

    const updatedProject: Project = {
      ...currentProject,
      folders: Array.from(existing),
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    dbService.saveProject(updatedProject);
    setSaveStatus('saved');
  };

  const handleDeleteFolder = (folderPath: string) => {
    if (!currentProject) return;
    const prefix = folderPath + '/';
    const deletedFileIds = new Set(
      currentProject.files
        .filter((f) => f.path === folderPath || f.path.startsWith(prefix))
        .map((f) => f.id)
    );
    const remainingFiles = currentProject.files.filter((f) => !deletedFileIds.has(f.id));
    const remainingFolders = (currentProject.folders || []).filter(
      (f) => f !== folderPath && !f.startsWith(prefix)
    );

    const updatedProject: Project = {
      ...currentProject,
      files: remainingFiles,
      folders: remainingFolders,
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    dbService.saveProject(updatedProject)
      .then(() => setSaveStatus('saved'))
      .catch((err) => {
        console.error('Failed to persist folder deletion:', err);
        setSaveStatus('error');
      });

    // Clean tabs and dirty state
    setOpenFileIds((prev) => prev.filter((id) => !deletedFileIds.has(id)));
    setDirtyFileIds((prev) => {
      const next = new Set(prev);
      deletedFileIds.forEach((id) => next.delete(id));
      return next;
    });

    if (deletedFileIds.has(activeFileId)) {
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id);
        setOpenFileIds((prev) => (prev.length > 0 ? prev : [remainingFiles[0].id]));
      } else {
        setActiveFileId('');
        setOpenFileIds([]);
      }
    }
    setSaveStatus('saved');
  };

  const handleRenameFolder = (oldFolderPath: string, newFolderPath: string) => {
    if (!currentProject) return;
    const oldPrefix = oldFolderPath + '/';
    const newPrefix = newFolderPath + '/';

    const updatedFiles = currentProject.files.map((f) => {
      if (f.path.startsWith(oldPrefix)) {
        return {
          ...f,
          path: newPrefix + f.path.substring(oldPrefix.length),
          lastModified: Date.now(),
        };
      }
      return f;
    });

    const updatedFolders = (currentProject.folders || []).map((f) => {
      if (f === oldFolderPath) return newFolderPath;
      if (f.startsWith(oldPrefix)) return newPrefix + f.substring(oldPrefix.length);
      return f;
    });

    const updatedProject: Project = {
      ...currentProject,
      files: updatedFiles,
      folders: updatedFolders,
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    dbService.saveProject(updatedProject);
    setSaveStatus('saved');
  };

  const handleMoveFile = (fileId: string, newFolderPath: string) => {
    if (!currentProject) return;
    const file = currentProject.files.find((f) => f.id === fileId);
    if (!file) return;

    const newPath = newFolderPath ? `${newFolderPath}/${file.name}` : file.name;
    const updatedFiles = currentProject.files.map((f) =>
      f.id === fileId ? { ...f, path: newPath, lastModified: Date.now() } : f
    );

    const updatedProject: Project = {
      ...currentProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    dbService.saveProject(updatedProject);
    setSaveStatus('saved');
  };

  const handleDeleteFile = (fileId: string) => {
    if (!currentProject) return;
    const updatedFiles = currentProject.files.filter((f) => f.id !== fileId);
    const updatedProject: Project = {
      ...currentProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    handleCloseTab(fileId);
    dbService.saveProject(updatedProject)
      .then(() => setSaveStatus('saved'))
      .catch((err) => {
        console.error('Failed to persist file deletion:', err);
        setSaveStatus('error');
      });
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    if (!currentProject) return;
    const targetFile = currentProject.files.find((f) => f.id === fileId);
    if (!targetFile) return;

    const newType = detectFileType(newName);
    // Keep directory prefix if file is inside a folder
    const parts = targetFile.path.split('/');
    parts.pop();
    const folder = parts.join('/');
    const newPath = folder ? `${folder}/${newName}` : newName;

    const updatedFiles = currentProject.files.map((f) =>
      f.id === fileId ? { ...f, name: newName, path: newPath, type: newType, lastModified: Date.now() } : f
    );

    const updatedProject: Project = {
      ...currentProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    dbService.saveProject(updatedProject);
    setSaveStatus('saved');
  };

  const handleDuplicateFile = (fileId: string) => {
    if (!currentProject) return;
    const original = currentProject.files.find((f) => f.id === fileId);
    if (!original) return;

    const parts = original.name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop() : '';
    const base = parts.join('.');
    const copyName = `${base}_copy${ext}`;

    const dirParts = original.path.split('/');
    dirParts.pop();
    const folder = dirParts.join('/');
    const copyPath = folder ? `${folder}/${copyName}` : copyName;

    handleCreateFile(copyName, copyPath, original.content);
  };

  const handleUploadAssets = async (fileList: FileList) => {
    if (!currentProject) return;
    const newFiles: ProjectFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const type = detectFileType(file.name);
      const isBinary = type === 'image';

      if (isBinary) {
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            newFiles.push({
              id: 'file-' + Math.random().toString(36).substring(2, 9),
              name: file.name,
              path: file.name,
              content: '',
              type,
              isBinary: true,
              dataUri: reader.result as string,
              lastModified: Date.now(),
            });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      } else {
        const text = await file.text();
        newFiles.push({
          id: 'file-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          path: file.name,
          content: text,
          type,
          lastModified: Date.now(),
        });
      }
    }

    const updatedProject: Project = {
      ...currentProject,
      files: [...currentProject.files, ...newFiles],
      updatedAt: Date.now(),
    };

    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    dbService.saveProject(updatedProject);
    setSaveStatus('saved');
  };

  // Project Handlers
  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    const targetProj = projects.find((p) => p.id === projectId);
    if (targetProj && targetProj.files.length > 0) {
      const first = targetProj.files[0];
      setActiveFileId(first.id);
      setOpenFileIds([first.id]);
    }
    setConsoleLogs([]);
  };

  const handleCreateProject = async (name: string, templateType = 'blank') => {
    let initialFiles: ProjectFile[] = [];

    if (templateType === 'canvas') {
      initialFiles = [
        {
          id: 'f-1',
          name: 'index.html',
          path: 'index.html',
          type: 'html',
          content: `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>Canvas Particle FX</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <canvas id="c"></canvas>\n  <script src="script.js"></script>\n</body>\n</html>`,
          lastModified: Date.now(),
        },
        {
          id: 'f-2',
          name: 'style.css',
          path: 'style.css',
          type: 'css',
          content: `body { margin: 0; overflow: hidden; background: #0a0f1d; } canvas { display: block; }`,
          lastModified: Date.now(),
        },
        {
          id: 'f-3',
          name: 'script.js',
          path: 'script.js',
          type: 'javascript',
          content: `const c = document.getElementById('c');\nconst ctx = c.getContext('2d');\nc.width = window.innerWidth;\nc.height = window.innerHeight;\nconsole.log("Canvas ready!");`,
          lastModified: Date.now(),
        },
      ];
    } else {
      initialFiles = [
        {
          id: 'f-1',
          name: 'index.html',
          path: 'index.html',
          type: 'html',
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${name}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="card">\n    <h1>Hello from CodeStudio! 🚀</h1>\n    <p>Edit index.html, style.css, or app.js to watch live changes.</p>\n    <button id="btn">Click Me</button>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>`,
          lastModified: Date.now(),
        },
        {
          id: 'f-2',
          name: 'style.css',
          path: 'style.css',
          type: 'css',
          content: `body {\n  margin: 0;\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: #0f172a;\n  color: #f8fafc;\n  font-family: -apple-system, sans-serif;\n}\n\n.card {\n  background: #1e293b;\n  border: 1px solid #334155;\n  padding: 32px;\n  border-radius: 16px;\n  text-align: center;\n  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);\n}\n\nh1 {\n  font-size: 1.5rem;\n  margin-bottom: 12px;\n  color: #38bdf8;\n}\n\nbutton {\n  background: #0284c7;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n  margin-top: 16px;\n  transition: 0.2s;\n}\n\nbutton:hover {\n  background: #0369a1;\n}`,
          lastModified: Date.now(),
        },
        {
          id: 'f-3',
          name: 'app.js',
          path: 'app.js',
          type: 'javascript',
          content: `console.log("Welcome to ${name}!");\n\nconst btn = document.getElementById("btn");\nif (btn) {\n  btn.addEventListener("click", () => {\n    alert("Button clicked! CodeStudio is live.");\n    console.log("User clicked the button.");\n  });\n}`,
          lastModified: Date.now(),
        },
      ];
    }

    const newProject: Project = {
      id: 'proj-' + Math.random().toString(36).substring(2, 9),
      name,
      files: initialFiles,
      folders: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [templateType],
    };

    await dbService.saveProject(newProject);
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setActiveFileId(newProject.files[0].id);
    setOpenFileIds([newProject.files[0].id]);
    setIsProjectModalOpen(false);
    setSaveStatus('saved');
  };

  const handleDeleteProject = async (projectId: string) => {
    await dbService.deleteProject(projectId);
    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);
    if (remaining.length > 0) {
      if (activeProjectId === projectId) {
        handleSelectProject(remaining[0].id);
      }
    } else {
      setActiveProjectId('');
      setActiveFileId('');
      setOpenFileIds([]);
      setDirtyFileIds(new Set());
    }
    setSaveStatus('saved');
  };

  const handleImportAsNewProject = async (newProj: Project, primaryFileId?: string) => {
    await dbService.saveProject(newProj);
    setProjects((prev) => [newProj, ...prev.filter((p) => p.id !== newProj.id)]);
    setActiveProjectId(newProj.id);
    const targetFile =
      (primaryFileId ? newProj.files.find((f) => f.id === primaryFileId) : null) ||
      detectPrimaryHtmlFile(newProj.files) ||
      newProj.files[0];
    if (targetFile) {
      setActiveFileId(targetFile.id);
      setOpenFileIds([targetFile.id]);
    } else {
      setActiveFileId('');
      setOpenFileIds([]);
    }
    setSaveStatus('saved');
    if (isMobile) setMobileTab('editor');
  };

  const handleAddFilesToProject = async (
    updatedProject: Project,
    _summary: { added: number; replaced: number; skipped: number; renamed: number }
  ) => {
    await dbService.saveProject(updatedProject);
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setSaveStatus('saved');
  };

  const handleImportZip = async (file: File) => {
    try {
      setSaveStatus('saving');
      const { name, files, folders } = await importZipFile(file);
      const newProj = createProjectFromImportedFiles(name, files, `Imported from ${file.name}`);
      const primaryHtml = detectPrimaryHtmlFile(newProj.files);
      await handleImportAsNewProject(newProj, primaryHtml?.id);
    } catch (err: any) {
      alert('ZIP Import Error: ' + (err.message || err));
      setSaveStatus('error');
    }
  };

  const handleImportHtmlFile = async (file: File) => {
    try {
      setSaveStatus('saving');
      const newProj = await importSingleHtmlFile(file);
      await handleImportAsNewProject(newProj, newProj.files[0]?.id);
    } catch (err: any) {
      alert('HTML Import Error: ' + (err.message || err));
      setSaveStatus('error');
    }
  };

  const handleImportFolder = async (fileList: FileList) => {
    try {
      setSaveStatus('saving');
      const { files, primaryHtml } = await importFileList(fileList);
      const firstSeg = fileList[0]?.webkitRelativePath?.split('/')[0];
      const folderName = firstSeg || 'Imported Website';
      const newProj = createProjectFromImportedFiles(
        folderName,
        files,
        `Imported website folder with ${files.length} files`
      );
      await handleImportAsNewProject(newProj, primaryHtml?.id);
    } catch (err: any) {
      alert('Folder Import Error: ' + (err.message || err));
      setSaveStatus('error');
    }
  };

  const handleRenameProject = async (projectId: string, newName: string) => {
    const updated = projects.map((p) => (p.id === projectId ? { ...p, name: newName, updatedAt: Date.now() } : p));
    setProjects(updated);
    const target = updated.find((p) => p.id === projectId);
    if (target) await dbService.saveProject(target);
    setSaveStatus('saved');
  };

  const handleDuplicateProject = async (projectId: string) => {
    const original = projects.find((p) => p.id === projectId);
    if (!original) return;

    const copy: Project = {
      ...original,
      id: 'proj-' + Math.random().toString(36).substring(2, 9),
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: original.files.map((f) => ({ ...f, id: 'file-' + Math.random().toString(36).substring(2, 9) })),
      folders: [...(original.folders || [])],
    };

    await dbService.saveProject(copy);
    setProjects((prev) => [copy, ...prev]);
    handleSelectProject(copy.id);
    setSaveStatus('saved');
  };

  const handleResetWorkspace = async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('codestudio_projects');
    }
    const all = await dbService.resetStarterProjects();
    setProjects(all);
    if (all.length > 0) handleSelectProject(all[0].id);
    setIsSettingsModalOpen(false);
  };

  const handleUpdateSettings = async (newPartial: Partial<EditorSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    await dbService.saveSettings(updated);
  };

  const handleExecuteRepl = (code: string) => {
    setEvalCodeTrigger({ code, timestamp: Date.now() });
    setConsoleLogs((prev) => [
      ...prev,
      {
        id: 'repl-' + Math.random().toString(36).substring(2, 9),
        level: 'info',
        args: [`> ${code}`],
        timestamp: Date.now(),
      },
    ]);
  };

  const handleInsertSnippet = (code: string) => {
    if (!currentFile || currentFile.isBinary) return;
    const newContent = (currentFile.content ? currentFile.content + '\n\n' : '') + code;
    handleUpdateContent(newContent);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
        <h2 className="text-base font-bold text-white tracking-wide">Loading CodeStudio...</h2>
        <p className="text-xs text-slate-500 mt-1">Initializing IndexedDB sandbox &amp; PWA service worker</p>
      </div>
    );
  }

  const errorCount = consoleLogs.filter((l) => l.level === 'error').length;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        project={currentProject}
        saveStatus={saveStatus}
        onManualSave={handleManualSave}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenToolsModal={() => setIsToolsModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSSHModal={() => setIsSSHModalOpen(true)}
        desktopLayout={desktopLayout}
        onSetDesktopLayout={setDesktopLayout}
        onTriggerPreview={() => {
          if (isMobile) setMobileTab('preview');
        }}
        theme={settings.appTheme}
        onToggleTheme={() =>
          handleUpdateSettings({ appTheme: settings.appTheme === 'dark' ? 'light' : 'dark' })
        }
        isMobile={isMobile}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {!currentProject ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-500/5">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Active Project</h2>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              All projects have been removed or no project is currently selected. Create a new project, import existing code files or archives, or restore the starter demos.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleCreateProject('My New Project')}
                className="px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-sky-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Import HTML / Folder / ZIP</span>
              </button>
              <button
                onClick={handleResetWorkspace}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700/60 transition flex items-center gap-2 active:scale-95"
              >
                <Database className="w-4 h-4" />
                <span>Restore Starter Projects</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Sidebar Toggle & File Explorer */}
            {!isMobile && (
              <>
                {isSidebarOpen ? (
                  <div className="w-64 h-full shrink-0 flex flex-col border-r border-slate-800">
                    <FileExplorer
                      project={currentProject}
                      activeFileId={activeFileId}
                      onSelectFile={handleSelectFile}
                      onCreateFile={handleCreateFile}
                      onCreateFolder={handleCreateFolder}
                      onDeleteFile={handleDeleteFile}
                      onDeleteFolder={handleDeleteFolder}
                      onRenameFile={handleRenameFile}
                      onRenameFolder={handleRenameFolder}
                      onDuplicateFile={handleDuplicateFile}
                      onMoveFile={handleMoveFile}
                      onImportZip={handleImportZip}
                      onOpenImportModal={() => setIsImportModalOpen(true)}
                      onImportHtmlFile={handleImportHtmlFile}
                      onImportFolder={handleImportFolder}
                      onUploadAssets={handleUploadAssets}
                    />
                  </div>
                ) : null}

                {/* Sidebar Collapse Toggle Button */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="absolute left-1 top-2 z-20 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 shadow-md transition"
                  title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                  style={{ left: isSidebarOpen ? '264px' : '8px' }}
                >
                  {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                </button>
              </>
            )}

            {/* Desktop Workspace Views */}
            {!isMobile && (
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Split View: Editor + Live Preview side-by-side */}
                {desktopLayout === 'split' && (
                  <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* Left: Code Editor */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 h-full">
                      <CodeEditor
                        project={currentProject}
                        activeFile={currentFile}
                        openFileIds={openFileIds}
                        settings={settings}
                        saveStatus={saveStatus}
                        lastSavedTime={lastSavedTime}
                        dirtyFileIds={dirtyFileIds}
                        onChangeContent={handleUpdateContent}
                        onSelectFile={handleSelectFile}
                        onCloseTab={handleCloseTab}
                        onUpdateSettings={handleUpdateSettings}
                        onManualSave={handleManualSave}
                        onCreateFile={() => handleCreateFile('index.html', 'index.html')}
                        onImportFiles={() => setIsImportModalOpen(true)}
                        isMobile={false}
                      />
                    </div>

                    {/* Right: Live Preview Engine */}
                    <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-950">
                      <LivePreview
                        project={currentProject}
                        activeHtmlPath="index.html"
                        onOpenConsole={() => setIsConsoleDrawerOpen(!isConsoleDrawerOpen)}
                        errorCount={errorCount}
                        evalCodeTrigger={evalCodeTrigger}
                        onConsoleMessage={handleConsoleMessage}
                      />
                    </div>
                  </div>
                )}

                {/* Editor-only Layout */}
                {desktopLayout === 'editor' && (
                  <div className="flex-1 flex flex-col min-w-0 h-full">
                    <CodeEditor
                      project={currentProject}
                      activeFile={currentFile}
                      openFileIds={openFileIds}
                      settings={settings}
                      saveStatus={saveStatus}
                      lastSavedTime={lastSavedTime}
                      dirtyFileIds={dirtyFileIds}
                      onChangeContent={handleUpdateContent}
                      onSelectFile={handleSelectFile}
                      onCloseTab={handleCloseTab}
                      onUpdateSettings={handleUpdateSettings}
                      onManualSave={handleManualSave}
                      onCreateFile={() => handleCreateFile('index.html', 'index.html')}
                      onImportFiles={() => setIsImportModalOpen(true)}
                      isMobile={false}
                    />
                  </div>
                )}

                {/* Preview-only Layout */}
                {desktopLayout === 'preview' && (
                  <div className="flex-1 flex flex-col min-w-0 h-full">
                    <LivePreview
                      project={currentProject}
                      activeHtmlPath="index.html"
                      onOpenConsole={() => setIsConsoleDrawerOpen(!isConsoleDrawerOpen)}
                      errorCount={errorCount}
                      evalCodeTrigger={evalCodeTrigger}
                      onConsoleMessage={handleConsoleMessage}
                    />
                  </div>
                )}

                {/* Desktop Bottom Console Drawer */}
                {isConsoleDrawerOpen && (
                  <div className="h-56 border-t border-slate-800 bg-slate-950 shrink-0 flex flex-col">
                    <ConsolePanel
                      logs={consoleLogs}
                      onClearLogs={() => setConsoleLogs([])}
                      onExecuteCode={handleExecuteRepl}
                      onSelectFileByPath={handleSelectFileByPath}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mobile Viewport: Single Focused Tab (Files / Editor / Preview / Console / Tools) */}
            {isMobile && (
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {mobileTab === 'files' && (
                  <div className="flex-1 h-full">
                    <FileExplorer
                      project={currentProject}
                      activeFileId={activeFileId}
                      onSelectFile={handleSelectFile}
                      onCreateFile={handleCreateFile}
                      onCreateFolder={handleCreateFolder}
                      onDeleteFile={handleDeleteFile}
                      onDeleteFolder={handleDeleteFolder}
                      onRenameFile={handleRenameFile}
                      onRenameFolder={handleRenameFolder}
                      onDuplicateFile={handleDuplicateFile}
                      onMoveFile={handleMoveFile}
                      onImportZip={handleImportZip}
                      onOpenImportModal={() => setIsImportModalOpen(true)}
                      onImportHtmlFile={handleImportHtmlFile}
                      onImportFolder={handleImportFolder}
                      onUploadAssets={handleUploadAssets}
                    />
                  </div>
                )}

                {mobileTab === 'editor' && (
                  <div className="flex-1 h-full flex flex-col min-h-0">
                    <CodeEditor
                      project={currentProject}
                      activeFile={currentFile}
                      openFileIds={openFileIds}
                      settings={settings}
                      saveStatus={saveStatus}
                      lastSavedTime={lastSavedTime}
                      dirtyFileIds={dirtyFileIds}
                      onChangeContent={handleUpdateContent}
                      onSelectFile={handleSelectFile}
                      onCloseTab={handleCloseTab}
                      onUpdateSettings={handleUpdateSettings}
                      onManualSave={handleManualSave}
                      onCreateFile={() => handleCreateFile('index.html', 'index.html')}
                      onImportFiles={() => setIsImportModalOpen(true)}
                      isMobile={true}
                    />
                  </div>
                )}

                {mobileTab === 'preview' && (
                  <div className="flex-1 h-full flex flex-col min-h-0">
                    <LivePreview
                      project={currentProject}
                      activeHtmlPath="index.html"
                      onOpenConsole={() => setMobileTab('console')}
                      errorCount={errorCount}
                      evalCodeTrigger={evalCodeTrigger}
                      onConsoleMessage={handleConsoleMessage}
                    />
                  </div>
                )}

                {mobileTab === 'console' && (
                  <div className="flex-1 h-full flex flex-col min-h-0">
                    <ConsolePanel
                      logs={consoleLogs}
                      onClearLogs={() => setConsoleLogs([])}
                      onExecuteCode={handleExecuteRepl}
                      onSelectFileByPath={handleSelectFileByPath}
                    />
                  </div>
                )}

                {mobileTab === 'tools' && (
                  <div className="flex-1 h-full overflow-y-auto p-4 bg-slate-900 space-y-3">
                    <h3 className="text-sm font-bold text-white mb-2">Mobile Quick Tools</h3>
                    <button
                      onClick={() => setIsToolsModalOpen(true)}
                      className="w-full p-3.5 bg-slate-800 rounded-xl text-left font-medium text-xs flex items-center justify-between border border-slate-700"
                    >
                      <span>Formatters, Snippets &amp; Search</span>
                      <Code2 className="w-4 h-4 text-sky-400" />
                    </button>
                    <button
                      onClick={() => setIsProjectModalOpen(true)}
                      className="w-full p-3.5 bg-slate-800 rounded-xl text-left font-medium text-xs flex items-center justify-between border border-slate-700"
                    >
                      <span>Manage Projects &amp; Backup</span>
                      <FolderOpen className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="w-full p-3.5 bg-slate-800 rounded-xl text-left font-medium text-xs flex items-center justify-between border border-slate-700"
                    >
                      <span>Editor &amp; Storage Settings</span>
                      <Terminal className="w-4 h-4 text-purple-400" />
                    </button>
                    <button
                      onClick={() => setIsSSHModalOpen(true)}
                      className="w-full p-3.5 bg-slate-800 rounded-xl text-left font-medium text-xs flex items-center justify-between border border-slate-700"
                    >
                      <span>SSH &amp; SFTP Deploy Architecture</span>
                      <Play className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <BottomNavigation
          activeTab={mobileTab}
          onSelectTab={setMobileTab}
          errorCount={errorCount}
          filesCount={currentProject ? currentProject.files.length : 0}
        />
      )}

      {/* Modals */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onDuplicateProject={handleDuplicateProject}
        onImportComplete={() => dbService.getAllProjects().then(setProjects)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      <DeveloperToolsModal
        isOpen={isToolsModalOpen}
        onClose={() => setIsToolsModalOpen(false)}
        project={currentProject}
        activeFile={currentFile}
        onUpdateFileContent={(fileId, newContent) => {
          handleUpdateContent(newContent);
        }}
        onInsertSnippet={handleInsertSnippet}
        onSelectFile={handleSelectFile}
      />

      <SSHArchitectureModal
        isOpen={isSSHModalOpen}
        onClose={() => setIsSSHModalOpen(false)}
        project={currentProject}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetWorkspace={handleResetWorkspace}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentProject={currentProject}
        onImportAsNewProject={handleImportAsNewProject}
        onAddFilesToProject={handleAddFilesToProject}
      />
    </div>
  );
}
