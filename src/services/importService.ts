import { Project, ProjectFile, FileType } from '../types/index';
import { detectFileType, importZipFile } from './zipService';

export type ConflictResolution = 'skip' | 'replace' | 'rename';

export interface ImportResult {
  project?: Project;
  addedFiles?: ProjectFile[];
  replacedCount?: number;
  skippedCount?: number;
  renamedCount?: number;
  entryFileId?: string;
}

/**
 * Checks if a file is binary (images, fonts, archives)
 */
export function isBinaryAsset(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  const binaryExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif',
    'woff', 'woff2', 'ttf', 'otf', 'eot',
    'mp3', 'wav', 'ogg', 'mp4', 'webm'
  ];
  return !!ext && binaryExtensions.includes(ext);
}

/**
 * Converts a browser File object to a CodeStudio ProjectFile
 */
export async function fileToProjectFile(file: File, relativePath?: string): Promise<ProjectFile> {
  const rawPath = relativePath || file.webkitRelativePath || file.name;
  const cleanPath = sanitizePath(rawPath);
  const filename = cleanPath.split('/').pop() || cleanPath;
  const type = detectFileType(filename);
  const isBinary = isBinaryAsset(filename);

  let content = '';
  let dataUri: string | undefined = undefined;

  if (isBinary) {
    dataUri = await readFileAsDataUri(file);
  } else {
    content = await readFileAsText(file);
  }

  return {
    id: 'file-' + Math.random().toString(36).substring(2, 9),
    name: filename,
    path: cleanPath,
    type,
    content,
    isBinary,
    dataUri,
    lastModified: file.lastModified || Date.now(),
  };
}

/**
 * Reads a File as UTF-8 string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read text file "${file.name}"`));
    reader.readAsText(file);
  });
}

/**
 * Reads a File as Data URL Base64
 */
export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read binary asset "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

/**
 * Clean path helper
 */
export function sanitizePath(p: string): string {
  if (!p) return '';
  return p
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim();
}

/**
 * Extracts and normalizes folders from a list of files or file paths
 */
export function deriveFoldersFromFiles(items: (ProjectFile | { path: string } | string)[]): string[] {
  const folderSet = new Set<string>();
  for (const item of items) {
    const rawPath = typeof item === 'string' ? item : item?.path;
    if (!rawPath) continue;
    const clean = sanitizePath(rawPath);
    const parts = clean.split('/');
    if (parts.length > 1) {
      parts.pop(); // remove file name
      let acc = '';
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        folderSet.add(sanitizePath(acc));
      }
    }
  }
  return Array.from(folderSet).sort();
}

/**
 * Auto-detects the best primary HTML file in a list of files
 * Prioritizes index.html (case-insensitive), then root .html files, then any .html, then first file.
 */
