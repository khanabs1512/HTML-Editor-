import React, { useState, useEffect } from 'react';
import { EditorSettings, EditorTheme } from '../types';
import { dbService } from '../services/db';
import {
  X,
  Settings as SettingsIcon,
  HardDrive,
  Sparkles,
  Sliders,
  Type,
  Palette,
  RotateCcw,
  Check,
  ShieldCheck
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onUpdateSettings: (settings: Partial<EditorSettings>) => void;
  onResetWorkspace: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetWorkspace,
}) => {
  const [storageInfo, setStorageInfo] = useState<{ usageMB: number; projectsCount: number; filesCount: number }>({
    usageMB: 0,
    projectsCount: 0,
    filesCount: 0,
  });

  useEffect(() => {
    if (isOpen) {
      dbService.getStorageUsage().then(setStorageInfo);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const themes: Array<{ id: EditorTheme; name: string }> = [
    { id: 'one-dark', name: 'One Dark (Default)' },
    { id: 'vs-dark', name: 'VS Code Dark' },
    { id: 'nord', name: 'Nord Frost' },
    { id: 'dracula', name: 'Dracula Obsidian' },
    { id: 'github-light', name: 'GitHub Light' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/15 text-sky-400 rounded-xl">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Editor &amp; Storage Settings</h2>
              <p className="text-xs text-slate-400">Configure editor ergonomics, typography, and local storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Typography & Editor */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-4 h-4 text-sky-400" />
              Editor Configuration
            </h3>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3.5 text-xs">
              {/* Font Size */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-white block">Font Size</span>
                  <span className="text-[11px] text-slate-400">Adjust code editor reading size</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="11"
                    max="24"
                    value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                    className="w-28 accent-sky-500"
                  />
                  <span className="font-mono text-xs text-sky-400 w-8 text-right">{settings.fontSize}px</span>
                </div>
              </div>

              {/* Theme */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="font-medium text-white block">Editor Theme</span>
                  <span className="text-[11px] text-slate-400">Syntax highlighting theme</span>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => onUpdateSettings({ theme: e.target.value as EditorTheme })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tab Size */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="font-medium text-white block">Tab Indentation</span>
                  <span className="text-[11px] text-slate-400">Number of spaces per indent level</span>
                </div>
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  {[2, 4].map((size) => (
                    <button
                      key={size}
                      onClick={() => onUpdateSettings({ tabSize: size })}
                      className={`px-3 py-1 rounded-md text-xs font-mono transition ${
                        settings.tabSize === size
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {size} spaces
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Wrap */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="font-medium text-white block">Word Wrap</span>
                  <span className="text-[11px] text-slate-400">Wrap long lines to fit editor viewport</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.wordWrap}
                  onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
                  className="w-4 h-4 accent-sky-500 rounded"
                />
              </div>

              {/* Auto Close Brackets */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="font-medium text-white block">Auto Close Brackets</span>
                  <span className="text-[11px] text-slate-400">Automatically pair (), [], {}, and &quot;&quot;</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoCloseBrackets}
                  onChange={(e) => onUpdateSettings({ autoCloseBrackets: e.target.checked })}
                  className="w-4 h-4 accent-sky-500 rounded"
                />
              </div>

              {/* Auto Save */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="font-medium text-white block">Auto-Save</span>
                  <span className="text-[11px] text-slate-400">Persist changes automatically to IndexedDB</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                  className="w-4 h-4 accent-sky-500 rounded"
                />
              </div>
            </div>
          </div>

          {/* 2. Storage & Persistence */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Local Storage Management
            </h3>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">IndexedDB Usage</div>
                  <div className="font-bold text-sm text-sky-400 font-mono mt-0.5">{storageInfo.usageMB} MB</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Projects</div>
                  <div className="font-bold text-sm text-white font-mono mt-0.5">{storageInfo.projectsCount}</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Total Files</div>
                  <div className="font-bold text-sm text-white font-mono mt-0.5">{storageInfo.filesCount}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="font-medium text-rose-400 block">Reset Starter Workspace</span>
                  <span className="text-[11px] text-slate-400">Re-seed sample projects and default settings</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Reset workspace back to original starter projects?')) {
                      onResetWorkspace();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium transition text-xs"
                >
                  Reset Workspace
                </button>
              </div>
            </div>
          </div>

          {/* 3. 100% Free & Open Guarantee */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-slate-950 border border-sky-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white block font-semibold mb-0.5">100% Free Forever Promise</strong>
              CodeStudio has zero subscriptions, zero ads, no locked features, and requires no account registration.
              All editing, bundling, live preview, formatters, and export features operate 100% locally in your browser.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end text-xs text-slate-400 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-md shadow-sky-600/20"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
