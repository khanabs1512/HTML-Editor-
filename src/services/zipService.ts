import JSZip from 'jszip';
import { Project, ProjectFile, FileType } from '../types/index';

const MAX_ZIP_FILES = 500;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB safety limit

export async function exportProjectAsZip(project: Project): Promise<Blob> {
  const zip = new JSZip();

  // Explicitly ensure directories exist
  if (project.folders && project.folders.length > 0) {
    for (const folder of project.folders) {
      zip.folder(sanitizePath(folder));
    }
  }

  for (const file of project.files) {
    const cleanPath = sanitizePath(file.path);
    if (file.isBinary && file.dataUri) {
      const base64Data = file.dataUri.split(',')[1] || '';
      zip.file(cleanPath, base64Data, { base64: true });
    } else {
      zip.file(cleanPath, file.content || '');
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const filename = `${sanitizeFilename(project.name || 'project')}.zip`;

  // Check Web Share API with files support
  if (typeof navigator !== 'undefined' && (navigator as any).canShare) {
    try {
      const shareFile = new File([blob], filename, { type: 'application/zip' });
      if ((navigator as any).canShare({ files: [shareFile] })) {
        await (navigator as any).share({
          files: [shareFile],
          title: project.name,
          text: `Exported CodeStudio project: ${project.name}`,
        });
        return blob;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return blob;
    }
  }

  downloadBlob(blob, filename);
  return blob;
}

export async function importZipFile(
  file: File | Blob
): Promise<{ name: string; files: ProjectFile[]; folders: string[] }> {
  const zip = new JSZip();
  let loadedZip: JSZip;

  try {
    loadedZip = await zip.loadAsync(file);
  } catch (err: any) {
    throw new Error('Corrupted or invalid ZIP archive: ' + (err.message || err));
  }

  const files: ProjectFile[] = [];
  const folderSet = new Set<string>();
  const projectName = (file instanceof File ? file.name : 'Imported Project')
    .replace(/\.zip$/i, '')
    .trim() || 'Imported Project';

  const validEntries: Array<{ path: string; entry: JSZip.JSZipObject }> = [];
  let totalEntriesCount = 0;

  loadedZip.forEach((relativePath, entry) => {
    totalEntriesCount++;
    // Guard against directory traversal
    if (relativePath.includes('..')) {
      throw new Error(`Security Violation: Directory traversal detected in ZIP entry "${relativePath}".`);
    }

    // Ignore macOS system metadata and hidden git directories
    if (
      !relativePath.startsWith('__MACOSX/') &&
      !relativePath.includes('/.') &&
      !relativePath.startsWith('.')
    ) {
      if (entry.dir) {
        folderSet.add(sanitizePath(relativePath));
      } else {
        validEntries.push({ path: sanitizePath(relativePath), entry });
      }
    }
  });

  if (totalEntriesCount === 0 || validEntries.length === 0) {
    throw new Error('The ZIP archive is empty or contains no readable files.');
  }

  if (validEntries.length > MAX_ZIP_FILES) {
    throw new Error(`ZIP archive contains too many files (${validEntries.length}). Maximum allowed is ${MAX_ZIP_FILES}.`);
  }

  let totalBytes = 0;

  for (const { path, entry } of validEntries) {
    const filename = path.split('/').pop() || path;
    const type = detectFileType(filename);
    const isBinary = type === 'image';

    // Track parent folders
    const parts = path.split('/');
    if (parts.length > 1) {
      parts.pop();
      let acc = '';
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        folderSet.add(acc);
      }
    }

    if (isBinary) {
      const base64 = await entry.async('base64');
      totalBytes += base64.length * 0.75;
      if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new Error(`Total uncompressed size exceeds safe limit of ${MAX_UNCOMPRESSED_BYTES / (1024 * 1024)} MB.`);
      }

      const ext = filename.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
      const dataUri = `data:${mime};base64,${base64}`;

      files.push({
        id: 'file-' + Math.random().toString(36).substring(2, 9),
        name: filename,
        path: path,
        type,
        isBinary: true,
        dataUri,
        content: '',
        lastModified: entry.date ? entry.date.getTime() : Date.now(),
      });
    } else {
      const content = await entry.async('string');
      totalBytes += content.length;
      if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new Error(`Total uncompressed size exceeds safe limit of ${MAX_UNCOMPRESSED_BYTES / (1024 * 1024)} MB.`);
      }

      files.push({
        id: 'file-' + Math.random().toString(36).substring(2, 9),
        name: filename,
        path: path,
        type,
        content,
        lastModified: entry.date ? entry.date.getTime() : Date.now(),
      });
    }
  }

  return {
    name: projectName,
    files,
    folders: Array.from(folderSet),
  };
}

export function downloadFile(file: ProjectFile): void {
  let blob: Blob;
  if (file.isBinary && file.dataUri) {
    const arr = file.dataUri.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    blob = new Blob([u8arr], { type: mime });
  } else {
    blob = new Blob([file.content], { type: getMimeType(file.type) });
  }

  downloadBlob(blob, file.name);
}

function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 300);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'codestudio_project';
}

function sanitizePath(p: string): string {
  return p
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .replace(/\/+$/, '')
    .replace(/\\/g, '/')
    .trim();
}

export function detectFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'md':
      return 'markdown';
    case 'svg':
      return 'svg';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'ico':
      return 'image';
    default:
      return 'text';
  }
}

function getMimeType(type: FileType): string {
  switch (type) {
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'javascript': return 'text/javascript';
    case 'json': return 'application/json';
    case 'xml': return 'application/xml';
    case 'markdown': return 'text/markdown';
    case 'svg': return 'image/svg+xml';
    default: return 'text/plain';
  }
}
