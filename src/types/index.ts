export type FileType = 'html' | 'css' | 'javascript' | 'json' | 'xml' | 'markdown' | 'svg' | 'text' | 'image';

export interface ProjectFile {
  id: string;
  name: string;
  path: string; // e.g. "index.html" or "css/style.css"
  content: string;
  type: FileType;
  size?: number;
  lastModified: number;
  isBinary?: boolean;
  dataUri?: string; // for images / binary assets
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  folders?: string[]; // e.g. ["css", "js", "assets/images"]
  createdAt: number;
  updatedAt: number;
  activeFileId?: string;
  tags?: string[];
}

export type EditorTheme = 'one-dark' | 'vs-dark' | 'github-light' | 'nord' | 'dracula';

export interface EditorSettings {
  fontSize: number;
  theme: EditorTheme;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  foldGutter: boolean;
  autoCloseBrackets: boolean;
  autoSave: boolean;
  autoSaveDelay: number; // in ms
  appTheme: 'dark' | 'light' | 'system';
}

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface ConsoleLogMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  args: any[];
  timestamp: number;
  line?: number;
  source?: string;
}

export type ViewportPreset = 'responsive' | 'iphone15' | 'pixel8' | 'ipad' | 'desktop';

export interface ViewportConfig {
  id: ViewportPreset;
  name: string;
  width: number | string;
  height: number | string;
  scale?: number;
}

export type ActiveMobileTab = 'editor' | 'preview' | 'console' | 'files' | 'tools';

export type FileSortOption = 'name' | 'type' | 'modified';