export function detectPrimaryHtmlFile(files: ProjectFile[]): ProjectFile | undefined {
  if (files.length === 0) return undefined;

  // 1. Root index.html or index.htm
  const rootIndex = files.find(
    (f) => f.path.toLowerCase() === 'index.html' || f.path.toLowerCase() === 'index.htm'
  );
  if (rootIndex) return rootIndex;

  // 2. Any index.html in subfolders
  const anyIndex = files.find(
    (f) => f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.htm'
  );
  if (anyIndex) return anyIndex;

  // 3. Any root-level HTML file
  const rootHtml = files.find(
    (f) => !f.path.includes('/') && (f.type === 'html' || f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm'))
  );
  if (rootHtml) return rootHtml;

  // 4. Any HTML file
  const anyHtml = files.find(
    (f) => f.type === 'html' || f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')
  );
  if (anyHtml) return anyHtml;

  // 5. Fallback to first file
  return files[0];
}

/**
 * Strips common top-level directory wrapper when users upload an entire folder
 * e.g. "my-project/index.html" and "my-project/css/style.css" -> "index.html" and "css/style.css"
 */
export function stripRootFolderPrefix(files: ProjectFile[]): ProjectFile[] {
  if (files.length === 0) return files;

  // Check if all files have at least one slash
  const allHaveSlash = files.every((f) => f.path.includes('/'));
  if (!allHaveSlash) return files;

  // Extract first path segment of all files
  const firstSegments = files.map((f) => f.path.split('/')[0]);
  const commonRoot = firstSegments[0];
  const allSameRoot = firstSegments.every((seg) => seg === commonRoot);

  if (allSameRoot && commonRoot) {
    const prefix = commonRoot + '/';
    return files.map((f) => {
      const stripped = f.path.substring(prefix.length);
      return {
        ...f,
        path: stripped,
      };
    });
  }

  return files;
}

/**
 * Creates a brand new Project from imported files
 */
export function createProjectFromImportedFiles(
  projectName: string,
  files: ProjectFile[],
  description?: string,
  tags: string[] = ['Imported']
): Project {
  // Normalize paths and strip redundant folder wrapper
  const normalizedFiles = stripRootFolderPrefix(files);
  const folders = deriveFoldersFromFiles(normalizedFiles);

  return {
    id: 'proj-' + Math.random().toString(36).substring(2, 9),
    name: projectName.trim() || 'Imported Project',
    description: description || `Imported project with ${normalizedFiles.length} file(s)`,
    files: normalizedFiles,
    folders,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags,
  };
}

/**
 * Merges imported files into an existing project with user-chosen conflict resolution
 */
export function mergeFilesIntoProject(
  targetProject: Project,
  incomingFiles: ProjectFile[],
  conflictResolution: ConflictResolution = 'replace'
): { updatedProject: Project; replacedCount: number; skippedCount: number; renamedCount: number } {
  let replacedCount = 0;
  let skippedCount = 0;
  let renamedCount = 0;

  const existingMap = new Map<string, ProjectFile>();
  for (const f of targetProject.files) {
    existingMap.set(f.path.toLowerCase(), f);
  }

  const finalFiles: ProjectFile[] = [...targetProject.files];
  const newFolders = new Set<string>(targetProject.folders || []);

  for (const incoming of incomingFiles) {
    const key = incoming.path.toLowerCase();
    const existing = existingMap.get(key);

    if (existing) {
      if (conflictResolution === 'skip') {
        skippedCount++;
        continue;
      } else if (conflictResolution === 'replace') {
        // Replace existing file
        const index = finalFiles.findIndex((f) => f.id === existing.id);
        if (index !== -1) {
          finalFiles[index] = {
            ...incoming,
            id: existing.id, // preserve existing id
            lastModified: Date.now(),
          };
          replacedCount++;
        }
      } else if (conflictResolution === 'rename') {
        // Generate unique renamed path
        const parts = incoming.path.split('.');
        const ext = parts.length > 1 ? '.' + parts.pop() : '';
        const base = parts.join('.');
        let counter = 1;
        let newPath = `${base}_imported_${counter}${ext}`;
        while (finalFiles.some((f) => f.path.toLowerCase() === newPath.toLowerCase())) {
          counter++;
          newPath = `${base}_imported_${counter}${ext}`;
        }
        const newName = newPath.split('/').pop() || newPath;
        finalFiles.push({
          ...incoming,
          id: 'file-' + Math.random().toString(36).substring(2, 9),
          name: newName,
          path: newPath,
          lastModified: Date.now(),
        });
        renamedCount++;
      }
    } else {
      // No collision, directly add
      finalFiles.push({
        ...incoming,
        id: 'file-' + Math.random().toString(36).substring(2, 9),
      });
    }

    // Register folders
    const pathParts = incoming.path.split('/');
    if (pathParts.length > 1) {
      pathParts.pop();
      let acc = '';
      for (const p of pathParts) {
        acc = acc ? `${acc}/${p}` : p;
        newFolders.add(sanitizePath(acc));
      }
    }
  }

  return {
    updatedProject: {
      ...targetProject,
      files: finalFiles,
      folders: Array.from(newFolders),
      updatedAt: Date.now(),
    },
    replacedCount,
    skippedCount,
    renamedCount,
  };
}

/**
 * Handles single HTML file import
 */
export async function importSingleHtmlFile(file: File): Promise<Project> {
  const content = await readFileAsText(file);
  const cleanName = file.name.trim();
  const projectName = cleanName.replace(/\.html?$/i, '').trim() || 'HTML Project';

  const htmlFile: ProjectFile = {
    id: 'file-' + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    path: cleanName,
    type: 'html',
    content,
    isBinary: false,
    lastModified: file.lastModified || Date.now(),
  };

  return {
    id: 'proj-' + Math.random().toString(36).substring(2, 9),
    name: projectName,
    description: `Imported from ${cleanName}`,
    files: [htmlFile],
    folders: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['Imported', 'HTML'],
  };
}

/**
 * Handles multi-file or folder import from a FileList
 */
export async function importFileList(
  fileList: FileList | File[],
  suggestedProjectName = 'Imported Website'
): Promise<{ files: ProjectFile[]; folders: string[]; primaryHtml?: ProjectFile }> {
  const files: ProjectFile[] = [];
  const list = Array.from(fileList);

  for (const f of list) {
    const projFile = await fileToProjectFile(f);
    files.push(projFile);
  }

  const normalizedFiles = stripRootFolderPrefix(files);
  const folders = deriveFoldersFromFiles(normalizedFiles);
  const primaryHtml = detectPrimaryHtmlFile(normalizedFiles);

  return {
    files: normalizedFiles,
    folders,
    primaryHtml,
  };
}
