import React from 'react';
import { Project, SaveStatus } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Code2,
  FolderKanban,
  Play,
  Columns,
  Maximize2,
  Settings,
  Sparkles,
  WifiOff,
  Download,
  Share2,
  Sun,
  Moon,
  ChevronDown,
  Terminal,
  ShieldCheck,
  Zap,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

interface HeaderProps {
  project: Project | null;
  saveStatus?: SaveStatus;
  onManualSave?: () => void;
  onOpenProjectModal: () => void;
  onOpenToolsModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenSSHModal: () => void;
  desktopLayout: 'split' | 'editor' | 'preview';
  onSetDesktopLayout: (layout: 'split' | 'editor' | 'preview') => void;
  onTriggerPreview: () => void;
  theme: 'dark' | 'light' | 'system';
  onToggleTheme: () => void;
  isMobile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  saveStatus = 'saved',
  onManualSave,
  onOpenProjectModal,
  onOpenToolsModal,
  onOpenSettingsModal,
  onOpenSSHModal,
  desktopLayout,
  onSetDesktopLayout,
  onTriggerPreview,
  theme,
  onToggleTheme,
  isMobile = false,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="h-13 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-slate-100 select-none shrink-0 z-30">
      {/* Left: App Logo & Project Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
            CodeStudio
          </span>
        </div>

        {/* Project Selector Button */}
        <button
          onClick={onOpenProjectModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-xs text-slate-200 transition max-w-[140px] sm:max-w-[200px]"
          title="Switch or manage projects"
        >
          <FolderKanban className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate font-medium">{project ? project.name : 'Select Project'}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {/* Save Status & Quick Save Button */}
        <div className="hidden sm:flex items-center gap-1.5">
          {onManualSave && (
            <button
              onClick={onManualSave}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-200 text-xs border border-slate-700 transition"
              title="Save All Changes to IndexedDB (Ctrl+S / Cmd+S)"
            >
              <Save className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium text-[11px]">Save</span>
            </button>
          )}

          <div className="flex items-center gap-1 text-[11px] font-sans">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-sky-400 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden md:inline">Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden md:inline">Saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>Error</span>
              </span>
            )}
          </div>
        </div>

        {/* Free Forever Badge */}
        <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
          <ShieldCheck className="w-3 h-3" />
          <span>100% Free &amp; Offline</span>
        </div>

        {/* Offline indicator if disconnected */}
        {!isOnline && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium animate-pulse">
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}
      </div>

      {/* Center: Desktop Layout Switcher (Split / Editor / Preview) */}
      {!isMobile && (
        <div className="hidden md:flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onSetDesktopLayout('split')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
              desktopLayout === 'split'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Split Editor & Preview"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            onClick={() => onSetDesktopLayout('editor')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
              desktopLayout === 'editor'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Editor Fullscreen"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
          <button
            onClick={() => onSetDesktopLayout('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
              desktopLayout === 'preview'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Live Preview Fullscreen"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>
      )}

      {/* Right: Quick Tools, PWA Install, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Tools Modal Trigger */}
        <button
          onClick={onOpenToolsModal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700/80 transition"
          title="Developer Tools (Format, Minify, Snippets, Search)"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Dev Tools</span>
        </button>

        {/* SSH Architecture Button */}
        <button
          onClick={onOpenSSHModal}
          className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/80 transition"
          title="Remote SSH / SFTP Architecture"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Deploy / SFTP</span>
        </button>

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Settings Modal Trigger */}
        <button
          onClick={onOpenSettingsModal}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition"
          title="Settings & Storage"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
