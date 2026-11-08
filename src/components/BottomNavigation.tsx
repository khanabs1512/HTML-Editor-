import React from 'react';
import { ActiveMobileTab } from '../types';
import { FolderOpen, Code2, Play, Terminal, Sparkles, AlertCircle } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: ActiveMobileTab;
  onSelectTab: (tab: ActiveMobileTab) => void;
  errorCount?: number;
  filesCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  errorCount = 0,
  filesCount = 0,
}) => {
  return (
    <nav className="md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 py-1.5 shrink-0 select-none z-30 pb-safe">
      {/* Files */}
      <button
        onClick={() => onSelectTab('files')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition relative ${
          activeTab === 'files'
            ? 'text-sky-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <FolderOpen className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Files</span>
      </button>

      {/* Editor / Code */}
      <button
        onClick={() => onSelectTab('editor')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
          activeTab === 'editor'
            ? 'text-sky-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Code2 className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Code</span>
      </button>

      {/* Live Preview Button */}
      <button
        onClick={() => onSelectTab('preview')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition relative ${
          activeTab === 'preview'
            ? 'text-sky-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <Play className="w-5 h-5 fill-current" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <span className="text-[10px] tracking-tight">Preview</span>
      </button>

      {/* Console */}
      <button
        onClick={() => onSelectTab('console')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition relative ${
          activeTab === 'console'
            ? 'text-sky-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <Terminal className="w-5 h-5" />
          {errorCount > 0 && (
            <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] text-[9px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center shadow">
              {errorCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Console</span>
      </button>

      {/* Tools */}
      <button
        onClick={() => onSelectTab('tools')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
          activeTab === 'tools'
            ? 'text-sky-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Tools</span>
      </button>
    </nav>
  );
};
